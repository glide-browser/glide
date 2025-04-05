/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** " " \n */
export const CLS_WHITESPACE = 0;
/** . , ! */
export const CLS_PUNCTUATION = 1;
/** letters, digits, underscores */
export const CLS_CHARACTER = 2;

/**
 * Characterises the given character string into 3 different classes:
 *
 * 0 - CLS_WHITESPACE, e.g. ` `, `\n`
 * 1 - CLS_PUNCTUATION, e.g. `.`, `|`, `?`
 * 2 - CLS_CHARACTER, e.g. `a`, `_`, `ñ`
 *
 * This attempts to emulate the internal `cls()` function in vim:
 * https://github.com/neovim/neovim/blob/9198368f32dc0b4e2470b594f323691d45501442/src/nvim/textobject.c#L272-L291
 */
export function cls(char: string): number {
  switch (char) {
    case " ":
    case "\t":
    case "\n":
      return CLS_WHITESPACE;

    // note: I *think* this diverges from vim but I'm not sure
    case "\r":
      return CLS_WHITESPACE;

    case ".":
    case ",":
    case ":":
    case "!":
    case "?":
    case "(":
    case ")":
    case "[":
    case "]":
    case "{":
    case "}":
    case "<":
    case ">":
    case "'":
    case '"':
    case "-":
    case "+":
    case "=":
    case "~":
    case "@":
    case "#":
    case "$":
    case "%":
    case "^":
    case "&":
    case "*":
    case "\\":
    case "/":
    case "|":
    case ";":
      return CLS_PUNCTUATION;

    // note: unsure what should happen here
    case "":
      return CLS_PUNCTUATION;
  }

  const code = char.charCodeAt(0);
  switch (code) {
    case 160: // \u00a0
    case 8203: // \u200B
    case 0x0: // \0
      return CLS_WHITESPACE;
    case 0x7f: // DEL
      return CLS_PUNCTUATION;
  }

  if (is_word_char(code)) {
    return CLS_CHARACTER;
  }

  if (code < 0x100) {
    // TODO(glide): I think this is redundant
    return CLS_PUNCTUATION;
  }

  return CLS_CHARACTER;
}

function is_word_char(code: number): boolean {
  // basic ascii characters
  if (
    (code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0)) ||
    (code >= "A".charCodeAt(0) && code <= "Z".charCodeAt(0)) ||
    (code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0)) ||
    code === "_".charCodeAt(0)
  ) {
    return true;
  }

  // beyond ascii
  if (code > 0x7f) {
    // check if it's a Unicode letter or number, this includes accented characters,
    // CJK characters, etc.
    const char = String.fromCharCode(code);
    return /\p{L}|\p{N}/u.test(char);
  }

  return false;
}
