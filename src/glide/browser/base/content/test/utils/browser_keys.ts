// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

import type { ValueOf } from "type-fest";
import type { KeyMappingTrieNode } from "../../utils/keys.mjs";

const fc = ChromeUtils.importESModule("resource://testing-common/fast-check.mjs", { global: "current" }).default;

const { split, event_to_key_notation, KeyManager, normalize, parse_modifiers } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/keys.mjs",
  { global: "current" },
);

function make_keys<K extends string>(
  keys: Record<K, { code: string; key?: string; shiftKey?: boolean }>,
): Record<K, { code: string; key: string; shiftKey?: boolean }> {
  return Object.fromEntries(
    Object.entries(keys).map((
      [key, event],
    ) => [key, { key: (event as ValueOf<typeof keys>).key ?? key, ...(event as ValueOf<typeof keys>) }]),
  ) as Record<K, { code: string; key: string; shiftKey?: boolean }>;
}

// en-US layout
const KEYS = make_keys({
  "`": { code: "Backquote" },
  "~": { code: "Backquote", shiftKey: true },
  "!": { code: "Digit1", shiftKey: true },
  "@": { code: "Digit2", shiftKey: true },
  "#": { code: "Digit3", shiftKey: true },
  "$": { code: "Digit4", shiftKey: true },
  "%": { code: "Digit5", shiftKey: true },
  "^": { code: "Digit6", shiftKey: true },
  "&": { code: "Digit7", shiftKey: true },
  "*": { code: "Digit8", shiftKey: true },
  "(": { code: "Digit9", shiftKey: true },
  ")": { code: "Digit0", shiftKey: true },
  "-": { code: "Minus" },
  "_": { code: "Minus", shiftKey: true },
  "=": { code: "Equal" },
  "+": { code: "Equal", shiftKey: true },
  "\\": { code: "Backslash" },
  "|": { code: "Backslash", shiftKey: true },
  "[": { code: "BracketLeft" },
  "{": { code: "BracketLeft", shiftKey: true },
  "]": { code: "BracketRight" },
  "}": { code: "BracketRight", shiftKey: true },
  ";": { code: "Semicolon" },
  ":": { code: "Semicolon", shiftKey: true },
  "'": { code: "Quote" },
  "\"": { code: "Quote", shiftKey: true },
  ",": { code: "Comma" },
  "<": { code: "Comma", shiftKey: true },
  ".": { code: "Period" },
  ">": { code: "Period", shiftKey: true },
  "/": { code: "Slash" },
  "?": { code: "Slash", shiftKey: true },
  " ": { code: "Space" },
  "Tab": { code: "Tab" },
  "Enter": { code: "Enter" },
  "Escape": { code: "Escape" },
  "ArrowUp": { code: "ArrowUp" },
  "ArrowDown": { code: "ArrowDown" },
  "ArrowLeft": { code: "ArrowLeft" },
  "ArrowRight": { code: "ArrowRight" },
  "Home": { code: "Home" },
  "Backspace": { code: "Backspace" },
  "Delete": { code: "Delete" },
  "End": { code: "End" },
  "PageUp": { code: "PageUp" },
  "PageDown": { code: "PageDown" },
  "F1": { code: "F1" },
  "F2": { code: "F2" },
  "F3": { code: "F3" },
  "F4": { code: "F4" },
  "F5": { code: "F5" },
  "F6": { code: "F6" },
  "F7": { code: "F7" },
  "F8": { code: "F8" },
  "F9": { code: "F9" },
  "F10": { code: "F10" },
  "F11": { code: "F11" },
  "F12": { code: "F12" },

  // standard
  "a": { code: "KeyA" },
  "A": { code: "KeyA", shiftKey: true },
  "b": { code: "KeyB" },
  "B": { code: "KeyB", shiftKey: true },
  "c": { code: "KeyC" },
  "C": { code: "KeyC", shiftKey: true },
  "d": { code: "KeyD" },
  "D": { code: "KeyD", shiftKey: true },
  "e": { code: "KeyE" },
  "E": { code: "KeyE", shiftKey: true },
  "f": { code: "KeyF" },
  "F": { code: "KeyF", shiftKey: true },
  "g": { code: "KeyG" },
  "G": { code: "KeyG", shiftKey: true },
  "h": { code: "KeyH" },
  "H": { code: "KeyH", shiftKey: true },
  "i": { code: "KeyI" },
  "I": { code: "KeyI", shiftKey: true },
  "j": { code: "KeyJ" },
  "J": { code: "KeyJ", shiftKey: true },
  "k": { code: "KeyK" },
  "K": { code: "KeyK", shiftKey: true },
  "l": { code: "KeyL" },
  "L": { code: "KeyL", shiftKey: true },
  "m": { code: "KeyM" },
  "M": { code: "KeyM", shiftKey: true },
  "n": { code: "KeyN" },
  "N": { code: "KeyN", shiftKey: true },
  "o": { code: "KeyO" },
  "O": { code: "KeyO", shiftKey: true },
  "p": { code: "KeyP" },
  "P": { code: "KeyP", shiftKey: true },
  "q": { code: "KeyQ" },
  "Q": { code: "KeyQ", shiftKey: true },
  "r": { code: "KeyR" },
  "R": { code: "KeyR", shiftKey: true },
  "s": { code: "KeyS" },
  "S": { code: "KeyS", shiftKey: true },
  "t": { code: "KeyT" },
  "T": { code: "KeyT", shiftKey: true },
  "u": { code: "KeyU" },
  "U": { code: "KeyU", shiftKey: true },
  "v": { code: "KeyV" },
  "V": { code: "KeyV", shiftKey: true },
  "w": { code: "KeyW" },
  "W": { code: "KeyW", shiftKey: true },
  "x": { code: "KeyX" },
  "X": { code: "KeyX", shiftKey: true },
  "y": { code: "KeyY" },
  "Y": { code: "KeyY", shiftKey: true },
  "z": { code: "KeyZ" },
  "Z": { code: "KeyZ", shiftKey: true },
  "0": { code: "Digit0" },
  "1": { code: "Digit1" },
  "2": { code: "Digit2" },
  "3": { code: "Digit3" },
  "4": { code: "Digit4" },
  "5": { code: "Digit5" },
  "6": { code: "Digit6" },
  "7": { code: "Digit7" },
  "8": { code: "Digit8" },
  "9": { code: "Digit9" },
});

add_setup(async function setup() {
  await reload_config(function _() {});
});

add_task(async function test_split() {
  isjson(split("a"), ["a"]);
  isjson(split("abcdefg"), ["a", "b", "c", "d", "e", "f", "g"]);
  isjson(split(""), []);

  // handling of <
  isjson(split("<"), ["<"]);
  isjson(split("ab<"), ["a", "b", "<"]);
  isjson(split("<ab"), ["<", "a", "b"]);
  isjson(split("ab<cd"), ["a", "b", "<", "c", "d"]);
  isjson(split("<<"), ["<", "<"]);
  isjson(split("<b<"), ["<", "b", "<"]);
  isjson(split("<>"), ["<", ">"]);

  // special keys
  isjson(split("<Esc>"), ["<Esc>"]);
  isjson(split("<Esc>a"), ["<Esc>", "a"]);
  isjson(split("<Esc>abc"), ["<Esc>", "a", "b", "c"]);
  isjson(split("ab<Esc>c"), ["a", "b", "<Esc>", "c"]);
  isjson(split("abc<Esc>"), ["a", "b", "c", "<Esc>"]);
  isjson(split("<Esc>a<lt>"), ["<Esc>", "a", "<lt>"]);
  isjson(split("<Esc><lt>"), ["<Esc>", "<lt>"]);

  // modifier keys
  isjson(split("<D-a>"), ["<D-a>"]);
  isjson(split("<D-a>a"), ["<D-a>", "a"]);
  isjson(split("<D-lt>a"), ["<D-lt>", "a"]);
  isjson(split("<D-Space>a"), ["<D-Space>", "a"]);
  isjson(split("<D-a>>"), ["<D-a>", ">"]);
});

add_task(async function test_normalize() {
  is(normalize("a"), "a");
  is(normalize("b"), "b");
  is(normalize("<Space>"), "<Space>");
  is(normalize(" "), "<Space>");
  is(normalize(">"), ">");
  is(normalize("<leader>"), "<leader>");
  is(
    event_to_key_notation({ ...KEYS[" "], ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }),
    "<Space>",
  );
  is(normalize("<D-!>"), "<D-!>");
  is(normalize("<D-S-!>"), "<D-!>");

  // special keys
  is(normalize("<Esc>"), "<Esc>");
  is(normalize("<F12>"), "<F12>");

  // char aliases
  is(normalize("<lt>"), "<");
  is(normalize("<Bslash>"), "\\");
  is(normalize("<Bar>"), "|");

  // modifier ordering
  is(normalize("<D-C-A-h>"), "<C-A-D-h>");
  is(normalize("<C-D-A-h>"), "<C-A-D-h>");
  is(normalize("<A-C-D-h>"), "<C-A-D-h>");
  is(normalize("<A-D-C-h>"), "<C-A-D-h>");

  // duplicate modifiers are ignored
  is(normalize("<A-C-A-D-D-h>"), "<C-A-D-h>");

  // Special char aliases with modifiers
  is(normalize("<D-lt>"), "<D-lt>");
  is(normalize("<D-Bar>"), "<D-Bar>");
  is(normalize("<D-|>"), "<D-Bar>");
  is(normalize("<D-\\>"), "<D-Bslash>");
  is(normalize("<D-Bslash>"), "<D-Bslash>");

  // special keys are case insensitive
  is(normalize("<BAR>"), "|");
  is(normalize("<BaR>"), "|");
  is(normalize("<SpaCE>"), "<Space>");
  is(normalize("<space>"), "<Space>");
  is(normalize("<D-LeADER>"), "<D-leader>");
  is(normalize("<C-D-LeADER>"), "<C-D-leader>");

  // shift transforming
  is(normalize("<S-h>"), "H");
  is(normalize("<S-C-h>"), "<C-S-H>");

  // TODO
  todo_is(normalize("<C-H>"), "<C-S-H>");
});

function to_key_notation(
  event: Partial<KeyboardEvent> & { key: string; code: string },
): string {
  return event_to_key_notation({ ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...event });
}

add_task(async function test_event_to_ident() {
  is(to_key_notation(KEYS["a"]), "a");
  is(to_key_notation(KEYS["A"]), "A");
  is(to_key_notation({ ...KEYS["c"], ctrlKey: true }), "<C-c>");
  is(to_key_notation({ ...KEYS["C"], ctrlKey: true }), "<C-S-C>");
  is(to_key_notation(KEYS["Escape"]), "<Esc>");
  is(to_key_notation({ ...KEYS["Escape"], ctrlKey: true }), "<C-Esc>");
  is(to_key_notation({ ...KEYS["<"], ctrlKey: true }), "<C-lt>");
  is(to_key_notation({ ...KEYS["d"], altKey: true }), "<A-d>");
  is(to_key_notation({ ...KEYS["x"], metaKey: true }), "<D-x>");

  // Multiple modifiers
  is(to_key_notation({ ...KEYS["P"], ctrlKey: true }), "<C-S-P>");
  is(to_key_notation({ ...KEYS["S"], ctrlKey: true, altKey: true }), "<C-A-S-S>");
  is(to_key_notation({ ...KEYS["l"], ctrlKey: true, altKey: true, metaKey: true }), "<C-A-D-l>");
  is(to_key_notation({ ...KEYS["P"], metaKey: true }), "<D-S-P>");

  // Special keys
  is(to_key_notation(KEYS["Tab"]), "<Tab>");
  is(to_key_notation({ ...KEYS["Tab"], shiftKey: true }), "<S-Tab>");
  is(to_key_notation(KEYS["Enter"]), "<CR>");
  is(to_key_notation(KEYS[" "]), "<Space>");
  is(to_key_notation(KEYS["ArrowUp"]), "<Up>");
  is(to_key_notation({ ...KEYS["ArrowDown"], ctrlKey: true }), "<C-Down>");
  is(to_key_notation(KEYS["Backspace"]), "<BS>");
  is(to_key_notation(KEYS["Delete"]), "<Del>");
  is(to_key_notation(KEYS["F1"]), "<F1>");
  is(to_key_notation(KEYS["F12"]), "<F12>");
  is(to_key_notation({ ...KEYS["F2"], ctrlKey: true, shiftKey: true }), "<C-S-F2>");

  // Special downcast keys
  is(to_key_notation(KEYS["\\"]), "\\");
  is(to_key_notation({ ...KEYS["\\"], ctrlKey: true }), "<C-Bslash>");
  is(to_key_notation(KEYS["|"]), "|");
  is(to_key_notation({ ...KEYS["|"], ctrlKey: true, metaKey: true }), "<C-D-Bar>");
});

add_task(async function test_parse_modifiers() {
  const base_modifiers = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, is_special: false };
  isjson(parse_modifiers("a"), { ...base_modifiers, key: "a" });
  isjson(parse_modifiers("b"), { ...base_modifiers, key: "b" });
  isjson(parse_modifiers("H"), { ...base_modifiers, key: "H" });
  isjson(parse_modifiers("<S-h>"), { ...base_modifiers, shiftKey: true, key: "h" });
  isjson(parse_modifiers("<S-H>"), { ...base_modifiers, shiftKey: true, key: "H" });
  isjson(parse_modifiers("<C-S-h>"), { ...base_modifiers, ctrlKey: true, shiftKey: true, key: "h" });
  isjson(parse_modifiers("<S-C-h>"), { ...base_modifiers, ctrlKey: true, shiftKey: true, key: "h" });
  isjson(parse_modifiers("<S-A-D-C-h>"), {
    ...base_modifiers,
    altKey: true,
    metaKey: true,
    ctrlKey: true,
    shiftKey: true,
    key: "h",
  });

  // lowercase
  isjson(parse_modifiers("<s-h>"), { ...base_modifiers, shiftKey: true, key: "h" });
  isjson(parse_modifiers("<s-H>"), { ...base_modifiers, shiftKey: true, key: "H" });
  isjson(parse_modifiers("<c-s-h>"), { ...base_modifiers, ctrlKey: true, shiftKey: true, key: "h" });

  // special keys
  isjson(parse_modifiers("<esc>"), { ...base_modifiers, is_special: true, key: "Escape" });
  isjson(parse_modifiers("<Esc>"), { ...base_modifiers, is_special: true, key: "Escape" });
});

add_task(async function test_leader() {
  const key_manager = new KeyManager();
  key_manager.set("normal", "<leader>sf", "back");

  glide.g.mapleader = "\\";

  var node: KeyMappingTrieNode | undefined;
  document?.addEventListener("keydown", event => {
    // @ts-ignore
    node = key_manager.handle_key_event(event, "normal");
  }, { mozSystemGroup: true, capture: true });

  await keys("\\sf");

  ok(node);
  is(node.value?.command, "back");
});

add_task(async function test_keymaps_list_all() {
  await reload_config(function _() {
    for (const keymap of glide.keymaps.list()) {
      glide.keymaps.del(keymap.mode, keymap.lhs);
    }
  });

  const keymaps = glide.keymaps.list();
  is(keymaps.length, 0, "keymaps.list() should list all keymaps");
});

add_task(async function test_keymaps_list_filter() {
  await reload_config(function _() {
    for (const keymap of glide.keymaps.list("normal")) {
      assert(keymap.mode, "normal");
      glide.keymaps.del(keymap.mode, keymap.lhs);
    }
  });

  const keymaps = glide.keymaps.list();
  Assert.greater(keymaps.length, 0, "Only normal keymaps should be returned");

  await reload_config(function _() {
    for (const keymap of glide.keymaps.list(["visual", "normal"])) {
      if (keymap.mode !== "visual" && keymap.mode !== "normal") {
        assert(false, "only visual or normal keymaps should be returned");
      }
      glide.keymaps.del(keymap.mode, keymap.lhs);
    }
  });

  Assert.less(glide.keymaps.list().length, keymaps.length, "Only normal/visual keymaps should be returned");
});

add_task(async function test_shifted_characters() {
  // test that inherently shifted characters don't get the S modifier,
  // note: this currently has only been tested on a US keyboard.

  // number row
  is(to_key_notation(KEYS["!"]), "!");
  is(to_key_notation(KEYS["@"]), "@");
  is(to_key_notation(KEYS["#"]), "#");
  is(to_key_notation(KEYS["$"]), "$");
  is(to_key_notation(KEYS["%"]), "%");
  is(to_key_notation(KEYS["^"]), "^");
  is(to_key_notation(KEYS["&"]), "&");
  is(to_key_notation(KEYS["*"]), "*");
  is(to_key_notation(KEYS["("]), "(");
  is(to_key_notation(KEYS[")"]), ")");

  // others
  is(to_key_notation(KEYS["_"]), "_");
  is(to_key_notation(KEYS["+"]), "+");
  is(to_key_notation(KEYS["{"]), "{");
  is(to_key_notation(KEYS["}"]), "}");
  is(to_key_notation(KEYS[":"]), ":");
  is(to_key_notation(KEYS["\""]), "\"");
  is(to_key_notation(KEYS[">"]), ">");
  is(to_key_notation(KEYS["?"]), "?");
  is(to_key_notation(KEYS["~"]), "~");

  // keys with special handling
  is(to_key_notation(KEYS["<"]), "<");
  is(to_key_notation(KEYS["|"]), "|");
});

add_task(async function test_shifted_characters_with_modifiers() {
  // single
  is(to_key_notation({ ...KEYS["+"], ctrlKey: true }), "<C-+>");
  is(to_key_notation({ ...KEYS["!"], ctrlKey: true }), "<C-!>");
  is(to_key_notation({ ...KEYS["@"], ctrlKey: true }), "<C-@>");
  is(to_key_notation({ ...KEYS["#"], ctrlKey: true }), "<C-#>");
  is(to_key_notation({ ...KEYS["$"], ctrlKey: true }), "<C-$>");
  is(to_key_notation({ ...KEYS["%"], ctrlKey: true }), "<C-%>");
  is(to_key_notation({ ...KEYS["^"], ctrlKey: true }), "<C-^>");
  is(to_key_notation({ ...KEYS["&"], ctrlKey: true }), "<C-&>");
  is(to_key_notation({ ...KEYS["*"], ctrlKey: true }), "<C-*>");
  is(to_key_notation({ ...KEYS["("], ctrlKey: true }), "<C-(>");
  is(to_key_notation({ ...KEYS[")"], ctrlKey: true }), "<C-)>");
  is(to_key_notation({ ...KEYS["_"], ctrlKey: true }), "<C-_>");
  is(to_key_notation({ ...KEYS["{"], ctrlKey: true }), "<C-{>");
  is(to_key_notation({ ...KEYS["}"], ctrlKey: true }), "<C-}>");
  is(to_key_notation({ ...KEYS[":"], ctrlKey: true }), "<C-:>");
  is(to_key_notation({ ...KEYS["\""], ctrlKey: true }), "<C-\">");
  is(to_key_notation({ ...KEYS["<"], ctrlKey: true }), "<C-lt>");
  is(to_key_notation({ ...KEYS[">"], ctrlKey: true }), "<C->>");
  is(to_key_notation({ ...KEYS["?"], ctrlKey: true }), "<C-?>");
  is(to_key_notation({ ...KEYS["~"], ctrlKey: true }), "<C-~>");

  // multiple
  is(to_key_notation({ ...KEYS["+"], ctrlKey: true, altKey: true }), "<C-A-+>");
  is(to_key_notation({ ...KEYS["!"], ctrlKey: true, altKey: true }), "<C-A-!>");
  is(to_key_notation({ ...KEYS["@"], ctrlKey: true, metaKey: true }), "<C-D-@>");
  is(to_key_notation({ ...KEYS["#"], ctrlKey: true, altKey: true, metaKey: true }), "<C-A-D-#>");
});

add_task(async function test_non_shifted_versions_of_characters_with_shift() {
  const render = to_key_notation;
  todo_is(render({ key: "-", code: "Minus", shiftKey: true }), "_");
  todo_is(render({ key: "-", code: "Minus", ctrlKey: true, shiftKey: true }), "<C-_>");
  todo_is(render({ key: "=", code: "Equal", ctrlKey: true, shiftKey: true }), "<C-+>");
  todo_is(render({ key: "[", code: "BracketLeft", ctrlKey: true, shiftKey: true }), "<C-{>");
  todo_is(render({ key: "]", code: "BracketRight", ctrlKey: true, shiftKey: true }), "<C-}>");
  todo_is(render({ key: ";", code: "Semicolon", ctrlKey: true, shiftKey: true }), "<C-:>");
  todo_is(render({ key: "'", code: "Quote", ctrlKey: true, shiftKey: true }), "<C-\">");
  todo_is(render({ key: ",", code: "Comma", ctrlKey: true, shiftKey: true }), "<C-<>");
  todo_is(render({ key: ".", code: "Period", ctrlKey: true, shiftKey: true }), "<C->>");
  todo_is(render({ key: "/", code: "Slash", ctrlKey: true, shiftKey: true }), "<C-?>");
  todo_is(render({ key: "`", code: "Backquote", ctrlKey: true, shiftKey: true }), "<C-~>");
});

add_task(async function test_non_shifted_characters_with_shift() {
  is(to_key_notation({ key: "a", code: "KeyA", ctrlKey: true, shiftKey: true }), "<C-S-A>");
  is(to_key_notation({ key: "z", code: "KeyZ", ctrlKey: true, shiftKey: true }), "<C-S-Z>");
  is(to_key_notation({ key: "h", code: "KeyH", altKey: true, shiftKey: true }), "<A-S-H>");
  is(to_key_notation({ key: "x", code: "KeyX", metaKey: true, shiftKey: true }), "<D-S-X>");
});

add_task(async function test_special_keys_with_shift() {
  is(to_key_notation({ ...KEYS["Tab"], shiftKey: true }), "<S-Tab>");
  is(to_key_notation({ ...KEYS["Tab"], ctrlKey: true, shiftKey: true }), "<C-S-Tab>");
  is(to_key_notation({ ...KEYS["Enter"], shiftKey: true }), "<S-CR>");
  is(to_key_notation({ ...KEYS["Enter"], ctrlKey: true, shiftKey: true }), "<C-S-CR>");
  is(to_key_notation({ ...KEYS["Escape"], shiftKey: true }), "<S-Esc>");
  is(to_key_notation({ ...KEYS["Escape"], altKey: true, shiftKey: true }), "<A-S-Esc>");
  is(to_key_notation({ ...KEYS[" "], shiftKey: true }), "<S-Space>");
  is(to_key_notation({ ...KEYS[" "], metaKey: true, shiftKey: true }), "<D-S-Space>");
  is(to_key_notation({ ...KEYS["ArrowUp"], shiftKey: true }), "<S-Up>");
  is(to_key_notation({ ...KEYS["ArrowDown"], ctrlKey: true, shiftKey: true }), "<C-S-Down>");
  is(to_key_notation({ ...KEYS["ArrowLeft"], altKey: true, shiftKey: true }), "<A-S-Left>");
  is(to_key_notation({ ...KEYS["ArrowRight"], metaKey: true, shiftKey: true }), "<D-S-Right>");
  is(to_key_notation({ ...KEYS["F1"], shiftKey: true }), "<S-F1>");
  is(to_key_notation({ ...KEYS["F12"], ctrlKey: true, shiftKey: true }), "<C-S-F12>");
  is(to_key_notation({ ...KEYS["Backspace"], shiftKey: true }), "<S-BS>");
  is(to_key_notation({ ...KEYS["Delete"], shiftKey: true }), "<S-Del>");
  is(to_key_notation({ ...KEYS["Home"], shiftKey: true }), "<S-Home>");
  is(to_key_notation({ ...KEYS["End"], shiftKey: true }), "<S-End>");
  is(to_key_notation({ ...KEYS["PageUp"], shiftKey: true }), "<S-PageUp>");
  is(to_key_notation({ ...KEYS["PageDown"], shiftKey: true }), "<S-PageDown>");
});

add_task(async function test_shift_edge_cases() {
  // uppercase letters don't get double-shifted
  is(to_key_notation({ key: "A", code: "KeyA", shiftKey: true }), "A");
  is(to_key_notation({ key: "A", code: "KeyA", ctrlKey: true, shiftKey: true }), "<C-S-A>");
  is(to_key_notation({ key: "Z", code: "KeyZ", ctrlKey: true, shiftKey: true }), "<C-S-Z>");

  // Test that shifted characters work without the shift key too
  is(to_key_notation({ key: "+", code: "Equal" }), "+");
  is(to_key_notation({ key: "!", code: "Digit1", ctrlKey: true }), "<C-!>");
  is(to_key_notation({ key: "@", code: "Digit2", altKey: true }), "<A-@>");
  is(to_key_notation({ key: "#", code: "Digit3", metaKey: true }), "<D-#>");
});

add_task(async function test_shifted_character_normalization() {
  // shifted chars without any modifiers
  is(normalize("+"), "+");
  is(normalize("!"), "!");
  is(normalize("@"), "@");

  // S- is stripped from shifted chars
  is(normalize("<S-+>"), "+");
  is(normalize("<S-!>"), "!");
  is(normalize("<S-@>"), "@");
  is(normalize("<C-S-+>"), normalize("<C-+>"));
  is(normalize("<C-S-!>"), normalize("<C-!>"));
  is(normalize("<C-S-@>"), normalize("<C-@>"));
  is(normalize("<C-S-#>"), normalize("<C-#>"));
  is(normalize("<C-S-$>"), normalize("<C-$>"));
  is(normalize("<C-S-%>"), normalize("<C-%>"));
  is(normalize("<C-S-^>"), normalize("<C-^>"));
  is(normalize("<C-S-&>"), normalize("<C-&>"));
  is(normalize("<C-S-*>"), normalize("<C-*>"));
  is(normalize("<C-S-(>"), normalize("<C-(>"));
  is(normalize("<C-S-)>"), normalize("<C-)>"));
  is(normalize("<C-S-_>"), normalize("<C-_>"));
  is(normalize("<C-S-{>"), normalize("<C-{>"));
  is(normalize("<C-S-}>"), normalize("<C-}>"));
  is(normalize("<C-S-:>"), normalize("<C-:>"));
  is(normalize("<C-S-\">"), normalize("<C-\">"));
  is(normalize("<C-S->>"), normalize("<C->>"));
  is(normalize("<C-S-?>"), normalize("<C-?>"));
  is(normalize("<C-S-~>"), normalize("<C-~>"));

  // multiple modifiers
  is(normalize("<C-A-S-+>"), normalize("<C-A-+>"));
  is(normalize("<C-D-S-!>"), normalize("<C-D-!>"));
  is(normalize("<C-A-D-S-@>"), normalize("<C-A-D-@>"));
  is(normalize("<C-S-+>"), "<C-+>");
  is(normalize("<C-S-!>"), "<C-!>");
  is(normalize("<A-S-@>"), "<A-@>");
  is(normalize("<D-S-#>"), "<D-#>");

  // special keys
  is(normalize("<C-S-lt>"), normalize("<C-lt>"));
  is(normalize("<C-S-Bar>"), normalize("<C-Bar>"));

  // non-shifted chars keep the S modifier
  is(normalize("<C-S-a>"), "<C-S-A>");
  is(normalize("<C-S-=>"), "<C-S-=>");

  // on a US keyboard this would never match anything as ctrl+shift+1 would actually
  // be sent as ctrl+shift+!, but if you do this you deserve to have strange behaviour
  is(normalize("<C-S-1>"), "<C-S-1>");
});

add_task(function normalize_is_idempotent() {
  fc.assert(
    fc.property(fc.string(), input => {
      const normalized = normalize(input);
      const double_normalized = normalize(normalized);
      return normalized === double_normalized;
    }),
    { seed: 1, numRuns: 1000, verbose: true },
  );
});
