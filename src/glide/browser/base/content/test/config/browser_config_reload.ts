// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_config_reload_applies_across_windows() {
  await reload_config(function _() {
    glide.g.value = "initial";
  });

  is(glide.g.value, "initial");

  await using second_window = await GlideTestUtils.new_window();
  is(second_window.GlideBrowser.api.g.value, "initial");

  await write_config(function _() {
    glide.g.value = "reloaded";
  });

  await glide.excmds.execute("config_reload");

  await waiter(() => glide.g.value).is("reloaded", "Value should be updated after reloading the config");
  await waiter(() => second_window.GlideBrowser.api.g.value).is(
    "reloaded",
    "Value in the second window should be updated after reloading the config in the first window",
  );
});
