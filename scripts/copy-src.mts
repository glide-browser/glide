/**
 * Our envisioned strategy of symlinking files doesn't actually work for content processes as it looks like
 * they have stricter requirements around FS access and cannot access anything outside of the `engine/`
 * directory.
 *
 * So we workaround this by emulating symlinks using a file system watcher that copies files when they're
 * modified.
 */

import chokidar from "chokidar";
import fs from "fs/promises";
import Path from "path";
import { ENGINE_DIR, SRC_DIR } from "./canonical-paths.mts";
import { queue } from "./dev.mts";

const dir_cache = new Set<string>();

async function copy(abs_path: string) {
  const rel_path = Path.relative(SRC_DIR, abs_path);
  const engine_path = Path.join(ENGINE_DIR, rel_path);
  const engine_dir = Path.dirname(engine_path);
  if (
    !dir_cache.has(engine_dir)
    && !(await fs
      .stat(engine_dir)
      .then(() => true)
      .catch(() => false))
  ) {
    dir_cache.add(engine_dir);
  }

  await fs.mkdir(engine_dir, { recursive: true });
  await fs.rm(engine_path, { force: true });
  await fs.copyFile(abs_path, engine_path);
}

const COPY_FILES = new Set<string>();

export async function main() {
  await new Promise<void>((resolve, reject) => {
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

          if (abs_path.endsWith(".patch")) {
            // these are managed by `pnpm firefox:patch`
            return true;
          }

          return false;
        },
      })
      .on("add", path => {
        COPY_FILES.add(path);
      })
      .on("ready", async () => {
        await queue.add(async () => {
          console.log(`Copying ${COPY_FILES.size} files to engine/`);
          console.time("✨ Copied in");
          for (const path of COPY_FILES) {
            await copy(path);
          }

          if (process.argv.includes("--watch")) {
            console.timeEnd("✨ Copied in");
            console.log("\nWatching:");
            return;
          }

          console.timeEnd("✨ Copied in");
          await watcher.close();
          resolve();
        });
      })
      .on("change", async path => {
        await queue.add(async () => {
          console.time(`Copied ${path}`);
          await copy(path);
          console.timeEnd(`Copied ${path}`);
        });
      })
      .on("unlink", async abs_path => {
        await queue.add(async () => {
          try {
            console.time(`Removed ${abs_path}`);

            const rel_path = Path.relative(SRC_DIR, abs_path);
            const engine_path = Path.join(ENGINE_DIR, rel_path);

            await fs.rm(engine_path);

            console.timeEnd(`Removed ${abs_path}`);
          } catch (err) {
            // can happen due to race conditions with this watcher and the docs watcher
            console.log("ignoring error while unlinking", err);
          }
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
