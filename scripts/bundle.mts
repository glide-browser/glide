import esbuild from "esbuild";
import fs from "fs/promises";
import { fileURLToPath } from "node:url";
import { bundle_types } from "./bundle-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function bundle() {
  await $.no_stdout(async () => {
    await fs.mkdir("src/glide/bundled", { recursive: true });

    const build = async (mod: string, filename: string) => {
      console.log("+ bundling", mod);
      await esbuild.build({
        format: "esm",
        minify: true,
        bundle: true,
        entryPoints: [fileURLToPath(import.meta.resolve(mod))],
        outfile: `src/glide/bundled/${filename}`,
      });
    };

    await build("ts-blank-space", "ts-blank-space.mjs");
    await build("@markdoc/markdoc", "markdoc.mjs");
    await build("fast-check", "fast-check.mjs");

    // TODO(glide): only bundle the themes + languages we need
    await build("shiki", "shiki.mjs");
  });

  await bundle_types();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bundle();
}
