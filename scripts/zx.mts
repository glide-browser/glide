import * as zx from "zx";
import { ROOT_DIR } from "./canonical-paths.mts";

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
};

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
