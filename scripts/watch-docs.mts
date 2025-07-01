import Path from "path";
import chokidar from "chokidar";
import { execa } from "execa";
import {
  DOCS_DIR,
  DOCS_DIST_DIR,
  GLIDE_BROWSER_CONTENT_DIR,
} from "./canonical-paths.mts";
import { queue } from "./dev.mts";

async function build_docs() {
  // separate process so changes to e.g. `content/docs.mts` don't require
  // restarting the dev watcher
  await execa("pnpm", ["--silent", "build:docs"], { stdio: "inherit" });
}

const DOCS_FILES = new Set<string>();
const DOCS_MTS = Path.join(GLIDE_BROWSER_CONTENT_DIR, "docs.mts");

export async function main() {
  return await new Promise<void>((resolve, reject) => {
    const watcher = chokidar
      .watch(
        [
          DOCS_DIR,
          GLIDE_BROWSER_CONTENT_DIR,
          //
        ],
        {
          ignored: (abs_path, stats) => {
            if (
              abs_path.includes("node_modules") ||
              abs_path.includes(".venv")
            ) {
              return true;
            }

            if (abs_path.startsWith(GLIDE_BROWSER_CONTENT_DIR)) {
              // we need to allow the content dir so that chokidar traverses it but
              // we really only want to look at the `docs.mts` file
              return !(
                abs_path === GLIDE_BROWSER_CONTENT_DIR || abs_path === DOCS_MTS
              );
            }

            if (!stats || !stats.isFile()) {
              // allow non-files (likely dirs)
              return false;
            }

            if (abs_path.startsWith(DOCS_DIST_DIR)) {
              // avoid infinite loop
              return true;
            }

            return false;
          },
        }
      )
      .on("add", path => {
        DOCS_FILES.add(path);
      })
      .on("ready", async () => {
        await queue.add(async () => {
          console.time("✨ Built docs in");

          await build_docs();

          console.timeEnd("✨ Built docs in");

          if (process.argv.includes("--watch")) {
            console.log("\nWatching docs changes:");
            return;
          }

          await watcher.close();
          resolve();
        });
      })
      .on("change", async path => {
        await queue.add(async () => {
          console.log(`Rebuilding docs as ${path} changed`);
          await build_docs();
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
