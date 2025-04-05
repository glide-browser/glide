/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// @ts-expect-error TS complains about ESModule resolution from a non-ESM file
//                  but it still resolves the type correctly?? so it really
//                  just does not matter at all ¯\_(ツ)_/¯
import type { KeyMappingTrieNode } from "../../utils/keys.mjs";

const { split, event_to_key_notation, KeyManager, normalize, parse_modifiers } =
  ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs", {
    global: "current",
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
    event_to_key_notation({
      key: "Space",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    }),
    "<Space>"
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
  event: Partial<KeyboardEvent> & { key: string }
): string {
  return event_to_key_notation({
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...event,
  });
}

add_task(async function test_event_to_ident() {
  is(to_key_notation({ key: "a" }), "a");
  is(to_key_notation({ key: "A", shiftKey: true }), "A");
  is(to_key_notation({ key: "c", ctrlKey: true }), "<C-c>");
  is(to_key_notation({ key: "c", ctrlKey: true, shiftKey: true }), "<C-S-c>");
  is(to_key_notation({ key: "Escape" }), "<Esc>");
  is(to_key_notation({ key: "Escape", ctrlKey: true }), "<C-Esc>");
  is(to_key_notation({ key: "<", ctrlKey: true }), "<C-lt>");
  is(to_key_notation({ key: "d", altKey: true }), "<A-d>");
  is(to_key_notation({ key: "x", metaKey: true }), "<D-x>");

  // Multiple modifiers
  is(to_key_notation({ key: "P", ctrlKey: true, shiftKey: true }), "<C-S-P>");
  is(
    to_key_notation({ key: "S", ctrlKey: true, shiftKey: true, altKey: true }),
    "<C-A-S-S>"
  );
  is(
    to_key_notation({ key: "l", ctrlKey: true, altKey: true, metaKey: true }),
    "<C-A-D-l>"
  );

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
  const base_modifiers = {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };
  isjson(parse_modifiers("a"), { ...base_modifiers, key: "a" });
  isjson(parse_modifiers("b"), { ...base_modifiers, key: "b" });
  isjson(parse_modifiers("H"), { ...base_modifiers, key: "H" });
  isjson(parse_modifiers("<S-h>"), {
    ...base_modifiers,
    shiftKey: true,
    key: "h",
  });
  isjson(parse_modifiers("<S-H>"), {
    ...base_modifiers,
    shiftKey: true,
    key: "H",
  });
  isjson(parse_modifiers("<C-S-h>"), {
    ...base_modifiers,
    ctrlKey: true,
    shiftKey: true,
    key: "h",
  });
  isjson(parse_modifiers("<S-C-h>"), {
    ...base_modifiers,
    ctrlKey: true,
    shiftKey: true,
    key: "h",
  });
  isjson(parse_modifiers("<S-A-D-C-h>"), {
    altKey: true,
    metaKey: true,
    ctrlKey: true,
    shiftKey: true,
    key: "h",
  });
});

add_task(async function test_leader() {
  const key_manager = new KeyManager();
  key_manager.set("normal", "<leader>sf", "back");

  GlideBrowser.api.g.mapleader = "\\";

  var node: KeyMappingTrieNode | undefined;
  document?.addEventListener(
    "keydown",
    event => {
      // @ts-ignore
      node = key_manager.handle_key_event(event, "normal");
    },
    { mozSystemGroup: true, capture: true }
  );

  EventUtils.synthesizeKey("\\");
  EventUtils.synthesizeKey("s");
  EventUtils.synthesizeKey("f");

  await new Promise(r => requestAnimationFrame(r));

  ok(node);
  is(node.value?.command, "back");
});
