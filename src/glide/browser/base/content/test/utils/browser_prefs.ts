// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { temp_prefs } = ChromeUtils.importESModule("chrome://glide/content/utils/prefs.mjs", { global: "current" });

add_task(async function test_temp_prefs() {
  await GlideTestUtils.reload_config(function _() {});

  const previous = Services.prefs.getIntPref("toolkit.scrollbox.pagescroll.maxOverlapPercent");

  {
    using prefs = temp_prefs();
    prefs.set("foo", true);
    prefs.set("toolkit.scrollbox.pagescroll.maxOverlapPercent", 50);

    is(Services.prefs.getBoolPref("foo"), true, "The foo pref should be set");
    is(
      Services.prefs.getIntPref("toolkit.scrollbox.pagescroll.maxOverlapPercent"),
      50,
      "The scrollbox pref should be set",
    );
    is(
      Services.prefs.prefHasUserValue("toolkit.scrollbox.pagescroll.maxOverlapPercent"),
      true,
      "The scrollbox pref should be marked as customised",
    );
  }

  is(glide.prefs.get("foo"), undefined, "the foo pref should be cleared entirely as it was not originally set");
  is(
    Services.prefs.getIntPref("toolkit.scrollbox.pagescroll.maxOverlapPercent"),
    previous,
    "The scrollbox pref should be reset",
  );
  is(
    Services.prefs.prefHasUserValue("toolkit.scrollbox.pagescroll.maxOverlapPercent"),
    false,
    "The scrollbox pref should not be marked as customised",
  );
});
