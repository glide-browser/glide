/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_normal_x() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, {
        text_start: 1,
      });

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

add_task(async function test_normal_diw() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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

    await set_text(
      "foo(bar: true)",
      "parentheses and special character handling"
    );
    await set_selection(3);
    await test_edit("diw", "foobar: true)", 3, "b");

    await set_text("foo(bar: true)", "delete inside parentheses");
    await set_selection(5);
    await test_edit("diw", "foo(: true)", 4, ":");

    await set_text(
      "foo(bar: true)",
      "delete special character inside parentheses"
    );
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

add_task(async function test_normal_dl() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 0 });

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
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 0 });

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

    await set_text(
      "barracks\nfab\nalice",
      "retains col position for multi lines"
    );
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
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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
    const { set_text, test_edit, test_motion, is_text, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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

    await set_text(
      "short\nvery long line here\nend",
      "lines of different lengths"
    );
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
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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
    await test_edit("r\n", "He\nlo\nworld", 2, "\n");

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
    const { set_text, test_edit, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Line 1", "basic");
    await test_edit("oLine 2", "Line 1\nLine 2", 12, "2");

    await set_text("Line 1\nLine 2", "at eol");
    await set_selection(12, "2");
    await test_edit("$oLine 3", "Line 1\nLine 2\nLine 3", 19, "3");
  });
});

add_task(async function test_normal_w() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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

    await set_text(
      "hello,world",
      "no whitespace between `,` and the next word"
    );
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
    await test_motion("w", 9, '"');
    await test_motion("w", 10, "d");
    await test_motion("w", 16, '"');
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
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "basic whitespace between words");
    await test_motion("W", 6, "w");
    await test_motion("W", 10, "d");

    await set_text("Hello   world", "multiple spaces between words");
    await test_motion("W", 8, "w");
    await test_motion("W", 12, "d");

    await set_text("Hello, world", "whitespace between `,` and the next word");
    await test_motion("W", 7, "w");
    await test_motion("W", 11, "d");

    await set_text(
      "hello,world",
      "no whitespace between `,` and the next word"
    );
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
    await test_motion("W", 9, '"');
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

add_task(async function test_normal_b() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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

    await set_text(
      "hello,world",
      "no whitespace between `,` and the next word"
    );
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
    await test_motion("b", 16, '"');
    await test_motion("b", 10, "d");
    await test_motion("b", 9, '"');
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
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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
    await test_motion("B", 9, '"');
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

add_task(async function test_normal_0() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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
    const { set_text, test_motion, set_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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
    const { set_text, test_motion } = GlideTestUtils.make_input_test_helpers(
      browser,
      { text_start: 1 }
    );

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
    const { set_text, test_motion } = GlideTestUtils.make_input_test_helpers(
      browser,
      { text_start: "end" }
    );

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

add_task(async function test_visual_overlapping_selections() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    const { set_text, set_selection, test_selection, test_motion } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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
    const { set_text, set_selection, test_selection, test_motion } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

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
    const { set_text, set_selection, test_edit, test_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: 1 });

    await set_text("Hello wurld", "from the start of the line");
    await test_edit("vlld", "lo wurld", 0, "l");

    await set_text("Hello wurld", "in the middle of a word");
    await set_selection(1);
    await test_edit("vlld", "Ho wurld", 1, "o");

    await set_text("hello bar\nworld", "crossing forward line boundary");
    await set_selection(6);
    await test_edit("vllld", "hello world", 6, "w");

    await set_text(
      "hello bar\nworld",
      "only crosses forward line boundary by one char"
    );
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
    const { set_text, test_edit, test_selection } =
      GlideTestUtils.make_input_test_helpers(browser, { text_start: "end" });

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

add_task(async function test_get_column_offset() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    async function get_column(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        const element = (content.document as Document).querySelector(
          "#textarea-1"
        );
        if (!element) throw new Error("no element");

        const motions = ChromeUtils.importESModule(
          "chrome://glide/content/motions.mjs"
        );
        return motions.get_column_offset(
          (element as any as MozEditableElement).editor!
        );
      });
    }

    const { set_text, set_selection } = GlideTestUtils.make_input_test_helpers(
      browser,
      { text_start: "end" }
    );

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
