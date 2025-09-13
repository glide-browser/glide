import * as execa from "execa";
import { exists } from "fs-extra";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { ENGINE_DIR } from "../canonical-paths.mts";
import "@total-typescript/ts-reset";

export const GLOB_ALL_FILES = ["**/*", "**/.*", ".*"];

export async function run(file: string, args: string[], options?: execa.Options): Promise<execa.Result> {
  if (options?.env) {
    console.log("+=", ...Object.entries(options.env).map(([name, value]) => `${name}=${value}`));
  }

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

export type Platform = "macos" | "linux";

export function get_platform(): Platform {
  const env = process.env["GLIDE_PLATFORM"];
  if (env) {
    switch (env) {
      case "macos":
      case "linux":
        return env;
      default:
        throw new Error(`Unexpected GLIDE_PLATFORM value: ${env}; expected 'macos' | 'linux'`);
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

export function get_compat_mode(): "aarch64" | "x86_64" | null {
  const env = process.env["GLIDE_COMPAT"];
  if (env) {
    switch (env) {
      case "aarch64":
      case "x86_64":
        return env;
      default:
        throw new Error(`Unexpected GLIDE_COMPAT value: ${env}; expected 'aarch64' | 'x86_64'`);
    }
  }

  return null;
}

export async function resolve_obj_dir() {
  const result = await engine_run("./mach", ["environment", "--format=json"]);
  console.log();
  assert(typeof result.stdout === "string");

  const data = JSON.parse(result.stdout);
  assert(typeof data === "object" && data);

  const topobjdir = (data as Record<string, unknown>)["topobjdir"];
  assert(topobjdir && typeof topobjdir === "string");
  return topobjdir;
}

export async function generate_file_hash(
  file: string,
  type: string,
): Promise<string> {
  return createHash(type)
    .update(await fs.readFile(file))
    .digest("hex");
}

function assert(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? `Expected \`${value}\` to be truthy`);
  }
}

export async function does_not_exist(path: string) {
  return !(await exists(path));
}
