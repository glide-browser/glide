/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function get_layouts(): GlideKeyboardLayouts {
  return {
    qwerty: {
      KeyA: ["a", "A"],
      KeyB: ["b", "B"],
      KeyC: ["c", "C"],
      KeyD: ["d", "D"],
      KeyE: ["e", "E"],
      KeyF: ["f", "F"],
      KeyG: ["g", "G"],
      KeyH: ["h", "H"],
      KeyI: ["i", "I"],
      KeyJ: ["j", "J"],
      KeyK: ["k", "K"],
      KeyL: ["l", "L"],
      KeyM: ["m", "M"],
      KeyN: ["n", "N"],
      KeyO: ["o", "O"],
      KeyP: ["p", "P"],
      KeyQ: ["q", "Q"],
      KeyR: ["r", "R"],
      KeyS: ["s", "S"],
      KeyT: ["t", "T"],
      KeyU: ["u", "U"],
      KeyV: ["v", "V"],
      KeyW: ["w", "W"],
      KeyX: ["x", "X"],
      KeyY: ["y", "Y"],
      KeyZ: ["z", "Z"],
      Digit0: ["0", ")"],
      Digit1: ["1", "!"],
      Digit2: ["2", "@"],
      Digit3: ["3", "#"],
      Digit4: ["4", "$"],
      Digit5: ["5", "%"],
      Digit6: ["6", "^"],
      Digit7: ["7", "&"],
      Digit8: ["8", "*"],
      Digit9: ["9", "("],
      Equal: ["=", "+"],
      Backquote: ["`", "~"],
      Backslash: ["\\", "|"],
      Period: [".", ">"],
      Comma: [",", "<"],
      Semicolon: [";", ":"],
      Slash: ["/", "?"],
      BracketLeft: ["[", "{"],
      BracketRight: ["]", "}"],
      Quote: ["'", "\""],
      Minus: ["-", "_"],
    },
  } satisfies Omit<GlideKeyboardLayouts, "__test_layout"> as GlideKeyboardLayouts;
  // __test_layout is a fake layout we use for testing purposes
}
