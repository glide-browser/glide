// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

import type { KeyMappingTrieNode } from "../../utils/keys.mjs";

const fc = ChromeUtils.importESModule("resource://testing-common/fast-check.mjs", { global: "current" }).default;

const { split, event_to_key_notation, KeyManager, normalize, parse_modifiers } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/keys.mjs",
  { global: "current" },
);

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
    event_to_key_notation({ key: "Space", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }),
    "<Space>",
  );

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
  is(normalize("<D-S-Bslash>"), "<D-S-Bslash>");

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
  event: Partial<KeyboardEvent> & { key: string },
): string {
  return event_to_key_notation({ ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...event });
}

add_task(async function test_event_to_ident() {
  is(to_key_notation({ key: "a" }), "a");
  is(to_key_notation({ key: "A", shiftKey: true }), "A");
  is(to_key_notation({ key: "a", shiftKey: true }), "A");
  is(to_key_notation({ key: "c", ctrlKey: true }), "<C-c>");
  is(to_key_notation({ key: "c", ctrlKey: true, shiftKey: true }), "<C-S-C>");
  is(to_key_notation({ key: "Escape" }), "<Esc>");
  is(to_key_notation({ key: "Escape", ctrlKey: true }), "<C-Esc>");
  is(to_key_notation({ key: "<", ctrlKey: true }), "<C-lt>");
  is(to_key_notation({ key: "d", altKey: true }), "<A-d>");
  is(to_key_notation({ key: "x", metaKey: true }), "<D-x>");

  // Multiple modifiers
  is(to_key_notation({ key: "P", ctrlKey: true, shiftKey: true }), "<C-S-P>");
  is(to_key_notation({ key: "S", ctrlKey: true, shiftKey: true, altKey: true }), "<C-A-S-S>");
  is(to_key_notation({ key: "l", ctrlKey: true, altKey: true, metaKey: true }), "<C-A-D-l>");
  is(to_key_notation({ key: "P", metaKey: true, shiftKey: true }), "<D-S-P>");

  // Special keys
  is(to_key_notation({ key: "Tab" }), "<Tab>");
  is(to_key_notation({ key: "Tab", shiftKey: true }), "<S-Tab>");
  is(to_key_notation({ key: "Enter" }), "<CR>");
  is(to_key_notation({ key: " " }), "<Space>");
  is(to_key_notation({ key: "ArrowUp" }), "<Up>");
  is(to_key_notation({ key: "ArrowDown", ctrlKey: true }), "<C-Down>");
  is(to_key_notation({ key: "Backspace" }), "<BS>");
  is(to_key_notation({ key: "Delete" }), "<Del>");
  is(to_key_notation({ key: "F1" }), "<F1>");
  is(to_key_notation({ key: "F12" }), "<F12>");
  is(to_key_notation({ key: "F2", ctrlKey: true, shiftKey: true }), "<C-S-F2>");

  // Special downcast keys
  is(to_key_notation({ key: "\\" }), "\\");
  is(to_key_notation({ key: "\\", ctrlKey: true }), "<C-Bslash>");
  is(to_key_notation({ key: "|" }), "|");
  is(to_key_notation({ key: "|", ctrlKey: true, metaKey: true }), "<C-D-Bar>");
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
  is(to_key_notation({ key: "!", shiftKey: true }), "!");
  is(to_key_notation({ key: "@", shiftKey: true }), "@");
  is(to_key_notation({ key: "#", shiftKey: true }), "#");
  is(to_key_notation({ key: "$", shiftKey: true }), "$");
  is(to_key_notation({ key: "%", shiftKey: true }), "%");
  is(to_key_notation({ key: "^", shiftKey: true }), "^");
  is(to_key_notation({ key: "&", shiftKey: true }), "&");
  is(to_key_notation({ key: "*", shiftKey: true }), "*");
  is(to_key_notation({ key: "(", shiftKey: true }), "(");
  is(to_key_notation({ key: ")", shiftKey: true }), ")");

  // others
  is(to_key_notation({ key: "_", shiftKey: true }), "_");
  is(to_key_notation({ key: "+", shiftKey: true }), "+");
  is(to_key_notation({ key: "{", shiftKey: true }), "{");
  is(to_key_notation({ key: "}", shiftKey: true }), "}");
  is(to_key_notation({ key: ":", shiftKey: true }), ":");
  is(to_key_notation({ key: "\"", shiftKey: true }), "\"");
  is(to_key_notation({ key: ">", shiftKey: true }), ">");
  is(to_key_notation({ key: "?", shiftKey: true }), "?");
  is(to_key_notation({ key: "~", shiftKey: true }), "~");

  // keys with special handling
  is(to_key_notation({ key: "<", shiftKey: true }), "<");
  is(to_key_notation({ key: "|", shiftKey: true }), "|");
});

add_task(async function test_shifted_characters_with_modifiers() {
  // single
  is(to_key_notation({ key: "+", ctrlKey: true, shiftKey: true }), "<C-+>");
  is(to_key_notation({ key: "!", ctrlKey: true, shiftKey: true }), "<C-!>");
  is(to_key_notation({ key: "@", ctrlKey: true, shiftKey: true }), "<C-@>");
  is(to_key_notation({ key: "#", ctrlKey: true, shiftKey: true }), "<C-#>");
  is(to_key_notation({ key: "$", ctrlKey: true, shiftKey: true }), "<C-$>");
  is(to_key_notation({ key: "%", ctrlKey: true, shiftKey: true }), "<C-%>");
  is(to_key_notation({ key: "^", ctrlKey: true, shiftKey: true }), "<C-^>");
  is(to_key_notation({ key: "&", ctrlKey: true, shiftKey: true }), "<C-&>");
  is(to_key_notation({ key: "*", ctrlKey: true, shiftKey: true }), "<C-*>");
  is(to_key_notation({ key: "(", ctrlKey: true, shiftKey: true }), "<C-(>");
  is(to_key_notation({ key: ")", ctrlKey: true, shiftKey: true }), "<C-)>");
  is(to_key_notation({ key: "_", ctrlKey: true, shiftKey: true }), "<C-_>");
  is(to_key_notation({ key: "{", ctrlKey: true, shiftKey: true }), "<C-{>");
  is(to_key_notation({ key: "}", ctrlKey: true, shiftKey: true }), "<C-}>");
  is(to_key_notation({ key: ":", ctrlKey: true, shiftKey: true }), "<C-:>");
  is(to_key_notation({ key: "\"", ctrlKey: true, shiftKey: true }), "<C-\">");
  is(to_key_notation({ key: "<", ctrlKey: true, shiftKey: true }), "<C-lt>");
  is(to_key_notation({ key: ">", ctrlKey: true, shiftKey: true }), "<C->>");
  is(to_key_notation({ key: "?", ctrlKey: true, shiftKey: true }), "<C-?>");
  is(to_key_notation({ key: "~", ctrlKey: true, shiftKey: true }), "<C-~>");

  // multiple
  is(to_key_notation({ key: "+", ctrlKey: true, altKey: true, shiftKey: true }), "<C-A-+>");
  is(to_key_notation({ key: "!", ctrlKey: true, altKey: true, shiftKey: true }), "<C-A-!>");
  is(to_key_notation({ key: "@", ctrlKey: true, metaKey: true, shiftKey: true }), "<C-D-@>");
  is(to_key_notation({ key: "#", ctrlKey: true, altKey: true, metaKey: true, shiftKey: true }), "<C-A-D-#>");
});

add_task(async function test_non_shifted_versions_of_characters_with_shift() {
  const render = to_key_notation;
  todo_is(render({ key: "-", shiftKey: true }), "_");
  todo_is(render({ key: "-", ctrlKey: true, shiftKey: true }), "<C-_>");
  todo_is(render({ key: "=", ctrlKey: true, shiftKey: true }), "<C-+>");
  todo_is(render({ key: "[", ctrlKey: true, shiftKey: true }), "<C-{>");
  todo_is(render({ key: "]", ctrlKey: true, shiftKey: true }), "<C-}>");
  todo_is(render({ key: ";", ctrlKey: true, shiftKey: true }), "<C-:>");
  todo_is(render({ key: "'", ctrlKey: true, shiftKey: true }), "<C-\">");
  todo_is(render({ key: ",", ctrlKey: true, shiftKey: true }), "<C-<>");
  todo_is(render({ key: ".", ctrlKey: true, shiftKey: true }), "<C->>");
  todo_is(render({ key: "/", ctrlKey: true, shiftKey: true }), "<C-|>");
  todo_is(render({ key: "`", ctrlKey: true, shiftKey: true }), "<C-~>");
});

add_task(async function test_non_shifted_characters_with_shift() {
  is(to_key_notation({ key: "a", ctrlKey: true, shiftKey: true }), "<C-S-A>");
  is(to_key_notation({ key: "z", ctrlKey: true, shiftKey: true }), "<C-S-Z>");
  is(to_key_notation({ key: "h", altKey: true, shiftKey: true }), "<A-S-H>");
  is(to_key_notation({ key: "x", metaKey: true, shiftKey: true }), "<D-S-X>");
});

add_task(async function test_special_keys_with_shift() {
  is(to_key_notation({ key: "Tab", shiftKey: true }), "<S-Tab>");
  is(to_key_notation({ key: "Tab", ctrlKey: true, shiftKey: true }), "<C-S-Tab>");
  is(to_key_notation({ key: "Enter", shiftKey: true }), "<S-CR>");
  is(to_key_notation({ key: "Enter", ctrlKey: true, shiftKey: true }), "<C-S-CR>");
  is(to_key_notation({ key: "Escape", shiftKey: true }), "<S-Esc>");
  is(to_key_notation({ key: "Escape", altKey: true, shiftKey: true }), "<A-S-Esc>");
  is(to_key_notation({ key: "Space", shiftKey: true }), "<S-Space>");
  is(to_key_notation({ key: "Space", metaKey: true, shiftKey: true }), "<D-S-Space>");
  is(to_key_notation({ key: "ArrowUp", shiftKey: true }), "<S-Up>");
  is(to_key_notation({ key: "ArrowDown", ctrlKey: true, shiftKey: true }), "<C-S-Down>");
  is(to_key_notation({ key: "ArrowLeft", altKey: true, shiftKey: true }), "<A-S-Left>");
  is(to_key_notation({ key: "ArrowRight", metaKey: true, shiftKey: true }), "<D-S-Right>");
  is(to_key_notation({ key: "F1", shiftKey: true }), "<S-F1>");
  is(to_key_notation({ key: "F12", ctrlKey: true, shiftKey: true }), "<C-S-F12>");
  is(to_key_notation({ key: "Backspace", shiftKey: true }), "<S-BS>");
  is(to_key_notation({ key: "Delete", shiftKey: true }), "<S-Del>");
  is(to_key_notation({ key: "Home", shiftKey: true }), "<S-Home>");
  is(to_key_notation({ key: "End", shiftKey: true }), "<S-End>");
  is(to_key_notation({ key: "PageUp", shiftKey: true }), "<S-PageUp>");
  is(to_key_notation({ key: "PageDown", shiftKey: true }), "<S-PageDown>");
});

add_task(async function test_shift_edge_cases() {
  // uppercase letters don't get double-shifted
  is(to_key_notation({ key: "A", shiftKey: true }), "A");
  is(to_key_notation({ key: "A", ctrlKey: true, shiftKey: true }), "<C-S-A>");
  is(to_key_notation({ key: "Z", ctrlKey: true, shiftKey: true }), "<C-S-Z>");

  // Test that shifted characters work without the shift key too
  is(to_key_notation({ key: "+" }), "+");
  is(to_key_notation({ key: "!", ctrlKey: true }), "<C-!>");
  is(to_key_notation({ key: "@", altKey: true }), "<A-@>");
  is(to_key_notation({ key: "#", metaKey: true }), "<D-#>");
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
