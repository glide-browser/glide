#!/usr/bin/env python3
"""TEMPORARY probe, do not merge: which Glide processes load ChannelPrefs.framework?

Update MARs never replace `Contents/Frameworks/ChannelPrefs.framework`, so after an update it
can be signed differently from the rest of the app. Only processes that load it can care.

This takes the app out of a published, Developer ID signed DMG and starts it three times:

  pristine          as shipped
  adhoc-framework   the framework re-signed ad-hoc (signed by "somebody else")
  no-framework      the framework deleted

Each time it loads a page whose script reports back, then lists which processes have XUL and
which have ChannelPrefs mapped.
"""

import http.server
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

RELEASES = "https://github.com/glide-browser/glide/releases/download"
VERSION = os.environ.get("PROBE_VERSION", "0.1.65a")
ARCH = "aarch64" if os.uname().machine == "arm64" else "x86_64"
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "framework-load-probe"
FRAMEWORK = "Contents/Frameworks/ChannelPrefs.framework"

PREFS = {
    "app.update.disabledForTesting": "true",
    "app.update.auto": "false",
    "browser.shell.checkDefaultBrowser": "false",
    "browser.startup.homepage_override.mstone": '"ignore"',
    "datareporting.policy.dataSubmissionEnabled": "false",
    "toolkit.telemetry.reportingpolicy.firstRun": "false",
}

PAGE = b"""<!doctype html><title>framework-load-probe</title>
<p>probe</p><script>fetch("/js-ran").catch(() => {});</script>
"""


def sh(cmd, check=True, timeout=600, quiet=False):
    proc = subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
    if not quiet:
        print(f"$ {' '.join(str(c) for c in cmd)}\n{proc.stdout.rstrip()}", flush=True)
    if check and proc.returncode != 0:
        raise SystemExit(f"command failed ({proc.returncode}): {cmd}")
    return proc


class Server:
    def __init__(self):
        self.hits = []
        hits = self.hits

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                hits.append(self.path)
                body = PAGE if self.path == "/" else b"ok"
                self.send_response(200)
                self.send_header("Content-Type", "text/html" if self.path == "/" else "text/plain")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()


def processes(app: Path):
    out = subprocess.run(["ps", "-axww", "-o", "pid=,command="], stdout=subprocess.PIPE, text=True).stdout
    found = []
    for line in out.splitlines():
        pid, _, command = line.strip().partition(" ")
        if not command.startswith(str(app) + "/"):
            continue
        executable = command[len(str(app)) + 1 :].split(" -", 1)[0]
        kind = "parent" if "-contentproc" not in command and executable == "Contents/MacOS/glide" else command.split()[-1]
        found.append((int(pid), executable, kind))
    return found


def mapped(pid: int):
    """File paths of the images a process has mapped, from vmmap (lsof as a fallback)."""
    proc = subprocess.run(["sudo", "-n", "vmmap", "-w", str(pid)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=180)
    paths = {line.split(" /", 1)[1].strip() for line in proc.stdout.splitlines() if line.startswith("__TEXT") and " /" in line}
    source = "vmmap"
    if not paths:
        print(f"   vmmap gave nothing for {pid}: {proc.stdout.strip().splitlines()[-1:] or proc.returncode}")
        lsof = subprocess.run(["sudo", "-n", "lsof", "-p", str(pid)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=180)
        paths = {line.split(" /", 1)[1].strip() for line in lsof.stdout.splitlines() if " txt " in line and " /" in line}
        source = "lsof"
    return {"/" + p for p in paths}, source


def run_case(name: str, pristine: Path, prepare) -> dict:
    print(f"\n::group::case {name}", flush=True)
    case = WORK / name
    shutil.rmtree(case, ignore_errors=True)
    case.mkdir(parents=True)
    app = case / "Glide.app"
    sh(["ditto", pristine, app], quiet=True)
    prepare(app)
    verify = sh(["codesign", "--verify", "--deep", "--strict", app], check=False)
    profile = case / "profile"
    profile.mkdir()
    (profile / "user.js").write_text("".join(f'user_pref("{k}", {v});\n' for k, v in PREFS.items()))

    server = Server()
    log = case / "glide.log"
    log.write_text("")
    sh(["open", "-n", "-F", "-a", app, "--stdout", log, "--stderr", log, "--args", "-profile", profile, f"http://127.0.0.1:{server.port}/"], check=False)

    deadline = time.time() + 150
    while time.time() < deadline and "/js-ran" not in server.hits:
        time.sleep(1)
    time.sleep(5)
    result = {"name": name, "verify": verify.returncode == 0, "page": "/" in server.hits, "js": "/js-ran" in server.hits, "rows": []}
    for pid, executable, kind in processes(app):
        try:
            paths, source = mapped(pid)
        except subprocess.TimeoutExpired:
            paths, source = set(), "timeout"
        xul = any(p.endswith("/Contents/MacOS/XUL") for p in paths)
        prefs = sorted(p for p in paths if "ChannelPrefs" in p)
        result["rows"].append((pid, executable, kind, source, len(paths), xul, bool(prefs)))
        print(f"   pid {pid:<6} {kind:<12} images={len(paths):<4} ({source}) XUL={'yes' if xul else 'no':<3} ChannelPrefs={'yes' if prefs else 'no'}  {executable}")
        for p in prefs:
            print(f"      {p}")
    print(f"   server saw: {server.hits}")
    sh(["pkill", "-9", "-f", f"^{app}/"], check=False, quiet=True)
    time.sleep(3)
    server.close()
    sh(["tail", "-5", log], check=False)
    print("::endgroup::", flush=True)
    return result


def main() -> int:
    shutil.rmtree(WORK, ignore_errors=True)
    WORK.mkdir(parents=True)
    sh(["sw_vers"])
    sh(["csrutil", "status"], check=False)

    dmg = WORK / "glide.dmg"
    sh(["curl", "--fail", "--silent", "--show-error", "--location", "--retry", "3", "--output", dmg, f"{RELEASES}/{VERSION}/glide.macos-{ARCH}.dmg"])
    mount = WORK / "mount"
    mount.mkdir()
    sh(["hdiutil", "attach", "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mount, dmg], quiet=True)
    pristine = WORK / "pristine-source/Glide.app"
    try:
        sh(["ditto", "--noextattr", "--noqtn", mount / "Glide.app", pristine], quiet=True)
    finally:
        sh(["hdiutil", "detach", mount, "-force"], check=False, quiet=True)

    print("\n::group::static: how the framework is linked", flush=True)
    sh(["codesign", "-dv", pristine], check=False)
    sh(["bash", "-c", f"otool -l '{pristine}/Contents/MacOS/XUL' | grep -B2 -A3 -E 'ChannelPrefs|LC_RPATH' | grep -E 'cmd |name |path '"], check=False)
    for helper in ("Contents/MacOS/glide", "Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container"):
        sh(["bash", "-c", f"otool -l '{pristine}/{helper}' | grep -A2 LC_RPATH | grep path; codesign -d --entitlements - '{pristine}/{helper}' 2>/dev/null | grep -c disable-library-validation"], check=False)
    print("::endgroup::", flush=True)

    def adhoc(app: Path) -> None:
        sh(["codesign", "--force", "--sign", "-", app / FRAMEWORK])
        sh(["codesign", "-dv", app / FRAMEWORK], check=False)

    cases = [
        run_case("pristine", pristine, lambda app: None),
        run_case("adhoc-framework", pristine, adhoc),
        run_case("no-framework", pristine, lambda app: shutil.rmtree(app / FRAMEWORK)),
    ]

    lines = [f"### Which processes load ChannelPrefs.framework ({VERSION} {ARCH}, {sh(['csrutil', 'status'], check=False, quiet=True).stdout.strip()})", ""]
    lines += ["| case | bundle verifies | page script ran | parent maps it | helpers with XUL | helpers mapping it |", "|---|---|---|---|---|---|"]
    for c in cases:
        parents = [r for r in c["rows"] if r[2] == "parent"]
        helpers = [r for r in c["rows"] if r[2] != "parent"]
        with_xul = [r for r in helpers if r[5]]
        lines.append(
            f"| {c['name']} | {'yes' if c['verify'] else 'no'} | {'yes' if c['js'] else 'NO'} "
            f"| {'yes' if any(r[6] for r in parents) else 'no'} | {len(with_xul)} of {len(helpers)} "
            f"| {sum(1 for r in helpers if r[6])} |"
        )
    summary = "\n".join(lines) + "\n"
    print("\n" + summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
