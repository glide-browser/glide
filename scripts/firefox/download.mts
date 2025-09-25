import fs from "fs/promises";
import meow from "meow";
import Path from "path";
import config from "../../firefox.json" with { type: "json" };
import { ENGINE_DIR, ROOT_DIR } from "../canonical-paths.mts";
import { exists } from "../util.mts";
import { engine_run, run } from "./util.mts";

const cli = meow({
  importMeta: import.meta,
  allowUnknownFlags: false,
  flags: {
    tar: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    fullHistory: { type: "boolean", default: false },
  },
});

const log = console;

main();

async function main() {
  const tag = config.version.tag;
  const version = config.version.version;

  const tar = cli.flags.tar;
  const force = cli.flags.force;
  const full_history = cli.flags.fullHistory;

  if (force && await exists(ENGINE_DIR)) {
    log.info("Removing existing workspace");
    await fs.rm(ENGINE_DIR, { recursive: true });
  }

  const is_empty = await fs.readdir(ENGINE_DIR)
    .then((files) => files.length === 0)
    .catch(() => false);
  if (is_empty) {
    log.info("'engine/' is empty, removing it...");
    fs.rmdir(ENGINE_DIR, { recursive: true });
  }

  if (tar) {
    const tar_path = Path.join(ROOT_DIR, "firefox.source.tar.xz");

    await run("curl", [
      "-L",
      "-o",
      tar_path,
      `https://download.cdn.mozilla.net/pub/mozilla.org/firefox/releases/${version}/source/firefox-${version}.source.tar.xz`,
    ], { cwd: ROOT_DIR });
    await fs.mkdir(ENGINE_DIR, { recursive: true });

    await run("tar", [
      "xf",
      tar_path,
      "--strip-components=1",
      "-C",
      ENGINE_DIR,
    ]);

    await run("git", ["init"], { cwd: ENGINE_DIR });

    return;
    // curl -L -o firefox.source.tar.xz https://download.cdn.mozilla.net/pub/mozilla.org/firefox/releases/144.0b5/source/firefox-144.0b5.source.tar.xz
    // mkdir -p engine
    // # note: the firefox tar unpacks to firefox-$version/
    // tar xf firefox.source.tar.xz --strip-components=1 -C engine
  }

  if (await exists(ENGINE_DIR)) {
    const was_shallow = await engine_run("git", ["rev-parse", "--is-shallow-repository"])
      .then((result) => result.stdout === "true");

    log.info("running `git fetch`, this may take some time...");
    await engine_run("git", ["fetch", ...(full_history ? ["--unshallow"] : ["--depth=1", "origin", "tag", tag])]);

    const head_sha = await engine_run("git", ["rev-parse", "HEAD"]).then((result) => result.stdout);
    const tag_sha = await engine_run("git", ["rev-parse", tag]).then((result) => result.stdout);

    // if we're converting from a shallow clone to a non-shallow clone
    // then we also need to setup the repo so that the branch history
    // is correctly setup
    if (was_shallow || head_sha !== tag_sha) {
      await setupGitRepo(tag);
    } else {
      log.info(`Already at tag ${tag}`);
    }

    return;
  }

  log.info(`Performing a ${full_history ? "full depth" : "shallow"} clone, this may take a while...`);
  await run("git", [
    "clone",
    ...(full_history ? [] : ["--depth=1", `--branch=${tag}`]),
    "git@github.com:mozilla-firefox/firefox.git",
    ENGINE_DIR,
  ], {
    cwd: ROOT_DIR,
  });
  await setupGitRepo(tag);
}

async function setupGitRepo(tag: string) {
  const dev_branch = `dev-${tag}`;

  // general configuration
  log.info(`Configuring repo`);
  await engine_run("git", ["config", "commit.gpgsign", "false"]);
  await engine_run("git", ["config", "core.safecrlf", "false"]);

  // cleanup any existing code (probably overkill)
  log.info(`Cleaning up repo`);
  await engine_run("git", ["stash", "--include-untracked"]).catch(() => null);
  await engine_run("git", ["clean", "-fd"]).catch(() => null);
  await engine_run("git", ["reset", "--hard", tag]);

  log.info(`Checking out tag ${tag} to branch ${dev_branch}`);

  const current_branch = await engine_run("git", ["branch", "--show-current"]).then((result) => result.stdout);
  if (current_branch !== dev_branch) {
    await engine_run("git", ["branch", "-D", dev_branch]).catch(() => null);
    await engine_run("git", ["switch", "-f", "-c", dev_branch]);
  }
}
