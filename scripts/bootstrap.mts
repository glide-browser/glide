import { $ } from "zx";
import { ROOT_DIR } from "./canonical-paths.mts";

$.cwd = ROOT_DIR;

$.stdio = "inherit";

$.log = (entry) => {
  switch (entry.kind) {
    case "cd": {
      console.log("[cd]", entry.dir);
      break;
    }
    case "cmd": {
      console.log("+", entry.cmd);
      break;
    }
    case "stdout": {
      process.stdout.write(entry.data.toString());
      break;
    }
    case "stderr": {
      process.stderr.write(entry.data.toString());
      break;
    }
  }
};

if (!process.argv.includes("--offline")) {
  await $`pnpm firefox:download`;
}

await $`./scripts/bundle.sh`;
await $`./scripts/generate-types.sh`;

await $`pnpm build:ts`;
await $`pnpm build:docs:html`;
await $`pnpm build:docs:index`;
await $`pnpm build:js`;

await $`pnpm firefox:patch`;
await $`pnpm dev:once`;
await $`pnpm build:types`;

// Create an empty config file to avoid loading the global user config.
await $`touch src/glide.ts`;
