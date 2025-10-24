// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* oxlint-disable no-unbound-method */

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_get_column_offset() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    async function get_column(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        const element = content.document.querySelector("#textarea-1");
        if (!element) throw new Error("no element");

        const motions = ChromeUtils.importESModule("chrome://glide/content/motions.mjs");
        return motions.get_column_offset((element as any as MozEditableElement).editor!);
      });
    }

    const { set_text, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

    await set_text("Hello\nworld", "from the end of the line");

    await set_selection(-1, "");
    is(await get_column(), 0);

    await set_selection(0, "H");
    is(await get_column(), 0);

    await set_selection(1, "e");
    is(await get_column(), 1);

    await set_selection(5, "\n");
    is(await get_column(), 0);

    await set_selection(6, "w");
    is(await get_column(), 1);

    await set_selection(10, "d");
    is(await get_column(), 5);
  });
});
