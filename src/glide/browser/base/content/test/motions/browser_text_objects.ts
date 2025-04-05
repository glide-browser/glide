/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const text_obj = ChromeUtils.importESModule(
  "chrome://glide/content/text-objects.mjs"
);

add_task(async function test_cls() {
  function check_cls(char: string, expected: number): void {
    let expected_str;
    switch (expected) {
      case text_obj.CLS_WHITESPACE: {
        expected_str = "whitespace";
        break;
      }
      case text_obj.CLS_PUNCTUATION: {
        expected_str = "punctuation";
        break;
      }
      case text_obj.CLS_CHARACTER: {
        expected_str = "character";
        break;
      }
    }

    is(
      text_obj.cls(char),
      expected,
      `cls(${JSON.stringify(char)}) -> ${expected_str}`
    );
  }

  check_cls(" ", text_obj.CLS_WHITESPACE);
  check_cls("\n", text_obj.CLS_WHITESPACE);
  check_cls("\t", text_obj.CLS_WHITESPACE);
  check_cls("\r", text_obj.CLS_WHITESPACE);
  check_cls("\0", text_obj.CLS_WHITESPACE); // Null character
  check_cls("\u00a0", text_obj.CLS_WHITESPACE); // Non-breaking space
  check_cls("\u200B", text_obj.CLS_WHITESPACE); // Zero-width space

  check_cls(".", text_obj.CLS_PUNCTUATION);
  check_cls(",", text_obj.CLS_PUNCTUATION);
  check_cls(":", text_obj.CLS_PUNCTUATION);
  check_cls("!", text_obj.CLS_PUNCTUATION);
  check_cls("?", text_obj.CLS_PUNCTUATION);
  check_cls("\x7F", text_obj.CLS_PUNCTUATION); // DEL character
  check_cls("", text_obj.CLS_PUNCTUATION);

  check_cls("a", text_obj.CLS_CHARACTER);
  check_cls("é", text_obj.CLS_CHARACTER);
  check_cls("É", text_obj.CLS_CHARACTER);
  check_cls("ñ", text_obj.CLS_CHARACTER);
  check_cls("ü", text_obj.CLS_CHARACTER);
  check_cls("漢", text_obj.CLS_CHARACTER); // CJK character
  check_cls("α", text_obj.CLS_CHARACTER); // Greek letter
  check_cls("й", text_obj.CLS_CHARACTER); // Cyrillic letter
  check_cls("\uFFFF", text_obj.CLS_CHARACTER); // Highest BMP character
});
