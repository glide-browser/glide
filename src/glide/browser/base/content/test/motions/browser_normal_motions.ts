// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* oxlint-disable no-unbound-method */

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_normal_x() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("abcdef", "basic");
    await test_edit("x", "bcdef", 0, "b");
    await test_edit("xx", "def", 0, "d");
    await test_edit("$x", "de", 1, "e");

    await set_text("", "should do nothing on empty input");
    await test_edit("x", "", -1, "");

    await set_text("fob\nbar", "should not cross line boundaries");
    await test_edit("x", "ob\nbar", 0, "o");
    await test_edit("xxxxxxxxx", "\nbar", -1, "");

    await set_text("fob\nbar", "should not delete line boundaries");
    await set_selection(3, "\n");
    await test_edit("xxxx", "fob\nbar", 3, "\n");
  });
});

add_task(async function test_normal_X() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("abcdef", "basic");
    await test_edit("X", "bcdef", -1, "");
    await test_edit("$X", "bcde", 3, "e");

    await set_text("", "should do nothing on empty input");
    await test_edit("X", "", -1, "");
  });
});

add_task(async function test_normal_s() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("abcdef", "basic");
    await set_selection(1, "b");
    await test_edit("s", "acdef", 0, "a");
    await test_edit("s", "cdef", -1, "");
  });
});

add_task(async function test_normal_dl() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 0 });

    await set_text("Hello world", "basic deletion");
    await test_edit("dl", "ello world", 0, "e");

    await set_text("Hello world", "caret at end of word");
    await set_selection(4);
    await test_edit("dl", "Hell world", 4, " ");

    await set_text("Hello world", "at eof");
    await set_selection(10, "d");
    await test_edit("dl", "Hello worl", 9, "l");

    await set_text("Hello\nworld", "at eol");
    await set_selection(4, "o");
    await test_edit("dl", "Hell\nworld", 3, "l");
    await test_edit("dl", "Hel\nworld", 2, "l");

    await set_text("hello\n\nworld", "empty line handling");
    await set_selection(6, "\n");
    await test_edit("dl", "hello\n\nworld", 6, "\n");

    await set_text("hello\t\tworld", "tab handling");
    await set_selection(5, "\t");
    await test_edit("dl", "hello\tworld", 5, "\t");

    await set_text("hello 世界 world", "unicode character handling");
    await set_selection(6, "世");
    await test_edit("dl", "hello 界 world", 6, "界");

    await set_text("foo bar baz", "dl is repeatable");
    await test_edit("dl", "oo bar baz", 0, "o");
    await test_edit(".", "o bar baz", 0, "o");
    await test_edit(".", " bar baz", 0, " ");
  });
});

add_task(async function test_normal_dd() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 0 });

    await set_text("Hello world", "basic deletion");
    await test_edit("dd", "", -1, "");

    await set_text("Hello\nworld", "basic deletion");
    await test_edit("dd", "world", 0, "w");

    await set_text("Hello\nworld", "retains col position");
    await set_selection(1, "e");
    await test_edit("dd", "world", 1, "o");

    await set_text("foo bar\nwoo", "retains col position for shorter line");
    await set_selection(6, "r");
    await test_edit("dd", "woo", 2, "o");

    await set_text("barracks\nfab\nalice", "retains col position for multi lines");
    await set_selection(7, "s");
    await test_edit("dd", "fab\nalice", 2, "b");

    await set_text("Hello world", "at eof");
    await set_selection(10, "d");
    await test_edit("dd", "", -1, "");

    await set_text("hello\n\nworld", "empty line handling");
    await set_selection(6, "\n");
    await test_edit("dd", "hello\nworld", 6, "w");

    await set_text("hello\t\tworld", "tab handling");
    await set_selection(5, "\t");
    await test_edit("dd", "", -1, "");

    await set_text("fob\nbar\nbaz", "is repeatable");
    await set_selection(1, "o");
    await test_edit("dd", "bar\nbaz", 1, "a");
    await test_edit(".", "baz", 1, "a");
    await test_edit(".", "", -1, "");
    await test_edit(".", "", -1, "");
  });
});

add_task(async function test_normal_dh() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello world", "basic deletion");
    await test_edit("dh", "Hello word", 9, "d");

    await set_text("world", "caret in the middle of a word");
    await set_selection(2, "r");
    await test_edit("dh", "wrld", 1, "r");

    await set_text("Hello world", "at bof");
    await set_selection(0, "H");
    await test_edit("dh", "Hello world", 0, "H");

    await set_text("foo\nbar", "at start of line");
    await set_selection(4, "b");
    await test_edit("dh", "foo\nbar", 4, "b");

    await set_text("foo\nbar", "at eol");
    await set_selection(3, "\n");
    await test_edit("dh", "foo\nbar", 3, "\n");

    await set_text("hello\n\nworld", "empty line handhing");
    await set_selection(6, "\n");
    await test_edit("dh", "hello\n\nworld", 6, "\n");

    await set_text("hello 世界 world", "unicode character handhing");
    await set_selection(7, "界");
    await test_edit("dh", "hello 界 world", 6, "界");

    await set_text("foo bar baz", "dh is repeatable");
    await set_selection(6, "r");
    await test_edit("dh", "foo br baz", 5, "r");
    await test_edit(".", "foo r baz", 4, "r");
    await test_edit(".", "foor baz", 3, "r");
  });
});

add_task(async function test_normal_dj() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, test_motion, is_text, set_selection } = GlideTestUtils.make_input_test_helpers(
      browser,
      { text_start: 1 },
    );

    await set_text("Hello world", "a single line");
    await set_selection(3, "l");
    await test_edit("dj", "Hello world", 3, "l");

    await set_text("Hello\nworld", "two lines");
    await test_edit("dj", "", -1, "");

    await set_text("foo\nbar\nbaz", "middle line of three lines");
    await set_selection(5, "a");
    await test_edit("dj", "foo", 1, "o");

    // note: vim would actually put the caret on the final `o`
    //       but firefox renders the newline differently so it
    //       actually makes more sense to put the caret at the start
    await set_text("foo\n\nbaz", "empty lines");
    await set_selection(3, "\n");
    await test_edit("dj", "foo", 0, "f");

    await set_text("foo\n   \nbaz", "whitespace-only lines");
    await set_selection(3, "\n");
    await test_edit("dj", "foo", 0, "f");

    await set_text("short\nvery long line here\nend", "lines of different lengths");
    await set_selection(2, "o");
    await test_motion("dj", 2, "d", "todo");
    await is_text("end");

    await set_text("first\nsecond\nthird", "cursor at end of first line");
    await set_selection(4, "t");
    await test_motion("dj", 4, "d", "todo");
    await is_text("third");

    await set_text("first\nsecond\nthird", "cursor at start of first line");
    await set_selection(0, "f");
    await test_edit("dj", "third", 0, "t");

    await set_text("first\nsecond", "cursor on last line");
    await set_selection(7, "e");
    await test_edit("dj", "first\nsecond", 7, "e");

    await set_text("first\r\nsecond\r\nthird", "carriage returns");
    await set_selection(2, "r");
    await test_motion("dj", 2, "i", "todo");
    await is_text("third");
  });
});

add_task(async function test_normal_r() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello world", "basic character replacement");
    await test_edit("rx", "xello world", 0, "x");

    await set_text("Hello world", "replacing with same character");
    await set_selection(0);
    await test_edit("rH", "Hello world", 0, "H");

    await set_text("Hello world", "multiple replacements in sequence");
    await set_selection(2);
    await test_edit("rxry", "Heylo world", 2, "y");

    await set_text("Hello\nworld", "replacement at end of line");
    await set_selection(4);
    await test_edit("rx", "Hellx\nworld", 4, "x");

    await set_text("Hello\nworld", "replacement at start of line");
    await set_selection(6);
    await test_edit("rx", "Hello\nxorld", 6, "x");

    await set_text("Hello world", "replacing with special character");
    await set_selection(5);
    await test_edit("r<", "Hello<world", 5, "<");

    await set_text("Hello world", "replacing with number");
    await set_selection(2);
    await test_edit("r1", "He1lo world", 2, "1");

    await set_text("Hello world", "ignores modifiers");
    await set_selection(2);
    await test_edit("r<D-c>", "Heclo world", 2, "c");

    await set_text("Hello\nworld", "replacing newline character");
    await set_selection(2);
    await test_edit("r<CR>", "He\nlo\nworld", 2, "\n");

    await set_text("Hello\tworld", "replacing tab character");
    await set_selection(6, "w");
    await test_edit("r<Tab>", "Hello\t\torld", 6, "\t");

    await set_text("Hello\nworld\nfoobar", "r is repeatable with .");
    await set_selection(1);
    await test_edit("rx", "Hxllo\nworld\nfoobar", 1, "x");
    await set_selection(7);
    await test_edit(".", "Hxllo\nwxrld\nfoobar", 7, "x");
    await set_selection(13);
    await test_edit(".", "Hxllo\nwxrld\nfxobar", 13, "x");

    await set_text("Hello\nworld", "at EOF");
    await set_selection(10);
    await test_edit("rx", "Hello\nworlx", 10, "x");

    await set_text("", "on empty text");
    await test_edit("rx", "x", 0, "x");
  });
});

add_task(async function test_o_mapping() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Line 1", "basic");
    await test_edit("oLine 2", "Line 1\nLine 2", 12, "2");

    await set_text("Line 1\nLine 2", "at eol");
    await set_selection(12, "2");
    await test_edit("$oLine 3", "Line 1\nLine 2\nLine 3", 19, "3");
  });
});

add_task(async function test_normal_0() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello wurld", "already at the start of the line");
    await test_motion("0", 0, "H");
    await test_motion("0", 0, "H");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("0", 0, "H");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("0", 0, "H");

    await set_text("hello\nwurld", "does not cross line boundaries");
    await test_motion("0", 6, "w");
    await test_motion("0", 6, "w");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("0", 6, " ");
    await test_motion("0", 6, " ");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("0", 8, "w");
    await test_motion("0", 8, "w");

    await set_text("hello\n\nworld", "does not move on empty lines");
    await test_motion("0", 7, "w");
    await set_selection(6);
    await test_motion("0", 6, "\n");
    await test_motion("0", 6, "\n");

    await set_text("hello\tworld", "tab");
    await test_motion("0", 0, "h");

    await set_text("hello\t\t\t\tworld", "consecutive tabs");
    await test_motion("0", 0, "h");

    await set_text("hello\t\tfoo\t\tworld", "non-consecutive tabs");
    await test_motion("0", 0, "h");

    await set_text("hello 世界 world", "unicode characters");
    await test_motion("0", 0, "h");

    await set_text("hello\u200Bworld", "zero-width spaces");
    await test_motion("0", 0, "h");
  });
});

add_task(async function test_normal_$() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "from the start of the line");
    await test_motion("$", 10, "d");
    await test_motion("$", 10, "d");

    await set_text("hello\nwurld", "does not cross line boundaries");
    await test_motion("$", 4, "o");
    await test_motion("$", 4, "o");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("$", 4, "o");
    await test_motion("$", 4, "o");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("$", 6, " ");
    await test_motion("$", 6, " ");

    await set_text("hello\n\nworld", "does not move on empty lines");
    await set_selection(5);
    await test_motion("$", 5, "\n");
    await test_motion("$", 5, "\n");
  });
});

add_task(async function test_normal_next_para() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "single line");
    await test_motion("}", 10, "d");
    await test_motion("}", 10, "d");

    await set_text("hello\nwurld", "two lines");
    await test_motion("}", 10, "d");
    await test_motion("}", 10, "d");

    await set_text("hello\n\nwurld", "empty line");
    await test_motion("}", 5, "\n");
    await test_motion("}", 11, "d");
  });
});

add_task(async function test_normal_next_para() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion } = GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

    await set_text("Hello wurld", "single line");
    await test_motion("{", 0, "H");
    await test_motion("{", 0, "H");

    await set_text("hello\nwurld", "two lines");
    await test_motion("{", 0, "h");
    await test_motion("{", 0, "h");

    await set_text("hello\n\nwurld", "empty line");
    await test_motion("{", 5, "\n");
    await test_motion("{", 0, "h");
  });
});

add_task(async function test_normal_u() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello world", "basic undo after deletion");
    await test_edit("x", "ello world", 0, "e");
    await test_edit("u", "Hello world", 0, "H");

    await set_text("Hello world", "undo after multiple deletions");
    await test_edit("xx", "llo world", 0, "l");
    await test_edit("u", "ello world", 0, "e");
    await test_edit("u", "Hello world", 0, "H");
  });
});

add_task(async function test_normal_I() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello world", "from end of line");
    await test_edit("Ifob", "fobHello world", 2, "b");

    await set_text("  Hello world", "with leading whitespace");
    await test_edit("Ifob", "  fobHello world", 4, "b");

    await set_text("Hello\nworld", "multiline - first line");
    await set_selection(4, "o");
    await test_edit("Ifob", "fobHello\nworld", 2, "b");

    await set_text("Hello\nworld", "multiline - second line");
    await set_selection(10, "d");
    await test_edit("Ifob", "Hello\nfobworld", 8, "b");

    await set_text("Hello\n\nworld", "empty line in middle");
    await set_selection(5, "\n");
    await test_edit("Ifob", "Hello\nfob\nworld", 8, "b");
  });
});
