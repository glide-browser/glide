import { execa } from "execa";

const DEFAULT_PATHS = ["glide", "browser/components/test"];

function split_args(args: string[]) {
  const paths: string[] = [];
  const flags: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-")) {
      flags.push(arg);
    } else {
      paths.push(arg);
    }
  }
  return { paths, flags };
}

async function main() {
  const args = process.argv.slice(2);
  let { paths, flags } = split_args(args);
  if (paths.length === 0) {
    paths = DEFAULT_PATHS;
  }

  await execa("mach", ["test", ...paths, ...flags], { stdio: "inherit" });
}

await main();
