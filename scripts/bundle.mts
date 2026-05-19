import esbuild from "esbuild";
import fs from "fs/promises";
import { fileURLToPath } from "node:url";
import { bundle_types } from "./bundle-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function bundle() {
  await $.no_stdout(async () => {
    await fs.mkdir("src/glide/bundled", { recursive: true });

    const build = async (
      filename: string,
      { mod, path }: { mod: string; path?: undefined } | { path: string; mod?: undefined },
    ) => {
      console.log("+ bundling", mod ?? path);
      await esbuild.build({
        format: "esm",
        minify: true,
        bundle: true,
        entryPoints: mod ? [fileURLToPath(import.meta.resolve(mod))] : [path!],
        outfile: `src/glide/bundled/${filename}`,
      });
    };

    await build("ts-blank-space.mjs", { mod: "ts-blank-space" });
    await build("markdoc.mjs", { mod: "@markdoc/markdoc" });
    await build("fast-check.mjs", { mod: "fast-check" });
    await build("dioscuri.mjs", { path: "scripts/shims/dioscuri.mjs" });

    // TODO(glide): only bundle the themes + languages we need
    await build("shiki.mjs", { mod: "shiki" });
  });

  await bundle_types();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bundle().catch($.handle_error);
}
