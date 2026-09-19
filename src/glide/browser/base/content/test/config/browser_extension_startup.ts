// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

/**
 * Regression tests for using `browser` while the builtin extension is still starting up.
 *
 * At real browser startup the window can finish its startup before the extension's background
 * page exists, which used to surface as "Tried to access `browser` too early in startup" for
 * listeners registered at the top level of the config (including glide's own) and for `browser`
 * calls made before `ConfigLoaded`. Tests can't observe real startup, and in a warm extension
 * process the background comes up too quickly to catch, so we simulate the precondition: no
 * background context and a `starting` state while the config is loaded, and then reload the
 * addon for real so that the genuine "background started" signal releases the deferred work.
 */

const ADDON_ID = "glide-internal@mozilla.org";

declare global {
  interface GlideGlobals {
    created?: number;
    tab_count?: number;
  }
}

/**
 * Runs `fn` while the extension looks like it is still starting up (as at real browser startup),
 * then restores the real state and reloads the addon.
 */
async function while_extension_starting(fn: () => Promise<void>): Promise<void> {
  const extension = GlideBrowser.extension;
  const real_state = extension.backgroundState;

  // the parent API is cached after first use, drop it so that the code under test has to go
  // through the same path it does at startup
  delete (GlideBrowser as { browser_parent_api?: unknown }).browser_parent_api;

  Object.defineProperty(extension, "backgroundContext", { get: () => undefined, configurable: true });
  extension.backgroundState = "starting";
  try {
    await fn();

    // keep the simulated state until the reload has replaced this extension instance: if it
    // looked "running" again before that, work deferred until the extension is ready would run
    // against the instance that is about to be thrown away.
    const addon = await AddonManager.getAddonByID(ADDON_ID);
    await addon.reload();
  } finally {
    delete (extension as { backgroundContext?: unknown }).backgroundContext;
    extension.backgroundState = real_state;
  }
}

add_task(async function test_top_level_browser_listener_while_extension_starting() {
  await write_config(function _() {
    glide.g.created = 0;
    browser.tabs.onCreated.addListener(() => {
      glide.g.created!++;
    });
  });

  await while_extension_starting(async () => {
    // like real startup: the config is loaded (and the listener registered) while the
    // background is still starting
    await GlideBrowser.reload_config(/* all_windows */ false);
  });

  // the listener is attached once glide sees the extension as ready, give that a moment to
  // happen before creating the tab it should observe
  await GlideBrowser.wait_for_extension_ready();
  await sleep_frames(5);

  using _tab = await GlideTestUtils.new_tab();
  await waiter(() => glide.g.created).is(1, "the listener registered while the extension was starting should work");
});

add_task(async function test_browser_call_while_extension_starting() {
  await write_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.g.tab_count = (await browser.tabs.query({})).length;
    });
  });

  await while_extension_starting(async () => {
    await GlideBrowser.reload_config(/* all_windows */ false);
    await glide.keys.send("~");

    // the call should wait for the extension instead of throwing (or resolving against nothing)
    await sleep_frames(10);
    is(glide.g.tab_count, undefined, "the `browser` call should not resolve while the extension is starting");
  });

  await waiter(() => glide.g.tab_count).is(
    gBrowser.tabs.length,
    "`browser` calls made while the extension was starting should resolve once it is running",
  );
});

add_task(async function test_config_loaded_after_addon_restart() {
  // `ConfigLoaded` must fire against the *new* background after the addon was reloaded
  await reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      glide.g.tab_count = (await browser.tabs.query({})).length;
    });
  });

  await waiter(() => glide.g.tab_count).is(gBrowser.tabs.length);
});
