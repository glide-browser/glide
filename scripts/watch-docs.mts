import Path from "path";
import chokidar from "chokidar";
import { execa } from "execa";
import {
  DOCS_DIR,
  DOCS_DIST_DIR,
  GLIDE_BROWSER_DIR,
} from "./canonical-paths.mts";

async function build_docs() {
  // separate process so changes to e.g. `content/docs.mts` don't require
  // restarting the dev watcher
  await execa("pnpm", ["--silent", "build:docs"], { stdio: "inherit" });
}

const DOCS_FILES = new Set<string>();

export async function main() {
  const watcher = chokidar
    .watch(
      [
        DOCS_DIR,
        Path.join(GLIDE_BROWSER_DIR, "base", "content", "docs.mts"),
        //
      ],
      {
        ignored: (abs_path, stats) => {
          if (abs_path.includes("node_modules") || abs_path.includes(".venv")) {
            return true;
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
      console.time("✨ Built docs in");

      await build_docs();

      console.timeEnd("✨ Built docs in");

      if (process.argv.includes("--watch")) {
        console.log("\nWatching docs changes:");
        return;
      }

      watcher.close();
    })
    .on("change", async path => {
      console.log(`Rebuilding docs as ${path} changed`);
      await build_docs();
    });
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  main();
}
