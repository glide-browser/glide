#!/usr/bin/env python3
"""
TEMPORARY rehearsal for `fix/macos-signed-update-mar`, do not merge.

The sign job only ever runs during a release, so this exercises the same code against the
artifacts of a real build, without the Apple credentials:

A. `.github/scripts/macos-sign.sh`, unmodified, with a throwaway self-signed certificate.
   Only the three things that need Apple issued credentials are stubbed out through PATH:
   rcodesign's `--for-notarization` check, the Developer ID signature on the DMG and the
   notarization itself. Checks the MAR and the update manifests it produces.

B. What macOS makes of an install after it was updated with a MAR built from a *Developer ID*
   signed app, using the published releases and their own updaters:
     - an old signed install updated straight to a signed MAR (the steady state after the fix)
     - an install that already lost its signature to a published MAR (today's users)

C. The build itself: that it starts, and that the previous release's updater can apply the
   MARs this build's tooling creates.

Glide and its updater are always started through LaunchServices (`open`), a process started
directly by the job is attributed to the runner agent. Grants are written straight into the
system TCC.db, which needs SIP to be disabled (it is on GitHub's hosted macOS runners).

Only uses the python standard library and tools that ship with macOS + Xcode CLT.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import os
import re
import shlex
import shutil
import socket
import struct
import subprocess
import sys
import time
import traceback
from pathlib import Path

BUNDLE_ID = "app.glide-browser.glide"
TEAM_ID = "M3M9SSHSKB"
APP = Path("/Applications/Glide.app")
UPDATER_APP = APP / "Contents/MacOS/updater.app"
SYSTEM_TCC_DB = "/Library/Application Support/com.apple.TCC/TCC.db"
TCC_SERVICE = "kTCCServiceScreenCapture"
MARIONETTE_PORT = 2828
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ENGINE = REPO_ROOT / "engine"
RELEASES = "https://github.com/glide-browser/glide/releases/download"

# files the updater only adds when they are missing, so they stay as first installed
ADD_IF_NOT = re.compile(r"(^|/)(ChannelPrefs|UpdateSettings)\.framework/")

# nsIOSPermissionRequest.PERMISSION_STATE_*
PERMISSION_STATES = {0: "notdetermined", 1: "restricted", 2: "denied", 3: "authorized"}

PREFS = {
    "marionette.port": MARIONETTE_PORT,
    "app.update.disabledForTesting": True,
    "app.update.auto": False,
    "browser.shell.checkDefaultBrowser": False,
    "browser.startup.homepage_override.mstone": "ignore",
    "datareporting.policy.dataSubmissionEnabled": False,
    "toolkit.telemetry.reportingpolicy.firstRun": False,
}

# runs in Glide's parent process (Marionette chrome context)
QUERY_SCRIPT = r"""
const result = {
  pid: Services.appinfo.processID,
  version: Services.appinfo.version,
  platform_version: Services.appinfo.platformVersion,
  build_id: Services.appinfo.appBuildID,
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

CHECKS: list[dict] = []

# how long to wait for Marionette after starting Glide, raised when it runs under Rosetta
# (every new build is translated on its first start, XUL alone takes a while)
LAUNCH_WAIT = 150.0


class CommandError(RuntimeError):
    pass


def log(message: str) -> None:
    print(message, flush=True)


def group(title: str) -> None:
    print(f"::endgroup::\n::group::{title}", flush=True)


def check(phase: str, name: str, ok: bool | None, detail: str = "") -> bool | None:
    """Record a result. ok=None is informational: reported, but never fails the job."""
    CHECKS.append({"phase": phase, "name": name, "ok": ok, "detail": detail})
    marker = {True: "PASS", False: "FAIL", None: "INFO"}[ok]
    log(f"[{marker}] {phase}: {name}" + (f" -- {detail}" if detail else ""))
    return ok


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


# --- MAR files ----------------------------------------------------------------------


def read_mar(path: Path) -> dict:
    """Parse a MAR, see modules/libmar/src/mar_private.h. Returns {name: (bytes, mode)}."""
    data = path.read_bytes()
    if data[:4] != b"MAR1":
        raise RuntimeError(f"{path} is not a MAR file")
    (index_offset,) = struct.unpack(">I", data[4:8])
    (num_sigs,) = struct.unpack(">I", data[16:20])
    pos = 20
    for _ in range(num_sigs):
        _, size = struct.unpack(">II", data[pos : pos + 8])
        pos += 8 + size
    (num_sections,) = struct.unpack(">I", data[pos : pos + 4])
    pos += 4
    product = None
    for _ in range(num_sections):
        block_size, block_id = struct.unpack(">II", data[pos : pos + 8])
        if block_id == 1:
            parts = data[pos + 8 : pos + block_size].split(b"\0")
            product = (parts[0].decode(), parts[1].decode())
        pos += block_size
    (index_size,) = struct.unpack(">I", data[index_offset : index_offset + 4])
    index = data[index_offset + 4 : index_offset + 4 + index_size]
    files = {}
    p = 0
    while p < len(index):
        offset, length, mode = struct.unpack(">III", index[p : p + 12])
        end = index.index(b"\0", p + 12)
        files[index[p + 12 : end].decode()] = (lzma.decompress(data[offset : offset + length]), mode)
        p = end + 1
    return {"product": product, "signatures": num_sigs, "files": files, "size": len(data)}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tree_listing(root: Path) -> dict:
    """{relative path: sha256} for every file below root."""
    out = {}
    for directory, _, files in os.walk(root):
        for name in files:
            path = Path(directory) / name
            rel = str(path.relative_to(root))
            if path.is_symlink():
                out[rel] = "symlink:" + os.readlink(path)
            else:
                out[rel] = sha256(path.read_bytes())
    return out


def compare(a: dict, b: dict) -> dict:
    return {
        "only_a": sorted(set(a) - set(b)),
        "only_b": sorted(set(b) - set(a)),
        "differ": sorted(k for k in set(a) & set(b) if a[k] != b[k]),
    }


def describe(diff: dict, a: str, b: str) -> str:
    parts = []
    for key, label in (("only_a", f"only in {a}"), ("only_b", f"only in {b}"), ("differ", "differ")):
        if diff[key]:
            shown = ", ".join(diff[key][:6]) + (f", ... ({len(diff[key])} total)" if len(diff[key]) > 6 else "")
            parts.append(f"{label}: {shown}")
    return "; ".join(parts) or "identical"


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
    run(["sudo", "killall", "tccd"], check=False, show=0)
    run(["killall", "tccd"], check=False, show=0)
    time.sleep(3)


def tcc(sql: str, check: bool = True) -> subprocess.CompletedProcess:
    return run(["sudo", "sqlite3", SYSTEM_TCC_DB, sql], check=check)


def tcc_revoke() -> None:
    tcc(f"DELETE FROM access WHERE service = '{TCC_SERVICE}' AND client = '{BUNDLE_ID}';")


def designated_requirement(app: Path) -> str:
    proc = run(["codesign", "--display", "-r-", app], check=False)
    match = re.search(r"designated => (.+)", proc.stdout)
    if not match:
        raise RuntimeError(f"no designated requirement for {app}")
    return match.group(1).strip()


def tcc_grant(requirement: str, work: Path) -> None:
    """Allow Screen Recording for BUNDLE_ID, like toggling it on in System Settings."""
    text = work / "requirement.txt"
    binary = work / "requirement.bin"
    text.write_text(requirement + "\n")
    binary.unlink(missing_ok=True)
    if run(["csreq", "-r", text, "-b", binary], check=False).returncode != 0:
        run(["csreq", "-r", "=" + requirement, "-b", binary])
    csreq = binary.read_bytes().hex()
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


def last_line(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines[-1] if lines else ""


def inspect(app: Path) -> dict:
    """Everything macOS can tell us about the code signature of an app, without changing it."""
    display = run(["codesign", "--display", "--verbose=4", app], check=False, show=0).stdout

    def field(pattern: str) -> str:
        match = re.search(pattern, display, re.MULTILINE)
        return match.group(1).strip() if match else "?"

    deep = run(["codesign", "--verify", "--deep", "--verbose=2", app], check=False, show=6)
    strict = run(["codesign", "--verify", "--deep", "--strict", "--verbose=2", app], check=False, show=6)
    spctl = run(["spctl", "--assess", "--type", "execute", "--verbose=4", app], check=False, show=6)
    return {
        "identifier": field(r"^Identifier=(.*)$"),
        "flags": field(r"^CodeDirectory .*flags=(\S+)"),
        "team": field(r"^TeamIdentifier=(.*)$"),
        "authority": field(r"^Authority=(.*)$"),
        "verify_deep_ok": deep.returncode == 0,
        "verify_deep": last_line(deep.stdout),
        "verify_strict_ok": strict.returncode == 0,
        "verify_strict": last_line(strict.stdout),
        "spctl_ok": spctl.returncode == 0,
        "spctl": " / ".join(line.strip() for line in spctl.stdout.splitlines() if line.strip())[:200],
    }


def strict_without_xattrs(app: Path, work: Path) -> tuple[bool, str]:
    """`codesign --strict` rejects FinderInfo xattrs, which `ditto` carries over from the DMG.
    Check a copy with the xattrs cleared, so what remains is about the files themselves."""
    copy = work / "strict-copy" / "Glide.app"
    shutil.rmtree(copy.parent, ignore_errors=True)
    copy.parent.mkdir(parents=True)
    run(["ditto", "--norsrc", "--noextattr", "--noqtn", app, copy], show=0)
    run(["xattr", "-cr", copy], check=False, show=0)
    proc = run(["codesign", "--verify", "--deep", "--strict", "--verbose=2", copy], check=False, show=8)
    shutil.rmtree(copy.parent, ignore_errors=True)
    return proc.returncode == 0, last_line(proc.stdout)


def install_app(source: Path) -> None:
    quit_glide()
    if APP.exists():
        if run(["rm", "-rf", APP], check=False, show=3).returncode != 0:
            run(["sudo", "rm", "-rf", APP])
    if run(["ditto", source, APP], check=False, show=3).returncode != 0:
        run(["sudo", "ditto", source, APP])
        run(["sudo", "chown", "-R", f"{os.getuid()}:{os.getgid()}", APP])
    register_app()


def register_app() -> None:
    lsregister = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
    run([lsregister, "-f", APP], check=False, show=0)


def apply_mar(mar: Path, label: str, work: Path, logs: Path) -> str:
    """Apply a MAR with the installed updater, the way Firefox's nsUpdateDriver invokes it."""
    quit_glide()
    patch_dir = work / f"patch-{label}"
    shutil.rmtree(patch_dir, ignore_errors=True)
    patch_dir.mkdir(parents=True)
    shutil.copyfile(mar, patch_dir / "update.mar")

    # Started through LaunchServices so it is not attributed to the runner agent. `open -W`
    # doesn't forward the exit code, but the updater reports the result in update.status.
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
        run(["cat", updater_log], check=False, show=15)
    if not status_file.exists():
        # it never ran, so nothing was touched yet: try starting it directly instead
        log("no update.status after `open`, running the updater directly")
        run([UPDATER_APP / "Contents/MacOS/org.mozilla.updater", *updater_args], check=False, timeout=900)
    status = status_file.read_text().strip() if status_file.exists() else "<no update.status>"
    if (patch_dir / "update.log").exists():
        shutil.copyfile(patch_dir / "update.log", logs / f"update-{label}.log")
        if status != "succeeded":
            run(["tail", "-30", patch_dir / "update.log"], check=False)
    log(f"update.status: {status}")
    register_app()
    return status


def write_profile(profile: Path) -> None:
    shutil.rmtree(profile, ignore_errors=True)
    profile.mkdir(parents=True)
    lines = [f"user_pref({json.dumps(name)}, {json.dumps(value)});" for name, value in PREFS.items()]
    (profile / "user.js").write_text("\n".join(lines) + "\n")


def query_glide(label: str, work: Path, logs: Path, wait: float | None = None) -> dict:
    """Start Glide through LaunchServices and ask it for its version and screen recording state."""
    quit_glide()
    restart_tccd()

    profile = work / f"profile-{label}"
    write_profile(profile)
    glide_log = logs / f"glide-{label}.log"
    glide_log.write_text("")

    run(
        ["open", "-n", "-F", "-a", APP, "--stdout", glide_log, "--stderr", glide_log]
        + ["--args", "-profile", profile, "--marionette", "--remote-allow-system-access"],
        check=False,
    )

    client = None
    started = time.time()
    deadline = started + (wait or LAUNCH_WAIT)
    last_error: Exception | None = None
    gone = 0
    while time.time() < deadline:
        try:
            client = Marionette(MARIONETTE_PORT)
            break
        except (OSError, ValueError) as e:
            last_error = e
            # it exited, or macOS refused to run it: no point in waiting for the whole timeout
            gone = gone + 1 if time.time() - started > 20 and not glide_pids() else 0
            if gone >= 5:
                break
            time.sleep(1)
    if client is None:
        pids = glide_pids()
        quit_glide()
        tail = "\n".join(glide_log.read_text(errors="replace").splitlines()[-30:])
        raise RuntimeError(f"Marionette never came up ({last_error}), running pids: {pids}\n{tail}")

    try:
        client.send("WebDriver:NewSession", {})
        client.send("Marionette:SetContext", {"value": "chrome"})
        # give the window server a moment, the screen recording heuristic looks at other apps' windows
        time.sleep(5)
        result = client.send("WebDriver:ExecuteScript", {"script": QUERY_SCRIPT, "args": []})["value"]
        log("query result: " + json.dumps(result))
        pid = result.get("pid")
        if pid:
            procinfo = run(["sudo", "launchctl", "procinfo", str(pid)], check=False, show=0).stdout
            responsible = [line.strip() for line in procinfo.splitlines() if "responsible path" in line.lower()]
            result["responsible"] = "; ".join(responsible) or "?"
        return result
    finally:
        quit_glide(client)


def screen_state(result: dict) -> str:
    return PERMISSION_STATES.get(result.get("firefox_state"), "?")


def download(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(["curl", "--fail", "--silent", "--show-error", "--location", "--retry", "3", "--output", dest, url])


def extract_app(dmg: Path, dest: Path, work: Path) -> Path:
    if dest.exists():
        return dest
    mountpoint = work / "dmg-mount"
    mountpoint.mkdir(parents=True, exist_ok=True)
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(["hdiutil", "attach", "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mountpoint, dmg], show=3)
    try:
        run(["ditto", mountpoint / "Glide.app", dest], show=3)
    finally:
        run(["hdiutil", "detach", mountpoint, "-force"], check=False, show=0)
    return dest


def firefox_json() -> dict:
    return json.loads((REPO_ROOT / "firefox.json").read_text())


def build_mar(mar_tool: Path, app: Path, version: str, out: Path) -> None:
    """Same invocation as `.github/scripts/macos-sign.sh`."""
    env = dict(os.environ, MAR=str(mar_tool), MAR_CHANNEL_ID="glide", MOZ_PRODUCT_VERSION=version)
    run(
        ["./tools/update-packaging/make_full_update.sh", out, app, firefox_json()["binary_name"]],
        env=env,
        cwd=ENGINE,
        timeout=1800,
        show=4,
    )


# --- environment --------------------------------------------------------------------


def environment(args: argparse.Namespace) -> dict:
    group("environment")
    info = {
        "macos": run(["sw_vers", "-productVersion"], check=False).stdout.strip(),
        "arch": run(["uname", "-m"], check=False).stdout.strip(),
        "sip": run(["csrutil", "status"], check=False).stdout.strip(),
        "gatekeeper": run(["spctl", "--status"], check=False).stdout.strip(),
        "bash": run(["bash", "-c", "echo $BASH_VERSION"], check=False).stdout.strip(),
        "xz": last_line(run(["xz", "--version"], check=False).stdout.splitlines()[0] if shutil.which("xz") else "missing"),
    }
    rosetta = run(["arch", "-x86_64", "/usr/bin/true"], check=False, show=3).returncode == 0
    if args.arch == "x86_64" and not rosetta:
        run(["softwareupdate", "--install-rosetta", "--agree-to-license"], check=False, timeout=600)
        rosetta = run(["arch", "-x86_64", "/usr/bin/true"], check=False, show=3).returncode == 0
    info["rosetta"] = rosetta
    info["can_run_target"] = args.arch == "aarch64" or rosetta
    if args.arch == "x86_64" and info["arch"] == "arm64":
        global LAUNCH_WAIT
        LAUNCH_WAIT = 480.0

    # Firefox's screen recording heuristic needs a named window from another app
    window_file = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "named-window.txt"
    window_file.write_text("a window from another app for nsCocoaUtils::GetScreenCapturePermissionState\n")
    run(["open", "-g", "-a", "TextEdit", window_file], check=False)

    probe = tcc(
        "INSERT INTO access (service, client, client_type, auth_value, auth_reason, auth_version,"
        f" indirect_object_identifier, flags, last_modified) VALUES ('{TCC_SERVICE}', 'glide.ci.probe',"
        " 0, 0, 3, 1, 'UNUSED', 0, 0);"
        " DELETE FROM access WHERE client = 'glide.ci.probe';",
        check=False,
    )
    info["tcc_writable"] = probe.returncode == 0
    log(f"environment: {info}")
    return info


# --- phase A: the sign script -------------------------------------------------------

RCODESIGN_STUB = """#!/bin/bash
# TEST STUB: `--for-notarization` refuses certificates that were not issued by Apple
args=()
for arg in "$@"; do
  [[ "$arg" == "--for-notarization" ]] || args+=("$arg")
done
echo "[stub] rcodesign without --for-notarization" >&2
exec "{real}" "${{args[@]}}"
"""

CODESIGN_STUB = """#!/bin/bash
# TEST STUB: the DMG is signed with the Developer ID from the keychain, sign it ad-hoc instead
last="${@: -1}"
if [[ "$last" == *.dmg ]]; then
  args=()
  replace=0
  for arg in "$@"; do
    if [[ $replace == 1 ]]; then
      args+=("-")
      replace=0
      continue
    fi
    [[ "$arg" == "-s" ]] && replace=1
    args+=("$arg")
  done
  echo "[stub] codesign: signing the DMG ad-hoc" >&2
  exec /usr/bin/codesign "${args[@]}"
fi
exec /usr/bin/codesign "$@"
"""

XCRUN_STUB = """#!/bin/bash
# TEST STUB: no Apple account to notarize with
case "$1" in
  notarytool | stapler)
    echo "[stub] skipped: xcrun $*" >&2
    exit 0
    ;;
esac
exec /usr/bin/xcrun "$@"
"""


def phase_a(args: argparse.Namespace, work: Path, logs: Path, published_profile: Path | None) -> dict:
    phase = "A sign script"
    group("phase A: generate throwaway credentials")
    creds = work / "creds"
    shutil.rmtree(creds, ignore_errors=True)
    creds.mkdir(parents=True)
    real_rcodesign = shutil.which("rcodesign")
    if not real_rcodesign:
        raise RuntimeError("rcodesign is not installed")
    run(
        [real_rcodesign, "generate-self-signed-certificate", "--person-name", "Glide CI Test"]
        + ["--profile", "developer-id-application", "--team-id", "GLIDETEST1", "--pem-filename", creds / "test"],
        show=3,
    )
    # /usr/bin/openssl is LibreSSL, which writes the legacy PKCS#12 encryption Keychain exports use
    run(
        ["/usr/bin/openssl", "pkcs12", "-export", "-inkey", creds / "test.key", "-in", creds / "test.crt"]
        + ["-certpbe", "PBE-SHA1-3DES", "-keypbe", "PBE-SHA1-3DES"]
        + ["-out", creds / "test.p12", "-passout", "pass:glide-ci-test"],
        show=5,
    )

    stubs = work / "stubs"
    shutil.rmtree(stubs, ignore_errors=True)
    stubs.mkdir(parents=True)
    for name, content in (
        ("rcodesign", RCODESIGN_STUB.format(real=real_rcodesign)),
        ("codesign", CODESIGN_STUB),
        ("xcrun", XCRUN_STUB),
    ):
        (stubs / name).write_text(content)
        (stubs / name).chmod(0o755)

    # any bytes do, the script only copies it into the bundle. Use the real one when we have it.
    profile = published_profile.read_bytes() if published_profile else b"not a real provisioning profile\n"

    updates = args.updates.resolve()
    original_updates = work / "updates.orig"
    shutil.rmtree(original_updates, ignore_errors=True)
    shutil.copytree(updates, original_updates)

    group("phase A: mar tool")
    mar_tool = args.mar_tool.resolve()
    tool_info = run(["file", mar_tool], check=False).stdout.strip()
    build_version = run(["otool", "-l", mar_tool], check=False, show=0).stdout
    minos = re.search(r"minos (\S+)", build_version)
    check(
        phase,
        "mar tool from the build job",
        None,
        f"{tool_info.split(': ', 1)[-1]}, minos {minos.group(1) if minos else '?'},"
        f" executable bit as downloaded: {os.access(mar_tool, os.X_OK)}",
    )
    run(["otool", "-L", mar_tool], check=False)

    group("phase A: run .github/scripts/macos-sign.sh")
    env = dict(
        os.environ,
        PATH=f"{stubs}:{os.environ['PATH']}",
        ARCH=args.arch,
        APPLE_DEVELOPER_ID="Developer ID Application: not used by the stub",
        APPLE_ACCOUNT_ID="not-used@example.com",
        APPLE_TEAM_ID="GLIDETEST1",
        APPLE_APP_ID_PASSWORD="not-used",
        P12_BASE64=base64.b64encode((creds / "test.p12").read_bytes()).decode(),
        P12_PASSWORD="glide-ci-test",
        PROVISIONING_PROFILE_BASE64=base64.b64encode(profile).decode(),
        DMG_PATH=str(args.build_dmg),
        # relative, exactly like macos-sign.yml passes them
        MAR_TOOL=os.path.relpath(mar_tool, REPO_ROOT),
        UPDATES_DIR=os.path.relpath(updates, REPO_ROOT),
    )
    sign_log = logs / "macos-sign.log"
    started = time.time()
    marks: list[tuple[float, str]] = []
    tail: list[str] = []
    with open(sign_log, "w") as f:
        proc = subprocess.Popen(
            ["./.github/scripts/macos-sign.sh"],
            cwd=REPO_ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            elapsed = time.time() - started
            line = line.rstrip("\n")
            f.write(f"[{elapsed:7.1f}s] {line}\n")
            tail = (tail + [line[:300]])[-60:]
            marker = re.match(r"^=+ (.+?) =+$", line.strip())
            if marker:
                marks.append((elapsed, marker.group(1)))
            if marker or "[stub]" in line or line.startswith(("Finished", "MAR_TOOL", "UPDATES_DIR", "the MAR does not")):
                log(f"  [{elapsed:7.1f}s] {line[:300]}")
        returncode = proc.wait()
    duration = time.time() - started
    if returncode != 0:
        log("\n".join("  " + line for line in tail))
    check(phase, "macos-sign.sh exits 0", returncode == 0, f"exit {returncode} after {duration:.0f}s")
    timings = [
        f"{title}: {(marks[i + 1][0] if i + 1 < len(marks) else duration) - at:.0f}s" for i, (at, title) in enumerate(marks)
    ]
    check(phase, "macos-sign.sh step timings (notarization is stubbed out)", None, ", ".join(timings))
    wanted = ("Creating update MAR", "Updating update manifests", "Signing DMG")
    steps = [title for _, title in marks if title in wanted]
    check(phase, "ran the MAR, manifest and DMG steps", len(steps) == 3, ", ".join(steps))
    return check_sign_outputs(args, work, logs, original_updates)


def check_sign_outputs(args: argparse.Namespace, work: Path, logs: Path, original_updates: Path) -> dict:
    """Check what `.github/scripts/macos-sign.sh` left behind for the workflow to upload."""
    phase = "A sign script"
    mar_tool = args.mar_tool
    updates = args.updates
    signed_app = ENGINE / f"obj-{args.arch}-apple-darwin/dist/Glide.app"
    mar_path = ENGINE / f"macos-{args.arch}.mar"
    dmg_path = ENGINE / f"glide.macos-{args.arch}.dmg"
    result = {"signed_app": signed_app, "mar": mar_path, "dmg": dmg_path, "ok": False}
    if not check(phase, "MAR was created where the workflow uploads it from", mar_path.exists(), str(mar_path)):
        return result

    group("phase A: check the MAR")
    config = firefox_json()
    version = config["brands"]["glide"]["release"]["display_version"]
    mar = read_mar(mar_path)
    check(phase, "MAR product info", mar["product"] == ("glide", version), f"{mar['product']} (want glide / {version})")
    header = run([mar_tool, "-T", mar_path], check=False, show=0).stdout.splitlines()[:6]
    log("\n".join("  " + line for line in header))

    manifest = mar["files"].pop("updatev3.manifest")[0].decode()
    instructions = [line for line in manifest.splitlines() if line.strip()]
    (logs / "updatev3.manifest").write_text(manifest)
    mar_listing = {name: sha256(data) for name, (data, _) in mar["files"].items()}
    app_listing = tree_listing(signed_app)
    diff = compare(mar_listing, app_listing)
    check(phase, "MAR contents are the signed .app, byte for byte", not any(diff.values()), describe(diff, "MAR", "app"))

    modes_wrong = [
        name for name, (_, mode) in mar["files"].items() if bool(mode & 0o111) != os.access(signed_app / name, os.X_OK)
    ]
    check(phase, "MAR keeps the executable bits", not modes_wrong, ", ".join(modes_wrong[:5]))

    seals = sorted(name for name in mar_listing if name.endswith("_CodeSignature/CodeResources"))
    check(
        phase,
        "MAR carries the signature files",
        "Contents/_CodeSignature/CodeResources" in mar_listing and "Contents/embedded.provisionprofile" in mar_listing,
        f"{len(seals)} CodeResources: " + ", ".join(s.replace("/Contents/_CodeSignature/CodeResources", "") for s in seals),
    )
    add_if_not = sorted(re.findall(r'^add-if-not "([^"]+)"', manifest, re.MULTILINE))
    unexpected = [name for name in add_if_not if not ADD_IF_NOT.search(name)]
    plain_adds = set(re.findall(r'^add "([^"]+)"', manifest, re.MULTILINE))
    missing_adds = sorted(set(mar_listing) - plain_adds - set(add_if_not))
    check(
        phase,
        "manifest: every file is added, add-if-not only for the two frameworks",
        instructions[0] == 'type "complete"' and not unexpected and not missing_adds and len(add_if_not) > 0,
        f"{len(plain_adds)} add, {len(add_if_not)} add-if-not, first line {instructions[0]!r}"
        + (f", unexpected add-if-not: {unexpected}" if unexpected else "")
        + (f", not added: {missing_adds}" if missing_adds else ""),
    )
    removes = [line for line in instructions if line.startswith(("remove ", "rmdir ", "rmrfdir "))]
    check(phase, "manifest: remove instructions", None, "; ".join(removes))

    group("phase A: check the signed DMG has the same app")
    if dmg_path.exists():
        dmg_app = extract_app(dmg_path, work / "rehearsal-dmg" / "Glide.app", work)
        diff = compare(tree_listing(dmg_app), mar_listing)
        check(phase, "app inside the final DMG == MAR contents", not any(diff.values()), describe(diff, "DMG", "MAR"))
    else:
        check(phase, "final DMG was created", False, str(dmg_path))

    main_sig = run(["codesign", "--display", "--verbose=4", signed_app], check=False, show=0).stdout
    check(
        phase,
        "the app the MAR was created from is signed (throwaway certificate)",
        "flags=0x10000(runtime)" in main_sig and "Signature=adhoc" not in main_sig and f"Identifier={BUNDLE_ID}" in main_sig,
        "; ".join(line for line in main_sig.splitlines() if line.startswith(("Identifier=", "Authority=", "CodeDirectory", "Signature=")))[:300],
    )

    group("phase A: check the update manifests")
    digest = hashlib.sha512(mar_path.read_bytes()).hexdigest()
    size = mar_path.stat().st_size
    manifests = sorted(updates.rglob("update.xml"))
    expected_targets = 1 if args.arch == "aarch64" else 4
    check(phase, "number of update.xml files", len(manifests) == expected_targets, f"{len(manifests)} (want {expected_targets})")
    mask = lambda text: re.sub(r' size="[0-9]+"', ' size="X"', re.sub(r'hashValue="[0-9a-f]+"', 'hashValue="X"', text))
    bad = []
    for path in manifests:
        text = path.read_text()
        before = (original_updates / path.relative_to(updates)).read_text()
        url = re.search(r'URL="([^"]+)"', text)
        problems = []
        if f'hashValue="{digest}"' not in text:
            problems.append("hashValue is not the sha512 of the MAR")
        if f' size="{size}"' not in text:
            problems.append("size is not the size of the MAR")
        if 'hashFunction="sha512"' not in text:
            problems.append("hashFunction")
        if mask(text) != mask(before):
            problems.append("something other than hashValue/size changed")
        if text == before:
            problems.append("unchanged")
        if not url or url.group(1) != f"{RELEASES}/{version}/macos-{args.arch}.mar":
            problems.append(f"URL {url.group(1) if url else None}")
        if f'appVersion="{version}"' not in text:
            problems.append("appVersion")
        if problems:
            bad.append(f"{path.relative_to(updates)}: {', '.join(problems)}")
    check(phase, "update.xml hash & size match the signed MAR, nothing else changed", not bad, "; ".join(bad) or f"sha512 {digest[:16]}…, {size} bytes")
    log(manifests[0].read_text() if manifests else "")
    leftovers = [str(p.relative_to(updates)) for p in updates.rglob("*") if p.is_file() and p.name != "update.xml"]
    check(phase, "no stray files in the manifests artifact", not leftovers, ", ".join(leftovers))
    stray = [p.name for p in signed_app.parent.iterdir() if p.name.endswith(".work")]
    check(phase, "MAR work directory cleaned up", not stray, ", ".join(stray))
    secrets = [name for name in mar_listing if name.endswith((".p12", ".passwd"))]
    check(phase, "no credential files in the MAR", not secrets, ", ".join(secrets))

    result["ok"] = True
    return result


# --- phase B: updates with real Developer ID signatures -----------------------------


def phase_b(args: argparse.Namespace, work: Path, logs: Path, info: dict) -> None:
    phase = "B real signatures"
    group("phase B: download published releases")
    apps = {}
    mars = {}
    for version in (args.old, args.mid, args.prev):
        download(f"{RELEASES}/{version}/glide.macos-{args.arch}.dmg", work / f"published/{version}.dmg")
        apps[version] = extract_app(work / f"published/{version}.dmg", work / f"published/{version}/Glide.app", work)
    for version in (args.mid, args.prev):
        mars[version] = work / f"published/{version}.mar"
        download(f"{RELEASES}/{version}/macos-{args.arch}.mar", mars[version])

    reference = apps[args.prev]
    reference_listing = tree_listing(reference)
    requirement = designated_requirement(reference)
    check(phase, f"{args.prev} DMG is Developer ID signed", TEAM_ID in requirement, requirement[:160])

    group("phase B: MAR from the signed app, made with the build's mar tool")
    signed_mar = work / "published" / f"{args.prev}.signed.mar"
    # upload-artifact drops the executable bit (macos-sign.sh restores it itself in phase A)
    args.mar_tool.chmod(0o755)
    build_mar(args.mar_tool, reference, args.prev, signed_mar)
    parsed = read_mar(signed_mar)
    parsed["files"].pop("updatev3.manifest")
    diff = compare({name: sha256(data) for name, (data, _) in parsed["files"].items()}, reference_listing)
    check(phase, f"MAR built from the signed {args.prev} app has exactly its files", not any(diff.values()), describe(diff, "MAR", "app"))

    if not info["can_run_target"]:
        check(phase, "update scenarios", None, f"skipped, this runner cannot run {args.arch} binaries")
        return

    def step(scenario: str, label: str, expect_signed: bool, launch: bool, grant: str | None) -> dict:
        """Inspect /Applications/Glide.app as it is now."""
        name = f"{scenario} / {label}"
        record = inspect(APP)
        log(f"{name}: {record}")
        diff = compare(tree_listing(APP), reference_listing)
        record["diff"] = describe(diff, "install", f"{args.prev} DMG")
        if expect_signed:
            check(phase, f"{name}: Developer ID signed", record["team"] == TEAM_ID and "runtime" in record["flags"], f"{record['identifier']} / {record['flags']} / {record['team']}")
            only_frameworks = not diff["only_a"] and not diff["only_b"] and all(ADD_IF_NOT.search(p) for p in diff["differ"])
            check(phase, f"{name}: same files as the {args.prev} DMG, apart from the add-if-not frameworks", only_frameworks, record["diff"])
            check(phase, f"{name}: codesign --verify --deep", record["verify_deep_ok"], record["verify_deep"])
            ok, detail = strict_without_xattrs(APP, work)
            check(phase, f"{name}: codesign --verify --deep --strict (xattrs cleared)", ok, detail)
            check(phase, f"{name}: codesign --verify --deep --strict (as installed)", None, record["verify_strict"])
            check(phase, f"{name}: Gatekeeper assessment (spctl)", None, record["spctl"])
        else:
            check(phase, f"{name}: signature state", None, f"{record['identifier']} / {record['flags']} / {record['team']}; verify: {record['verify_deep']}; {record['diff']}")
        if launch:
            if grant == "developer-id":
                tcc_grant(requirement, work)
            elif grant == "none":
                tcc_revoke()
            try:
                result = query_glide(re.sub(r"[^a-z0-9]+", "-", name.lower()), work, logs)
            except Exception as e:
                check(phase, f"{name}: starts", False, str(e)[:300])
                return record
            check(phase, f"{name}: starts", result.get("version") == args.prev, f"version {result.get('version')}, responsible {result.get('responsible')}")
            state = screen_state(result)
            detail = f"{state}, CGPreflight {result.get('cg_preflight')}"
            authorized = state == "authorized" and result.get("cg_preflight") is True
            denied = state == "denied" and result.get("cg_preflight") is False
            if grant == "none":
                check(phase, f"{name}: control, without a grant screen recording is denied", denied, detail)
            elif grant == "developer-id" and expect_signed:
                check(phase, f"{name}: screen recording grant made for the Developer ID app is honoured", authorized, detail)
            elif grant == "developer-id":
                # the bug: System Settings shows the permission as on, macOS refuses it
                check(phase, f"{name}: screen recording grant made for the Developer ID app is refused (the bug)", denied, detail)
        return record

    def update(scenario: str, mar: Path, label: str) -> bool:
        status = apply_mar(mar, re.sub(r"[^a-z0-9]+", "-", f"{scenario}-{label}".lower()), work, logs)
        return bool(check(phase, f"{scenario} / {label}: updater succeeded", status == "succeeded", status))

    group(f"phase B: control, fresh {args.prev} DMG install")
    install_app(reference)
    step("control", f"{args.prev} DMG", True, True, "none")
    step("control", f"{args.prev} DMG, granted", True, True, "developer-id")

    scenario = f"{args.old} DMG -> signed MAR"
    group(f"phase B: {scenario}")
    install_app(apps[args.old])
    if update(scenario, signed_mar, "signed MAR"):
        step(scenario, "after signed MAR", True, True, "developer-id")

    scenario = f"{args.mid} DMG -> published {args.prev} MAR -> signed MAR"
    group(f"phase B: {scenario}")
    install_app(apps[args.mid])
    if update(scenario, mars[args.prev], "published MAR"):
        step(scenario, "after published MAR (today)", False, True, "developer-id")
        if update(scenario, signed_mar, "signed MAR"):
            step(scenario, "after signed MAR", True, True, "developer-id")

    scenario = f"{args.old} DMG -> published {args.mid} MAR -> published {args.prev} MAR -> signed MAR"
    group(f"phase B: {scenario}")
    install_app(apps[args.old])
    if update(scenario, mars[args.mid], f"published {args.mid} MAR") and update(scenario, mars[args.prev], f"published {args.prev} MAR"):
        step(scenario, "after published MARs (today)", False, False, None)
        if update(scenario, signed_mar, "signed MAR"):
            step(scenario, "after signed MAR", True, True, "developer-id")
    tcc_revoke()


# --- phase C: this build ------------------------------------------------------------


def phase_c(args: argparse.Namespace, work: Path, logs: Path, info: dict, rehearsal: dict | None) -> None:
    phase = "C this build"
    config = firefox_json()
    version = config["brands"]["glide"]["release"]["display_version"]
    if not info["can_run_target"]:
        check(phase, "build canary", None, f"skipped, this runner cannot run {args.arch} binaries")
        return

    group("phase C: the unsigned build starts")
    build_app = extract_app(args.build_dmg, work / "build-dmg" / "Glide.app", work)
    install_app(build_app)
    try:
        result = query_glide("build-app", work, logs)
        check(phase, "the build's app starts", result.get("version") == version, f"version {result.get('version')}, platform {result.get('platform_version')}, build {result.get('build_id')}")
    except Exception as e:
        check(phase, "the build's app starts", False, str(e)[:300])

    prev_app = work / f"published/{args.prev}/Glide.app"
    if not prev_app.exists():
        check(phase, "update canaries", None, "skipped, phase B did not download the previous release")
        return

    if args.unsigned_mar and args.unsigned_mar.exists():
        group(f"phase C: {args.prev} updater applies the build job's (unsigned) MAR")
        install_app(prev_app)
        status = apply_mar(args.unsigned_mar, "build-unsigned-mar", work, logs)
        if check(phase, f"{args.prev} -> build's unsigned MAR: updater succeeded", status == "succeeded", status):
            diff = compare(tree_listing(APP), tree_listing(build_app))
            leftover = [p for p in diff["only_a"] if not ADD_IF_NOT.search(p)]
            check(phase, f"{args.prev} -> build's unsigned MAR: files left over from the signed install", None, ", ".join(leftover) or "none")
            try:
                result = query_glide("build-unsigned-mar", work, logs)
                check(phase, f"{args.prev} -> build's unsigned MAR: starts", result.get("version") == version, f"version {result.get('version')}, platform {result.get('platform_version')}")
            except Exception as e:
                check(phase, f"{args.prev} -> build's unsigned MAR: starts", False, str(e)[:300])

    if rehearsal and rehearsal["mar"].exists():
        group(f"phase C: {args.prev} updater applies the rehearsal's MAR")
        install_app(prev_app)
        status = apply_mar(rehearsal["mar"], "rehearsal-mar", work, logs)
        if check(phase, f"{args.prev} -> rehearsal MAR: updater succeeded", status == "succeeded", status):
            diff = compare(tree_listing(APP), tree_listing(rehearsal["signed_app"]))
            only_frameworks = not diff["only_a"] and not diff["only_b"] and all(ADD_IF_NOT.search(p) for p in diff["differ"])
            check(phase, f"{args.prev} -> rehearsal MAR: install == the app that was signed, apart from the add-if-not frameworks", only_frameworks, describe(diff, "install", "signed app"))
            record = inspect(APP)
            check(phase, f"{args.prev} -> rehearsal MAR: signature (throwaway certificate, so macOS will not trust it)", None, f"{record['identifier']} / {record['flags']} / {record['authority']}; {record['verify_deep']}")
            try:
                result = query_glide("rehearsal-mar", work, logs)
                check(phase, f"{args.prev} -> rehearsal MAR: starts", None, f"version {result.get('version')}")
            except Exception as e:
                check(phase, f"{args.prev} -> rehearsal MAR: starts", None, "no: " + str(e).splitlines()[0][:200])


# --- report -------------------------------------------------------------------------


def write_summary(args: argparse.Namespace, info: dict, fatal: list[str]) -> bool:
    failed = [c for c in CHECKS if c["ok"] is False]
    lines = [
        f"## Signed update MAR rehearsal ({args.arch})",
        "",
        f"macOS {info.get('macos')} ({info.get('arch')}), {info.get('sip')}, Gatekeeper: {info.get('gatekeeper')},"
        f" TCC.db writable: {info.get('tcc_writable')}, Rosetta: {info.get('rosetta')}, bash {info.get('bash')}, {info.get('xz')}",
        "",
        f"**{len([c for c in CHECKS if c['ok']])} passed, {len(failed)} failed,"
        f" {len([c for c in CHECKS if c['ok'] is None])} informational**",
        "",
    ]
    for message in fatal:
        lines += [f"**Phase aborted:** `{message}`", ""]
    lines += ["| | Phase | Check | Detail |", "|---|---|---|---|"]
    for c in CHECKS:
        marker = {True: "✅", False: "❌", None: "ℹ️"}[c["ok"]]
        cells = [marker, c["phase"], c["name"], c["detail"]]
        lines.append("| " + " | ".join(str(cell).replace("|", "\\|").replace("\n", " ") for cell in cells) + " |")
    summary = "\n".join(lines) + "\n"
    log(summary)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a") as f:
            f.write(summary)
    return not failed and not fatal


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--arch", required=True, choices=["aarch64", "x86_64"])
    parser.add_argument("--work", required=True, type=Path, help="scratch directory")
    parser.add_argument("--build-dmg", required=True, type=Path, help="unsigned DMG from the build job")
    parser.add_argument("--mar-tool", required=True, type=Path, help="host mar tool from the build job")
    parser.add_argument("--updates", required=True, type=Path, help="update manifests from the build job")
    parser.add_argument("--unsigned-mar", type=Path, help="MAR from the build job")
    parser.add_argument("--prev", default="0.1.65a", help="latest published release")
    parser.add_argument("--mid", default="0.1.64a", help="the release before it")
    parser.add_argument("--old", default="0.1.34a", help="an old release")
    parser.add_argument("--skip", default="", help="comma separated phases to skip: a,b,c")
    args = parser.parse_args()
    args.build_dmg = args.build_dmg.resolve()
    args.mar_tool = args.mar_tool.resolve()
    args.updates = args.updates.resolve()
    if args.unsigned_mar:
        args.unsigned_mar = args.unsigned_mar.resolve()
    skip = {part.strip().lower() for part in args.skip.split(",") if part.strip()}

    work = args.work.resolve()
    logs = work / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    print("::group::start", flush=True)

    info: dict = {}
    fatal: list[str] = []
    rehearsal = None
    try:
        info = environment(args)
        # the provisioning profile every release ships inside the app, for a realistic rehearsal
        published_profile = None
        try:
            download(f"{RELEASES}/{args.prev}/glide.macos-{args.arch}.dmg", work / f"published/{args.prev}.dmg")
            prev_app = extract_app(work / f"published/{args.prev}.dmg", work / f"published/{args.prev}/Glide.app", work)
            published_profile = prev_app / "Contents/embedded.provisionprofile"
        except Exception as e:
            log(f"could not fetch the previous release: {e}")

        for name, fn in (
            ("a", lambda: phase_a(args, work, logs, published_profile)),
            ("b", lambda: phase_b(args, work, logs, info)),
            ("c", lambda: phase_c(args, work, logs, info, rehearsal)),
        ):
            if name in skip:
                continue
            try:
                value = fn()
                if name == "a":
                    rehearsal = value
            except Exception as e:
                traceback.print_exc()
                fatal.append(f"phase {name.upper()}: {type(e).__name__}: {str(e)[:300]}")
    except Exception as e:
        traceback.print_exc()
        fatal.append(f"{type(e).__name__}: {str(e)[:300]}")
    finally:
        try:
            quit_glide()
        except Exception:
            pass
        group("summary")
        print("::endgroup::", flush=True)

    (logs / "results.json").write_text(json.dumps({"environment": info, "checks": CHECKS, "fatal": fatal}, indent=2, default=str))
    return 0 if write_summary(args, info, fatal) else 1


if __name__ == "__main__":
    sys.exit(main())
