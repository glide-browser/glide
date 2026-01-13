import { fileURLToPath } from "url";
import { $ } from "./zx.mts";

$.set_root_dir();

export async function check_config() {
  if (process.platform !== "win32") {
    return;
  }

  const symlinks = await $({ stdio: "pipe" })`git config core.symlinks`.text().then((t) => t.trim());
  if (symlinks !== "true") {
    console.error("Git symlinks are not enabled; this will break the core browser build.");
    console.error("");
    console.error("You must run the following command to enable symlinks");
    console.error("");
    console.error("  $ git config core.symlinks true");
    console.error("");
    console.error("Then to actually fix the symlinks you must reset all local changes:");
    console.error("WARNING: this will delete any local changes you've made.");
    console.error("         make sure you've backed up changes beforehand.");
    console.error("");
    console.error("  $ git rm -r --cached . && git reset --hard HEAD");
    console.error("");

    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await check_config().catch($.handle_error);
}
