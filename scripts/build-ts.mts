import chokidar from "chokidar";
import fs from "fs/promises";
import Path from "path";
import ts_blank_space from "ts-blank-space";
import { SRC_DIR } from "./canonical-paths.mts";
import { queue } from "./dev.mts";

const dist_dir_cache = new Set<string>();

async function build(abs_path: string) {
  const dist_dir = Path.join(abs_path, "..", "dist");
  if (
    !dist_dir_cache.has(dist_dir)
    && !(await fs
      .stat(dist_dir)
      .then(() => true)
      .catch(() => false))
  ) {
    await fs.mkdir(dist_dir, { recursive: true });
    dist_dir_cache.add(dist_dir);
  }

  const dist_path = Path.join(dist_dir, Path.basename(abs_path).replace(/ts$/, "js"));

  const contents = await fs.readFile(abs_path, "utf8");
  await fs.writeFile(dist_path, ts_blank_space(contents), "utf8");
}

// all the build files that chokidar would look at
const BUILD_FILES = new Set<string>();
// TS files we don't care about building
const IGNORED_FILES = new Set([
  "glide.ts",
  "glide/browser/base/content/test/config/types/config.ts",
]);

export async function main() {
  return await new Promise<void>((resolve, reject) => {
    const watcher = chokidar
      .watch([SRC_DIR], {
        ignored: (abs_path, stats) => {
          if (abs_path.includes("node_modules") || abs_path.includes(".venv")) {
            return true;
          }

          if (!stats || !stats.isFile()) {
            // allow non-files (likely dirs)
            return false;
          }

          const rel_path = Path.relative(SRC_DIR, abs_path);
          if (!rel_path.endsWith("ts")) {
            // we only care about TS files
            return true;
          }

          if (
            // ignore scripts as they'll never be built
            rel_path.startsWith("glide/scripts/")
            // these are just used internally in-tree for checking docs types
            || rel_path.includes("/docs/dist/snippets/")
            // ignore .d.ts as they'll never be built
            || rel_path.startsWith("glide/generated/")
            || rel_path.startsWith("glide/@types/")
            || rel_path.endsWith(".d.ts")
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
        await queue.add(async () => {
          console.log(`Building ${BUILD_FILES.size} TS files`);
          console.time("✨ Built TS in");
          for (const path of BUILD_FILES) {
            await build(path);
          }

          if (process.argv.includes("--watch")) {
            console.timeEnd("✨ Built TS in");
            console.log("\nWatching:");
            return;
          }

          console.timeEnd("✨ Built TS in");
          await watcher.close();
          resolve();
        });
      })
      .on("change", async path => {
        await queue.add(async () => {
          console.time(`Built ${path}`);
          await build(path);
          console.timeEnd(`Built ${path}`);
        });
      })
      .on("error", error => {
        reject(error);
      });
  });
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  main();
}
