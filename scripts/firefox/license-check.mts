// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import chalk from "chalk";
import fs from "fs/promises";
import meow from "meow";
import Path from "path";
import { assert_never } from "../../src/glide/browser/base/content/utils/guards.mts";
import { SCRIPTS_DIR, SRC_DIR } from "../canonical-paths.mts";

const FILE_IGNORE_REGEXP = new RegExp(
  ".*\\.(json|patch|md|jpeg|mp4|webm|png|gif|webp|tiff|ico|woff2|DS_Store|gitignore)",
);
const LICENSE_IGNORE_STRING = "license-ignore-file";

const FIXABLE_FILES = [
  { regex: new RegExp(".*\\.(m?)(j|t)s"), comment: "// ", commentClose: "\n" },
  {
    regex: new RegExp(".*(\\.inc)?\\.css"),
    commentOpen: "/*\n",
    comment: " * ",
    commentClose: "\n */",
  },
  {
    regex: new RegExp(".*\\.(html|svg|xml)"),
    commentOpen: "<!--\n",
    comment: "   - ",
    commentClose: "\n   -->",
  },
  {
    regex: new RegExp(".*\\.py|moz\\.build|jar\\.mn|\\.toml"),
    commentOpen: "",
    comment: "# ",
    commentClose: "\n",
  },
];

const cli = meow({
  importMeta: import.meta,
  allowUnknownFlags: false,
  flags: { fix: { type: "boolean", default: false } },
});

main();

async function main() {
  const missing: string[] = [];
  const fixed: string[] = [];
  const license = await fs.readFile(Path.join(SCRIPTS_DIR, "firefox", "license.txt"), "utf8").then((contents) =>
    contents.trimEnd()
  );

  for await (const entry of fs.glob("**/*", { cwd: SRC_DIR, withFileTypes: true, exclude: (p) => p.name === "dist" })) {
    if (entry.isDirectory()) {
      continue;
    }

    const absolute_path = Path.join(entry.parentPath, entry.name);
    const relative_path = Path.relative(SRC_DIR, absolute_path);

    const result = await check_license(relative_path);

    switch (result) {
      case "skip": {
        console.log(chalk.grey("skip"), "    ", relative_path);
        break;
      }
      case "success": {
        console.log(chalk.green("success"), " ", relative_path);
        break;
      }
      case "fix": {
        console.log("");
        if (!cli.flags.fix) {
          missing.push(relative_path);
          console.error(chalk.red("missing"), relative_path);
          break;
        }

        const fixable = FIXABLE_FILES.find(({ regex }) => regex.test(relative_path));
        if (!fixable) {
          missing.push(relative_path);
          console.error(chalk.red("missing"), relative_path);
          break;
        }

        fixed.push(relative_path);

        var header = license
          .split("\n")
          .map((ln) => (fixable.comment) + ln)
          .join("\n");

        if (fixable.commentOpen) {
          header = fixable.commentOpen + header + fixable.commentClose;
        }

        const abs_path = Path.join(SRC_DIR, relative_path);
        await fs.writeFile(abs_path, header + "\n\n" + (await fs.readFile(abs_path, "utf8")));
        console.log(chalk.cyan("fixed"), "   ", relative_path);
        break;
      }
      default:
        throw assert_never(result);
    }
  }

  if (fixed.length) {
    console.log();
    console.log("The following files were automatically fixed:");
    console.log(fixed.map((p) => "  - " + p).join("\n"));
    console.log();
  }

  if (missing.length) {
    console.error();
    console.error("The following files are missing a license:");
    console.error(missing.map((p) => "  - " + p).join("\n"));
    console.error();
    console.error("Run pnpm fix:license or add the license header manually.");
    console.error();
    process.exit(1);
  }
}

async function check_license(relative_path: string): Promise<"skip" | "success" | "fix"> {
  if (
    FILE_IGNORE_REGEXP.test(relative_path)
    // compiled files
    || relative_path.startsWith("glide/docs/dist")
    || relative_path.startsWith("glide/bundled")
    || relative_path.startsWith("glide/generated/")
    || relative_path.endsWith("bundled.compiled.d.ts")
    // Mozilla does not appear to put licenses in these files
    || relative_path.endsWith("chrome.manifest")
  ) {
    return "skip";
  }

  const abs_path = Path.join(SRC_DIR, relative_path);

  const contents = await fs.readFile(abs_path, "utf8");
  if (contents.includes(LICENSE_IGNORE_STRING)) {
    return "skip";
  }

  if (await has_license(contents)) {
    return "success";
  }

  return "fix";
}

async function has_license(contents: string): Promise<boolean> {
  const heading = contents.split("\n").slice(0, 5).join("\n");

  return (heading.includes("the Mozilla Public")
    && heading.includes("If a copy of the MPL was")
    && heading.includes("http://mozilla.org/MPL/2.0/"));
}
