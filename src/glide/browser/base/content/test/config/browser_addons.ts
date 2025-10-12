// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ADDON_ID = "amosigned-xpi@tests.mozilla.org";

async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.install.requireBuiltInCerts", false],
    ],
  });
}

async function teardown() {
  const addon = await AddonManager.getAddonByID(ADDON_ID);
  if (addon) {
    await addon.uninstall();
  }
}

add_task(async function test_install_addon_from_url() {
  await setup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      // mochitest resolves example.com to local files
      const addon = await glide.addons.install_from_url(
        "https://example.com/browser/toolkit/mozapps/extensions/test/xpinstall/amosigned.xpi",
      );

      glide.g.value = addon;
    });
  });

  await waiter(() => GlideBrowser.api.g.value !== undefined).ok("Waiting for addon to be installed");

  const addon = GlideBrowser.api.g.value as glide.Addon;
  is(addon.id, ADDON_ID);
  is(addon.name, "XPI Test");
  ok(addon.active);

  await teardown();
});
