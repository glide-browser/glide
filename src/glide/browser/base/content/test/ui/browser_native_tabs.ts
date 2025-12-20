// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_ui_native_tabs() {
  const navigator_toolbox = document!.getElementById("navigator-toolbox");
  ok(navigator_toolbox, "Element 'navigator-toolbox' should exist.");

  await GlideTestUtils.reload_config(() => {});
  const height_default = navigator_toolbox!.clientHeight;

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "show";
  });
  const height_show = navigator_toolbox!.clientHeight;
  is(height_default, height_show, "glide.ui.native_tabs 'show' option should keep initial toolbox dimensions.");

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "hide";
  });
  const height_hide = navigator_toolbox!.clientHeight;
  ok(height_default > height_hide, "glide.ui.native_tabs 'hide' option should shrink the toolbox height.");

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "autohide";
  });
  await waiter(() => {
    const height_autohide = navigator_toolbox!.clientHeight;
    return height_default > height_autohide && height_autohide > height_hide;
  }).ok("glide.ui.native_tabs 'autohide' toolbox height should be in range 'show' - 'hide'.");
});
