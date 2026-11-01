// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/commandline/basic.html";

const { CommandHistory } = ChromeUtils.importESModule("chrome://glide/content/command-history.mjs");
const { PrivateBrowsingUtils } = ChromeUtils.importESModule("resource://gre/modules/PrivateBrowsingUtils.sys.mjs");

const COMMAND_HISTORY_MAX_ENTRIES = 10;

async function history_commands(maxEntries: number = COMMAND_HISTORY_MAX_ENTRIES) {
  return CommandHistory.list(maxEntries);
}

async function wait_for_history(...expected: string[]) {
  await waiter(async () => JSON.stringify(await history_commands())).is(JSON.stringify(expected));
}

add_task(async function test_commandline_history_records_commands() {
  await CommandHistory.reset();
  await reload_config(function() {
    glide.excmds.create({ name: "hist_a", description: "a" }, () => {
      glide.g.value = "a";
    });
    glide.excmds.create({ name: "hist_b", description: "b" }, () => {
      glide.g.value = "b";
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":hist_a<CR>");
    await waiter(() => glide.g.value).is("a");
    await wait_for_history("hist_a");

    await keys(":hist_b<CR>");
    await waiter(() => glide.g.value).is("b");
    await wait_for_history("hist_b", "hist_a");

    await keys(":hist_a<CR>");
    await waiter(() => glide.g.value).is("a");
    await wait_for_history("hist_a", "hist_b");
  });
});

add_task(async function test_commandline_history_q_colon_lists_and_runs() {
  await CommandHistory.reset();
  await reload_config(function() {
    glide.excmds.create({ name: "hist_run", "description": "run " }, () => {
      glide.g.value = "ran";
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":hist_run<CR>");
    await wait_for_history("hist_run");

    await keys("q:");
    await wait_for_mode("command");

    is(GlideTestUtils.commandline.current_source_header(), "history");
    is(GlideTestUtils.commandline.row_cmd(0), "hist_run");

    glide.g.value = null;
    await keys("<CR>");
    await waiter(async () => glide.g.value).is("ran", "accepting a history row should execute it");
  });
});

add_task(async function test_commandline_history_history_empty_list() {
  await CommandHistory.reset();
  await reload_config(function() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("q:");
    await wait_for_mode("command");
    is(GlideTestUtils.commandline.current_source_header(), "history");
    is(GlideTestUtils.commandline.visible_rows().length, 0, "empty history should show no rows");
  });
});

add_task(async function test_commandline_history_clear() {
  await CommandHistory.reset();
  await reload_config(function _() {
    glide.excmds.create({ name: "hist_clear_me", description: "x" }, () => {});
  });
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":hist_clear_me<CR>");
    await wait_for_history("hist_clear_me");

    await keys(":commandline_history_clear<CR>");
    await waiter(async () => (await history_commands()).length).is(0);

    await keys("q:");
    await wait_for_mode("command");

    is(GlideTestUtils.commandline.visible_rows().length, 0);
  });
});

add_task(async function test_commandline_history_max_entries() {
  await CommandHistory.reset();
  await reload_config(function _() {
    glide.o.command_history_max_entries = 2;
    glide.excmds.create({ name: "hist_1", description: "1" }, () => {});
    glide.excmds.create({ name: "hist_2", description: "2" }, () => {});
    glide.excmds.create({ name: "hist_3", description: "3" }, () => {});
  });
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":hist_1<CR>");
    await keys(":hist_2<CR>");
    await keys(":hist_3<CR>");
    await wait_for_history("hist_3", "hist_2");
  });
});

add_task(async function test_commandline_history_private_window() {
  await CommandHistory.reset();
  await reload_config(function() {
    glide.excmds.create({ name: "hist_private", description: "p" }, () => {
      glide.g.value = "private";
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    // seed history from normal window
    await keys(":hist_private<CR>");
    await wait_for_history("hist_private");

    // @ts-expect-error `private` is valid OpenBrowserWindow opts but missing from BrowserTestUtils typings
    const win = await BrowserTestUtils.openNewBrowserWindow({ private: true });
    try {
      await TestUtils.waitForCondition(() => win.GlideBrowser?.api, "waiting for Glide in the private window");
      ok(PrivateBrowsingUtils.isWindowPrivate(win), "opened window is private");

      // New window focuses the urlbar (insert mode). Leave that before sending `q:`
      await win.GlideBrowser.api.excmds.execute("mode_change normal");
      await TestUtils.waitForCondition(
        () => win.GlideBrowser.state.mode === "normal",
        "private window should leave urlbar insert mode",
      );

      await win.GlideBrowser.api.keys.send("q:");
      await TestUtils.waitForCondition(
        () => win.GlideBrowser.state.mode === "command",
        "private window should enter command mode",
      );

      const commandline = win.document.querySelector("glide-commandline")!;
      const header = [...commandline.querySelectorAll(".section-header")].find((element) =>
        !(element.parentElement as HTMLElement).hidden
      );
      is(header?.textContent, "history");

      const rows = [...commandline.querySelectorAll(".gcl-option")].filter((row) => !(row as HTMLElement).hidden);
      is(rows.length, 1, "private history should be the notice, not stored commands");
      is(rows[0]?.textContent, "Command history is not available in private browsing");

      await win.GlideBrowser.api.keys.send("<Esc>");
      await win.GlideBrowser.api.keys.send(":hist_private<CR>");
      await win.GlideBrowser.api.keys.send(":commandline_history_clear<CR>");

      // Accept/clear from private window must not change the history
      await wait_for_history("hist_private");
    } finally {
      await BrowserTestUtils.closeWindow(win);
    }
  });
});
