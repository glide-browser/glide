// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* oxlint-disable no-unbound-method */

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_visual_overlapping_selections() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, set_selection, test_selection, test_motion } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: 1,
    });

    await set_text("Hello world", "multiple forwards and backwards");
    await test_selection("vllllhh", "Hel");

    await set_text("Hello world", "going left then back to the anchor");
    await set_selection(4);
    await test_selection("vhh", "llo");
    await test_selection("ll", "o");
    await test_motion("<Esc>", 4, "o");

    await set_text("Hello world", "right then left");
    await set_selection(5); // " "
    await sleep_frames(5);
    await test_selection("vllhhh", "o ", "todo");

    await set_text("foo bar", "left then right");
    await set_selection(4); // " "
    await test_selection("vhlll", "bar", "todo");
  });
});

add_task(async function test_cancelling_visual_selections() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, set_selection, test_selection, test_motion } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: 1,
    });

    await set_text("Hello world", "going right then cancel");
    await test_selection("vllll", "Hello");
    await test_motion("<Esc>", 4, "o");
    is(GlideBrowser.state.mode, "normal", "Esc in visual should enter normal");

    await set_text("Hello world", "going left then cancel");
    await set_selection(10);
    await test_selection("vhhhh", "world");
    await test_motion("<Esc>", 6, "w");

    await set_text("Hello world", "going left then right then cancel");
    await set_selection(10);
    await test_selection("vhhhh", "world");
    await test_selection("ll", "rld");
    await test_motion("<Esc>", 8, "r");

    await set_text("Hello world", "going right then left then cancel");
    await test_selection("vllll", "Hello");
    await test_selection("hh", "Hel");
    await test_motion("<Esc>", 2, "l");

    await set_text("Hello world", "going right then back to the anchor");
    await set_selection(4);
    await test_selection("vll", "o w");
    await test_selection("hh", "o");
    await test_motion("<Esc>", 4, "o");

    await set_text("Hello world", "going left then back to the anchor");
    await set_selection(4);
    await test_selection("vhh", "llo");
    await test_selection("ll", "o");
    await test_motion("<Esc>", 4, "o");
  });
});

add_task(async function test_visual_forwards() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, set_selection, test_edit, test_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: 1,
    });

    await set_text("Hello wurld", "from the start of the line");
    await test_edit("vlld", "lo wurld", 0, "l");

    await set_text("Hello wurld", "in the middle of a word");
    await set_selection(1);
    await test_edit("vlld", "Ho wurld", 1, "o");

    await set_text("hello bar\nworld", "crossing forward line boundary");
    await set_selection(6);
    await test_edit("vllld", "hello world", 6, "w");

    await set_text("hello bar\nworld", "only crosses forward line boundary by one char");
    await set_selection(6);
    await test_edit("vllllllld", "hello world", 6, "w");

    await set_text("hello\n\n\n\nworld", "empty lines");
    await set_selection(7);
    await test_edit("vlld", "hello\n\n\nworld", 6, "\n");

    await set_text("Hello world", "spamming right when at eof");
    await test_selection("vlllllllllllllllllllllllllllllll", "Hello world");
    await test_selection("hh", "Hello wor");

    await set_text("Hello world\nfoo", "spamming right when at eol");
    await test_selection("vlllllllllllllllllllllllllllllll", "Hello world\n");
    await test_selection("hh", "Hello worl");
  });
});

add_task(async function test_visual_backwards() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, test_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello world", "from the end of the line");
    await test_edit("vhhd", "Hello wo", 7, "o");

    await set_text("Hello world", "spamming left when at bof");
    await test_selection("vhhhhhhhhhhhhhhhhhhhhhhhhh", "Hello world");
    await test_selection("ll", "llo world");

    await set_text("Hello\nworld", "spamming left when at bol");
    await test_selection("vhhhhhhhhhhhhhhhhhhhhhhhhh", "world");
    await test_selection("ll", "rld");
  });
});

add_task(async function test_visual_c() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit } = GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

    await set_text("Hello world", "from the end of the line");
    await test_edit("vhhc", "Hello wo", 7, "o");

    await set_text("Hello world", "edit not at the eof");
    await test_edit("hhvhhc", "Hello ld", 5, " ");

    await set_text("Hello world", "edit at the bof");
    await test_edit("hhhhhhhhhhhhhhlvllc", "lo world", -1, "");
  });
});

add_task(async function test_visual_yank_editable_to_clipboard() {
  await GlideTestUtils.reload_config(function _() {
    // lower the highlight time so our tests can be fast
    glide.o.yank_highlight_time = 1;
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello world", "yank selection to clipboard");
    await set_selection(1);
    await keys("vlll");
    await sleep_frames(3);

    await keys("y");
    await sleep_frames(10);

    const clipboardText = await navigator.clipboard.readText();
    is(clipboardText, "ello", "Selected text should be copied to clipboard");
    is(GlideBrowser.state.mode, "normal", "Should return to normal mode after yank");
  });
});

add_task(async function test_visual_yank_non_editable_to_clipboard() {
  await GlideTestUtils.reload_config(function _() {
    // lower the highlight time so our tests can be fast
    glide.o.yank_highlight_time = 1;
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const window = content.window;
      const document = content.document;

      const label = document.querySelector("label[for=\"user_input_1\"]");
      if (!label) {
        throw new Error("Could not find label element");
      }

      // Create a selection on the label text
      const range = document.createRange();
      range.selectNodeContents(label);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      // Focus the window to ensure selection is active
      window.focus();
    });

    await sleep_frames(3);
    await keys("vy");
    await sleep_frames(3);

    is(await navigator.clipboard.readText(), "Enter your text:", "Label text should be copied to clipboard");
    is(GlideBrowser.state.mode, "normal", "Should return to normal mode after yank");
  });
});
