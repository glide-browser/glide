/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { GlideOperator } from "./browser-mode.mts";

const text_obj = ChromeUtils.importESModule(
  "chrome://glide/content/text-objects.mjs"
);
const { assert_never } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const strings = ChromeUtils.importESModule(
  "chrome://glide/content/utils/strings.mjs"
);

/**
 * An exhaustive list of all currently supported motion operations.
 */
export const MOTIONS = ["iw", "h", "j", "k", "l", "d"] as const;
type GlideMotion = (typeof MOTIONS)[number];

export function select_motion(
  editor: nsIEditor,
  motion: GlideMotion,
  mode: GlideMode,
  operator: GlideOperator
):
  | {
      // TODO(glide): figure out a different pattern for this problem
      fixup_deletion: () => void;
    }
  | undefined {
  switch (motion) {
    case "iw": {
      start_of_word(editor);
      end_of_word(editor, { extend: true, inclusive: true });
      break;
    }
    case "h": {
      // we are at the beginning of the input or on the very first char,
      // there's nothing for us to do
      if (
        editor.selection.focusOffset <= 1 ||
        preceding_char(editor) === "\n"
      ) {
        return;
      }

      back_char(editor, false);
      back_char(editor, true);
      break;
    }
    case "j": {
      const text = editor.selection.focusNode?.textContent;
      if (!text) {
        throw new Error("No text");
      }

      // TODO(glide): clean this up
      var left_newline_index = strings.reverse_indexof(
        text,
        "\n",
        editor.selection.focusOffset - 1
      );
      if (left_newline_index === -1) {
        left_newline_index = 0;
      }
      var right_newline_index = text.indexOf(
        "\n",
        editor.selection.focusOffset
      );

      if (right_newline_index === -1) {
        // there is only one line, we can't do anything
        return;
      }

      const right_aligned_pos_in_line =
        right_newline_index - editor.selection.focusOffset;

      right_newline_index = text.indexOf("\n", right_newline_index + 1);
      if (right_newline_index === -1) {
        right_newline_index = text.length;
      }

      const was_on_newline = current_char(editor) === "\n";

      while (editor.selection.focusOffset > left_newline_index) {
        editor.selectionController.characterMove(false, false);
      }

      while (editor.selection.focusOffset < right_newline_index) {
        editor.selectionController.characterMove(true, true);
      }

      if (
        editor.selection.anchorOffset === 0 &&
        text.charAt(editor.selection.focusOffset)
      ) {
        editor.selectionController.characterMove(true, true);
      }

      return {
        // ensure the caret is put in the correct place after deletion
        // Note: I think this could be cleaned up substantially, inside `d`
        //       we could instead get the col number before deleting and then
        //       ensure the col number is the same if possible
        fixup_deletion() {
          if (was_on_newline && current_char(editor) !== "\n") {
            beginning_of_line(editor, false);
            return;
          }

          for (let i = 0; i < right_aligned_pos_in_line; i++) {
            if (is_bof(editor, "left")) {
              break;
            }
            editor.selectionController.characterMove(false, false);
          }
        },
      };
    }
    case "k": {
      if (mode !== "visual") {
        end_of_line(editor, false, true);
      }

      editor.selectionController.lineMove(false, true);
      beginning_of_line(editor, true, true);
      break;
    }
    case "l": {
      back_char(editor, false);
      forward_char(editor, true);
      break;
    }
    case "d": {
      if (operator !== "d") {
        // the `d` motion is only allowed with `dd`, e.g. `cd` doesn't do anything
        return;
      }

      if (is_empty_line(editor)) {
        // For empty lines, select just the newline character
        editor.selectionController.characterMove(false, false);
        editor.selectionController.characterMove(true, true);

        return {
          fixup_deletion() {
            // Position cursor at the start of the next line after deletion
            if (!is_eof(editor) && current_char(editor) === "\n") {
              editor.selectionController.characterMove(true, false);
            }
          },
        };
      }

      const col_pos = get_column_offset(editor);
      beginning_of_line(editor, false, true);
      end_of_line(editor, true, true);

      return {
        fixup_deletion() {
          for (let i = 0; i < col_pos; i++) {
            editor.selectionController.characterMove(true, false);
            if (is_eof(editor) || next_char(editor) === "\n") {
              break;
            }
          }
        },
      };
    }
    default:
      throw assert_never(motion, `Unknown motion: ${motion}`);
  }
}

/**
 * Returns the offset of the caret in the current line.
 *
 * This returns `0` in a couple of different situations:
 * - caret is at the BOF
 * - caret is at the first character after the BOF
 * - caret is at the newline char (i.e. at the start of the line)
 *
 * col = 0
 * ```
 *█foo
 * ---
 * █oo
 * ---
 * foo
 *█bar
 * ```
 *
 * col = 2
 * ```
 * foo
 * b█r
 * ```
 */
export function get_column_offset(editor: nsIEditor): number {
  let pos = 0;
  let i = editor.selection.focusOffset - 1;
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content");
  }

  while (true) {
    const char = content.charAt(i);
    if (char === "\n" || i <= 0) {
      break;
    }
    pos++;
    i--;
  }

  return pos;
}

export function start_of_word(editor: nsIEditor) {
  const starting_cls = text_obj.cls(current_char(editor));

  while (text_obj.cls(current_char(editor)) === starting_cls) {
    editor.selectionController.characterMove(
      /* forward */ false,
      /* extend */ false
    );

    if (is_bof(editor) || is_eol(editor)) {
      break;
    }
  }

  // correct off-by-one
  editor.selectionController.characterMove(
    /* forward */ true,
    /* extend */ false
  );
}

export function end_of_word(
  editor: nsIEditor,
  props?: { extend?: boolean; inclusive?: boolean }
) {
  if (is_eol(editor)) {
    // if we're at the end of the line then there's nothing more we can do
    return;
  }

  const extend = props?.extend ?? false;
  const inclusive = props?.inclusive ?? false;
  const starting_cls = text_obj.cls(current_char(editor));

  if (inclusive) {
    // include the current char
    editor.selectionController.characterMove(false, false);
  }

  while (text_obj.cls(next_char(editor)) === starting_cls) {
    editor.selectionController.characterMove(true, extend);

    if (is_eof(editor) || is_eol(editor)) {
      break;
    }
  }
}

/**
 * Move the selection forward 1 word.
 *
 * `bigword=true`  -> equivalent to `W`
 * `bigword=false` -> equivalent to `w`
 */
export function forward_word(
  editor: nsIEditor,
  bigword: boolean,
  mode: GlideMode | undefined
) {
  const extend = mode === "visual";
  const starting_cls = text_obj.cls(current_char(editor));

  // we always want to move one character forward no matter what
  editor.selectionController.characterMove(true, extend);

  // go one char past end of current word (if any)
  if (starting_cls !== text_obj.CLS_WHITESPACE) {
    if (bigword) {
      // for bigword, the word boundary is any whitespace
      while (text_obj.cls(current_char(editor)) !== text_obj.CLS_WHITESPACE) {
        editor.selectionController.characterMove(true, extend);
        if (is_eof(editor) || is_eol(editor)) {
          break;
        }
      }
    } else {
      // for non-bigword, the word boundary is anything other than the starting class
      while (text_obj.cls(current_char(editor)) === starting_cls) {
        editor.selectionController.characterMove(true, extend);
        if (is_eof(editor) || is_eol(editor)) {
          break;
        }
      }
    }
  }

  // find the next word
  while (text_obj.cls(current_char(editor)) === text_obj.CLS_WHITESPACE) {
    editor.selectionController.characterMove(true, extend);

    if (is_eof(editor) || is_eol(editor)) {
      break;
    }
  }
}

/**
 * Move the selection backward 1 word.
 *
 * `bigword=true`  -> equivalent to `B`
 * `bigword=false` -> equivalent to `b`
 */
export function back_word(editor: nsIEditor, bigword: boolean) {
  // we always want to move one character back no matter what
  editor.selectionController.characterMove(
    /* forward */ false,
    /* extend */ false
  );

  // find the end of the previous word
  while (text_obj.cls(current_char(editor)) === text_obj.CLS_WHITESPACE) {
    editor.selectionController.characterMove(
      /* forward */ false,
      /* extend */ false
    );

    if (is_bof(editor)) {
      break;
    }
  }

  // go backwards until we find a new word class
  const starting_cls = text_obj.cls(current_char(editor));
  if (bigword) {
    while (text_obj.cls(current_char(editor)) !== text_obj.CLS_WHITESPACE) {
      editor.selectionController.characterMove(
        /* forward */ false,
        /* extend */ false
      );

      if (is_bof(editor)) {
        break;
      }
    }
  } else {
    while (text_obj.cls(current_char(editor)) === starting_cls) {
      editor.selectionController.characterMove(
        /* forward */ false,
        /* extend */ false
      );

      if (is_bof(editor)) {
        break;
      }
    }
  }

  // we moved one too far
  if (text_obj.cls(current_char(editor)) !== starting_cls || is_bof(editor)) {
    editor.selectionController.characterMove(
      /* forward */ true,
      /* extend */ false
    );
  }
}

export function next_para(editor: nsIEditor) {
  while (true) {
    editor.selectionController.lineMove(true, false);
    editor.selectionController.intraLineMove(true, false);

    if (is_empty_line(editor) || is_eof(editor)) {
      break;
    }
  }
}

export function back_para(editor: nsIEditor) {
  while (true) {
    editor.selectionController.lineMove(false, false);
    editor.selectionController.intraLineMove(false, false);

    if (is_empty_line(editor) || is_bof(editor)) {
      break;
    }
  }

  if (is_bof(editor) && next_char(editor) !== "\n") {
    editor.selectionController.characterMove(true, false);
  }
}

/**
 * Move back one character, this does *not* cross line boundaries.
 */
export function back_char(editor: nsIEditor, extend: boolean) {
  if (
    (selection_direction(editor) !== "forwards" &&
      current_char(editor) === "\n") ||
    editor.selection.focusOffset < 1
  ) {
    return;
  }
  editor.selectionController.characterMove(false, extend);
}

/**
 * Move forward one character, this does *not* cross line boundaries when
 * the selection is collapsed (a la normal mode) but does allow crossing
 * the line boundary by a single character when the selection is not collapsed
 * (a la visual mode).
 */
export function forward_char(editor: nsIEditor, extend: boolean) {
  if (is_eof(editor)) {
    return;
  }

  // normal mode
  if (editor.selection.isCollapsed && next_char(editor) === "\n") {
    return;
  }

  // visual mode allows
  if (
    selection_direction(editor) !== "backwards" &&
    current_char(editor) === "\n"
  ) {
    return;
  }

  editor.selectionController.characterMove(true, extend);
}

/**
 * Equivalent to `0`. Goes to the *very* beginning of the line, skipping
 * any leading whitespace.
 */
export function beginning_of_line(
  editor: nsIEditor,
  extend: boolean,
  inclusive: boolean = false
) {
  while (preceding_char(editor) !== "\n" && editor.selection.focusOffset > 1) {
    editor.selectionController.characterMove(false, extend);
  }

  if (inclusive && !is_bof(editor, "current")) {
    editor.selectionController.characterMove(false, extend);
  }
}

/**
 * Equivalent to `$`. Goes to the *very* end of the line, skipping
 * any trailing whitespace.
 */
export function end_of_line(
  editor: nsIEditor,
  extend: boolean,
  inclusive: boolean = false
) {
  while (next_char(editor) !== "\n" && !is_eof(editor)) {
    editor.selectionController.characterMove(true, extend);
  }
  if (inclusive && next_char(editor) === "\n") {
    editor.selectionController.characterMove(true, extend);
  }
}

/**
 * Delete the current selection range.
 */
export function delete_selection(editor: nsIEditor, forward: boolean) {
  if (editor.selection.isCollapsed) {
    throw new Error("cannot delete collapsed selections");
  }

  editor.deleteSelection(
    /* action */ editor.ePrevious,
    /* stripWrappers */ editor.eStrip
  );

  if (forward && !is_eol(editor)) {
    forward_char(editor, false);
  }
}

function selection_direction(
  editor: nsIEditor
): "forwards" | "backwards" | "collapsed" {
  if (editor.selection.isCollapsed) {
    return "collapsed";
  }

  if (editor.selection.anchorOffset < editor.selection.focusOffset) {
    return "forwards";
  }

  return "backwards";
}

export function preceding_char(editor: nsIEditor): string | null {
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content");
  }

  const index = editor.selection.focusOffset - 2;
  if (index < 0) {
    return null;
  }
  return content.charAt(index);
}

export function current_char(editor: nsIEditor): string {
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content");
  }

  return content.charAt(editor.selection.focusOffset - 1);
}

export function next_char(editor: nsIEditor): string {
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content, cannot move forward");
  }

  return content.charAt(editor.selection.focusOffset);
}

function is_empty_line(editor: nsIEditor): boolean {
  // An empty line is when we're on a newline and either:
  // 1. The previous character is also a newline (empty line between text)
  // 2. The next character is also a newline (empty line between text)
  return (
    current_char(editor) === "\n" &&
    (preceding_char(editor) === "\n" || next_char(editor) === "\n")
  );
}

export function is_bof(
  editor: nsIEditor,
  pos: "left" | "current" = "current"
): boolean {
  switch (pos) {
    case "left":
      return editor.selection.focusOffset - 1 <= 0;
    case "current":
      return editor.selection.focusOffset === 0;
    default:
      throw assert_never(pos);
  }
}

export function is_eof(editor: nsIEditor): boolean {
  return (
    editor.selection.focusOffset ===
    editor.selection.focusNode?.textContent?.length
  );
}

export function is_eol(editor: nsIEditor): boolean {
  return current_char(editor) === "\n";
}
