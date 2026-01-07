import fs from "fs/promises";
import Path from "path";
import { SCRIPTS_DIR } from "./canonical-paths.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function generate_types() {
  await $.rmdir("src/glide/generated");

  // Generate `.d.ts` files from source JS files
  // This is mainly intended for symbol discovery through LSPs as
  // it will end up generating a lot of `any`s
  await $`./node_modules/.bin/tsc \
    --declaration \
    --allowJs \
    --emitDeclarationOnly \
    --outDir src/glide/generated \
    ./engine/testing/mochitest/tests/SimpleTest/EventUtils.js \
    ./engine/testing/modules/TestUtils.sys.mjs \
    ./engine/browser/base/content/browser-commands.js`;

  // Our `.d.ts` files are intended to define global types so we can't use `export`
  {
    const path = "src/glide/generated/testing/modules/TestUtils.sys.d.mts";
    await fs.writeFile(
      path,
      await fs.readFile(path, "utf-8").then((content) => content
        .replace("export namespace TestUtils {", "declare namespace TestUtils {")
      ),
    );
  }

  // Remove existing `declare `s as they're not valid after we wrap everything in a `declare namespace`
  {
    const path = "src/glide/generated/testing/mochitest/tests/SimpleTest/EventUtils.d.ts";
    let content = await fs.readFile(path, "utf-8");

    content = content.replace(/^declare /gm, "");
    // Add a namespace to properly emulate runtime behaviour
    content = `declare namespace EventUtils {\n${content}}\n`;

    await fs.writeFile(path, content);
  }

  // Vendor firefox types
  {
    await fs.mkdir("src/glide/generated/@types/subs", { recursive: true });
    await fs.mkdir("src/glide/generated/@types/generated", { recursive: true });
    await fs.mkdir("src/glide/generated/@types/extensions", { recursive: true });

    for (const file of await $.glob("*.ts", { cwd: "engine/tools/@types/" })) {
      await fs.copyFile(Path.join("engine/tools/@types", file), Path.join("src/glide/generated/@types", file));
    }

    for (const file of await $.glob("*.ts", { cwd: "engine/tools/@types/generated/" })) {
      await fs.copyFile(
        Path.join("engine/tools/@types/generated", file),
        Path.join("src/glide/generated/@types/generated", file),
      );
    }

    await fs.copyFile(
      "engine/tools/@types/subs/AppConstants.sys.d.mts",
      "src/glide/generated/@types/subs/AppConstants.sys.d.ts",
    );
    await fs.copyFile(
      "engine/toolkit/components/extensions/types/ext-tabs-base.d.ts",
      "src/glide/generated/@types/extensions/ext-tabs-base.d.ts",
    );
  }

  // Vendor web extensions types
  {
    const path = "src/glide/browser/base/content/extension-api.d.ts";
    const content = await fs.readFile("node_modules/webextension-polyfill/out/index.d.ts", "utf-8");
    const license = await fs.readFile(Path.join(SCRIPTS_DIR, "firefox", "license.txt"), "utf8").then((contents) =>
      contents.trimEnd().split("\n").map((ln) => "// " + ln).join("\n")
    );

    await fs.writeFile(path, license + "\n\n" + content);
    await $`node_modules/.bin/dprint fmt --log-level=error ${path}`;
  }
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  await generate_types();
}
