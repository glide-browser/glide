/**
 * Build the Glide docs.
 *
 * Globs the `glide/docs` dir for `.md` files and converts them to HTML using markdoc.
 *
 * Additionally symlinks other files.
 *
 * Additionally builds the `tutor/dist/index.html` file.
 */

// note: search requires manually running
//  `pnpm build:docs:index`
//  alternatively `pnpm bootstrap` will do that for you

import "./polyfill-chromeutils.cjs";
import fs from "fs/promises";
import meow from "meow";
import Path from "path";
import { DOCS_DIR, DOCS_DIST_DIR, TUTOR_DIR, TUTOR_DIST_DIR } from "./canonical-paths.mts";

const shiki = ChromeUtils.importESModule("chrome://glide/content/bundled/shiki.mjs");
const { markdown_to_html, code_to_html, resolve_themes } = ChromeUtils.importESModule(
  "chrome://glide/content/docs.mjs",
);

const cli = meow({
  importMeta: import.meta,
  allowUnknownFlags: false,
  flags: { symlink: { type: "boolean", default: true } },
});

const SYMLINKS = [
  "docs.js",
  "docs.css",
  "reset.css",
  "index.css",
  "logo-20.webp",
  "logo@2x.webp",
  "logo-32.png",
  "BerkeleyMono-Regular.woff2",
  "_headers",
  "demo.mp4",
  "demo.webm",
  "demo-thumb.webp",
];
const TUTOR_FILES = [
  "index.html",
  "tutor.css",
];

const highlighter = await shiki.createHighlighter({
  langs: ["typescript", "javascript", "html", "go", "bash", "toml", "python", "jsonc"],
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

for await (const md_file of fs.glob("**/*.md", { cwd: DOCS_DIR })) {
  const relative_dist_path = md_file.replace(".md", ".html");
  const dist_file = Path.join(DOCS_DIST_DIR, relative_dist_path);

  console.log(`building ${md_file} -> ${relative_dist_path}`);

  const parent_dist_dir = Path.dirname(dist_file);
  if (parent_dist_dir !== ".") {
    await fs.mkdir(parent_dist_dir, { recursive: true });
  }

  await fs.writeFile(
    dist_file,
    await markdown_to_html(await fs.readFile(Path.join(DOCS_DIR, md_file), "utf8"), highlighter, {
      nested_count: md_file.split(Path.sep).length,
      relative_dist_path,
    }),
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

async function build_tutor_docs() {
  const tutor_docs_dist_dir = Path.join(DOCS_DIST_DIR, "tutorial");
  await fs.mkdir(tutor_docs_dist_dir, { recursive: true });

  const FENCE_RE = /<fence(.*)>(.*)<\/fence>/gis;
  const FENCE_LANGUAGE_RE = /language="(?<language>.*)"/i;
  const themes = resolve_themes(highlighter).themes;

  for (const file of TUTOR_FILES) {
    await fs.writeFile(
      Path.join(tutor_docs_dist_dir, file),
      await transform_tutor_file(Path.join(TUTOR_DIR, file), true),
    );
    await fs.writeFile(Path.join(TUTOR_DIST_DIR, file), await transform_tutor_file(Path.join(TUTOR_DIR, file), false));
  }
  await fs.writeFile(
    Path.join(tutor_docs_dist_dir, "tutor.js"),
    await fs.readFile(Path.join(TUTOR_DIR, "dist", "tutor.js"), "utf8").then((contents) =>
      contents.replaceAll("resource://glide-docs/", "../")
    ),
  );

  async function transform_tutor_file(abs_path: string, for_docs: boolean) {
    let content = await fs.readFile(abs_path, "utf8");

    if (for_docs) {
      content = content.replaceAll("resource://glide-docs/", "../");
    }

    // highlight code blocks
    if (abs_path.endsWith(".html")) {
      content = content.replaceAll(FENCE_RE, (substring, attrs: string, code: string) => {
        const language = attrs.match(FENCE_LANGUAGE_RE)?.groups?.["language"];
        if (!language) {
          console.log(substring);
          throw new Error("missing language attr");
        }
        return code_to_html(highlighter, code.trimStart(), { lang: language, themes });
      });
    }

    return content;
  }
}

await build_tutor_docs();
