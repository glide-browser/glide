import chalk from "chalk";
import { execa } from "execa";
import { ENGINE_DIR } from "../canonical-paths.mts";
import { branding_patch, patch_mozconfig } from "./patch.mts";

async function main() {
  const ctx = { errors: [] as string[] };
  await branding_patch(ctx);
  if (ctx.errors.length) {
    console.error(chalk.red("Branding patch failed:"));
    console.error(ctx.errors.map((err) => `- ${err}`).join("\n"));
    process.exit(1);
  }
  await patch_mozconfig();

  await execa("./mach", ["build"], { stdio: "inherit", cwd: ENGINE_DIR });
}

await main();
