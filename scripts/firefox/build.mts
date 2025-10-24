import { execa } from "execa";
import { ENGINE_DIR } from "../canonical-paths.mts";
import { patch_mozconfig } from "./patch.mts";

async function main() {
  await patch_mozconfig();

  await execa("./mach", ["build"], { stdio: "inherit", cwd: ENGINE_DIR });
}

await main();
