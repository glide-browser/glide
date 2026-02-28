import chalk from "chalk";
import { execa, ExecaError } from "execa";
import fs from "fs/promises";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../../firefox.json" with { type: "json" };
import { is_present } from "../../src/glide/browser/base/content/utils/guards.mts";
import { BRANDING_DIR, CONFIGS_DIR, ENGINE_DIR, ROOT_DIR, SRC_DIR } from "../canonical-paths.mts";
import { chain, ensure_symlink, exists } from "../util.mts";
import { get_platform, GLOB_ALL_FILES } from "./util.mts";

interface Context {
  errors: string[];
}

const IS_RELEASE = !!process.env["GLIDE_RELEASE"];
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

async function main() {
  const ctx: Context = { errors: [] };

  const patch_args = [
    "--ignore-space-change",
    "--ignore-whitespace",
    "--verbose",
    // this creates `.rej` files for any conflicting hunks, and applies any hunks that do apply cleanly
    // which is nice for resolving cases where there is just a single bad hunk.
    process.argv.includes("--allow-partial") ? "--reject" : null,
  ].filter(is_present);

  await apply_git_patches(ctx, patch_args);
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

async function apply_git_patches(ctx: Context, patch_args: string[]) {
  const patches = chain(
    fs.glob("*.patch", { cwd: Path.join(ROOT_DIR, "patches"), withFileTypes: true }),
    fs.glob("**/*.patch", { cwd: SRC_DIR, withFileTypes: true }),
  );

  for await (const entry of patches) {
    if (entry.isDirectory()) {
      continue;
    }

    const path = Path.join(entry.parentPath, entry.name);
    const relative_path = Path.relative(ROOT_DIR, Path.join(entry.parentPath, entry.name));

    try {
      await execa("git", ["apply", "-R", ...patch_args, path], { cwd: ENGINE_DIR });
    } catch {
      // If the patch has already been applied, we want to revert it. Because
      // there is no good way to check this we are just going to catch and
      // discard the error
    }

    const result = await execa("git", ["apply", ...patch_args, path], { all: true, cwd: ENGINE_DIR }).catch((e) =>
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
  const display_name = IS_RELEASE ? "Glide" : "Glide Debug";
  const mac_bundle_id = IS_RELEASE ? "glide" : "glide-debug";

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
      let config_content = await fs.readFile(config_path, "utf8");
      config_content = config_content
        .replaceAll("${MOZ_APP_DISPLAYNAME}", display_name)
        .replaceAll("${MOZ_MACBUNDLE_ID}", mac_bundle_id);
      await fs.writeFile(config_path, config_content);
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

  const basename = IS_RELEASE ? "glide" : "glide-debug";

  const common_config = await fs.readFile(Path.join(CONFIGS_DIR, "common", "mozconfig"), "utf8").then((contents) =>
    contents
      .replaceAll("${changeset}", changeset)
      .replaceAll("${firefox_version}", config.version.version)
      .replaceAll("${basename}", basename)
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

  const version = config.brands.glide.release.display_version;
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version.txt"), version);
  await fs.writeFile(Path.join(ENGINE_DIR, "browser/config/version_display.txt"), version);
}

function indent(str: string, prefix: string): string {
  return str.split("\n").map((s) => prefix + s).join("\n");
}
