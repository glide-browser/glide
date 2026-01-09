import fs from "fs/promises";
import Path from "path";
import * as zx from "zx";
import { ROOT_DIR } from "./canonical-paths.mts";
import { exists } from "./util.mts";

export * from "zx";

const DEFAULT_STDIO = "inherit" as const;
zx.defaults.stdio = DEFAULT_STDIO;

let verbose = true;

export const $ = zx.$({
  cwd: ROOT_DIR,
  log: (entry) => {
    switch (entry.kind) {
      case "cd": {
        console.log("[cd]", entry.dir);
        break;
      }
      case "cmd": {
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
  no_stdout(cb: () => Promise<void>): Promise<void>;
  touch(path: string): Promise<boolean>;
  /** equivalent to `rm -rf $path` */
  rmdir(path: string): Promise<void>;
  /** returns a shell tagged template that invokes a command from node_modules/.bin */
  bin(cmd: string): zx.Shell;

  glob: typeof zx.glob;
};

$.glob = zx.glob;

$.bin = (cmd: string) => $({ prefix: Path.join("node_modules", ".bin", cmd) });

$.set_root_dir = () => {
  process.chdir(ROOT_DIR);
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
