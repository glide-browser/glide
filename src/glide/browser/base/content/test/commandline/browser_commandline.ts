// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/commandline/basic.html";

add_task(async function test_basic_commandline() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    await keys("foo");
    is(GlideTestUtils.commandline.get_input_content(), "foo", "key presses should be entered into the input element");

    await keys("<esc>");
    await GlideTestUtils.wait_for_mode("normal");
    ok(
      document!.querySelector<HTMLElement>("glide-commandline")!.hidden,
      "Commandline should be hidden after pressing escape",
    );
  });
});

add_task(async function test_basic_filtering() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    await keys("ex");
    await sleep_frames(3);

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(visible_rows[0]!.querySelector(".excmd")!.textContent, "examplecmd", "Correct command should be visible");

    await keys("<Backspace><Backspace>");
    await sleep_frames(3);

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await sleep_frames(1);
    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter",
    );
  });
});

add_task(async function test_basic_tabbing() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    // tab goes forward
    for (let i = 0; i < visible_rows.length; i++) {
      // the first row should be focused without needing to `tab`
      if (i !== 0) {
        await keys("<tab>");
      }

      const focused_row = GlideTestUtils.commandline.focused_row();
      const visible = visible_rows[i];

      is(focused_row, visible, `Tab should focus row ${i}`);
    }

    // shift+tab goes back
    for (let i = visible_rows.length - 1; i >= 0; i--) {
      await keys("<S-Tab>");
      const focused_row = GlideTestUtils.commandline.focused_row();
      const row_index = i === 0 ? visible_rows.length - 1 : i - 1;
      is(focused_row, visible_rows[row_index], `Shift+Tab should focus row ${row_index}`);
    }

    // filtering maintains selection when possible
    const focused_row = GlideTestUtils.commandline.focused_row();

    await keys("foo");

    ok(focused_row!.classList.contains("focused"), "Selection should be maintained when filtered item remains visible");
  });
});

add_task(async function test_tabs() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    await keys("tab ");

    is(
      GlideTestUtils.commandline.current_source_header(),
      "tabs",
      "entering `tab ` should result in open tab completions",
    );
    let visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 2, "there should only be 2 tab options present");
    is(visible_rows[0]!.querySelector(".url")!.textContent, "about:blank", "Default tab should be the first option");
    is(visible_rows[1]!.querySelector(".url")!.textContent, FILE, "Current tab should be the second option");

    // filtering
    await keys("bas");

    is(GlideTestUtils.commandline.get_input_content(), "tab bas");
    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 1, "there should only be 1 tab option present after filtering");
    is(visible_rows[0]!.querySelector(".url")!.textContent, FILE, "Current tab should be the only option");

    await keys("<Backspace><Backspace><Backspace><Backspace>");
    is(GlideTestUtils.commandline.get_input_content(), "tab");
    is(
      GlideTestUtils.commandline.current_source_header(),
      "ex commands",
      "pressing backspace should result in excmd completions",
    );
  });
});

add_task(async function test_excmd_enter() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    await sleep_frames(5);

    await keys("ex");

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(visible_rows[0]!.querySelector(".excmd")!.textContent, "examplecmd", "Correct command should be visible");

    await keys("<Backspace><Backspace>");

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await new Promise(r => requestAnimationFrame(r));

    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter",
    );
  });
});

add_task(async function test_commandline_closes_on_blur() {
  await sleep_frames(20);

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    const commandline = document!.querySelector("glide-commandline") as GlideCommandLine;
    const input = commandline.querySelector<HTMLInputElement>("[anonid=\"glide-commandline-input\"]");

    ok(!commandline.hidden, "Commandline should be visible after opening");
    is(document!.activeElement, input, "Input should have focus");

    await keys("test");
    is(input!.value, "test", "Input should contain 'test'");

    // Move focus to browser content
    gBrowser.selectedBrowser.focus();
    await sleep_frames(50);

    ok(commandline.hidden, "Commandline should be hidden after losing focus");
    await GlideTestUtils.wait_for_mode("normal");
  });
});

add_task(async function test_commandline_custom_excmd_arguments() {
  await sleep_frames(20);

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.reload_config(function _() {
      glide.excmds.create({ name: "my_long_command_name", description: "bar" }, ({ args_arr }) => {
        glide.g.value = args_arr;
        glide.g.test_checked = true;
      });
    });

    await keys(":my_long_command_name foo bar");
    await sleep_frames(20);

    await keys("<CR>");

    await TestUtils.waitForCondition(() => glide.g.test_checked === true, "Waiting for excmd to be executed");

    isjson(glide.g.value, ["foo", "bar"], "arguments should be passed to the excmd");
  });
});

add_task(async function test_commandline_tab_reopen() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("<space><space>");
    await waiter(() => GlideTestUtils.commandline.focused_row()?.classList.contains("TabCompletionOption")).ok();

    await keys("<esc>");
    await until(() => GlideBrowser.state.mode === "normal");

    await keys("<space><space>");
    await waiter(() => GlideTestUtils.commandline.focused_row()?.classList.contains("TabCompletionOption")).ok();
  });
});

add_task(async function test_commandline_keymaps() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create({ name: "foobarbaz" }, () => {});
    glide.keymaps.set("normal", "<leader>~~~", "foobarbaz" as any);
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":foobarbaz");
    await until(() => GlideTestUtils.commandline.focused_row()?.children[0]?.textContent === "foobarbaz");

    is(GlideTestUtils.commandline.focused_row()?.children[2]?.textContent, "<leader>~~~");
  });
});

add_task(async function test_commandline_focus_to_content() {
  await sleep_frames(20);

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.reload_config(function _() {
      glide.excmds.create({ name: "my_long_command_name", description: "bar" }, ({ args_arr }) => {
        glide.g.value = args_arr;
        glide.g.test_checked = true;
      });
    });

    await keys(":foo");
    await sleep_frames(10);

    is(document?.activeElement?.getAttribute("anonid"), "glide-commandline-input", "commandline should be focused");

    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(20);

    await TestUtils.waitForCondition(
      () => document?.activeElement?.tagName.toLowerCase() === "browser",
      "content should be focused",
    );
  });
});
