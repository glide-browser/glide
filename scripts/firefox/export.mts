import fs from "fs/promises";
import meow from "meow";
import * as Path from "path";
import { ENGINE_DIR, SRC_DIR } from "../canonical-paths.mts";
import { does_not_exist, engine_run } from "./util.mts";

const cli = meow({
  importMeta: import.meta,
  allowUnknownFlags: false,
});

async function main() {
  if (!cli.input.length) {
    throw new Error("At least one file to export the patch for must be given, e.g. `pnpm firefox:patch moz.build`");
  }

  for (const file of cli.input) {
    const absolute_path = resolve_path(file);
    const relative_path = Path.relative(ENGINE_DIR, absolute_path);

    if (await does_not_exist(absolute_path)) {
      throw new Error(`${absolute_path} does not exist`);
    }

    const stat = await fs.stat(absolute_path);
    if (stat.isDirectory()) {
      throw new Error(`${absolute_path} is a directory which is not supported yet`);
    }

    const proc = await engine_run("git", [
      "diff",
      "--src-prefix=a/",
      "--dst-prefix=b/",
      "--full-index",
      relative_path,
    ], { stripFinalNewline: false });
    if (!proc.stdout) {
      throw new Error(`${absolute_path} has no changes`);
    }

    const name = get_patch_name(relative_path);
    const src_path = Path.join(SRC_DIR, ...relative_path.split(Path.sep).slice(0, -1), name);
    const src_dir = Path.dirname(src_path);

    if (await does_not_exist(src_dir)) {
      await fs.mkdir(src_dir, { recursive: true });
    }

    await fs.writeFile(src_path, proc.stdout as string);
    console.log();
    console.log("Exported patch to", src_path);
    console.log();
  }
}

function resolve_path(file: string): string {
  if (Path.isAbsolute(file)) {
    return file;
  }

  const parts = file.split(Path.sep);
  if (parts[0] === "engine") {
    return Path.join(ENGINE_DIR, ...parts.slice(1));
  }

  return Path.join(ENGINE_DIR, file);
}

function get_patch_name(file: string): string {
  return `${Path.basename(file).replace(/\./g, "-")}.patch`;
}

main();
