import { bundle } from "./bundle.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

if (!process.argv.includes("--offline")) {
  await $`pnpm firefox:download`;
}

await bundle();

await $`./scripts/generate-types.sh`;

await $`pnpm build:ts`;
await $`pnpm build:docs:html`;
await $`pnpm build:docs:index`;
await $`pnpm build:js`;

await $`pnpm firefox:patch`;
await $`pnpm dev:once`;
await $`pnpm build:types`;

// Create an empty config file to avoid loading the global user config.
await $.touch("src/glide.ts");
