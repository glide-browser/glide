import { execa } from "execa";

const DEFAULT_TEST = "glide";

function split_test_args(args: string[]) {
  const test_args: string[] = [];
  const flags: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-")) {
      flags.push(arg);
    } else {
      test_args.push(arg);
    }
  }
  return { test_args, flags };
}

async function main() {
  const args = process.argv.slice(2);
  const { test_args, flags } = split_test_args(args);

  const tests = test_args.length === 0 ? [DEFAULT_TEST] : test_args;

  await execa("mach", ["test", ...tests, ...flags], { stdio: "inherit" });
}

await main();
