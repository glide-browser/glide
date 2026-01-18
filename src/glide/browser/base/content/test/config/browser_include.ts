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
  await reload_config(function _() {});
});

add_task(async function test_include_basic_functionality() {
  await write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await reload_config(function _() {
    glide.include("included.ts");
  });

  await sleep_frames(10);

  ok(glide.g.include_called, "the included.ts file was executed");
});

add_task(async function test_unstable_include_still_works() {
  await write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await reload_config(function _() {
    glide.unstable.include("included.ts");
  });

  await sleep_frames(10);

  ok(glide.g.include_called, "the included.ts file was executed");
});

add_task(async function test_include_absolute_path() {
  await write_config(function _() {
    glide.g.include_called = true;
  }, "included.ts");

  await reload_config(function _() {
    glide.include(glide.path.join(glide.path.profile_dir, "glide", "included.ts"));
  });

  await sleep_frames(10);

  ok(glide.g.include_called, "the included.ts file was executed");
});

add_task(async function test_include_nested_absolute() {
  await write_config(function _() {
    glide.g.calls!.push("included.ts");
    glide.include(glide.path.join(glide.path.profile_dir, "glide", "other.glide.ts"));
  }, "included.ts");

  await write_config(function _() {
    glide.g.calls!.push("other.glide.ts");
  }, "other.glide.ts");

  await reload_config(function _() {
    glide.g.calls = [];
    glide.include(glide.path.join(glide.path.profile_dir, "glide", "included.ts"));
  });

  await waiter(() => glide.g.calls).isjson(["included.ts", "other.glide.ts"], "nested include() calls should work");
});

add_task(async function test_include_nested_relative() {
  await write_config(function _() {
    glide.g.calls!.push("my-plugin/glide.ts");
    glide.include("opts.glide.ts");
  }, "plugins/my-plugin/glide.ts");

  await write_config(function _() {
    glide.g.calls!.push("my-plugin/opts.glide.ts");
  }, "plugins/my-plugin/opts.glide.ts");

  await reload_config(function _() {
    glide.g.calls = [];
    glide.include(glide.path.join(glide.path.profile_dir, "glide", "plugins", "my-plugin", "glide.ts"));
  });

  await waiter(() => glide.g.calls).isjson(
    ["my-plugin/glide.ts", "my-plugin/opts.glide.ts"],
    "relative include() paths should be resolved relative to the config file that executed it",
  );
});

add_task(async function test_include_fs_relative_api() {
  await glide.fs.write(PathUtils.join(PathUtils.profileDir, "glide", "data.txt"), "Data from glide profile");
  await glide.fs.write(
    PathUtils.join(PathUtils.profileDir, "glide", "plugins", "my-plugin", "data.txt"),
    "Data from my-plugin",
  );

  await write_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.g.value = await glide.fs.read("data.txt", "utf8");
    });
  }, "plugins/my-plugin/glide.ts");

  await reload_config(function _() {
    glide.keymaps.set("normal", "P", async () => {
      glide.g.value = await glide.fs.read("data.txt", "utf8");
    });

    glide.include("plugins/my-plugin/glide.ts");
  });

  await keys("~");
  await waiter(() => typeof glide.g.value).is("string");
  is(
    glide.g.value,
    "Data from my-plugin",
    "glide.fs.read() should read the file relative to the file it was called from",
  );

  glide.g.value = undefined;
  await keys("P");
  await waiter(() => typeof glide.g.value).is("string");
  is(
    glide.g.value,
    "Data from glide profile",
    "glide.fs.read() should read the file relative to the file it was called from",
  );
});
