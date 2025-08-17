/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { dedent } = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");
const { fetch_resource } = ChromeUtils.importESModule("chrome://glide/content/utils/resources.mjs");

export async function init() {
  const dirs = GlideBrowser.config_dirs
    // `config_dirs` is ordered by most specific, but for this case the more general dir
    // is what we want to be selected first
    .slice()
    .reverse();

  const options = dirs.map(({ path, description }) =>
    // for long paths, the current UI will just truncate them which isn't useful at all
    // so until we can make the UI better (which seems annoying), just show the description
    path.length > 30 ? "<" + description + " dir>" : path
  );

  const choice = await Services.prompt.asyncSelect(
    browsingContext,
    Services.prompt.MODAL_TYPE_TAB!,
    "title",
    "Choose a directory to define the glide config in. Use arrows to select.",
    options,
  );
  const ok = choice.getPropertyAsBool("ok");
  if (!ok) {
    GlideBrowser._log.debug("[config_init]: modal dialog was closed");
    return;
  }

  const config_dir = dirs[choice.getPropertyAsInt32("selected")]!.path!;
  GlideBrowser._log.debug(`[config_init]: selected dir: ${config_dir}`);

  await IOUtils.makeDirectory(config_dir, { createAncestors: true, ignoreExisting: true });
  await write_d_ts(config_dir);
  await IOUtils.writeUTF8(PathUtils.join(config_dir, "glide.ts"), DEFAULT_CONFIG);
  await IOUtils.writeUTF8(PathUtils.join(config_dir, "tsconfig.json"), DEFAULT_TSCONFIG);
  await IOUtils.writeUTF8(PathUtils.join(config_dir, "package.json"), DEFAULT_PACKAGE_JSON);

  GlideBrowser.add_notification(GlideBrowser.config_pending_notification_id, {
    label: "Reload the config to ensure the setup worked!",
    priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
    buttons: [
      {
        "l10n-id": "glide-error-notification-reload-config-button",
        callback: () => {
          GlideBrowser.reload_config();
        },
      },
    ],
  });
}

export async function write_d_ts(dir: string) {
  await IOUtils.writeUTF8(
    PathUtils.join(dir, "glide.d.ts"),
    await fetch_resource("chrome://glide/content/glide.d.ts", { loadUsingSystemPrincipal: true }),
  );
}

const DEFAULT_CONFIG = dedent`
  // Config docs:
  //
  //   https://glide-browser.app/config
  //
  // API reference:
  //
  //   https://glide-browser.app/api
  //
  // Try typing \`glide.\` and see what you can do!
`;

const DEFAULT_TSCONFIG = dedent`
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "exclude": [
    "node_modules"
  ],
  "compilerOptions": {
    "lib": ["DOM", "ES2022"],
    "types": [
      "./glide.d.ts"
    ],
    "target": "ES2024",
    "module": "nodenext",
    "moduleDetection": "force",
    "allowJs": true,
    "noEmit": true,
    /**
     * Recommended type checking rules.
     *
     * Feel free to modify these.
     */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "skipLibCheck": true,
    "noErrorTruncation": true,
    "allowImportingTsExtensions": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
`;

const DEFAULT_PACKAGE_JSON = dedent`
{
  "name": "glide-config",
  "private": true,
  "version": "0.0.1",
  "description": "",
  "scripts": {
    "tsc": "tsc"
  },
  "keywords": [],
  "author": "",
  "license": "",
  "dependencies": {
    "typescript": "^5.8.3"
  },
  "devDependencies": {}
}
`;
