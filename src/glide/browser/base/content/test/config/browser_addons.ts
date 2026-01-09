// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule("resource://testing-common/AddonTestUtils.sys.mjs");

declare global {
  interface GlideGlobals {
    addons?: glide.AddonInstall[];
  }
}

const ADDON_ID = "amosigned-xpi@tests.mozilla.org";
const ADDON_NAME = "XPI Test";

async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.install.requireBuiltInCerts", false],
    ],
  });
}

async function teardown() {
  const uninstalled = new Set<string>();
  for (const addon of glide.g.addons ?? []) {
    if (uninstalled.has(addon.id)) {
      continue;
    }

    await addon.uninstall();
    uninstalled.add(addon.id);
  }
}

add_task(async function test_install_addon_from_url() {
  await setup();

  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      // mochitest resolves example.com to local files
      const addon = await glide.addons.install(
        "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi",
      );

      glide.g.value = addon;
    });
  });

  await waiter(() => glide.g.value !== undefined).ok("Waiting for addon to be installed");

  const addon = glide.g.value as glide.Addon;
  is(addon.id, ADDON_ID);
  is(addon.name, ADDON_NAME);
  is(addon.type, "extension");
  ok(addon.active);

  await addon.uninstall();
});

add_task(async function test_addons_list() {
  await setup();

  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      // mochitest resolves example.com to local files
      glide.g.value = await glide.addons.install(
        "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi",
      );
    });

    glide.keymaps.set("normal", "~", async () => {
      const ADDON_NAME = "XPI Test";

      var addons = await glide.addons.list();
      assert(addons.find((addon) => addon.name === ADDON_NAME));
      // ensure at least none of the builtin addons have an unknown type
      assert(addons.every((addon) => addon.type));

      var addons = await glide.addons.list("extension");
      assert(addons.find((addon) => addon.name === ADDON_NAME));

      var addons = await glide.addons.list(["extension"]);
      assert(addons.find((addon) => addon.name === ADDON_NAME));

      var addons = await glide.addons.list(["extension", "locale", "dictionary"]);
      assert(addons.find((addon) => addon.name === ADDON_NAME));

      var addons = await glide.addons.list(["locale", "dictionary"]);
      assert(!addons.find((addon) => addon.name === ADDON_NAME));

      glide.g.value = true;
    });
  });

  const addon = await until(() => glide.g.value as glide.Addon | undefined);
  glide.g.value = undefined;

  await keys("~");
  await waiter(() => glide.g.value).ok("Waiting for tests to finish");

  await addon.uninstall();

  notok((await glide.addons.list()).find((a) => a.name === ADDON_NAME));
});

add_task(async function test_install_calls_same_url_cached() {
  await setup();

  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      glide.g.addons = [];

      const url = "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi";
      glide.g.addons.push(
        // shouldn't be cached
        await glide.addons.install(url),
        // should be cached
        await glide.addons.install(url),
      );
    });
  });

  await waiter(() => glide.g.addons?.length === 2)
    .ok("Waiting for addons to be installed");

  const addons = glide.g.addons as Tuple<glide.AddonInstall, 2>;

  is(addons[0].id, ADDON_ID);
  is(addons[0].cached, false, "First addon is not cached as it is the first install");

  is(addons[1].id, ADDON_ID);
  is(addons[1].cached, true, "Second addon is cached as the addon is already installed");

  await teardown();
});

add_task(async function test_install_force_reinstall() {
  await setup();

  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      glide.g.addons = [];
      const url = "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi";
      glide.g.addons.push(await glide.addons.install(url), await glide.addons.install(url, { force: true }));
    });
  });

  await waiter(() => glide.g.addons?.length === 2)
    .ok("Waiting for addons to be installed");

  const addons = glide.g.addons as Tuple<glide.AddonInstall, 2>;

  is(addons[0].cached, false, "First addon is not cached");
  is(addons[1].cached, false, "Force install bypasses cache");
  is(addons[0].id, addons[1].id, "Both installs have the same ID");

  await teardown();
});

add_task(async function test_addon_reload_triggers_extension_restart() {
  await setup();

  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      glide.g.value = await glide.addons.install(
        "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi",
      );
    });
  });

  await waiter(() => glide.g.value).ok("Waiting for addon to be installed");

  const addon = glide.g.value as glide.Addon;
  is(addon.id, ADDON_ID);
  ok(addon.active, "Addon is active before reload");

  const startup_promise = AddonTestUtils.promiseWebExtensionStartup(ADDON_ID);

  await addon.reload();

  await startup_promise;

  ok(addon.active, "Addon is still active after reload");
  is(addon.id, ADDON_ID);
  is(addon.name, ADDON_NAME);

  const reloaded = (await glide.addons.list("extension")).find((a) => a.id === ADDON_ID);
  ok(reloaded, "Addon still in list after reload");
  ok(reloaded!.active, "Addon still active after reload");
});
