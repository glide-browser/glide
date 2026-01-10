import { fileURLToPath } from "url";
import { check_types } from "./check-types.mts";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function lint() {
  console.log("==> Checking types");
  await check_types();

  console.log("==> Checking oxlint");
  await $`pnpm oxlint`;

  console.log("==> Checking license comments");
  // note: run `pnpm fix:license` to autofix most cases
  await $`pnpm check:license`;

  console.log("==> Checking formatting");
  await $`pnpm fmt:check`;

  if (await $.which("zizmor", { nothrow: true })) {
    console.log("==> Running zizmor");
    await $`zizmor .`;
  } else if (!process.env["CI"]) {
    // we run zizmor in a separate action in CI
    process.stderr.write("zizmor command not found; github workflow lints cannot be ran\n");
    process.stderr.write("\n");
    process.stderr.write("please install it from https://docs.zizmor.sh/installation/\n");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await lint().catch($.handle_error);
}
