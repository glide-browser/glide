/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

declare global {
  interface GlideGlobals {
    include_called?: boolean;
  }
}

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {});
});

add_task(async function test_include_basic_functionality() {
  GlideTestUtils.write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await GlideTestUtils.reload_config(function _() {
    glide.unstable.include("included.ts");
  });

  await sleep_frames(10);

  ok(GlideBrowser.api.g.include_called, "the included.ts file was executed");
});
