import assert from "assert";
import chalk from "chalk";
import { execa, ExecaError } from "execa";
import fs from "fs/promises";
import Path from "path";
import { DOCS_DIR, DOCS_DIST_DIR, GLIDE_BROWSER_CONTENT_DIR, ROOT_DIR } from "./canonical-paths.mts";
import { indent } from "./util.mts";

async function main() {
  const snippets_dir = Path.join(DOCS_DIST_DIR, "snippets");

  await fs.rm(snippets_dir, { force: true, recursive: true }).catch(() => null);
  await fs.mkdir(snippets_dir);

  await fs.copyFile(
    Path.join(GLIDE_BROWSER_CONTENT_DIR, "test", "config", "types", "tsconfig.json"),
    Path.join(snippets_dir, "tsconfig.json"),
  );

  const bundled_types_path = Path.join(GLIDE_BROWSER_CONTENT_DIR, "dist", "bundled.compiled.d.ts");

  const snippets: Array<{ path: string; location: string }> = [];

  for await (
    const entry of fs.glob("**/*.md", {
      cwd: DOCS_DIR,
      withFileTypes: true,
    })
  ) {
    if (entry.name === "api.md") {
      // errors with the tsc setup for these snippets and we can't disable
      // checking them because the `{%` syntax messes up in-editor highlighting
      continue;
    }

    const abs_path = Path.join(entry.parentPath, entry.name);

    const relative_path = Path.relative(DOCS_DIR, abs_path);
    const dist = Path.join(snippets_dir, relative_path.replace(".md", ""));
    await fs.mkdir(dist, { recursive: true });

    let i = 0;

    const contents = await fs.readFile(abs_path, "utf8");
    for (const match of contents.matchAll(/```typescript(.*?)\n(.*?)```/gms)) {
      const attrs = parse_attrs(match[1]!);
      if (!attrs.check) {
        continue;
      }

      const code = match[2]!;
      const filename = `${i}.ts`;
      i++;

      const snippet_path = Path.join(dist, filename);
      await fs.writeFile(
        snippet_path,
        (attrs.highlight_prefix || "") + code + (attrs.highlight_prefix === "type x = {" ? "\n}" : ""),
      );

      const line_number = contents.slice(0, match.index).split("\n").length;
      const location = `${relative_path}:${line_number}`;

      snippets.push({ path: snippet_path, location });
    }
  }

  const parsed_errors = new Map<string, string[]>();

  const result = await execa(Path.join(ROOT_DIR, "node_modules", ".bin", "tsc"), [
    "--noEmit",
    "--pretty",
    ...snippets.map((s) => s.path),
    bundled_types_path,
  ], { cwd: snippets_dir, stdio: "pipe", all: true }).catch((err) => err as ExecaError);

  const path_to_location = new Map(snippets.map((s) => [Path.relative(snippets_dir, s.path), s.location]));

  if (result.exitCode !== 0) {
    assert(typeof result.all === "string");

    const ansi = "(?:\x1b\\[[0-9;]*m)*";
    const error_regex = new RegExp(`^${ansi}(.+?\\.ts)${ansi}:${ansi}\\d+${ansi}:${ansi}\\d+${ansi} - `);
    for (const line of result.all.split("\n")) {
      const match = line.match(error_regex);
      if (!match) {
        continue;
      }

      const error_path = match[1]!;
      const location = path_to_location.get(error_path);
      if (!location) {
        continue;
      }

      var lines = parsed_errors.get(location);
      if (!lines) {
        lines = [];
        parsed_errors.set(location, lines);
      }
      lines.push(line);
    }
  }

  for (const { location } of snippets) {
    const error = parsed_errors.get(location);
    if (error) {
      console.log(chalk.red("error"), location);
      console.log(indent(error.join("\n")));
    } else {
      console.log(chalk.green("pass"), "", location);
    }
  }

  if (parsed_errors.size > 0) {
    console.log();
    console.log("====== logs  ======");
    console.log(result.all);
    console.log("====== /logs ======");
    console.log();
    console.log(
      `The following ${parsed_errors.size} docs example snippet${
        parsed_errors.size !== 1 ? "s" : ""
      } did not type check:`,
    );

    for (const location of parsed_errors.keys()) {
      console.log(`- ${location}`);
    }

    console.log(`To fix these, you should either add {% check="false" %} or fix the example snippet`);

    process.exit(1);
  }

  if (result.exitCode !== 0) {
    console.log(`tsc exited 0 but we could not figure out why; logs below:`);
    console.log(result.all);
    process.exit(2);
  }
}

interface CodeMeta {
  check: boolean;
  highlight_prefix?: string;
}

function parse_attrs(attrs: string): CodeMeta {
  const parsed: CodeMeta = { check: true };

  attrs = attrs.trim();

  if (!attrs || !attrs.startsWith("{% ") || !attrs.endsWith(" %}")) {
    return parsed;
  }

  const inner = attrs.slice(3, -3);

  for (const match of inner.matchAll(/(.*?)="(.*?)"/g)) {
    const name = match[1]!;
    const value = match[2]!;

    switch (name) {
      case "highlight_prefix": {
        parsed.highlight_prefix = value;
        break;
      }
      case "check": {
        // TODO
        parsed.check = false;
        break;
      }
      default:
        throw new Error(`Unexpected code highlight attribute ${name}`);
    }
  }
  return parsed;
}

await main();
