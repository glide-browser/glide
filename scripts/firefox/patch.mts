import chalk from "chalk";
import { execa, ExecaError } from "execa";
import { ensureSymlink, exists } from "fs-extra";
import fs from "fs/promises";
import Path from "node:path";
import { BRANDING_DIR, ENGINE_DIR, SRC_DIR } from "../canonical-paths.mts";
import { GLOB_ALL_FILES } from "./util.mts";

const PATCH_ARGS = [
  "--ignore-space-change",
  "--ignore-whitespace",
  "--verbose",
];

interface Context {
  errors: string[];
}

main();

async function main() {
  const ctx: Context = { errors: [] };
  // await apply_git_patches(ctx);
  // await setup_symlinks(ctx);
  await branding_patch(ctx);

  if (ctx.errors.length) {
    // TODO
    console.log(ctx.errors);
    process.exit(1);
  }
}

async function apply_git_patches(ctx: Context) {
  for await (const entry of fs.glob("**/*.patch", { cwd: SRC_DIR, withFileTypes: true })) {
    if (entry.isDirectory()) {
      continue;
    }

    const path = Path.join(entry.parentPath, entry.name);

    try {
      await execa("git", ["apply", "-R", ...PATCH_ARGS, path], { cwd: ENGINE_DIR });
    } catch {
      // If the patch has already been applied, we want to revert it. Because
      // there is no good way to check this we are just going to catch and
      // discard the error
    }

    const result = await execa("git", ["apply", ...PATCH_ARGS, path], { all: true, cwd: ENGINE_DIR }).catch((e) =>
      e as ExecaError
    );
    if (result.exitCode === 0) {
      console.log(chalk.green("patch"), " ", path);
    } else {
      // TODO
      ctx.errors.push(path);
      console.error(result.all);
    }
  }
}

async function setup_symlinks(ctx: Context) {
  const getChunked = (location: string) => location.replace(/\\/g, "/").split("/");

  for await (
    const entry of fs.glob(GLOB_ALL_FILES, {
      cwd: SRC_DIR,
      withFileTypes: true,
      // filter out glide/ files as those are handled separately in ../copy-src.mts
      // using our dev fs watcher instead
      exclude: (entry) => (entry.name === "glide" && entry.parentPath === SRC_DIR),
    })
  ) {
    if (entry.isDirectory() || entry.name === ".DS_Store" || entry.name.endsWith(".patch")) {
      continue;
    }

    const dest = ENGINE_DIR;
    const relative_path = Path.relative(SRC_DIR, Path.join(entry.parentPath, entry.name));
    const src_path = Path.resolve(SRC_DIR, ...getChunked(relative_path));
    const output_path = Path.resolve(dest, ...getChunked(relative_path));

    // If the file exists and is not a symlink, we want to replace it with a
    // symlink to our file, so remove it
    if (await exists(output_path)) {
      const stat = await fs.stat(output_path);
      if (!stat.isSymbolicLink()) {
        await fs.rm(output_path);
      }
    }

    try {
      const link = await fs.readlink(src_path).catch(() => null);

      // handle relative symlinks
      if (link !== null && (link.startsWith("./") || link.startsWith("../"))) {
        const rel_to_dir = Path.dirname(Path.join(dest, relative_path));
        const linked_to = Path.resolve(rel_to_dir, ...getChunked(link));
        await fs.rm(output_path, { force: true });
        await fs.symlink(linked_to, output_path);
      } else {
        await ensureSymlink(src_path, output_path);
      }
    } catch (e) {
      console.error(chalk.red("error"), " ", relative_path);
      ctx.errors.push(String(e));
      continue;
    }

    console.log(chalk.green("link"), "  ", relative_path);

    // TODO?
    // const gitignore = readFileSync(resolve(ENGINE_DIR, ".gitignore")).toString();
    // if (!gitignore.includes(getChunked(relative_path).join("/"))) {
    //   appendToFileSync(resolve(ENGINE_DIR, ".gitignore"), `\n${getChunked(relative_path).join("/")}`);
    // }
  }
}

async function branding_patch(ctx: Context) {
  const brands = await fs.readdir(BRANDING_DIR, { withFileTypes: true }).then((entries) =>
    entries.filter((entry) => entry.isDirectory())
  );
  console.log({ brands });
}
