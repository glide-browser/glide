import { main as copy_files } from "./copy-src.mts";
import { main as build_ts } from "./build-ts.mts";
import { main as watch_docs } from "./watch-docs.mts";

copy_files();
build_ts();
watch_docs();
