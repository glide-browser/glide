// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const TUTOR_URL = "resource://glide-tutor/index.html";

add_task(async function test_ctrl_comma_blurs_input() {
  await BrowserTestUtils.withNewTab(TUTOR_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById("lesson-3-input");
      input!.focus();
    });

    await wait_for_mode("insert");

    var active_element_tag = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.window.requestAnimationFrame(r));
      return content.document.activeElement!.tagName.toLowerCase();
    });
    is(active_element_tag, "input");

    await keys("<C-,>");

    var active_element_tag = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.window.requestAnimationFrame(r));
      return content.document.activeElement!.tagName.toLowerCase();
    });
    isnot(active_element_tag, "input", "<C-,> should blur the input element");

    await wait_for_mode("normal");
  });
});
