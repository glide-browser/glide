import { execa } from "execa";
import fs from "fs/promises";
import Path from "path";
import { DOCS_DIST_DIR, ROOT_DIR } from "./canonical-paths.mts";

async function main() {
  const html_assets_script_path = Path.join(
    ROOT_DIR,
    "node_modules",
    "html-assets-hash",
    "bin",
    "html-assets-hash.mjs",
  );
  for await (const html_file of fs.glob("**/*.html", { cwd: DOCS_DIST_DIR })) {
    await execa("node", [html_assets_script_path, Path.join(DOCS_DIST_DIR, html_file)], { stdio: "inherit" });
  }
}

main();
