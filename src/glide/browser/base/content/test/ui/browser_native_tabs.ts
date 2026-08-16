// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

/**
 * Firefox 154 moved the tab notification deck into a `#notifications-toolbar` inside
 * `#navigator-toolbox`, so transient infobars (e.g. at startup) change the toolbox height.
 * `native_tabs` only manipulates the tab strip, so exclude the notifications toolbar from
 * all height measurements.
 */
function toolbox_height(toolbox: Element): number {
  const notifications = document!.getElementById("notifications-toolbar");
  return toolbox.clientHeight - (notifications?.clientHeight ?? 0);
}

/**
 * `native_tabs` toggles the tab strip via an async stylesheet, so the toolbox only reflows a frame
 * or two after `reload_config` resolves. read the height once it has settled, otherwise we capture a
 * transient value mid-reflow and the height comparisons flake.
 */
async function settled_toolbox_height(toolbox: Element): Promise<number> {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 120; i++) {
    await sleep_frames(1);
    const height = toolbox_height(toolbox);
    if (height === last) {
      if (++stable >= 5) {
        return height;
      }
    } else {
      stable = 0;
      last = height;
    }
  }
  return last;
}

add_task(async function test_native_tabs() {
  const navigator_toolbox = document!.getElementById("navigator-toolbox");
  ok(navigator_toolbox, "Element 'navigator-toolbox' should exist.");

  await reload_config(() => {});
  const height_default = await settled_toolbox_height(navigator_toolbox!);

  await reload_config(function _() {
    glide.o.native_tabs = "show";
  });
  const height_show = await settled_toolbox_height(navigator_toolbox!);
  is(height_default, height_show, "glide.o.native_tabs 'show' option should keep initial toolbox dimensions.");

  await reload_config(function _() {
    glide.o.native_tabs = "hide";
  });
  const height_hide = await settled_toolbox_height(navigator_toolbox!);
  Assert.greater(height_default, height_hide, "glide.o.native_tabs 'hide' option should shrink the toolbox height.");

  await reload_config(function _() {
    glide.o.native_tabs = "autohide";
  });
  await waiter(() => {
    const height_autohide = toolbox_height(navigator_toolbox!);
    return height_default > height_autohide && height_autohide > height_hide;
  }).ok("glide.o.native_tabs 'autohide' toolbox height should be in range 'show' - 'hide'.");

  await reload_config(() => {});
  const height_reset_default = await settled_toolbox_height(navigator_toolbox!);
  is(height_default, height_reset_default, "Resetting the config should yield the default window height");
});

add_task(async function test_buf_native_tabs() {
  const navigator_toolbox = document!.getElementById("navigator-toolbox");
  ok(navigator_toolbox, "Element 'navigator-toolbox' should exist.");

  await reload_config(() => {});
  const height_default = toolbox_height(navigator_toolbox!);

  await reload_config(function _() {
    glide.bo.native_tabs = "hide";
  });
  const height_hide = toolbox_height(navigator_toolbox!);
  Assert.greater(height_default, height_hide, "glide.bo.native_tabs 'hide' option should shrink the toolbox height.");

  await reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.bo.native_tabs = "hide";
    });
  });
  is(toolbox_height(navigator_toolbox!), height_default);

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    is(glide.bo.native_tabs, "hide");
    is(toolbox_height(navigator_toolbox!), height_hide, "Loading the input_test buffer should hide the native tabs");
  });

  is(toolbox_height(navigator_toolbox!), height_default, "Leaving the input_test buffer should show the native tabs");
});
