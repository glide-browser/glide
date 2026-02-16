// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs", { global: "current" });

function to_key_notation(
  event: Partial<KeyboardEvent> & { key: string; code?: string },
): string {
  return Keys.event_to_key_notation({
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...event,
  });
}

add_task(async function test_default_uses_event_key() {
  await reload_config(function _() {});

  is(to_key_notation({ key: "a", code: "KeyB" }), "a", "a - should use event.key");
  is(to_key_notation({ key: "ü", code: "BracketLeft" }), "ü", "ü - should use event.key");
});

add_task(async function test_physical_layout__qwerty() {
  await reload_config(function _() {
    glide.o.keyboard_layout = "qwerty";
    glide.o.keymaps_use_physical_layout = "force";
  });

  is(to_key_notation({ key: "x", code: "KeyA" }), "a", "Should translate KeyA to 'a' via qwerty layout");
  is(
    to_key_notation({ key: "ü", code: "BracketLeft" }),
    "[",
    "Should translate BracketLeft to '[' via qwerty layout, ignoring event.key",
  );
  is(
    to_key_notation({ key: "foreign_char", code: "Backslash" }),
    "\\",
    "Should translate Backslash to '\\' via qwerty layout",
  );
  is(
    to_key_notation({ key: "foreign_char", code: "Backslash", shiftKey: true }),
    "|",
    "Should translate Shift+Backslash to '|' via qwerty layout",
  );

  const letters = "abcdefghijklmnopqrstuvwxyz";
  for (const letter of letters) {
    const code = `Key${letter.toUpperCase()}`;
    is(
      to_key_notation({ key: "foreign_char", code }),
      letter,
      `Should translate ${code} to '${letter}' via qwerty layout`,
    );
  }

  for (let i = 0; i <= 9; i++) {
    const code = `Digit${i}`;
    is(
      to_key_notation({ key: "foreign_char", code }),
      String(i),
      `Should translate ${code} to '${i}' via qwerty layout`,
    );
  }

  // shifted
  is(
    to_key_notation({ key: "Ü", code: "BracketLeft", shiftKey: true }),
    "{",
    "Should translate Shift+BracketLeft to '{' via qwerty layout",
  );
  is(
    to_key_notation({ key: "x", code: "KeyA", shiftKey: true }),
    "A",
    "Should translate Shift+KeyA to 'A' via qwerty layout",
  );

  const shifted_digits = {
    Digit1: "!",
    Digit2: "@",
    Digit3: "#",
    Digit4: "$",
    Digit5: "%",
    Digit6: "^",
    Digit7: "&",
    Digit8: "*",
    Digit9: "(",
    Digit0: ")",
  };
  for (const [code, expected] of Object.entries(shifted_digits)) {
    is(
      to_key_notation({ key: "foreign_char", code, shiftKey: true }),
      expected,
      `Should translate Shift+${code} to '${expected}' via qwerty layout`,
    );
  }

  const punctuation: Array<[string, string, string]> = [
    ["Minus", "-", "_"],
    ["Equal", "=", "+"],
    ["BracketLeft", "[", "{"],
    ["BracketRight", "]", "}"],
    ["Semicolon", ";", ":"],
    ["Quote", "'", "\""],
    ["Comma", ",", "<"],
    ["Period", ".", ">"],
    ["Slash", "/", "?"],
    ["Backquote", "`", "~"],
  ];

  for (const [code, unshifted, shifted] of punctuation) {
    is(
      to_key_notation({ key: "foreign_char", code }),
      unshifted,
      `Should translate ${code} to '${unshifted}' via qwerty layout`,
    );
    is(
      to_key_notation({ key: "foreign_char", code, shiftKey: true }),
      shifted,
      `Should translate Shift+${code} to '${shifted}' via qwerty layout`,
    );
  }
});

add_task(async function test_physical_layout__qwerty__with_modifiers() {
  await reload_config(function _() {
    glide.o.keyboard_layout = "qwerty";
    glide.o.keymaps_use_physical_layout = "force";
  });

  is(
    to_key_notation({ key: "ü", code: "BracketLeft", ctrlKey: true }),
    "<C-[>",
    "Should translate Ctrl+BracketLeft to '<C-[>' via qwerty layout",
  );
  is(
    to_key_notation({ key: "foreign_char", code: "KeyA", metaKey: true }),
    "<D-a>",
    "Should translate Cmd+KeyA to '<D-a>' via qwerty layout",
  );
  is(
    to_key_notation({ key: "foreign_char", code: "KeyA", ctrlKey: true, shiftKey: true }),
    "<C-S-A>",
    "Should translate Ctrl+Shift+KeyA to '<C-S-A>' via qwerty layout",
  );
});

add_task(async function test_physical_layout__qwerty__unknown_code_falls_back_to_key() {
  await reload_config(function _() {
    glide.o.keyboard_layout = "qwerty";
    glide.o.keymaps_use_physical_layout = "force";
  });

  is(to_key_notation({ key: "Escape", code: "Escape" }), "<Esc>");
  is(to_key_notation({ key: "Enter", code: "Enter" }), "<CR>");
  is(to_key_notation({ key: "ArrowUp", code: "ArrowUp" }), "<Up>");
  is(to_key_notation({ key: "Escape", code: "Unknown" }), "<Esc>");
  is(to_key_notation({ key: "a" }), "a", "Should use event.key when code is not provided");
});

declare global {
  interface GlideKeyboardLayouts {
    __test_layout: GlideKeyboardLayout;
  }
}

add_task(async function test_physical_layout__custom_keyboard_layout() {
  await reload_config(function _() {
    glide.o.keyboard_layouts.__test_layout = {
      KeyS: [";", ":"],
      KeyD: [".", ">"],
      KeyF: ["p", "P"],
      BracketLeft: ["/", "?"],
    };

    glide.o.keyboard_layout = "__test_layout";
    glide.o.keymaps_use_physical_layout = "force";
  });

  is(to_key_notation({ key: "s", code: "KeyS" }), ";", "Custom layout: KeyS should map to ';'");
  is(to_key_notation({ key: "s", code: "KeyS", shiftKey: true }), ":", "Custom layout: Shift+KeyS should map to ':'");
  is(to_key_notation({ key: "[", code: "BracketLeft" }), "/", "Custom layout: BracketLeft should map to '/'");

  await reload_config(function _() {});
});

add_task(async function test_switching__keymaps_use_physical_layout() {
  await reload_config(function _() {
    glide.o.keymaps_use_physical_layout = "force";
    glide.o.keyboard_layout = "qwerty";
  });

  is(to_key_notation({ key: "ü", code: "BracketLeft" }), "[", "Force mode: Should translate via layout");

  await reload_config(function _() {
    glide.o.keymaps_use_physical_layout = "never";
  });

  is(to_key_notation({ key: "ü", code: "BracketLeft" }), "ü", "Never mode: Should use event.key");

  await reload_config(function _() {
    glide.o.keymaps_use_physical_layout = "force";
    glide.o.keyboard_layout = "qwerty";
  });

  is(to_key_notation({ key: "ü", code: "BracketLeft" }), "[", "Force mode again: Should translate via layout");
});

add_task(async function test_keymap_matching_with_physical_layout() {
  await reload_config(function _() {
    glide.o.keyboard_layouts.__test_layout = {
      KeyS: [";", ":"],
    };
    glide.o.keyboard_layout = "__test_layout";
    glide.o.keymaps_use_physical_layout = "force";

    glide.keymaps.set("normal", ";", () => {
      glide.g.test_checked = true;
    });

    (async () => {
      glide.g.value = await glide.keys.next_passthrough();
    })();
  });

  await glide.keys.send("s");

  await until(() => glide.g.test_checked, "waiting for the keymap to be invoked");
  var event = await until(() => glide.g.value as glide.KeyEvent);
  is(event.key, "s");
  is(event.code, "KeyS");
  is(event.shiftKey, false);

  await reload_config(function _() {});
});

add_task(async function test_keymap_matching_without_physical_layout() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "ü", () => {
      glide.g.test_checked = true;
    });

    (async () => {
      glide.g.value = await glide.keys.next_passthrough();
    })();
  });

  await glide.keys.send("ü");

  await until(() => glide.g.test_checked, "waiting for the keymap to be invoked");
  var event = await until(() => glide.g.value as glide.KeyEvent);
  is(event.key, "ü");
  is(event.code, "");
  is(event.shiftKey, false);

  await reload_config(function _() {});
});
