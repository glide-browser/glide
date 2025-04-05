import fs from "fs/promises";
import chokidar from "chokidar";
import Path from "path";
import { fileURLToPath } from "url";
import ts_blank_space from "ts-blank-space";

const ROOT_DIR = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const GLIDE_DIR = Path.join(ROOT_DIR, "glide");

const dist_dir_cache = new Set<string>();

async function build(abs_path: string) {
  const dist_dir = Path.join(abs_path, "..", "dist");
  if (
    !dist_dir_cache.has(dist_dir) &&
    !(await fs
      .stat(dist_dir)
      .then(() => true)
      .catch(() => false))
  ) {
    await fs.mkdir(dist_dir, { recursive: true });
    dist_dir_cache.add(dist_dir);
  }

  const dist_path = Path.join(
    dist_dir,
    Path.basename(abs_path).replace(/ts$/, "js")
  );

  const contents = await fs.readFile(abs_path, "utf8");
  await fs.writeFile(dist_path, ts_blank_space(contents), "utf8");
}

// all the build files that chokidar would look at
const BUILD_FILES = new Set<string>();
// TS files we don't care about building
const IGNORED_FILES = new Set([
  "glide.ts",
  "browser/base/content/test/config/config_types.ts",
]);

const watcher = chokidar
  .watch([GLIDE_DIR], {
    ignored: (abs_path, stats) => {
      if (abs_path.includes("node_modules") || abs_path.includes(".venv")) {
        return true;
      }

      if (!stats || !stats.isFile()) {
        // allow non-files (likely dirs)
        return false;
      }

      const rel_path = Path.relative(GLIDE_DIR, abs_path);
      if (!rel_path.endsWith("ts")) {
        // we only care about TS files
        return true;
      }

      if (
        // ignore scripts as they'll never be built
        rel_path.startsWith("scripts/") ||
        // ignore .d.ts as they'll never be built
        rel_path.startsWith("generated/") ||
        rel_path.startsWith("@types/") ||
        rel_path.endsWith(".d.ts")
      ) {
        return true;
      }

      if (IGNORED_FILES.has(rel_path)) {
        return true;
      }

      return false;
    },
  })
  .on("add", path => {
    BUILD_FILES.add(path);
  })
  .on("ready", async () => {
    console.log(`Building ${BUILD_FILES.size} files`);
    console.time("✨ Built in");
    for (const path of BUILD_FILES) {
      await build(path);
    }

    if (process.argv.includes("--watch")) {
      console.timeEnd("✨ Built in");
      console.log("\nWatching:");
      return;
    }

    console.timeEnd("✨ Built in");
    watcher.close();
  })
  .on("change", async path => {
    console.time(`Built ${path}`);
    await build(path);
    console.timeEnd(`Built ${path}`);
  });
