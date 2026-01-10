import fs from "fs/promises";
import Path from "path";
import * as zx from "zx";
import { ROOT_DIR } from "./canonical-paths.mts";
import { exists } from "./util.mts";

export * from "zx";

const DEFAULT_STDIO = "inherit" as const;
zx.defaults.stdio = DEFAULT_STDIO;

let verbose = true;
let log_commands = true;

export const $ = zx.$({
  cwd: ROOT_DIR,
  quote: process.platform === "win32" ? zx.quotePowerShell : zx.quote,
  log: (entry) => {
    switch (entry.kind) {
      case "cd": {
        console.log("[cd]", entry.dir);
        break;
      }
      case "cmd": {
        if (!log_commands) return;
        console.log("+", entry.cmd);
        break;
      }
      case "stdout": {
        if (verbose) {
          process.stdout.write(entry.data.toString());
        }
        break;
      }
      case "stderr": {
        if (verbose) {
          process.stderr.write(entry.data.toString());
        }
        break;
      }
    }
  },
}) as zx.Shell & {
  set_root_dir(): void;
  disable_command_logging(): void;
  no_stdout(cb: () => Promise<void>): Promise<void>;
  touch(path: string): Promise<boolean>;
  /** equivalent to `rm -rf $path` */
  rmdir(path: string): Promise<void>;
  /** returns a shell tagged template that invokes a command from node_modules/.bin */
  bin(cmd: string): zx.Shell;
  /** uses process.exit() for zx errors to avoid noisy JS stack traces */
  handle_error(err: unknown): never;

  glob: typeof zx.glob;
  which: typeof zx.which;
};

$.glob = zx.glob;
$.which = zx.which;

$.bin = (cmd: string) => {
  return $({
    // for some unknown reason, the \ syntax does *not* work in our windows
    // CI builds, but the / does. the inverse is true for my local windows
    // builds. I have no idea why.
    prefix: process.platform === "win32" && process.env["CI"] !== "true"
      ? `node_modules\\.bin\\${cmd}`
      : `node_modules/.bin/${cmd}`,
  });
};

$.set_root_dir = () => {
  process.chdir(ROOT_DIR);
};

$.disable_command_logging = () => {
  log_commands = false;
};

$.no_stdout = async (cb) => {
  zx.defaults.stdio = "pipe";
  verbose = false;

  await cb();

  zx.defaults.stdio = DEFAULT_STDIO;
  verbose = true;
};

$.touch = async function(path) {
  if (await exists(path)) {
    return false;
  }

  await fs.writeFile(path, "");
  return true;
};

$.rmdir = async function(path) {
  await fs.rm(path, { recursive: true, force: true });
};

$.handle_error = function(error) {
  if (is_zx_error(error)) {
    // just propagate the exit code as our logger should've forwarded the
    // process output already.
    process.exit(error.exitCode || 1);
  }

  throw error;
};

function is_zx_error(error: unknown): error is zx.ProcessOutput {
  return error != null && typeof error === "object" && "exitCode" in error;
}
