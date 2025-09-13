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

export function get_platform(): "macos" | "linux" {
  const env = process.env["GLIDER_PLATFORM"];
  if (env) {
    switch (env) {
      case "macos":
      case "linux":
        return env;
      default:
        throw new Error(`Unexpected GLIDER_PLATFORM value: ${env}; expected 'maocs' | 'linux'`);
    }
  }

  switch (process.platform) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      throw new Error(`Unsupported platform ${process.platform}; Only macos & linux are supported.`);
  }
}
