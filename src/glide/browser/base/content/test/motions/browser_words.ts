// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* oxlint-disable no-unbound-method */

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_normal_diw() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello world", "basic word deletion");
    await set_selection(2);
    await test_edit("diw", " world", 0, " ");

    await set_text("Hello world", "delete word with cursor at start");
    await set_selection(0);
    await test_edit("diw", " world", 0, " ");

    await set_text("Hello world", "delete word with cursor at end");
    await set_selection(4);
    await test_edit("diw", " world", 0, " ");

    await set_text("Hello   world", "multiple spaces preserved after deletion");
    await set_selection(2);
    await test_edit("diw", "   world", 0, " ");

    await set_text("Hello, world", "punctuation handling");
    await set_selection(5);
    await test_edit("diw", "Hello world", 5, " ");

    await set_text("hello?.world", "consecutive punctuation");
    await set_selection(5);
    await test_edit("diw", "helloworld", 5, "w");

    await set_text("foo(bar: true)", "parentheses and special character handling");
    await set_selection(3);
    await test_edit("diw", "foobar: true)", 3, "b");

    await set_text("foo(bar: true)", "delete inside parentheses");
    await set_selection(5);
    await test_edit("diw", "foo(: true)", 4, ":");

    await set_text("foo(bar: true)", "delete special character inside parentheses");
    await set_selection(7, ":");
    await test_edit("diw", "foo(bar true)", 7, " ");

    await set_text("hello\nworld", "line boundary word deletion");
    await set_selection(2);
    await test_edit("diw", "\nworld", -1, "");

    await set_text("hello\n\nworld", "empty line handling");
    await set_selection(6, "\n");
    await test_edit("diw", "hello\n\nworld", 6, "\n");

    await set_text("hello\t\tworld", "tab handling");
    await set_selection(5, "\t");
    await test_edit("diw", "helloworld", 5, "w");

    await set_text("hello 世界 world", "unicode character handling");
    await set_selection(7, "界");
    await test_edit("diw", "hello  world", 6, " ");

    await set_text("'hello' text", "quoted text full word");
    await set_selection(2, "e");
    await test_edit("diw", "'' text", 1, "'");

    await set_text("'hello' text", "quoted text with cursor on quote");
    await set_selection(0, `'`);
    await test_edit("diw", "hello' text", 0, "h");

    await set_text("word with trailing   ", "trailing whitespace");
    await set_selection(16);
    await test_edit("diw", "word with    ", 10, " ");

    await set_text("  word with leading", "leading whitespace");
    await set_selection(4, "r");
    await test_edit("diw", "   with leading", 2, " ");

    await set_text("one_two_three", "underscore word");
    await set_selection(5);
    await test_edit("diw", "", -1, "");

    await set_text("numbers123and456text", "numbers within text");
    await set_selection(9);
    await test_edit("diw", "", -1, "");

    await set_text("foo bar baz", "diw is repeatable");
    await set_selection(1);
    await test_edit("diw", " bar baz", 0, " ");
    await test_edit(".", "bar baz", 0, "b");
  });
});

add_task(async function test_normal_dw() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: 1,
    });

    await set_text("Hello world", "dw at start of word deletes word + following space");
    await set_selection(0);
    await test_edit("dw", "world", 0, "w");

    await set_text("Hello world", "dw from inside a word deletes to next word boundary (keeps preceding chars)");
    await set_selection(2);
    await test_edit("dw", "Heworld", 2, "w");

    await set_text("Hello   world", "dw at start deletes word + all following spaces");
    await set_selection(0);
    await test_edit("dw", "world", 0, "w");

    await set_text("Hello   world", "dw from inside a word deletes to next word, skipping extra spaces");
    await set_selection(2);
    await test_edit("dw", "Heworld", 2, "w");

    await set_text("Hello, world", "dw stops at punctuation (keeps punctuation and following space)");
    await set_selection(0);
    await test_edit("dw", ", world", 0, ",");

    await set_text("hello\nworld", "dw treats newline as whitespace and deletes it with the word");
    await set_selection(0);
    await test_edit("dw", "\nworld", -1, "");

    await set_text("hello?.world", "dw on punctuation run deletes punctuation up to next word");
    await set_selection(5);
    await test_edit("dw", "helloworld", 5, "w");

    await set_text("h h h", "dw deletes a single-letter word + following space");
    await set_selection(2);
    await test_edit("dw", "h h", 2, "h");

    await set_text("\nworld", "dw at start deletes leading newline (treats newline as whitespace)");
    await set_selection(0);
    await test_edit("dw", "world", 0, "w");
  });
});

add_task(async function test_normal_w() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("w", 8, "w");
    await test_motion("w", 12, "d");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("w", 5, ",");
    await test_motion("w", 7, "w");
    await test_motion("w", 11, "d");

    await set_text("hello,world", "no whitespace between `,` and the next word");
    await test_motion("w", 5, ",");
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("foo(bar: true)", "parentheses handling");
    await test_motion("w", 3, "(");
    await test_motion("w", 4, "b");
    await test_motion("w", 7, ":");
    await test_motion("w", 9, "t");
    await test_motion("w", 13, ")");

    await set_text("hello\nwurld", "basic line boundaries handling");
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("w", 8, "w");
    await test_motion("w", 12, "d");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("w", 8, "w", "todo");
    await test_motion("w", 12, "d");

    await set_text("hello\n\nworld", "empty lines");
    await test_motion("w", 6, "\n");
    await test_motion("w", 7, "w");
    await test_motion("w", 11, "d");
    await test_motion("w", 11, "d");

    await set_text("hello\r\n\r\nworld", "empty carriage return lines");
    await test_motion("w", 6, "\n");
    await test_motion("w", 7, "w");
    await test_motion("w", 11, "d");
    await test_motion("w", 11, "d");

    await set_text("line1\n\n\nline2", "multiple empty lines");
    await test_motion("w", 6, "\n");
    await test_motion("w", 7, "\n", "todo");
    await test_motion("w", 8, "l");
    await test_motion("w", 12, "2");

    await set_text("hello\tworld", "tab");
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("hello\t\t\t\tworld", "consecutive tabs");
    await test_motion("w", 9, "w");
    await test_motion("w", 13, "d");

    await set_text("hello\t\tfoo\t\tworld", "non-consecutive tabs");
    await test_motion("w", 7, "f");
    await test_motion("w", 12, "w");

    await set_text("hello\t \t world", "tabs mixed with spaces");
    await test_motion("w", 9, "w");
    await test_motion("w", 13, "d");

    await set_text("hello?.world", "consecutive punctuation");
    await test_motion("w", 5, "?");
    await test_motion("w", 7, "w");
    await test_motion("w", 11, "d");
    await test_motion("w", 11, "d");

    await set_text("hello? .world", "punctuation mixed with whitespace");
    await test_motion("w", 5, "?");
    await test_motion("w", 7, ".");
    await test_motion("w", 8, "w");
    await test_motion("w", 12, "d");

    await set_text("camelCase PascalCase", "camel/pascal case handling");
    await test_motion("w", 10, "P");
    await test_motion("w", 19, "e");

    await set_text("snake_case another_snake_case", "snake case handling");
    await test_motion("w", 11, "a");
    await test_motion("w", 28, "e");

    await set_text("snake_andCamelCase APascalCase", "mixed case handling");
    await test_motion("w", 19, "A");
    await test_motion("w", 29, "e");

    await set_text("test123 456tesT", "numbers in words");
    await test_motion("w", 8, "4");
    await test_motion("w", 14, "T");

    await set_text("https://test.com/path", "url-like strings");
    await test_motion("w", 5, ":");
    await test_motion("w", 8, "t");
    await test_motion("w", 12, ".");
    await test_motion("w", 13, "c");
    await test_motion("w", 16, "/");
    await test_motion("w", 17, "p");
    await test_motion("w", 20, "h");

    await set_text("hello 世界 world", "unicode characters");
    await test_motion("w", 6, "世");
    await test_motion("w", 9, "w");
    await test_motion("w", 13, "d");

    await set_text("'quoted' \"double\" text", "quoted text");
    await test_motion("w", 1, "q");
    await test_motion("w", 7, "'");
    await test_motion("w", 9, "\"");
    await test_motion("w", 10, "d");
    await test_motion("w", 16, "\"");
    await test_motion("w", 18, "t");
    await test_motion("w", 21, "t");

    // note: pretty sure this works but the test logic is broken
    await set_text("hello 👋🌎🌎 world 🤨", "emoji characters");
    await test_motion("w", 8, "👋", "todo");
    await test_motion("w", 13, "w");
    await test_motion("w", 18, "🤨", "todo");

    await set_text(`hello\u200Bworld`, "zero-width spaces");
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("f(x) = 2x + 1", "mathematical expressions");
    await test_motion("w", 1, "(");
    await test_motion("w", 2, "x");
    await test_motion("w", 3, ")");
    await test_motion("w", 5, "=");
    await test_motion("w", 7, "2");
    await test_motion("w", 10, "+");
    await test_motion("w", 12, "1");

    await set_text("Hello wurld", "caret in the middle of a word");
    await set_selection(3);
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("Hello wurld", "caret in between two words");
    await set_selection(5);
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");

    await set_text("Hello wurld", "caret at the end of the first word");
    await set_selection(4);
    await test_motion("w", 6, "w");
    await test_motion("w", 10, "d");
  });
});

add_task(async function test_normal_W() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("W", 8, "w");
    await test_motion("W", 12, "d");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("W", 7, "w");
    await test_motion("W", 11, "d");

    await set_text("hello,world", "no whitespace between `,` and the next word");
    await test_motion("W", 10, "d");

    await set_text("foo(bar: true)", "parentheses handling");
    await test_motion("W", 9, "t");
    await test_motion("W", 13, ")");

    await set_text("hello\nwurld", "basic line boundaries handling");
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("W", 8, "w");
    await test_motion("W", 12, "d");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("W", 8, "w", "todo");
    await test_motion("W", 12, "d");

    await set_text("hello\n\nworld", "empty lines");
    await test_motion("W", 6, "\n");
    await test_motion("W", 7, "w");
    await test_motion("W", 11, "d");
    await test_motion("W", 11, "d");

    await set_text("hello\r\n\r\nworld", "empty carriage return lines");
    await test_motion("W", 6, "\n");
    await test_motion("W", 7, "w");
    await test_motion("W", 11, "d");
    await test_motion("W", 11, "d");

    await set_text("line1\n\n\nline2", "multiple empty lines");
    await test_motion("W", 6, "\n");
    await test_motion("W", 7, "\n", "todo");
    await test_motion("W", 8, "l");
    await test_motion("W", 12, "2");

    await set_text("hello\tworld", "tab");
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("hello\t\t\t\tworld", "consecutive tabs");
    await test_motion("W", 9, "w");
    await test_motion("W", 13, "d");

    await set_text("hello\t\tfoo\t\tworld", "non-consecutive tabs");
    await test_motion("W", 7, "f");
    await test_motion("W", 12, "w");

    await set_text("hello\t \t world", "tabs mixed with spaces");
    await test_motion("W", 9, "w");
    await test_motion("W", 13, "d");

    await set_text("hello?.world", "consecutive punctuation");
    await test_motion("W", 11, "d");
    await test_motion("W", 11, "d");

    await set_text("hello? .world", "punctuation mixed with whitespace");
    await test_motion("W", 7, ".");
    await test_motion("W", 12, "d");

    await set_text("camelCase PascalCase", "camel/pascal case handling");
    await test_motion("W", 10, "P");
    await test_motion("W", 19, "e");

    await set_text("snake_case another_snake_case", "snake case handling");
    await test_motion("W", 11, "a");
    await test_motion("W", 28, "e");

    await set_text("snake_andCamelCase APascalCase", "mixed case handling");
    await test_motion("W", 19, "A");
    await test_motion("W", 29, "e");

    await set_text("test123 456tesT", "numbers in words");
    await test_motion("W", 8, "4");
    await test_motion("W", 14, "T");

    await set_text("https://test.com/path", "url-like strings");
    await test_motion("W", 20, "h");

    await set_text("hello 世界 world", "unicode characters");
    await test_motion("W", 6, "世");
    await test_motion("W", 9, "w");
    await test_motion("W", 13, "d");

    await set_text("'quoted' \"double\" text", "quoted text");
    await test_motion("W", 9, "\"");
    await test_motion("W", 18, "t");
    await test_motion("W", 21, "t");

    // note: pretty sure this works but the test logic is broken
    await set_text("hello 👋🌎🌎 world 🤨", "emoji characters");
    await test_motion("W", 8, "👋", "todo");
    await test_motion("W", 13, "w");
    await test_motion("W", 18, "🤨", "todo");

    await set_text(`hello\u200Bworld`, "zero-width spaces");
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("f(x) = 2x + 1", "mathematical expressions");
    await test_motion("W", 5, "=");
    await test_motion("W", 7, "2");
    await test_motion("W", 10, "+");
    await test_motion("W", 12, "1");

    await set_text("Hello wurld", "caret in the middle of a word");
    await set_selection(3);
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("Hello wurld", "caret in between two words");
    await set_selection(5);
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("Hello wurld", "caret at the end of the first word");
    await set_selection(4);
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");
  });
});

add_task(async function test_normal_e() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("e", 4, "o");
    await test_motion("e", 10, "d");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("e", 4, "o");
    await test_motion("e", 12, "d");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("e", 4, "o");
    await test_motion("e", 5, ",");
    await test_motion("e", 11, "d");

    await set_text("hello,world", "no whitespace between `,` and the next word");
    await test_motion("e", 4, "o");
    await test_motion("e", 5, ",");
    await test_motion("e", 10, "d");

    await set_text("foo(bar: true)", "parentheses handling");
    await test_motion("e", 2, "o");
    await test_motion("e", 3, "(");
    await test_motion("e", 6, "r");
    await test_motion("e", 7, ":");
    await test_motion("e", 12, "e");
    await test_motion("e", 13, ")");

    await set_text("hello\nwurld", "basic line boundaries handling");
    await test_motion("e", 4, "o");
    await test_motion("e", 10, "d");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("e", 4, "o");
    await test_motion("e", 12, "d");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("e", 4, "o");
    await test_motion("e", 12, "d");

    await set_text("hello\n\nworld", "empty lines");
    await test_motion("e", 4, "o");
    await test_motion("e", 11, "d");

    await set_text("Hello wurld", "caret in the middle of a word");
    await set_selection(3);
    await test_motion("e", 4, "o");
    await test_motion("e", 10, "d");

    await set_text("Hello wurld", "caret in between two words");
    await set_selection(5);
    await test_motion("e", 10, "d");

    await set_text("Hello wurld", "caret at the end of the first word");
    await set_selection(4);
    await test_motion("e", 10, "d");
  });
});

add_task(async function test_normal_b() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("b", 6, "w");
    await test_motion("b", 0, "H");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("b", 8, "w");
    await test_motion("b", 0, "H");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("b", 7, "w");
    await test_motion("b", 5, ",");
    await test_motion("b", 0, "H");

    await set_text("hello?.world", "consecutive punctuation");
    await test_motion("b", 7, "w");
    await test_motion("b", 5, "?");
    await test_motion("b", 0, "h");

    await set_text("hello,world", "no whitespace between `,` and the next word");
    await test_motion("b", 6, "w");
    await test_motion("b", 5, ",");
    await test_motion("b", 0, "h");

    await set_text("foo(bar: true)", "parentheses handling");
    await test_motion("b", 9, "t");
    await test_motion("b", 7, ":");
    await test_motion("b", 4, "b");
    await test_motion("b", 3, "(");
    await test_motion("b", 0, "f");

    await set_text("hello\nwurld", "basic line boundaries handling");
    await test_motion("b", 6, "w");
    await test_motion("b", 0, "h");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("b", 8, "w");
    await test_motion("b", 0, "h");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("b", 8, "w");
    await test_motion("b", 0, "h");

    await set_text("hello\n\nworld", "empty lines");
    await test_motion("b", 7, "w");
    await test_motion("b", 6, "\n", "todo");
    await test_motion("b", 0, "h");

    // TODO(glide): figure out what this should be
    // await set_text("hello\r\n\r\nworld", "empty carriage return lines");
    // await test_motion('b', 6, "\n");
    // await test_motion('b', 7, "w");
    // await test_motion('b', 11, "d");
    // await test_motion('b', 11, "d");

    await set_text("line1\n\n\nline2", "multiple empty lines");
    await test_motion("b", 8, "l");
    await test_motion("b", 7, "\n", "todo");
    await test_motion("b", 6, "\n", "todo");
    await test_motion("b", 0, "l");

    await set_text("hello\tworld", "tab");
    await test_motion("b", 6, "w");
    await test_motion("b", 0, "h");

    await set_text("hello\t\t\t\tworld", "consecutive tabs");
    await test_motion("b", 9, "w");
    await test_motion("b", 0, "h");

    await set_text("hello\t\tfoo\t\tworld", "non-consecutive tabs");
    await test_motion("b", 12, "w");
    await test_motion("b", 7, "f");
    await test_motion("b", 0, "h");

    await set_text("hello\t \t world", "tabs mixed with spaces");
    await test_motion("b", 9, "w");
    await test_motion("b", 0, "h");

    await set_text("hello? .world", "punctuation mixed with whitespace");
    await test_motion("b", 8, "w");
    await test_motion("b", 7, ".");
    await test_motion("b", 5, "?");
    await test_motion("b", 0, "h");

    await set_text("camelCase PascalCase", "camel/pascal case handling");
    await test_motion("b", 10, "P");
    await test_motion("b", 0, "c");

    await set_text("snake_case another_snake_case", "snake case handling");
    await test_motion("b", 11, "a");
    await test_motion("b", 0, "s");

    await set_text("snake_andCamelCase APascalCase", "mixed case handling");
    await test_motion("b", 19, "A");
    await test_motion("b", 0, "s");

    await set_text("test123 456tesT", "numbers in words");
    await test_motion("b", 8, "4");
    await test_motion("b", 0, "t");

    await set_text("https://test.com/path", "url-like strings");
    await test_motion("b", 17, "p");
    await test_motion("b", 16, "/");
    await test_motion("b", 13, "c");
    await test_motion("b", 12, ".");
    await test_motion("b", 8, "t");
    await test_motion("b", 5, ":");
    await test_motion("b", 0, "h");

    await set_text("hello 世界 world", "unicode characters");
    await test_motion("b", 9, "w");
    await test_motion("b", 6, "世");
    await test_motion("b", 0, "h");

    await set_text("'quoted' \"double\" text", "quoted text");
    await test_motion("b", 18, "t");
    await test_motion("b", 16, "\"");
    await test_motion("b", 10, "d");
    await test_motion("b", 9, "\"");
    await test_motion("b", 7, "'");
    await test_motion("b", 1, "q");
    await test_motion("b", 0, "'");

    // note: pretty sure this works but the test logic is broken
    await set_text("hello 👋🌎🌎 world 🤨", "emoji characters");
    await test_motion("b", 13, "w");
    await test_motion("b", 8, "👋", "todo");
    await test_motion("b", 0, "h", "todo");

    await set_text("hello\u200Bworld", "zero-width spaces");
    await test_motion("b", 6, "w");
    await test_motion("b", 0, "h");

    await set_text("f(x) = 2x + 1", "mathematical expressions");
    await test_motion("b", 10, "+");
    await test_motion("b", 7, "2");
    await test_motion("b", 5, "=");
    await test_motion("b", 3, ")");
    await test_motion("b", 2, "x");
    await test_motion("b", 1, "(");
    await test_motion("b", 0, "f");

    await set_text("Hello wurld", "caret in the middle of a word");
    await set_selection(10);
    await test_motion("b", 6, "w");
    await set_selection(3);
    await test_motion("b", 0, "H");

    await set_text("Hello wurld", "caret in between two words");
    await set_selection(5);
    await test_motion("b", 0, "H");

    await set_text("Hello wurld", "caret at the end of the first word");
    await set_selection(4);
    await test_motion("b", 0, "H");
  });
});

add_task(async function test_normal_B() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } = GlideTestUtils.make_input_test_helpers(browser, {
      text_start: "end",
    });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("B", 6, "w");
    await test_motion("B", 0, "H");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("B", 8, "w");
    await test_motion("B", 0, "H");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("B", 7, "w");
    await test_motion("B", 0, "H");

    await set_text("hello?.world", "consecutive punctuation");
    await test_motion("B", 0, "h");

    await set_text("foo(bar: true)", "parentheses handling");
    await test_motion("B", 9, "t");
    await test_motion("B", 0, "f");

    await set_text("hello\nwurld", "basic line boundaries handling");
    await test_motion("B", 6, "w");
    await test_motion("B", 0, "h");

    await set_text("hello\n  world", "line boundaries with post whitespace");
    await test_motion("B", 8, "w");
    await test_motion("B", 0, "h");

    await set_text("hello  \nworld", "line boundaries with pre whitespace");
    await test_motion("B", 8, "w");
    await test_motion("B", 0, "h");

    await set_text("hello\n\nworld", "empty lines");
    await test_motion("B", 7, "w");
    await test_motion("B", 6, "\n", "todo");
    await test_motion("B", 0, "h");

    await set_text("line1\n\n\nline2", "multiple empty lines");
    await test_motion("B", 8, "l");
    await test_motion("B", 7, "\n", "todo");
    await test_motion("B", 6, "\n", "todo");
    await test_motion("B", 0, "l");

    await set_text("hello\tworld", "tab");
    await test_motion("B", 6, "w");
    await test_motion("B", 0, "h");

    await set_text("hello\t\t\t\tworld", "consecutive tabs");
    await test_motion("B", 9, "w");
    await test_motion("B", 0, "h");

    await set_text("hello\t \t world", "tabs mixed with spaces");
    await test_motion("B", 9, "w");
    await test_motion("B", 0, "h");

    await set_text("hello? .world", "punctuation mixed with whitespace");
    await test_motion("B", 7, ".");
    await test_motion("B", 0, "h");

    await set_text("hello 世界 world", "unicode characters");
    await test_motion("B", 9, "w");
    await test_motion("B", 6, "世");
    await test_motion("B", 0, "h");

    await set_text("'quoted' \"double\" text", "quoted text");
    await test_motion("B", 18, "t");
    await test_motion("B", 9, "\"");
    await test_motion("B", 0, "'");

    await set_text("foo Hello wurld", "caret in between two words");
    await set_selection(9);
    await test_motion("B", 4, "H");
    await test_motion("B", 0, "f");

    await set_text("Hello wurld", "caret at the end of the first word");
    await set_selection(4);
    await test_motion("B", 0, "H");
  });
});
