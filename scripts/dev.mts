import PQueue from "p-queue";
import { main as build_ts } from "./build-ts.mts";
import { main as copy_files } from "./copy-src.mts";
import { main as watch_docs } from "./watch-docs.mts";

export const queue = new PQueue({ concurrency: 1 });

async function main() {
  // if we're not running in watch mode, then we need to do these operations
  // sequentially to make sure that everything works as expected.
  //
  // e.g. if we're building TS files at the same time as copying, then we'll miss copying
  //      some JS files if they were created after the copying was "done".
  if (!process.argv.includes("--watch")) {
    await build_ts();
    await watch_docs();
    await copy_files();
    return;
  }

  void build_ts();
  void watch_docs();
  void copy_files();
}

if (import.meta.url.endsWith(process.argv[1]!)) {
  await main();
}
