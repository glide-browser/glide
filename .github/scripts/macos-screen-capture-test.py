#!/usr/bin/env python3
"""
TEMPORARY investigation for https://github.com/glide-browser/glide/discussions/366, do not merge.

Checks whether macOS honours a Screen Recording grant for Glide when it is:

1. installed from the signed release DMG
2. updated in-app with the published update MAR, which is built from the *unsigned* .app.
   The MAR is applied by Glide's own updater, the same way an in-app update does it
3. updated again with a MAR built from the *signed* .app, i.e. the proposed fix on
   `fix/macos-signed-update-mar`, applied by the updater that (2) left behind

Each grant is written straight into the system TCC.db along with the code requirement
that System Settings records, which only works if SIP is disabled on the runner. The
permission is then read from inside Glide via Marionette, using both the heuristic
Firefox's WebRTC code relies on (nsIOSPermissionRequest.getScreenCapturePermissionState)
and CGPreflightScreenCaptureAccess().

Glide is started through LaunchServices (`open`), because a process started directly
by the job is attributed to the runner agent, which already has Screen Recording
granted in the runner image. The `no-grant` stage is the control for this and must
come back denied, otherwise every other result is meaningless.

Only uses the python standard library and tools that ship with macOS + Xcode CLT
(plus `xz`, installed with brew if it is missing).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import socket
import subprocess
import sys
import time
import traceback
from pathlib import Path

BUNDLE_ID = "app.glide-browser.glide"
APP = Path("/Applications/Glide.app")
UPDATER_APP = APP / "Contents/MacOS/updater.app"
SYSTEM_TCC_DB = "/Library/Application Support/com.apple.TCC/TCC.db"
TCC_SERVICE = "kTCCServiceScreenCapture"
MARIONETTE_PORT = 2828
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# nsIOSPermissionRequest.PERMISSION_STATE_*
PERMISSION_STATES = {0: "notdetermined", 1: "restricted", 2: "denied", 3: "authorized"}

# everything needed to build the host `mar` tool and run make_full_update.sh, the same
# way `.github/scripts/macos-sign.sh` does it on the fix branch
MOZILLA_FILES = [
    "modules/libmar/src/mar.h",
    "modules/libmar/src/mar_cmdline.h",
    "modules/libmar/src/mar_create.c",
    "modules/libmar/src/mar_extract.c",
    "modules/libmar/src/mar_private.h",
    "modules/libmar/src/mar_read.c",
    "modules/libmar/tool/mar.c",
    "other-licenses/nsis/Contrib/CityHash/cityhash/city.cpp",
    "other-licenses/nsis/Contrib/CityHash/cityhash/city.h",
    "tools/update-packaging/common.sh",
    "tools/update-packaging/make_full_update.sh",
]

PREFS = {
    "marionette.port": MARIONETTE_PORT,
    "app.update.disabledForTesting": True,
    "app.update.auto": False,
    "browser.shell.checkDefaultBrowser": False,
    "browser.startup.homepage_override.mstone": "ignore",
    "datareporting.policy.dataSubmissionEnabled": False,
    "toolkit.telemetry.reportingpolicy.firstRun": False,
    # logs the window list heuristic in nsCocoaUtils::GetScreenCapturePermissionState()
    "logging.nsCocoaUtils": 5,
}

# runs in Glide's parent process (Marionette chrome context)
QUERY_SCRIPT = r"""
const result = {
  pid: Services.appinfo.processID,
  version: Services.appinfo.version,
  platform_version: Services.appinfo.platformVersion,
};
try {
  const permissions = Cc["@mozilla.org/ospermissionrequest;1"].getService(Ci.nsIOSPermissionRequest);
  const state = {};
  permissions.getScreenCapturePermissionState(state);
  result.firefox_state = state.value;
} catch (e) {
  result.firefox_error = String(e);
}
try {
  const { ctypes } = ChromeUtils.importESModule("resource://gre/modules/ctypes.sys.mjs");
  const lib = ctypes.open("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics");
  try {
    const preflight = lib.declare("CGPreflightScreenCaptureAccess", ctypes.default_abi, ctypes.bool);
    result.cg_preflight = preflight();
  } finally {
    lib.close();
  }
} catch (e) {
  result.cg_error = String(e);
}
return result;
"""


class CommandError(RuntimeError):
    pass


def log(message: str) -> None:
    print(message, flush=True)


def group(title: str) -> None:
    print(f"::endgroup::\n::group::{title}", flush=True)


def run(
    cmd: list,
    *,
    check: bool = True,
    input: str | None = None,
    env: dict | None = None,
    cwd: Path | None = None,
    timeout: float = 600,
    show: int = 60,
) -> subprocess.CompletedProcess:
    """Run a command, merging stderr into stdout (codesign prints everything to stderr)."""
    cmd = [str(part) for part in cmd]
    log("$ " + " ".join(shlex.quote(part) for part in cmd))
    try:
        proc = subprocess.run(
            cmd,
            input=input,
            env=env,
            cwd=cwd,
            timeout=timeout,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
        )
    except subprocess.TimeoutExpired as e:
        raise CommandError(f"timed out after {timeout}s: {' '.join(cmd)}") from e

    lines = (proc.stdout or "").splitlines()
    shown = lines[-show:] if show > 0 else []
    if len(lines) > len(shown):
        log(f"  ... ({len(lines) - len(shown)} lines omitted)")
    for line in shown:
        log("  " + line)
    if proc.returncode != 0:
        log(f"  (exit code {proc.returncode})")
        if check:
            raise CommandError(f"exit code {proc.returncode}: {' '.join(cmd)}")
    return proc


# --- Marionette ---------------------------------------------------------------------


class MarionetteError(RuntimeError):
    pass


class Marionette:
    """Minimal client for the Marionette protocol (length-prefixed JSON over TCP)."""

    def __init__(self, port: int, timeout: float = 60):
        self.sock = socket.create_connection(("127.0.0.1", port), timeout=timeout)
        self.buffer = b""
        self.message_id = 0
        self.hello = self._receive()

    def _receive(self):
        while b":" not in self.buffer:
            self._read_more()
        length, _, rest = self.buffer.partition(b":")
        size = int(length)
        self.buffer = rest
        while len(self.buffer) < size:
            self._read_more()
        data, self.buffer = self.buffer[:size], self.buffer[size:]
        return json.loads(data)

    def _read_more(self) -> None:
        chunk = self.sock.recv(65536)
        if not chunk:
            raise ConnectionError("marionette connection closed")
        self.buffer += chunk

    def send(self, name: str, params: dict | None = None):
        self.message_id += 1
        payload = json.dumps([0, self.message_id, name, params or {}]).encode()
        self.sock.sendall(str(len(payload)).encode() + b":" + payload)
        while True:
            message = self._receive()
            if message[0] == 1 and message[1] == self.message_id:
                if message[2]:
                    raise MarionetteError(f"{name}: {message[2]}")
                return message[3]

    def close(self) -> None:
        try:
            self.sock.close()
        except OSError:
            pass


# --- helpers ------------------------------------------------------------------------


def glide_pids() -> list[int]:
    # not through run(), this is polled
    proc = subprocess.run(["pgrep", "-f", "^/Applications/Glide\\.app/"], stdout=subprocess.PIPE, text=True)
    return [int(pid) for pid in proc.stdout.split()]


def quit_glide(client: Marionette | None = None) -> None:
    if client is not None:
        try:
            client.send("Marionette:Quit", {"flags": ["eForceQuit"]})
        except Exception as e:  # the connection usually drops before the reply arrives
            log(f"  Marionette:Quit: {e}")
        client.close()

    deadline = time.time() + 30
    while time.time() < deadline:
        if not glide_pids():
            return
        time.sleep(0.5)
    log("Glide did not exit, killing it")
    run(["pkill", "-9", "-f", "^/Applications/Glide\\.app/"], check=False)
    time.sleep(2)


def restart_tccd() -> None:
    run(["sudo", "killall", "tccd"], check=False)
    run(["killall", "tccd"], check=False)
    time.sleep(3)


def tcc(sql: str, check: bool = True) -> subprocess.CompletedProcess:
    return run(["sudo", "sqlite3", SYSTEM_TCC_DB, sql], check=check)


def tcc_rows() -> str:
    proc = tcc(
        "SELECT client, client_type, auth_value, auth_reason, hex(csreq) FROM access"
        f" WHERE service = '{TCC_SERVICE}';",
        check=False,
    )
    return proc.stdout.strip()


def tcc_revoke() -> None:
    tcc(f"DELETE FROM access WHERE service = '{TCC_SERVICE}' AND client = '{BUNDLE_ID}';")


def designated_requirement(app: Path) -> str:
    proc = run(["codesign", "--display", "-r-", app], check=False)
    match = re.search(r"designated => (.+)", proc.stdout)
    if not match:
        raise RuntimeError(f"no designated requirement for {app}")
    return match.group(1).strip()


def compile_requirement(requirement: str, work: Path) -> bytes:
    text = work / "requirement.txt"
    binary = work / "requirement.bin"
    text.write_text(requirement + "\n")
    binary.unlink(missing_ok=True)
    if run(["csreq", "-r", text, "-b", binary], check=False).returncode != 0:
        run(["csreq", "-r", "=" + requirement, "-b", binary])
    return binary.read_bytes()


def tcc_grant(requirement: str, work: Path) -> None:
    """Allow Screen Recording for BUNDLE_ID, like toggling it on in System Settings."""
    csreq = compile_requirement(requirement, work).hex()
    now = int(time.time())
    tcc_revoke()
    proc = tcc(
        "INSERT INTO access (service, client, client_type, auth_value, auth_reason, auth_version,"
        " csreq, indirect_object_identifier, flags, last_modified)"
        f" VALUES ('{TCC_SERVICE}', '{BUNDLE_ID}', 0, 2, 3, 1, X'{csreq}', 'UNUSED', 0, {now});",
        check=False,
    )
    if proc.returncode != 0:
        # same shape as actions/runner-images configure-tccdb-macos.sh (macOS 14+ schema)
        tcc(
            f"INSERT INTO access VALUES ('{TCC_SERVICE}', '{BUNDLE_ID}', 0, 2, 3, 1, X'{csreq}',"
            f" NULL, NULL, 'UNUSED', NULL, 0, {now}, NULL, NULL, 'UNUSED', {now});"
        )


def signature(app: Path) -> dict:
    proc = run(["codesign", "--display", "--verbose=4", app], check=False)
    out = proc.stdout

    def field(pattern: str) -> str:
        match = re.search(pattern, out, re.MULTILINE)
        return match.group(1).strip() if match else "?"

    verify = run(["codesign", "--verify", "--deep", "--strict", "--verbose=2", app], check=False)
    verify_lines = [line for line in verify.stdout.splitlines() if line.strip()]
    return {
        "identifier": field(r"^Identifier=(.*)$"),
        "flags": field(r"^CodeDirectory .*flags=(\S+)"),
        "team": field(r"^TeamIdentifier=(.*)$"),
        "authority": field(r"^Authority=(.*)$"),
        "verify_ok": verify.returncode == 0,
        "verify": verify_lines[-1] if verify_lines else "",
    }


def same_as(app: Path, reference: Path) -> str:
    proc = run(["diff", "-rq", app, reference], check=False, show=10)
    if proc.returncode == 0:
        return "identical"
    return f"{len(proc.stdout.splitlines())} differences"


def install_app(source: Path) -> None:
    quit_glide()
    if APP.exists():
        if run(["rm", "-rf", APP], check=False).returncode != 0:
            run(["sudo", "rm", "-rf", APP])
    if run(["ditto", source, APP], check=False).returncode != 0:
        run(["sudo", "ditto", source, APP])
        run(["sudo", "chown", "-R", f"{os.getuid()}:{os.getgid()}", APP])
    register_app()


def register_app() -> None:
    lsregister = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
    run([lsregister, "-f", APP], check=False)


def apply_mar(mar: Path, label: str, work: Path, logs: Path) -> None:
    """Apply a MAR with the installed updater, the way Firefox's nsUpdateDriver invokes it."""
    quit_glide()
    patch_dir = work / f"patch-{label}"
    shutil.rmtree(patch_dir, ignore_errors=True)
    patch_dir.mkdir(parents=True)
    shutil.copyfile(mar, patch_dir / "update.mar")

    # Started through LaunchServices so it is not attributed to the runner agent: macOS only
    # lets the bundle be modified by code from the same team (or with App Management access),
    # in practice it is started by Glide. `open -W` doesn't forward the exit code, but the
    # updater reports the result in update.status.
    updater_log = logs / f"updater-{label}.log"
    updater_log.write_text("")
    # arg-version patch-dir install-dir apply-to-dir which-invocation wait-pid, see
    # ApplyUpdate() in toolkit/xre/nsUpdateDriver.cpp
    updater_args = ["3", patch_dir, APP, APP, "first", "0"]
    status_file = patch_dir / "update.status"
    try:
        run(
            ["open", "-W", "-n", "-a", UPDATER_APP, "--stdout", updater_log, "--stderr", updater_log]
            + ["--args", *updater_args],
            check=False,
            timeout=900,
        )
    except CommandError as e:
        log(f"updater via open: {e}")
    finally:
        run(["pkill", "-9", "-f", "updater\\.app/Contents/MacOS/"], check=False, show=0)
        run(["cat", updater_log], check=False)
    if not status_file.exists():
        # it never ran, so nothing was touched yet: try starting it directly instead
        log("no update.status after `open`, running the updater directly")
        run([UPDATER_APP / "Contents/MacOS/org.mozilla.updater", *updater_args], check=False, timeout=900)
    status = status_file.read_text().strip() if status_file.exists() else "<no update.status>"
    if (patch_dir / "update.log").exists():
        shutil.copyfile(patch_dir / "update.log", logs / f"update-{label}.log")
    log(f"update.status: {status}")
    if status != "succeeded":
        raise RuntimeError(f"updater failed, update.status: {status!r}")
    register_app()


def write_profile(profile: Path) -> None:
    shutil.rmtree(profile, ignore_errors=True)
    profile.mkdir(parents=True)
    lines = [f"user_pref({json.dumps(name)}, {json.dumps(value)});" for name, value in PREFS.items()]
    (profile / "user.js").write_text("\n".join(lines) + "\n")


def query_glide(label: str, work: Path, logs: Path) -> dict:
    """Start Glide through LaunchServices and read the screen recording permission from inside it."""
    quit_glide()
    restart_tccd()

    profile = work / f"profile-{label}"
    write_profile(profile)
    glide_log = logs / f"glide-{label}.log"
    glide_log.write_text("")

    run(
        [
            "open",
            "-n",
            "-F",
            "-a",
            APP,
            "--stdout",
            glide_log,
            "--stderr",
            glide_log,
            "--args",
            "-profile",
            profile,
            "--marionette",
            "--remote-allow-system-access",
        ]
    )

    client = None
    deadline = time.time() + 120
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            client = Marionette(MARIONETTE_PORT)
            break
        except (OSError, ValueError) as e:
            last_error = e
            time.sleep(1)
    if client is None:
        quit_glide()
        tail = "\n".join(glide_log.read_text(errors="replace").splitlines()[-30:])
        raise RuntimeError(f"Marionette never came up ({last_error}), running pids: {glide_pids()}\n{tail}")

    try:
        client.send("WebDriver:NewSession", {})
        client.send("Marionette:SetContext", {"value": "chrome"})
        # give the window server a moment, the heuristic looks at other apps' windows
        time.sleep(5)
        result = client.send("WebDriver:ExecuteScript", {"script": QUERY_SCRIPT, "args": []})["value"]
        log("query result: " + json.dumps(result))

        pid = result.get("pid")
        if pid:
            parent = run(["ps", "-o", "ppid=,comm=", "-p", str(pid)], check=False).stdout.strip()
            procinfo = run(["sudo", "launchctl", "procinfo", str(pid)], check=False, show=0).stdout
            responsible = [line.strip() for line in procinfo.splitlines() if "responsible" in line.lower()]
            result["parent"] = parent
            result["responsible"] = "; ".join(responsible) or "?"
            log(f"parent: {parent}, responsible: {result['responsible']}")
        return result
    finally:
        quit_glide(client)


# --- setup --------------------------------------------------------------------------


def download(url: str, dest: Path) -> None:
    run(["curl", "--fail", "--silent", "--show-error", "--location", "--retry", "3", "--output", dest, url])


def extract_app(dmg: Path, dest: Path, work: Path) -> None:
    mountpoint = work / "dmg-mount"
    mountpoint.mkdir(parents=True, exist_ok=True)
    run(["hdiutil", "attach", "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mountpoint, dmg])
    try:
        run(["ditto", mountpoint / "Glide.app", dest])
    finally:
        run(["hdiutil", "detach", mountpoint, "-force"], check=False)


def build_mar_tool(mozilla: Path, out: Path) -> None:
    src = mozilla / "modules/libmar/src"
    cityhash = mozilla / "other-licenses/nsis/Contrib/CityHash/cityhash"
    objects = out.parent / "mar-objects"
    objects.mkdir(parents=True, exist_ok=True)
    flags = ["-O2", "-DNO_SIGN_VERIFY", "-I", src, "-I", cityhash]
    for name in ["mar_create", "mar_extract", "mar_read"]:
        run(["clang", "-c", *flags, src / f"{name}.c", "-o", objects / f"{name}.o"])
    run(
        [
            "clang",
            "-c",
            *flags,
            '-DMAR_CHANNEL_ID="glide"',
            '-DMOZ_APP_VERSION="0"',
            mozilla / "modules/libmar/tool/mar.c",
            "-o",
            objects / "mar_tool.o",
        ]
    )
    run(
        [
            "clang++",
            "-c",
            "-O2",
            "-std=c++17",
            "-I",
            cityhash,
            cityhash / "city.cpp",
            "-o",
            objects / "city.o",
        ]
    )
    run(["clang++", *sorted(objects.glob("*.o")), "-o", out])


def build_mar(mar_tool: Path, mozilla: Path, app: Path, version: str, out: Path) -> None:
    # channel & version must match `create_mar_file()` in scripts/firefox/package.mts
    env = dict(os.environ, MAR=str(mar_tool), MAR_CHANNEL_ID="glide", MOZ_PRODUCT_VERSION=version)
    run(
        ["bash", mozilla / "tools/update-packaging/make_full_update.sh", out, app],
        env=env,
        timeout=1800,
        show=15,
    )


def prepare(args: argparse.Namespace, work: Path) -> dict:
    release_url = f"https://github.com/glide-browser/glide/releases/download/{args.release}"
    dmg = work / "glide.dmg"
    unsigned_mar = work / "unsigned.mar"
    signed_app = work / "signed/Glide.app"
    signed_mar = work / "signed.mar"
    mozilla = work / "mozilla"
    mar_tool = work / "mar"

    group("download release")
    download(f"{release_url}/glide.macos-{args.arch}.dmg", dmg)
    download(f"{release_url}/macos-{args.arch}.mar", unsigned_mar)

    group("extract signed app from DMG")
    signed_app.parent.mkdir(parents=True, exist_ok=True)
    extract_app(dmg, signed_app, work)
    sig = signature(signed_app)
    log(f"DMG app signature: {sig}")
    if sig["team"] in ("?", "not set"):
        raise RuntimeError("the release DMG's app is not Developer ID signed, nothing to compare against")

    group("fetch mozilla sources")
    tag = json.loads((REPO_ROOT / "firefox.json").read_text())["version"]["tag"]
    for path in MOZILLA_FILES:
        dest = mozilla / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        download(f"https://raw.githubusercontent.com/mozilla-firefox/firefox/{tag}/{path}", dest)

    group("build mar tool")
    if shutil.which("xz") is None:
        run(["brew", "install", "xz"])
    build_mar_tool(mozilla, mar_tool)

    group("build MAR from the signed app")
    build_mar(mar_tool, mozilla, signed_app, args.release, signed_mar)
    for mar in (unsigned_mar, signed_mar):
        header = run([mar_tool, "-T", mar], check=False, show=0).stdout.splitlines()[:6]
        log(f"{mar.name}:\n  " + "\n  ".join(header))

    return {
        "signed_app": signed_app,
        "signed_mar": signed_mar,
        "unsigned_mar": unsigned_mar,
        "signed_requirement": designated_requirement(signed_app),
    }


def environment() -> dict:
    group("environment")
    info = {
        "macos": run(["sw_vers", "-productVersion"], check=False).stdout.strip(),
        "build": run(["sw_vers", "-buildVersion"], check=False).stdout.strip(),
        "arch": run(["uname", "-m"], check=False).stdout.strip(),
        "sip": run(["csrutil", "status"], check=False).stdout.strip(),
    }
    run(["id"], check=False)
    # Firefox's heuristic needs a named window from another app at the normal or dock level
    window_file = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "named-window.txt"
    window_file.write_text("a window from another app for nsCocoaUtils::GetScreenCapturePermissionState\n")
    run(["open", "-g", "-a", "TextEdit", window_file], check=False)
    run(["ls", "-ld", "/Applications"], check=False)
    tcc(".schema access", check=False)
    log("existing screen capture grants:\n" + tcc_rows())

    # probe that the system TCC.db is writable, everything below depends on it
    probe = tcc(
        "INSERT INTO access (service, client, client_type, auth_value, auth_reason, auth_version,"
        f" indirect_object_identifier, flags, last_modified) VALUES ('{TCC_SERVICE}', 'glide.ci.probe',"
        " 0, 0, 3, 1, 'UNUSED', 0, 0);"
        f" DELETE FROM access WHERE client = 'glide.ci.probe';",
        check=False,
    )
    info["tcc_writable"] = probe.returncode == 0
    log(f"environment: {info}")
    return info


# --- stages -------------------------------------------------------------------------


def run_stages(setup: dict, work: Path, logs: Path) -> list[dict]:
    signed_app = setup["signed_app"]
    signed_requirement = setup["signed_requirement"]
    results: list[dict] = []
    state: dict = {"grant": "none"}

    def stage(name: str, description: str, expect: str | None, prepare_stage) -> None:
        group(f"stage: {name}")
        record: dict = {"name": name, "description": description, "expect": expect}
        try:
            prepare_stage()
            record["grant"] = state["grant"]
            record["tcc_rows"] = tcc_rows()
            log("screen capture grants:\n" + record["tcc_rows"])
            record["signature"] = signature(APP)
            record["same_as_dmg"] = same_as(APP, signed_app)
            record.update(query_glide(name, work, logs))
        except Exception as e:
            traceback.print_exc()
            record["error"] = f"{type(e).__name__}: {e}"
        results.append(record)

    def grant_signed() -> None:
        tcc_grant(signed_requirement, work)
        state["grant"] = "Developer ID requirement"

    def grant_current() -> None:
        requirement = designated_requirement(APP)
        tcc_grant(requirement, work)
        state["grant"] = f"current app's requirement (`{requirement[:60]}`)"

    def revoke() -> None:
        tcc_revoke()
        state["grant"] = "none"

    stage(
        "no-grant",
        "signed DMG install, no grant (control: proves TCC checks Glide, not the runner agent)",
        "denied",
        lambda: (install_app(signed_app), revoke()),
    )
    stage(
        "dmg",
        "signed DMG install, granted",
        "authorized",
        grant_signed,
    )
    stage(
        "old-mar",
        "after applying the published MAR (current in-app update), grant unchanged",
        "denied",
        lambda: apply_mar(setup["unsigned_mar"], "old-mar", work, logs),
    )
    stage(
        "old-mar-regrant",
        "same install, re-granted for the ad-hoc app (user toggles it off and on again)",
        None,
        grant_current,
    )
    stage(
        "new-mar-adhoc-grant",
        "after applying a MAR built from the signed app, grant from the previous stage kept",
        None,
        lambda: apply_mar(setup["signed_mar"], "new-mar", work, logs),
    )
    stage(
        "new-mar",
        "same install, granted for the Developer ID app (e.g. granted before the broken update)",
        "authorized",
        grant_signed,
    )
    return results


# --- report -------------------------------------------------------------------------


def verdict(record: dict, control_ok: bool) -> str:
    if "error" in record:
        return "ERROR"
    expect = record["expect"]
    if expect is None:
        return "observed"
    state = PERMISSION_STATES.get(record.get("firefox_state"), "?")
    ok = state == expect and record.get("cg_preflight") == (expect == "authorized")
    if not control_ok and record["name"] != "no-grant":
        return "INCONCLUSIVE"
    return "as expected" if ok else "UNEXPECTED"


def write_summary(info: dict, results: list[dict], fatal: str | None) -> bool:
    control = next((r for r in results if r["name"] == "no-grant"), None)
    control_ok = bool(
        control
        and "error" not in control
        and PERMISSION_STATES.get(control.get("firefox_state")) == "denied"
        and control.get("cg_preflight") is False
    )

    lines = [
        "## Screen recording permission test",
        "",
        f"macOS {info.get('macos')} ({info.get('build')}, {info.get('arch')}), {info.get('sip')},"
        f" system TCC.db writable: {info.get('tcc_writable')}",
        "",
    ]
    if fatal:
        lines += [f"**Setup failed:** `{fatal}`", ""]
    if results and not control_ok:
        lines += [
            "**The `no-grant` control did not come back denied, so TCC is not checking Glide itself"
            " (or the check errored). The other results are not meaningful.**",
            "",
        ]
    lines += [
        "| Stage | Situation | Grant | Expected | Firefox check | CGPreflight | Identifier / flags / team"
        " | codesign --verify | Same files as DMG | Parent / responsible | Result |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    all_ok = fatal is None and bool(results)
    for record in results:
        result = verdict(record, control_ok)
        if result in ("ERROR", "UNEXPECTED", "INCONCLUSIVE"):
            all_ok = False
        sig = record.get("signature", {})
        firefox = PERMISSION_STATES.get(record.get("firefox_state"), record.get("firefox_error", "?"))
        cg = record.get("cg_preflight", record.get("cg_error", "?"))
        cells = [
            f"`{record['name']}`",
            record["description"],
            record.get("grant", "?"),
            record["expect"] or "-",
            str(firefox),
            str(cg),
            f"`{sig.get('identifier', '?')}` / `{sig.get('flags', '?')}` / `{sig.get('team', '?')}`",
            ("ok" if sig.get("verify_ok") else "FAIL: " + sig.get("verify", "")) if sig else "?",
            record.get("same_as_dmg", "?"),
            f"{record.get('parent', '?')} / {record.get('responsible', '?')}",
            result + (f": {record['error']}" if "error" in record else ""),
        ]
        lines.append("| " + " | ".join(cell.replace("|", "\\|").replace("\n", " ") for cell in cells) + " |")

    summary = "\n".join(lines) + "\n"
    log(summary)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a") as f:
            f.write(summary)
    return all_ok


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--release", default="0.1.64a", help="Glide release whose DMG & MAR are tested")
    parser.add_argument("--arch", default="aarch64", choices=["aarch64", "x86_64"])
    parser.add_argument("--work", required=True, type=Path, help="scratch directory")
    args = parser.parse_args()

    work = args.work.resolve()
    logs = work / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    print("::group::start", flush=True)

    info: dict = {}
    results: list[dict] = []
    fatal = None
    try:
        info = environment()
        setup = prepare(args, work)
        results = run_stages(setup, work, logs)
    except Exception as e:
        traceback.print_exc()
        fatal = f"{type(e).__name__}: {e}"
    finally:
        quit_glide()
        group("summary")
        print("::endgroup::", flush=True)

    (logs / "results.json").write_text(
        json.dumps({"environment": info, "stages": results}, indent=2, default=str)
    )
    return 0 if write_summary(info, results, fatal) else 1


if __name__ == "__main__":
    sys.exit(main())
