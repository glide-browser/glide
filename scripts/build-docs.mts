/**
 * Build the Glide docs.
 *
 * Globs the `glide/docs` dir for `.md` files and converts them to HTML using markdoc.
 *
 * Additionally symlinks other files.
 */

// note: search requires manually running
//  `pnpm build:docs:index`
//  alternatively `pnpm bootstrap` will do that for you

import "./polyfill-chromeutils.cjs";
import meow from "meow";
import Path from "path";
import fs from "fs/promises";
import { DOCS_DIR, DOCS_DIST_DIR } from "./canonical-paths.mts";

const shiki = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/shiki.mjs"
);
const { markdown_to_html } = ChromeUtils.importESModule(
  "chrome://glide/content/docs.mjs"
);

const cli = meow({
  importMeta: import.meta,
  allowUnknownFlags: false,
  flags: {
    symlink: {
      type: "boolean",
      default: true,
    },
  },
});

const MD_GLOB_EXCLUDE = /monospace-web/;
const SYMLINKS = [
  "docs.js",
  "docs.css",
  "logo.png",
  "BerkeleyMono-Regular.woff2",
  "monospace-web/reset.css",
  "monospace-web/index.css",
];

const highlighter = await shiki.createHighlighter({
  langs: ["typescript", "javascript", "html", "go", "bash", "toml", "python"],
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
      .readFile(Path.join(DOCS_DIR, "themes", "tokyonight-light.json"), "utf8")
      .then(contents => JSON.parse(contents))) as any,
  ],
});

await fs.mkdir(DOCS_DIST_DIR, { recursive: true });

for await (const md_file of fs.glob("**/*.md", {
  cwd: DOCS_DIR,
  exclude: filename => MD_GLOB_EXCLUDE.test(filename),
})) {
  const relative_dist_path = md_file.replace(".md", ".html");
  const dist_file = Path.join(DOCS_DIST_DIR, relative_dist_path);

  console.log(`building ${md_file} -> ${relative_dist_path}`);

  const parent_dist_dir = Path.dirname(dist_file);
  if (parent_dist_dir !== ".") {
    await fs.mkdir(parent_dist_dir, { recursive: true });
  }

  await fs.writeFile(
    dist_file,
    await markdown_to_html(
      await fs.readFile(Path.join(DOCS_DIR, md_file), "utf8"),
      highlighter,
      { nested_count: md_file.split(Path.sep).length, relative_dist_path }
    )
  );
}

for (const file of SYMLINKS) {
  const source_file = Path.join(DOCS_DIR, file);
  const dist_file = Path.join(DOCS_DIST_DIR, file);

  const parent_dist_dir = Path.dirname(dist_file);
  if (parent_dist_dir !== ".") {
    await fs.mkdir(parent_dist_dir, { recursive: true });
  }

  if (cli.flags.symlink) {
    const stat = await fs.stat(dist_file).catch(() => null);
    if (stat?.isSymbolicLink()) {
      continue;
    }

    if (stat) {
      await fs.rm(dist_file);
    }

    await fs.symlink(source_file, dist_file);
  } else {
    await fs.rm(dist_file).catch(() => null);
    await fs.copyFile(source_file, dist_file);
  }
}
