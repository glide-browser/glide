#!/usr/bin/env python3
"""TEMPORARY test for `fix/macos-update-admin-prompt`, do not merge.

What does Glide do with an update when it can't write to its own app bundle?

It takes a published release, points it at a local update server through an enterprise policy
and starts it in three shapes:

  baseline-root   as published, the app owned by root
  fixed-root      with the fix, the app owned by root
  fixed-user      with the fix, the app owned by the user (must behave as before)

"With the fix" means the hunk of `src/toolkit/mozapps/update/UpdateService-sys-mjs.patch`
applied to `modules/UpdateService.sys.mjs` inside the release's omni.ja, so no build is needed.
That breaks the bundle's seal, which does not stop it from starting.

Only uses the python standard library and tools that ship with macOS.
"""

from __future__ import annotations

import hashlib
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import zipfile
from pathlib import Path

RELEASES = "https://github.com/glide-browser/glide/releases/download"
VERSION = os.environ.get("TEST_VERSION", "0.1.65a")
ARCH = "aarch64" if os.uname().machine == "arm64" else "x86_64"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PATCH = REPO_ROOT / "src/toolkit/mozapps/update/UpdateService-sys-mjs.patch"
MODULE = "modules/UpdateService.sys.mjs"
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "update-unwritable-test"
MARIONETTE_PORT = 2828
MAR = os.urandom(4096)

PREFS = {
    "marionette.port": MARIONETTE_PORT,
    "app.update.log": True,
    # Marionette's recommended prefs turn update checks off, unless the pref has a user value
    "app.update.disabledForTesting": False,
    "app.update.staging.enabled": False,
    "browser.shell.checkDefaultBrowser": False,
    "browser.startup.homepage_override.mstone": "ignore",
    "datareporting.policy.dataSubmissionEnabled": False,
    "toolkit.telemetry.reportingpolicy.firstRun": False,
}

# runs in Glide's parent process (Marionette chrome context)
QUERY_SCRIPT = r"""
const done = arguments[arguments.length - 1];
(async () => {
  const { setTimeout } = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const aus = Cc["@mozilla.org/updates/update-service;1"].getService(Ci.nsIApplicationUpdateService);
  const um = Cc["@mozilla.org/updates/update-manager;1"].getService(Ci.nsIUpdateManager);
  await aus.init();

  const out = {
    version: Services.appinfo.version,
    platformVersion: Services.appinfo.platformVersion,
    autoDownload: Services.prefs.getBoolPref("app.update.auto", true),
    elevationRequired: aus.elevationRequired,
    canCheckForUpdates: aus.canCheckForUpdates,
    canUsuallyApplyUpdates: aus.canUsuallyApplyUpdates,
    canApplyUpdates: aus.canApplyUpdates,
  };

  const seen = [];
  let offered = null;
  const observer = {
    observe(subject, topic, data) {
      seen.push(`${topic}:${data}`);
      if (topic == "update-available" && subject) {
        offered = subject.QueryInterface(Ci.nsIUpdate);
      }
    },
  };
  const topics = ["update-available", "update-downloading", "update-downloaded", "update-staged", "update-error"];
  topics.forEach(topic => Services.obs.addObserver(observer, topic));
  const activeNotification = () => {
    const { AppMenuNotifications } = ChromeUtils.importESModule("resource://gre/modules/AppMenuNotifications.sys.mjs");
    return AppMenuNotifications.activeNotification?.id ?? null;
  };

  try {
    out.checkStarted = await aus.checkForBackgroundUpdates();
    for (let i = 0; i < 120 && !seen.some(entry => entry.startsWith("update-available:")); i++) {
      await sleep(500);
    }
    await sleep(1500);
    out.afterCheck = [...seen];
    out.notification = activeNotification();

    if (offered) {
      out.offeredVersion = offered.appVersion;
      out.downloadStarted = await aus.downloadUpdate(offered);
      for (let i = 0; i < 120; i++) {
        const ready = await um.getReadyUpdate();
        if (ready) {
          out.readyState = ready.state;
          break;
        }
        await sleep(500);
      }
      await sleep(1500);
      out.afterDownload = [...seen];
      out.notificationAfterDownload = activeNotification();
    }
  } finally {
    topics.forEach(topic => Services.obs.removeObserver(observer, topic));
  }

  out.log = Services.console
    .getMessageArray()
    .map(message => message.message)
    .filter(message =>
      /AUS:SVC (getCanApplyUpdates|getElevationRequired|UpdateService[.:](_selectAndInstallUpdate|canCheckForUpdates|canUsuallyCheckForUpdates|checkForBackgroundUpdates))/.test(
        message
      )
    )
    .map(message => message.replace(/^\*\*\* /, "").slice(0, 220))
    .slice(0, 60);
  return out;
})().then(done, error => done({ error: String(error), stack: error?.stack }));
"""

# what each shape has to do
EXPECTED = {
    "baseline-root": {
        "elevationRequired": True,
        "canApplyUpdates": True,
        "afterCheck": ["update-available:show-prompt"],
        "notification": "update-available",
        "readyState": "pending-elevate",
    },
    "fixed-root": {
        "elevationRequired": True,
        "canApplyUpdates": False,
        "afterCheck": ["update-available:cant-apply"],
        "notification": "update-manual",
        "readyState": None,
    },
    "fixed-user": {
        "elevationRequired": False,
        "canApplyUpdates": True,
        "afterCheck": ["update-available:show-prompt"],
        "notification": "update-available",
        "readyState": "pending",
    },
}


def log(message: str) -> None:
    print(message, flush=True)


def sh(cmd, check=True, timeout=900, quiet=False) -> subprocess.CompletedProcess:
    proc = subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
    if not quiet:
        log(f"$ {' '.join(str(c) for c in cmd)}\n{proc.stdout.rstrip()}")
    if check and proc.returncode != 0:
        raise SystemExit(f"command failed ({proc.returncode}): {cmd}\n{proc.stdout}")
    return proc


# --- the fix, applied to a release's omni.ja ------------------------------------------


def apply_hunks(text: str, patch: str) -> str:
    """Apply a unified diff by its content (not its line numbers, which differ per Firefox version)."""
    hunks: list[list[str]] = []
    for line in patch.splitlines():
        if line.startswith("@@"):
            hunks.append([])
        elif hunks and line[:1] in (" ", "+", "-"):
            hunks[-1].append(line)
    if not hunks:
        raise SystemExit("no hunks in the patch")
    for hunk in hunks:
        before = "\n".join(line[1:] for line in hunk if line[0] in " -") + "\n"
        after = "\n".join(line[1:] for line in hunk if line[0] in " +") + "\n"
        if text.count(before) != 1:
            raise SystemExit(f"hunk context found {text.count(before)} times, expected once:\n{before}")
        text = text.replace(before, after)
    return text


def patched_omni(source: Path, dest: Path) -> None:
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(dest, "w", zipfile.ZIP_STORED) as out:
        entries = original.infolist()
        for entry in entries:
            data = original.read(entry.filename)
            if entry.filename == MODULE:
                data = apply_hunks(data.decode(), PATCH.read_text()).encode()
            copy = zipfile.ZipInfo(entry.filename, entry.date_time)
            copy.external_attr = entry.external_attr
            copy.compress_type = zipfile.ZIP_STORED
            out.writestr(copy, data)
    with zipfile.ZipFile(dest) as check:
        assert len(check.infolist()) == len(entries), "entry count changed"
        assert "glide-injection-start" in check.read(MODULE).decode(), "the fix is not in the new omni.ja"


# --- update server --------------------------------------------------------------------


class UpdateServer:
    def __init__(self) -> None:
        self.hits: list[str] = []
        hits = self.hits
        server = self

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def do_GET(self) -> None:
                hits.append(f"{self.path.split('?')[0]} {self.headers.get('Range', '')}".strip())
                if self.path.startswith("/update.xml"):
                    self.reply(200, server.update_xml().encode(), "text/xml")
                elif self.path.startswith("/update.mar"):
                    start, end = 0, len(MAR) - 1
                    requested = self.headers.get("Range", "")
                    if requested.startswith("bytes="):
                        first, _, last = requested[6:].partition("-")
                        start = int(first or 0)
                        end = min(int(last), end) if last else end
                        extra = {"Content-Range": f"bytes {start}-{end}/{len(MAR)}"}
                        self.reply(206, MAR[start : end + 1], "application/octet-stream", extra)
                    else:
                        self.reply(200, MAR, "application/octet-stream")
                else:
                    self.reply(200, b"<!doctype html><title>details</title>", "text/html")

            def reply(self, status: int, body: bytes, content_type: str, extra: dict | None = None) -> None:
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Accept-Ranges", "bytes")
                for name, value in (extra or {}).items():
                    self.send_header(name, value)
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args) -> None:
                pass

        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def update_xml(self) -> str:
        digest = hashlib.sha512(MAR).hexdigest()
        return (
            '<?xml version="1.0"?>\n<updates>\n'
            '  <update type="minor" displayVersion="999.0" appVersion="999.0" platformVersion="999.0"'
            f' buildID="29991231235959" detailsURL="{self.url}/details">\n'
            f'    <patch type="complete" URL="{self.url}/update.mar" hashFunction="sha512" hashValue="{digest}" size="{len(MAR)}"/>\n'
            "  </update>\n</updates>\n"
        )

    def close(self) -> None:
        self.httpd.shutdown()


# --- Marionette -----------------------------------------------------------------------


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


# --- one shape ------------------------------------------------------------------------


def pids(app: Path) -> list[int]:
    proc = subprocess.run(["pgrep", "-f", f"^{app}/"], stdout=subprocess.PIPE, text=True)
    return [int(pid) for pid in proc.stdout.split()]


def quit_glide(app: Path, client: Marionette | None = None) -> None:
    if client is not None:
        try:
            client.sock.settimeout(20)
            client.send("Marionette:Quit", {"flags": ["eForceQuit"]})
        except Exception as e:  # the connection usually drops before the reply arrives
            log(f"  Marionette:Quit: {e}")
        client.close()
    deadline = time.time() + 30
    while time.time() < deadline and pids(app):
        time.sleep(0.5)
    if pids(app):
        log("Glide did not exit, killing it")
        sh(["pkill", "-9", "-f", f"^{app}/"], check=False, quiet=True)
        time.sleep(2)


def run_case(name: str, pristine: Path, omni: Path | None, owner: str) -> dict:
    log(f"\n::group::{name}")
    case = WORK / name
    sh(["sudo", "rm", "-rf", case], quiet=True)
    case.mkdir(parents=True)
    app = case / "Glide.app"
    sh(["ditto", "--norsrc", "--noextattr", "--noqtn", pristine, app], quiet=True)
    if omni is not None:
        shutil.copyfile(omni, app / "Contents/Resources/omni.ja")

    server = UpdateServer()
    distribution = app / "Contents/Resources/distribution"
    distribution.mkdir(exist_ok=True)
    (distribution / "policies.json").write_text(json.dumps({"policies": {"AppUpdateURL": f"{server.url}/update.xml"}}))

    if owner == "root":
        sh(["sudo", "chown", "-R", "root:wheel", app], quiet=True)
    sh(["ls", "-ld", app, app / "Contents/MacOS/glide"])
    writable = os.access(app, os.W_OK) and os.access(app / "Contents/MacOS/glide", os.W_OK)
    log(f"app bundle writable by {os.environ.get('USER')}: {writable}")

    profile = case / "profile"
    profile.mkdir()
    (profile / "user.js").write_text("".join(f"user_pref({json.dumps(k)}, {json.dumps(v)});\n" for k, v in PREFS.items()))
    glide_log = case / "glide.log"
    glide_log.write_text("")
    sh(
        ["open", "-n", "-F", "-a", app, "--stdout", glide_log, "--stderr", glide_log]
        + ["--env", "MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1"]
        + ["--args", "-profile", profile, "--marionette", "--remote-allow-system-access"],
        check=False,
    )

    result: dict = {"writable": writable}
    client = None
    deadline = time.time() + 180
    while time.time() < deadline and client is None:
        try:
            client = Marionette(MARIONETTE_PORT, timeout=300)
        except (OSError, ValueError):
            time.sleep(1)
    try:
        if client is None:
            raise RuntimeError("Marionette never came up")
        client.send("WebDriver:NewSession", {})
        client.send("Marionette:SetContext", {"value": "chrome"})
        client.send("WebDriver:SetTimeouts", {"script": 240000})
        result.update(client.send("WebDriver:ExecuteAsyncScript", {"script": QUERY_SCRIPT, "args": []})["value"])
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"[:500]
    finally:
        quit_glide(app, client)
        server.close()

    result["server"] = server.hits
    log(json.dumps(result, indent=2))
    if result.get("error"):
        sh(["tail", "-40", glide_log], check=False)
    log("::endgroup::")
    return result


def verdict(name: str, result: dict) -> list[str]:
    problems = []
    if result.get("error"):
        return [f"error: {result['error']}"]
    for key, want in EXPECTED[name].items():
        got = result.get(key)
        if key == "afterCheck":
            # the browser's own timer can run a second check, so only the kind matters
            got = sorted(set(got or []))
        if got != want:
            problems.append(f"{key}: expected {want!r}, got {got!r}")
    return problems


def main() -> int:
    sh(["sudo", "rm", "-rf", WORK], quiet=True)
    WORK.mkdir(parents=True)
    sh(["sw_vers"])
    log(f"patch under test: {PATCH} (blob {sh(['git', '-C', REPO_ROOT, 'hash-object', PATCH], quiet=True).stdout.strip()})")

    dmg = WORK / "glide.dmg"
    sh(["curl", "--fail", "--silent", "--show-error", "--location", "--retry", "3", "--output", dmg, f"{RELEASES}/{VERSION}/glide.macos-{ARCH}.dmg"])
    mount = WORK / "mount"
    mount.mkdir()
    sh(["hdiutil", "attach", "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mount, dmg], quiet=True)
    pristine = WORK / "pristine/Glide.app"
    try:
        sh(["ditto", "--norsrc", "--noextattr", "--noqtn", mount / "Glide.app", pristine], quiet=True)
    finally:
        sh(["hdiutil", "detach", mount, "-force"], check=False, quiet=True)

    fixed_omni = WORK / "omni-fixed.ja"
    patched_omni(pristine / "Contents/Resources/omni.ja", fixed_omni)
    log(f"omni.ja with the fix: {fixed_omni.stat().st_size} bytes (published: {(pristine / 'Contents/Resources/omni.ja').stat().st_size})")

    results = {
        "baseline-root": run_case("baseline-root", pristine, None, "root"),
        "fixed-root": run_case("fixed-root", pristine, fixed_omni, "root"),
        "fixed-user": run_case("fixed-user", pristine, fixed_omni, "user"),
    }

    lines = [f"### Update with an app bundle Glide can't write to ({VERSION} {ARCH})", ""]
    lines += ["| shape | can apply updates | after the check | prompt shown | after download | verdict |", "|---|---|---|---|---|---|"]
    failed = False
    for name, result in results.items():
        problems = verdict(name, result)
        failed = failed or bool(problems)
        lines.append(
            f"| {name} | {result.get('canApplyUpdates')} | {', '.join(sorted(set(result.get('afterCheck') or []))) or '-'} "
            f"| {result.get('notification')} | {result.get('readyState') or '-'} | {'ok' if not problems else 'FAIL: ' + '; '.join(problems)} |"
        )
    summary = "\n".join(lines) + "\n"
    log("\n" + summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(summary)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
