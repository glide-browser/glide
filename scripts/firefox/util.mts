import * as execa from "execa";
import { ENGINE_DIR } from "../canonical-paths.mts";

export const GLOB_ALL_FILES = ["**/*", "**/.*", ".*"];

export async function run(file: string, args: string[], options?: execa.Options): Promise<execa.Result> {
  console.log("+", file, ...args);
  return execa.execa(file, args, {
    stdout: ["inherit", "pipe"],
    stderr: ["inherit", "pipe"],
    ...options,
  });
}

export async function engine_run(
  file: string,
  args: string[],
  options?: Omit<execa.Options, "cwd">,
): Promise<execa.Result> {
  return run(file, args, { ...options, cwd: ENGINE_DIR });
}
