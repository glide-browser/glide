import chalk from "chalk";
import { execa, ExecaError } from "execa";
import fs from "fs/promises";
import { createHash } from "node:crypto";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../../firefox.json" with { type: "json" };
import { is_present } from "../../src/glide/browser/base/content/utils/guards.mts";
import { BRANDING_DIR, CONFIGS_DIR, ENGINE_DIR, ROOT_DIR, SRC_DIR } from "../canonical-paths.mts";
import { chain, ensure_symlink, exists } from "../util.mts";
import { get_platform, GLOB_ALL_FILES, IS_RELEASE } from "./util.mts";

export interface Context {
  errors: string[];
}

const TEMPLATE_VARIABLES = {
  basename: IS_RELEASE ? "glide" : "glide-debug",
  macbundle_name: IS_RELEASE ? "Glide" : "Glide Debug",
  MOZ_MACBUNDLE_ID: IS_RELEASE ? "glide" : "glide-debug",
  MOZ_APP_DISPLAYNAME: IS_RELEASE ? "Glide" : "Glide Debug",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

async function main() {
  const ctx: Context = { errors: [] };

  await apply_git_patches(ctx, get_patch_args({ allow_partial: process.argv.includes("--allow-partial") }));
  await setup_symlinks(ctx);
  await branding_patch(ctx);

  await patch_mozconfig();
  console.log(chalk.green("mozconfig"));

  if (ctx.errors.length) {
    console.error();
    console.error("Patching firefox", chalk.red("failed") + ":");
    console.error(ctx.errors.map((err) => `- ${err}`).join("\n"));
    process.exit(1);
  }
}

export function get_patch_args({ allow_partial }: { allow_partial: boolean }): string[] {
  return [
    "--ignore-space-change",
    "--ignore-whitespace",
    "--verbose",
    // this creates `.rej` files for any conflicting hunks, and applies any hunks that do apply cleanly
    // which is nice for resolving cases where there is just a single bad hunk.
    allow_partial ? "--reject" : null,
  ].filter(is_present);
}

export async function apply_git_patches(ctx: Context, patch_args: string[]) {
  const patches = chain(
    fs.glob("*.patch", { cwd: Path.join(ROOT_DIR, "patches"), withFileTypes: true }),
    fs.glob("**/*.patch", { cwd: SRC_DIR, withFileTypes: true }),
  );

  // Files that don't match have been edited since, e.g. changes that haven't been exported yet, so they're
  // left alone and handled by reverting the patch below.
  const state_path = await get_patch_state_path();
  for (const [file, hash] of Object.entries(await read_patch_state(state_path))) {
    if (await hash_engine_file(file) === hash) {
      await restore_engine_file(file);
    }
  }

  const patched_files = new Set<string>();
  const failed_files = new Set<string>();

  for await (const entry of patches) {
    if (entry.isDirectory()) {
      continue;
    }

    const path = Path.join(entry.parentPath, entry.name);
    const relative_path = Path.relative(ROOT_DIR, Path.join(entry.parentPath, entry.name));
    const files = await get_patch_files(path);

    if (await is_modified(files)) {
      await execa("git", ["apply", "-R", ...patch_args, path], { cwd: ENGINE_DIR }).catch(() => null);
    }

    const result = await execa("git", ["apply", ...patch_args, path], { all: true, cwd: ENGINE_DIR }).catch((e) =>
      e as ExecaError
    );
    if (result.exitCode === 0) {
      files.forEach((file) => patched_files.add(file));
      console.log(chalk.green("patch"), " ", relative_path);
    } else {
      files.forEach((file) => failed_files.add(file));
      ctx.errors.push(relative_path);
      console.error(chalk.red("patch"), " ", relative_path);
      console.error(indent(result.all as string, "        "));
      console.error();
    }
  }

  const state: PatchState = {};
  for (const file of patched_files) {
    if (!failed_files.has(file)) {
      state[file] = await hash_engine_file(file);
    }
  }
  await fs.writeFile(state_path, JSON.stringify(state, null, 2) + "\n");
}

/**
 * relative file path -> hash of contents, null if deleted
 */
type PatchState = Record<string, string | null>;

async function get_patch_state_path(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--git-path", "glide-patched-files.json"], { cwd: ENGINE_DIR });
  return Path.resolve(ENGINE_DIR, stdout.trim());
}

async function read_patch_state(state_path: string): Promise<PatchState> {
  try {
    const state = JSON.parse(await fs.readFile(state_path, "utf8"));
    return typeof state === "object" && state ? state as PatchState : {};
  } catch {
    return {};
  }
}

async function hash_engine_file(file: string): Promise<string | null> {
  const contents = await fs.readFile(Path.join(ENGINE_DIR, file)).catch(() => null);
  return contents ? createHash("sha256").update(contents).digest("hex") : null;
}

async function restore_engine_file(file: string) {
  const in_head = await execa("git", ["cat-file", "-e", `HEAD:${file}`], { cwd: ENGINE_DIR }).then(
    () => true,
    () => false,
  );
  if (in_head) {
    await execa("git", ["checkout", "HEAD", "--", file], { cwd: ENGINE_DIR });
  } else {
    await fs.rm(Path.join(ENGINE_DIR, file), { force: true });
  }
}

async function get_patch_files(patch_path: string): Promise<string[]> {
  const { stdout: numstat } = await execa("git", ["apply", "--numstat", "-z", patch_path], { cwd: ENGINE_DIR });
  return numstat.split("\0").filter(Boolean).map((entry) => entry.split("\t")[2]!);
}

async function is_modified(files: string[]): Promise<boolean> {
  if (!files.length) {
    return true;
  }

  const { stdout: status } = await execa("git", ["status", "--porcelain", "--", ...files], { cwd: ENGINE_DIR });
  return status.trim() !== "";
}

async function setup_symlinks(ctx: Context) {
  const get_chunked = (location: string) => location.replace(/\\/g, "/").split("/");

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
    const relative_root_path = Path.relative(ROOT_DIR, Path.join(entry.parentPath, entry.name));
    const relative_path = Path.relative(SRC_DIR, Path.join(entry.parentPath, entry.name));
    const src_path = Path.resolve(SRC_DIR, ...get_chunked(relative_path));
    const output_path = Path.resolve(dest, ...get_chunked(relative_path));

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
        const linked_to = Path.resolve(rel_to_dir, ...get_chunked(link));
        await fs.rm(output_path, { force: true });
        await fs.symlink(linked_to, output_path);
      } else {
        await ensure_symlink(src_path, output_path);
      }
    } catch (e) {
      ctx.errors.push(relative_root_path);
      console.error(chalk.red("link"), "  ", relative_root_path);
      console.error(indent(String(e), "        "));
      console.error();
      continue;
    }

    console.log(chalk.green("link"), "  ", relative_root_path);
  }
}

export async function branding_patch(ctx: Context) {
  const brands = await fs.readdir(BRANDING_DIR, { withFileTypes: true }).then((entries) =>
    entries.filter((entry) => entry.isDirectory())
  );

  for (const brand of brands) {
    if (!brand.isDirectory()) {
      continue;
    }

    const abs_path = Path.join(brand.parentPath, brand.name);
    const engine_path = Path.join(ENGINE_DIR, "browser", "branding", brand.name);
    const relative_path = Path.relative(ROOT_DIR, abs_path);

    try {
      await fs.rm(engine_path, { force: true }).catch(() => null);
      await fs.cp(abs_path, engine_path, { recursive: true });

      const config_path = Path.join(engine_path, "configure.sh");
      await fs.writeFile(config_path, replace_template_vars(await fs.readFile(config_path, "utf-8")));
    } catch (e) {
      ctx.errors.push(relative_path);
      console.error(chalk.red("brand"), " ", relative_path);
      console.error(indent(String(e), "        "));
      console.error();
      continue;
    }

    console.log(chalk.green("brand"), " ", relative_path);
  }
}

export async function patch_mozconfig() {
  const changeset = process.env["GLIDE_REVISION"]
    ?? await execa("git", ["rev-parse", "HEAD"]).then((res) => res.stdout.trim()).catch((err) => {
      console.warn(chalk.red("Could not resolve changeset due to error"), err);
      console.warn();
      console.warn(
        "If you're building glide outside of a git repository, set the `GLIDE_REVISION` environment variable to short-circuit this check.",
      );
      console.warn();
      return "";
    });

  const common_config = replace_template_vars(
    await fs.readFile(Path.join(CONFIGS_DIR, "common", "mozconfig"), "utf8"),
    { changeset, firefox_version: config.version.version },
  );
  const os_config = await fs.readFile(Path.join(CONFIGS_DIR, get_platform(), "mozconfig"), "utf8");
  await fs.writeFile(
    Path.join(ENGINE_DIR, "mozconfig"),
    [
      `# This file is automatically generated. It will be overwritten every time \`pnpm build\` is ran.\n`,
      common_config,
      "\n",
      os_config,
      "\n",
      process.env["GLIDE_MOZCONFIG_CONTENT"],
    ].filter(is_present).join("\n"),
  );

  const version = config.brands.glide.release.display_version;
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version.txt"), version);
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version_display.txt"), version);
}

function indent(str: string, prefix: string): string {
  return str.split("\n").map((s) => prefix + s).join("\n");
}

function replace_template_vars(contents: string, extra_vars?: Record<string, string>): string {
  for (const [key, value] of Object.entries(TEMPLATE_VARIABLES)) {
    contents = contents.replaceAll(`\${${key}}`, value);
  }
  for (const [key, value] of Object.entries(extra_vars ?? {})) {
    contents = contents.replaceAll(`\${${key}}`, value);
  }
  return contents;
}
