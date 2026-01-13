import { bundle } from "./bundle.mts";
import { check_config } from "./check-config.mts";
import { generate_types } from "./generate-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

await check_config();

if (!process.argv.includes("--offline")) {
  await $`pnpm firefox:download`;
}

await bundle();
await generate_types();

await $`pnpm build:ts`;
await $`pnpm build:docs:html`;
await $`pnpm build:docs:index`;
await $`pnpm build:js`;

await $`pnpm firefox:patch`;
await $`pnpm dev:once`;
await $`pnpm build:types`;

// Create an empty config file to avoid loading the global user config.
await $.touch("src/glide.ts");
