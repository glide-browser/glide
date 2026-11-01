import { execa } from "execa";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import Path from "node:path";
import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { ENGINE_DIR, ROOT_DIR, SRC_DIR } from "../canonical-paths.mts";
import { apply_git_patches, get_patch_args } from "./patch.mts";

// run against a scratch engine + src dir instead of the real checkout
vi.mock(import("../canonical-paths.mts"), async (import_original) => {
  const root = await fs.mkdtemp(Path.join(tmpdir(), "glide-patch-test-"));
  return {
    ...(await import_original()),
    ROOT_DIR: root,
    ENGINE_DIR: Path.join(root, "engine"),
    SRC_DIR: Path.join(root, "src"),
  };
});
if (!ROOT_DIR.startsWith(tmpdir() + Path.sep)) {
  throw new Error(`refusing to run the patch tests against ${ROOT_DIR}`);
}

const FILE = "toolkit/example.js";
const ORIGINAL = lines("one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten");

beforeEach(async () => {
  await fs.rm(ROOT_DIR, { recursive: true, force: true });
  await fs.mkdir(ENGINE_DIR, { recursive: true });
  await fs.mkdir(SRC_DIR, { recursive: true });
  await git("init", "--quiet");

  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  await fs.rm(ROOT_DIR, { recursive: true, force: true });
});

test("applies a patch to a pristine file", async () => {
  await commit_upstream({ [FILE]: ORIGINAL });
  await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));

  expect(await patch()).toEqual([]);
  expect(await read_engine_file(FILE)).toBe(ORIGINAL.replace("two\n", "two (glide)\n"));
});

test("applies patches from the top-level patches dir", async () => {
  await commit_upstream({ [FILE]: ORIGINAL });
  const patch_path = await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));
  await fs.mkdir(Path.join(ROOT_DIR, "patches"));
  await fs.rename(patch_path, Path.join(ROOT_DIR, "patches", "example.patch"));

  expect(await patch()).toEqual([]);
  expect(await read_engine_file(FILE)).toBe(ORIGINAL.replace("two\n", "two (glide)\n"));
});

test("re-applying a patch doesn't change anything", async () => {
  await commit_upstream({ [FILE]: ORIGINAL });
  await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));

  expect(await patch()).toEqual([]);
  expect(await patch()).toEqual([]);
  expect(await read_engine_file(FILE)).toBe(ORIGINAL.replace("two\n", "two (glide)\n"));
});

test("only changes the files that are patched", async () => {
  await commit_upstream({ [FILE]: ORIGINAL, "toolkit/other.js": ORIGINAL });
  await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));

  expect(await patch()).toEqual([]);
  expect(await git("status", "--porcelain")).toBe(` M ${FILE}`);
});

test("reports a patch that no longer applies", async () => {
  await commit_upstream({ [FILE]: ORIGINAL });
  await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));
  await commit_upstream({ [FILE]: ORIGINAL.replace("two\n", "two (upstream)\n") });

  expect(await patch()).toEqual([`src/${FILE}.patch`]);
  expect(await read_engine_file(FILE)).toBe(ORIGINAL.replace("two\n", "two (upstream)\n"));
});

test("keeps changes to a patched file that haven't been exported yet", async () => {
  await commit_upstream({ [FILE]: ORIGINAL });
  await create_patch(FILE, ORIGINAL.replace("two\n", "two (glide)\n"));
  expect(await patch()).toEqual([]);

  await write_engine_file(FILE, (await read_engine_file(FILE)).replace("nine\n", "nine (unexported)\n"));

  expect(await patch()).toEqual([]);
  expect(await read_engine_file(FILE)).toBe(
    ORIGINAL.replace("two\n", "two (glide)\n").replace("nine\n", "nine (unexported)\n"),
  );
});

function lines(...lines: string[]): string {
  return lines.join("\n") + "\n";
}

async function patch(): Promise<string[]> {
  const ctx = { errors: [] };
  await apply_git_patches(ctx, get_patch_args({ allow_partial: false }));
  return ctx.errors;
}

async function git(...args: string[]): Promise<string> {
  const result = await execa("git", [
    "-c",
    "user.name=glide",
    "-c",
    "user.email=glide@example.com",
    "-c",
    "commit.gpgsign=false",
    ...args,
  ], { cwd: ENGINE_DIR, stripFinalNewline: false });
  return result.stdout.trimEnd();
}

/**
 * Commit the given files to the engine, like a new Firefox version would.
 */
async function commit_upstream(files: Record<string, string>) {
  for (const [file, contents] of Object.entries(files)) {
    await write_engine_file(file, contents);
  }
  await git("add", "--all");
  await git("commit", "--quiet", "--message", "upstream");
}

/**
 * Create a patch that changes the engine `file` from `HEAD` to `contents`, the same way that `pnpm export` does,
 * while leaving the engine file itself as it was.
 */
async function create_patch(file: string, contents: string): Promise<string> {
  const previous = await read_engine_file(file);
  await write_engine_file(file, contents);
  const { stdout: diff } = await execa("git", ["diff", "--src-prefix=a/", "--dst-prefix=b/", "--full-index", file], {
    cwd: ENGINE_DIR,
    stripFinalNewline: false,
  });
  await write_engine_file(file, previous);

  const patch_path = Path.join(SRC_DIR, `${file}.patch`);
  await fs.mkdir(Path.dirname(patch_path), { recursive: true });
  await fs.writeFile(patch_path, diff);
  return patch_path;
}

async function read_engine_file(file: string): Promise<string> {
  return await fs.readFile(Path.join(ENGINE_DIR, file), "utf8");
}

async function write_engine_file(file: string, contents: string) {
  await fs.mkdir(Path.dirname(Path.join(ENGINE_DIR, file)), { recursive: true });
  await fs.writeFile(Path.join(ENGINE_DIR, file), contents);
}
