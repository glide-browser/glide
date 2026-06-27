// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_reset_switches_to_insert() {
  await reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  is(glide.ctx.mode, "normal");

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById<HTMLInputElement>("input-1")!.focus();
    });

    await sleep_frames(10);
    is(glide.ctx.mode, "normal", "mode should not change on focus while `switch_mode_on_focus` is disabled");

    await glide.excmds.execute("mode_reset");

    await wait_for_mode("insert", "mode_reset should switch to insert as an input is focused");
  });
});

add_task(async function test_reset_switches_to_normal() {
  await reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await glide.excmds.execute("mode_change insert");
    await wait_for_mode("insert");

    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.focus();
      input.blur();
    });

    await sleep_frames(10);
    is(glide.ctx.mode, "insert", "mode should stay insert while `switch_mode_on_focus` is disabled");

    await glide.excmds.execute("mode_reset");

    await wait_for_mode("normal", "mode_reset should switch to normal as nothing editable is focused");
  });
});

add_task(async function test_reset_exits_ignore_mode() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await keys("<S-Esc>");
    await wait_for_mode("ignore");

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById<HTMLInputElement>("input-1")!.focus();
    });

    await glide.excmds.execute("mode_reset");

    await wait_for_mode("insert", "mode_reset should exit ignore mode and switch to insert");
  });
});
