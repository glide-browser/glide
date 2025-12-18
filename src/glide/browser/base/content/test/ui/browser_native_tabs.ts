// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_ui_native_tabs() {
  const navigatorToolbox = document!.getElementById("navigator-toolbox");
  ok(navigatorToolbox, "Element 'navigator-toolbox' should exist.");

  await GlideTestUtils.reload_config(() => {});
  const heightDefault = navigatorToolbox!.clientHeight;

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "show";
  });
  const heightShow = navigatorToolbox!.clientHeight;
  is(heightDefault, heightShow, "glide.ui.native_tabs 'show' option should keep initial toolbox dimensions.");

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "hide";
  });
  const heightHide = navigatorToolbox!.clientHeight;
  ok(heightDefault > heightHide, "glide.ui.native_tabs 'hide' option should shrink the toolbox height.");

  await GlideTestUtils.reload_config(function _() {
    glide.ui.native_tabs = "autohide";
  });
  await waiter(() => {
    const heightAutohide = navigatorToolbox!.clientHeight;
    return heightDefault > heightAutohide && heightAutohide > heightHide;
  }).ok("glide.ui.native_tabs 'autohide' toolbox height should be in range 'show' - 'hide'.");
});
