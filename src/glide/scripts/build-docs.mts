/**
 * Build the Glide docs.
 *
 * Globs the `glide/docs` dir for `.md` files and converts them to HTML using markdoc.
 *
 * Additionally symlinks other files.
 */

// note: search requires manually running
// `npx -y pagefind --site glide/docs/dist`

import "./polyfill-chromeutils.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";

const shiki = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/shiki.mjs"
);
const { markdown_to_html } = ChromeUtils.importESModule(
  "chrome://glide/content/docs.mjs"
);

const DOCS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs"
);
const DOCS_DIST_DIR = path.join(DOCS_DIR, "dist");

const highlighter = await shiki.createHighlighter({
  langs: ["typescript", "javascript"],
  themes: [
    "catppuccin-mocha",
    "nord",
    "one-dark-pro",
    "plastic",
    "poimandres",
    "tokyo-night",
    "vesper",
    // copied from https://github.com/tokyo-night/tokyo-night-vscode-theme/blob/da5546bc4163a02a30d6f3ced90d4ef7dfcb8460/themes/tokyo-night-light-color-theme.json
    (await fs
      .readFile(path.join(DOCS_DIR, "themes", "tokyonight-light.json"), "utf8")
      .then(contents => JSON.parse(contents))) as any,
  ],
});

await fs.mkdir(DOCS_DIST_DIR, { recursive: true });

const MD_GLOB_EXCLUDE = /monospace-web/;

for await (const md_file of fs.glob("**/*.md", {
  cwd: DOCS_DIR,
  exclude: filename => MD_GLOB_EXCLUDE.test(filename),
})) {
  const relative_dist_path = md_file.replace(".md", ".html");
  const dist_file = path.join(DOCS_DIST_DIR, relative_dist_path);

  console.log(`building ${md_file} -> ${relative_dist_path}`);

  const parent_dist_dir = path.dirname(dist_file);
  if (parent_dist_dir !== ".") {
    await fs.mkdir(parent_dist_dir, { recursive: true });
  }

  await fs.writeFile(
    dist_file,
    await markdown_to_html(
      await fs.readFile(path.join(DOCS_DIR, md_file), "utf8"),
      highlighter,
      { nested_count: md_file.split(path.sep).length, relative_dist_path }
    )
  );
}

const symlinks = [
  "docs.js",
  "docs.css",
  "logo.png",
  "BerkeleyMono-Regular.woff2",
  "monospace-web/reset.css",
  "monospace-web/index.css",
];

for (const file of symlinks) {
  const source_file = path.join(DOCS_DIR, file);
  const dist_file = path.join(DOCS_DIST_DIR, file);

  const parent_dist_dir = path.dirname(dist_file);
  if (parent_dist_dir !== ".") {
    await fs.mkdir(parent_dist_dir, { recursive: true });
  }

  if (
    await fs
      .access(dist_file)
      .then(() => false)
      .catch(() => true)
  ) {
    await fs.symlink(source_file, dist_file);
  }
}
