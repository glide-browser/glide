import fs from "fs/promises";
import { fileURLToPath } from "node:url";
import { bundle_types } from "./bundle-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function bundle() {
  await $.no_stdout(async () => {
    await fs.mkdir("src/glide/bundled", { recursive: true });

    await $`pnpm esbuild \
      --format=esm \
      --minify \
      --bundle "$(node -e 'console.log(require.resolve("ts-blank-space"))')"`.pipe(
      "src/glide/bundled/ts-blank-space.mjs",
    );

    await $`pnpm esbuild \
      --format=esm \
      --minify \
      --bundle "$(node -e 'console.log(require.resolve("@markdoc/markdoc"))')"`.pipe("src/glide/bundled/markdoc.mjs");

    await $`pnpm esbuild \
      --format=esm \
      --minify \
      --bundle "$(node -e 'console.log(require.resolve("fast-check"))')"`.pipe("src/glide/bundled/fast-check.mjs");

    // TODO(glide): only bundle the themes + languages we need
    await $`pnpm esbuild \
      --format=esm \
      --minify \
      --bundle "$(node -e 'console.log(require.resolve("shiki"))')"`.pipe("src/glide/bundled/shiki.mjs");
  });

  await bundle_types();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bundle();
}
