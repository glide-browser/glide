// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_current_version_is_stored_in_profile() {
  const versions_path = glide.path.join(glide.path.profile_dir, ".glide", "versions.json");
  await waiter(() => glide.fs.exists(versions_path)).ok();

  const contents = await glide.fs.read(versions_path, "utf8");
  const data = JSON.parse(contents) as any;
  is(data[Services.appinfo.version], true);
});
