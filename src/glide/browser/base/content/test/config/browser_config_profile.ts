/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(async function test_glide_api_dts_exists() {
  const path = PathUtils.join(PathUtils.profileDir, "glide", "glide.d.ts");
  ok(await IOUtils.exists(path), `${path} should exist in the profile directory`);
});
