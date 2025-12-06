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
  await GlideTestUtils.write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await GlideTestUtils.reload_config(function _() {
    glide.unstable.include("included.ts");
  });

  await sleep_frames(10);

  ok(glide.g.include_called, "the included.ts file was executed");
});

add_task(async function test_include_absolute_path() {
  await GlideTestUtils.write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await GlideTestUtils.reload_config(function _() {
    glide.unstable.include(glide.path.join(glide.path.profile_dir, "glide", "included.ts"));
  });

  await sleep_frames(10);

  ok(glide.g.include_called, "the included.ts file was executed");
});

add_task(async function test_include_nested_absolute() {
  await GlideTestUtils.write_config(function _() {
    glide.g.calls!.push("included.ts");
    glide.unstable.include(glide.path.join(glide.path.profile_dir, "glide", "other.glide.ts"));
  }, "included.ts");

  await GlideTestUtils.write_config(function _() {
    glide.g.calls!.push("other.glide.ts");
  }, "other.glide.ts");

  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];
    glide.unstable.include(glide.path.join(glide.path.profile_dir, "glide", "included.ts"));
  });

  await waiter(() => glide.g.calls).isjson(["included.ts", "other.glide.ts"], "nested include() calls should work");
});

add_task(async function test_include_nested_relative() {
  await GlideTestUtils.write_config(function _() {
    glide.g.calls!.push("my-plugin/glide.ts");
    glide.unstable.include("opts.glide.ts");
  }, "plugins/my-plugin/glide.ts");

  await GlideTestUtils.write_config(function _() {
    glide.g.calls!.push("my-plugin/opts.glide.ts");
  }, "plugins/my-plugin/opts.glide.ts");

  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];
    glide.unstable.include(glide.path.join(glide.path.profile_dir, "glide", "plugins", "my-plugin", "glide.ts"));
  });

  await waiter(() => glide.g.calls).isjson(
    ["my-plugin/glide.ts", "my-plugin/opts.glide.ts"],
    "relative include() paths should be resolved relative to the config file that executed it",
  );
});
