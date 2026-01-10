import { fileURLToPath } from "url";
import { bundle_types } from "./bundle-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function check_types() {
  await $`pnpm tsc:browser`;

  console.log("============ checking node.js script types ============");
  await $`pnpm tsc:scripts`;

  console.log("============ bundling config types         ============");
  await bundle_types();

  console.log("============ checking bundled config types ============");
  await $`pnpm tsc:config`;

  console.log("============ checking docs example types   ============");
  await $`pnpm tsc:docs`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await check_types();
}
