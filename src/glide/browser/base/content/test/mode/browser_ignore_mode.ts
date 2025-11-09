// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_ignore_mode_new_tab_stays_in_ignore_mode() {
  await glide.excmds.execute("mode_change normal");

  await keys("<S-Esc>");

  try {
    await BrowserTestUtils.withNewTab(FILE, async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        const element = content.document.getElementById("input-1") as HTMLInputElement;
        element.focus();
      });

      await sleep_frames(10);
      is(
        glide.ctx.mode,
        "ignore",
        "we should still be in ignore mode after opening a new tab and focusing an input element",
      );
    });
  } finally {
    await glide.excmds.execute("mode_change normal");
  }
});
