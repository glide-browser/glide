import chalk from "chalk";
import { execa, ExecaError } from "execa";
import { ensureSymlink, exists } from "fs-extra";
import fs from "fs/promises";
import Path from "node:path";
import config from "../../firefox.json" with { type: "json" };
import { BRANDING_DIR, CONFIGS_DIR, ENGINE_DIR, ROOT_DIR, SRC_DIR } from "../canonical-paths.mts";
import { get_platform, GLOB_ALL_FILES } from "./util.mts";

const PATCH_ARGS = [
  "--ignore-space-change",
  "--ignore-whitespace",
  "--verbose",
];

interface Context {
  errors: string[];
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  main();
}

async function main() {
  const ctx: Context = { errors: [] };
  await apply_git_patches(ctx);
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

async function apply_git_patches(ctx: Context) {
  for await (const entry of fs.glob("**/*.patch", { cwd: SRC_DIR, withFileTypes: true })) {
    if (entry.isDirectory()) {
      continue;
    }

    const path = Path.join(entry.parentPath, entry.name);
    const relative_path = Path.relative(ROOT_DIR, Path.join(entry.parentPath, entry.name));

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
      console.log(chalk.green("patch"), " ", relative_path);
    } else {
      ctx.errors.push(relative_path);
      console.error(chalk.red("patch"), " ", relative_path);
      console.error(indent(result.all as string, "        "));
      console.error();
    }
  }
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
        await ensureSymlink(src_path, output_path);
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

async function branding_patch(ctx: Context) {
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
  const changeset = await execa("git", ["rev-parse", "HEAD"]).then((res) => res.stdout.trim());

  const common_config = await fs.readFile(Path.join(CONFIGS_DIR, "common", "mozconfig"), "utf8").then((contents) =>
    contents
      .replaceAll("${changeset}", changeset)
      .replaceAll("${firefox_version}", config.version.version)
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
    ].join("\n"),
  );

  const version = config.brands.glide.release.displayVersion;
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version.txt"), version);
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version_display.txt"), version);
}

function indent(str: string, prefix: string): string {
  return str.split("\n").map((s) => prefix + s).join("\n");
}
