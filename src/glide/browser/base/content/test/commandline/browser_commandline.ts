/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/commandline/basic.html";

add_task(async function test_basic_commandline() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    EventUtils.synthesizeKey("f");
    EventUtils.synthesizeKey("o");
    EventUtils.synthesizeKey("o");

    is(
      GlideTestUtils.commandline.get_input_content(),
      "foo",
      "key presses should be entered into the input element"
    );

    EventUtils.synthesizeKey("KEY_Escape");
    await TestUtils.waitForCondition(
      () =>
        document!.getElementById("glide-toolbar-mode-button")!.textContent ===
        "normal",
      "Waiting for mode button to show `normal` mode"
    );
    notok(
      document!.querySelector<HTMLElement>("glide-commandline")!.hidden,
      "Commandline should not be hidden after pressing escape once"
    );

    EventUtils.synthesizeKey("KEY_Escape");
    ok(
      document!.querySelector<HTMLElement>("glide-commandline")!.hidden,
      "Commandline should be hidden after pressing escape in normal mode"
    );
  });
});

add_task(async function test_basic_filtering() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    EventUtils.synthesizeKey("e");
    EventUtils.synthesizeKey("x");

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(
      visible_rows[0]!.querySelector(".excmd")!.textContent,
      "examplecmd",
      "Correct command should be visible"
    );

    EventUtils.synthesizeKey("KEY_Backspace");
    EventUtils.synthesizeKey("KEY_Backspace");

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await new Promise(r => requestAnimationFrame(r));

    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter"
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
        EventUtils.synthesizeKey("KEY_Tab");
        await new Promise(r => requestAnimationFrame(r));
      }

      const focused_row = GlideTestUtils.commandline.focused_row();
      const visible = visible_rows[i];

      is(focused_row, visible, `Tab should focus row ${i}`);
    }

    // shift+tab goes back
    for (let i = visible_rows.length - 1; i >= 0; i--) {
      EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
      const focused_row = GlideTestUtils.commandline.focused_row();
      const row_index = i === 0 ? visible_rows.length - 1 : i - 1;
      is(
        focused_row,
        visible_rows[row_index],
        `Shift+Tab should focus row ${row_index}`
      );
    }

    // filtering maintains selection when possible
    const focused_row = GlideTestUtils.commandline.focused_row();

    EventUtils.synthesizeKey("f");
    EventUtils.synthesizeKey("o");
    EventUtils.synthesizeKey("o");

    ok(
      focused_row!.classList.contains("focused"),
      "Selection should be maintained when filtered item remains visible"
    );
  });
});

add_task(async function test_focus_restore() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    EventUtils.synthesizeKey("f");
    EventUtils.synthesizeKey("o");
    EventUtils.synthesizeKey("o");

    const commandline = document!.querySelector("glide-commandline")!;
    const input = commandline.querySelector<HTMLInputElement>(
      '[anonid="glide-commandline-input"]'
    );

    is(input!.value, "foo", "Input should contain 'foo'");

    // Move focus away to the browser content
    gBrowser.selectedBrowser.focus();
    isnot(
      document!.activeElement,
      input,
      "Focus should have moved away from command line"
    );

    // Reopen command line
    await GlideTestUtils.commandline.open();

    is(
      input!.value,
      "foo",
      "Input value should be preserved after focus restore"
    );
    is(document!.activeElement, input, "Input should regain focus");
  });
});

add_task(async function test_tabs() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    EventUtils.synthesizeKey("t");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey(" ");
    await new Promise(r => requestAnimationFrame(r));

    is(
      GlideTestUtils.commandline.current_source_header(),
      "tabs",
      "entering `tab ` should result in open tab completions"
    );
    let visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 2, "there should only be 2 tab options present");
    is(
      visible_rows[0]!.querySelector(".url")!.textContent,
      "about:blank",
      "Default tab should be the first option"
    );
    is(
      visible_rows[1]!.querySelector(".url")!.textContent,
      FILE,
      "Current tab should be the second option"
    );

    // filtering
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("s");
    await new Promise(r => requestAnimationFrame(r));

    is(GlideTestUtils.commandline.get_input_content(), "tab bas");
    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(
      visible_rows.length,
      1,
      "there should only be 1 tab option present after filtering"
    );
    is(
      visible_rows[0]!.querySelector(".url")!.textContent,
      FILE,
      "Current tab should be the only option"
    );

    EventUtils.synthesizeKey("KEY_Backspace");
    EventUtils.synthesizeKey("KEY_Backspace");
    EventUtils.synthesizeKey("KEY_Backspace");
    EventUtils.synthesizeKey("KEY_Backspace");
    await new Promise(r => requestAnimationFrame(r));
    is(GlideTestUtils.commandline.get_input_content(), "tab");
    is(
      GlideTestUtils.commandline.current_source_header(),
      "ex commands",
      "pressing backspace should result in excmd completions"
    );
  });
});

add_task(async function test_excmd_enter() {
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    await sleep_frames(5);

    EventUtils.synthesizeKey("e");
    EventUtils.synthesizeKey("x");

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(
      visible_rows[0]!.querySelector(".excmd")!.textContent,
      "examplecmd",
      "Correct command should be visible"
    );

    EventUtils.synthesizeKey("KEY_Backspace");
    EventUtils.synthesizeKey("KEY_Backspace");

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await new Promise(r => requestAnimationFrame(r));

    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter"
    );
  });
});
