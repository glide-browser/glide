import fs from "fs/promises";
import ini from "ini";
import Path from "node:path";
import xml from "xmlbuilder2";
import config from "../../firefox.json" with { type: "json" };
import { assert_never } from "../../src/glide/browser/base/content/utils/guards.mts";
import { DIST_DIR } from "../canonical-paths.mts";
import { does_not_exist, exists } from "../util.mts";
import {
  engine_run,
  expect_compat_mode,
  generate_file_hash,
  get_compat_mode,
  get_platform,
  resolve_obj_dir,
} from "./util.mts";

interface ReleaseInfo {
  display_version: string;
  github: {
    repo: string;
  };
}

/**
 * These are all of the different platforms that aus should deploy to.
 *
 * Based off the code from mozrelease:
 * https://searchfox.org/mozilla-central/source/python/mozrelease/mozrelease/platforms.py
 * https://searchfox.org/mozilla-central/source/taskcluster/gecko_taskgraph/util/partials.py
 */
const AUS_PLATFORMS_MAP = {
  linux_64: ["Linux_x86_64-gcc3"],
  linux_arm: ["Linux_aarch64-gcc3"],
  macos_intel: [
    "Darwin_x86_64-gcc3-u-i386-x86_64",
    "Darwin_x86-gcc3-u-i386-x86_64",
    "Darwin_x86-gcc3",
    "Darwin_x86_64-gcc3",
  ],
  macos_arm: ["Darwin_aarch64-gcc3"],
  windows_64: ["WINNT_x86_64-msvc-x64"],
  windows_arm: ["WINNT_aarch64-msvc-aarch64"],
};

async function main() {
  const channel = "glide";
  const version = config.brands[channel].release.display_version;

  const obj_dir = await resolve_obj_dir();
  console.log("Resolved obj dir to", obj_dir);

  if (await does_not_exist(DIST_DIR)) {
    await fs.mkdir(DIST_DIR, { recursive: true });
  }

  await engine_run("./mach", ["package"]);
  await engine_run("./mach", ["package-multi-locale", "--locales", ...(await get_locales())]);

  const files = (await fs.readdir(Path.join(obj_dir, "dist"), { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  for (const file of files) {
    const dest_file = Path.join(
      DIST_DIR,
      file.includes(".installer.exe") ? `glide.windows-${expect_compat_mode()}.installer.exe` : file,
    );
    console.log(`Copying ${file} to ${Path.basename(dest_file)}`);

    if (await exists(dest_file)) {
      await fs.unlink(dest_file);
    }
    await fs.copyFile(Path.join(obj_dir, "dist", file), dest_file);
  }

  const mar_path = await create_mar_file({ obj_dir, version, channel });
  if (mar_path) {
    await generate_browser_update_files({ obj_dir, mar_path, channel });
  }

  console.log();
  console.log(`Output written to ${DIST_DIR}`);
}

async function get_locales() {
  // note: this file doesn't exist yet
  const locales = await fs.readFile("l10n/supported-languages", "utf-8").catch(() => "en-US").then((contents) =>
    contents.split("\n")
  );
  console.log(`locales:\n${locales.map((locale) => "- " + locale)}`);
  return locales;
}

async function create_mar_file(
  { obj_dir, version, channel }: { obj_dir: string; version: string; channel: string },
): Promise<string | null> {
  const platform = get_platform();
  switch (platform) {
    // updates are disabled
    case "linux":
      return null;
  }

  const mar_binary = Path.join(obj_dir, "dist/host/bin", platform === "windows" ? "mar.exe" : "mar");
  const binary = platform === "macos"
    ? Path.join(obj_dir, "dist", config.binary_name, "Glide.app")
    : Path.join(obj_dir, "dist", config.binary_name);

  const mar_path = Path.resolve(DIST_DIR, "output.mar");
  console.debug(`Writing MAR to ${mar_path} from ${binary}`);

  const to_shell_path = (p: string) => platform === "windows" ? p.replace(/\\/g, "/") : p;

  await engine_run("./tools/update-packaging/make_full_update.sh", [to_shell_path(DIST_DIR), to_shell_path(binary)], {
    env: {
      MAR: to_shell_path(mar_binary),
      MAR_CHANNEL_ID: channel,
      MOZ_PRODUCT_VERSION: version,
    },
  });
  return mar_path;
}

async function generate_browser_update_files(
  { obj_dir, mar_path, channel }: { obj_dir: string; mar_path: string; channel: "glide" },
) {
  console.info("Creating browser AUS update files");

  const release_info = config.brands[channel].release;
  const version = release_info.display_version;
  const platform_config = await get_platform_config({ obj_dir });

  const update_object = {
    updates: {
      update: {
        // TODO: Correct update type from semver, store the old version somewhere
        "@type": "minor",
        "@displayVersion": version,
        "@appVersion": version,
        "@platformVersion": config.version.version,
        "@buildID": platform_config["Build"].BuildID,

        patch: {
          // TODO: Partial patches might be nice for download speed
          "@type": "complete",
          "@URL": get_release_mar_url(release_info),
          "@hashFunction": "sha512",
          "@hashValue": await generate_file_hash(mar_path, "sha512"),
          "@size": (await fs.stat(mar_path)).size,
        },
      },
    },
  };

  for (const target of get_targets()) {
    await write_update_file_to_disk(target, channel, update_object);
  }
}

async function write_update_file_to_disk(
  target: string,
  channel: string,
  updateObject: {
    updates: { update: Record<string, any> };
  },
) {
  const document = xml.create(updateObject);

  const xml_path = Path.join(DIST_DIR, "update", "browser", target, channel, "update.xml");
  await ensure_empty(Path.dirname(xml_path));

  await fs.writeFile(xml_path, document.end({ prettyPrint: true }));
}

async function get_platform_config({ obj_dir }: { obj_dir: string }) {
  let platform_ini = Path.join(obj_dir, "dist", config.binary_name, "platform.ini");
  if (await does_not_exist(platform_ini)) {
    platform_ini = Path.join(obj_dir, "dist", "bin", "platform.ini");
  }
  return ini.parse(await fs.readFile(platform_ini, "utf8"));
}

function get_release_mar_name(): string {
  const platform = get_platform();
  const compat = get_compat_mode();
  switch (platform) {
    case "macos": {
      switch (compat) {
        case "x86_64":
          return "macos-x86_64.mar";
        case "aarch64":
          return "macos-aarch64.mar";
        case null:
          return "macos.mar";
        default:
          throw assert_never(compat);
      }
    }
    case "linux": {
      switch (compat) {
        case "x86_64":
          return "linux-x86_64.mar";
        case "aarch64":
          return "linux-aarch64.mar";
        case null:
          return "linux.mar";
        default:
          throw assert_never(compat);
      }
    }
    case "windows": {
      switch (compat) {
        case "x86_64":
          return "windows-x86_64.mar";
        case "aarch64":
          return "windows-aarch64.mar";
        case null:
          return "windows.mar";
        default:
          throw assert_never(compat);
      }
    }
    default:
      throw assert_never(platform);
  }
}

function get_release_mar_url(releaseInfo: ReleaseInfo) {
  const mar_name = get_release_mar_name();
  const mar_url =
    `https://github.com/${releaseInfo.github.repo}/releases/download/${releaseInfo.display_version}/${mar_name}`;
  console.info(`Using '${mar_url}' as the MAR url`);
  return mar_url;
}

function get_targets(): string[] {
  const platform = get_platform();
  const compat = get_compat_mode();

  switch (platform) {
    case "macos": {
      switch (compat) {
        case "aarch64":
          return AUS_PLATFORMS_MAP.macos_arm;
        case "x86_64":
        case null:
          return AUS_PLATFORMS_MAP.macos_intel;
        default:
          throw assert_never(compat);
      }
    }

    case "linux": {
      switch (compat) {
        case "aarch64":
          return AUS_PLATFORMS_MAP.linux_arm;
        case "x86_64":
        case null:
          return AUS_PLATFORMS_MAP.linux_64;
        default:
          throw assert_never(compat);
      }
    }
    case "windows": {
      switch (compat) {
        case "aarch64":
          return AUS_PLATFORMS_MAP.windows_arm;
        case "x86_64":
        case null:
          return AUS_PLATFORMS_MAP.windows_64;
        default:
          throw assert_never(compat);
      }
    }
    default:
      throw assert_never(platform);
  }
}

async function ensure_empty(path: string) {
  if (await exists(path)) {
    await fs.rm(path, { recursive: true });
  }

  await fs.mkdir(path, { recursive: true });
}

await main();
