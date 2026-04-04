/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { GlideOperator } from "./browser-excmds-registry.mts";

const text_obj = ChromeUtils.importESModule("chrome://glide/content/text-objects.mjs");
const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const strings = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");

/**
 * A minimal representation of `nsIEditor` so that we can re-implement editors
 * for non-standard cases, e.g. Google Docs, Monaco.
 */
export interface Editor {
  selection: {
    isCollapsed: boolean;
    focusNode?: {
      textContent: string | null;
    } | null;
    focusOffset: number;
    anchorOffset: number;
  };
  selectionController: {
    characterMove(forward: boolean, extend: boolean): void;
    lineMove(forward: boolean, extend: boolean): void;
    intraLineMove(forward: boolean, extend: boolean): void;
  };
  deleteSelection(action: number, stripWrappers: number): void;
}

/**
 * An exhaustive list of all currently supported motion operations.
 */
export const MOTIONS = [
  // text objects
  "iw", "aw",

  // quote text objects
  'i"', 'a"', "i'", "a'", "i`", "a`",

  // bracket text objects
  "i(", "a(", "ib", "ab",
  "i[", "a[",
  "i{", "a{", "iB", "aB",

  // angle bracket text objects
  "i<", "a<",

  // html tag text objects
  "it", "at",

  // basic character motions
  "h", "j", "k", "l",

  // word motions
  "w", "W", "b", "B", "e",

  // line position motions
  "0", "^", "$",

  // whole-buffer motions (for operators: dgg, dG, cgg, cG)
  "gg", "G",

  // line operation
  "d",
] as const;

type GlideMotion = (typeof MOTIONS)[number];

export function select_motion(
  editor: nsIEditor,
  motion: GlideMotion,
  mode: GlideMode,
  operator: GlideOperator,
):
  | {
    // TODO(glide): figure out a different pattern for this problem
    fixup_deletion: () => void;
  }
  | undefined
{
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
        editor.selection.focusOffset <= 1
        || preceding_char(editor) === "\n"
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
      var left_newline_index = strings.reverse_indexof(text, "\n", editor.selection.focusOffset - 1);
      if (left_newline_index === -1) {
        left_newline_index = 0;
      }
      var right_newline_index = text.indexOf("\n", editor.selection.focusOffset);

      if (right_newline_index === -1) {
        // there is only one line, we can't do anything
        return;
      }

      const right_aligned_pos_in_line = right_newline_index - editor.selection.focusOffset;

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
        editor.selection.anchorOffset === 0
        && text.charAt(editor.selection.focusOffset)
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
    case "aw": {
      start_of_word(editor);
      end_of_word(editor, { extend: true, inclusive: true });
      // extend selection over any trailing whitespace (aw includes a separating space)
      while (
        text_obj.cls(next_char(editor)) === text_obj.CLS_WHITESPACE
        && !is_eol(editor)
        && !is_eof(editor)
      ) {
        forward_char(editor, true);
      }
      break;
    }
    case "w":
    case "W": {
      const before = editor.selection.focusOffset;
      forward_word(editor, motion === "W", undefined);
      const after = editor.selection.focusOffset;

      if (after === before) return;

      // exclusive forward
      select_absolute_range(editor, before - 1, after - 1);
      break;
    }
    case "b":
    case "B": {
      const before = editor.selection.focusOffset;
      back_word(editor, motion === "B");
      const after = editor.selection.focusOffset;

      if (after === before) return;

      // backward exclusive
      select_absolute_range(editor, after - 1, before - 1);
      break;
    }
    case "e": {
      const before = editor.selection.focusOffset;
      end_word(editor, undefined);
      const after = editor.selection.focusOffset;

      if (after === before) return;

      // inclusive forward
      select_absolute_range(editor, before - 1, after);
      break;
    }
    case "0": {
      const before = editor.selection.focusOffset;
      beginning_of_line(editor, false);
      const after = editor.selection.focusOffset;

      if (after === before) return;

      // backward exclusive
      select_absolute_range(editor, after - 1, before - 1);
      break;
    }
    case "^": {
      const before = editor.selection.focusOffset;
      first_non_whitespace(editor);
      const after = editor.selection.focusOffset;

      if (after === before) return;

      if (after > before) {
        // forward exclusive (cursor was on leading whitespace)
        select_absolute_range(editor, before - 1, after - 1);
      } else {
        // backward exclusive
        select_absolute_range(editor, after - 1, before - 1);
      }
      break;
    }
    case "$": {
      const before = editor.selection.focusOffset;
      end_of_line(editor, false);
      const after = editor.selection.focusOffset;
      if (after === before) return;
      // inclusive forward: from before current char to after last char on line
      select_absolute_range(editor, before - 1, after);
      break;
    }
    // quote text objects
    case 'i"':
    case 'a"': {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_quote_range(text, editor.selection.focusOffset - 1, '"', motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i'":
    case "a'": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_quote_range(text, editor.selection.focusOffset - 1, "'", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i`":
    case "a`": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_quote_range(text, editor.selection.focusOffset - 1, "`", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i(":
    case "a(":
    case "ib":
    case "ab": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_bracket_range(text, editor.selection.focusOffset - 1, "(", ")", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i[":
    case "a[": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_bracket_range(text, editor.selection.focusOffset - 1, "[", "]", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i{":
    case "a{":
    case "iB":
    case "aB": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_bracket_range(text, editor.selection.focusOffset - 1, "{", "}", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "i<":
    case "a<": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_bracket_range(text, editor.selection.focusOffset - 1, "<", ">", motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "it":
    case "at": {
      const text = editor.selection.focusNode?.textContent ?? "";
      const range = find_tag_range(text, editor.selection.focusOffset - 1, motion[0] === "i");
      if (range) select_absolute_range(editor, range.start, range.end);
      break;
    }
    case "gg": {
      // Extend selection backward to beginning of buffer.
      while (!is_bof(editor, "current")) {
        editor.selectionController.characterMove(false, true);
      }
      break;
    }
    case "G": {
      // Extend selection forward to end of buffer.
      while (!is_eof(editor)) {
        editor.selectionController.characterMove(true, true);
      }
      break;
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
 * █foo
 * ---
 * █oo
 * ---
 * foo
 * █bar
 * ```
 *
 * col = 2
 * ```
 * foo
 * b█r
 * ```
 */
export function get_column_offset(editor: Editor): number {
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

export function start_of_word(editor: Editor) {
  const starting_cls = text_obj.cls(current_char(editor));

  while (text_obj.cls(current_char(editor)) === starting_cls) {
    editor.selectionController.characterMove(/* forward */ false, /* extend */ false);

    if (is_bof(editor) || is_eol(editor)) {
      break;
    }
  }

  // correct off-by-one
  editor.selectionController.characterMove(/* forward */ true, /* extend */ false);
}

export function end_of_word(
  editor: Editor,
  props?: { extend?: boolean; inclusive?: boolean },
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
  editor: Editor,
  bigword: boolean,
  mode: GlideMode | undefined,
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
 * Move the selection to the end of the word.
 */
export function end_word(editor: Editor, mode: GlideMode | undefined) {
  const extend = mode === "visual";

  do {
    // we always want to move one character forward no matter what
    editor.selectionController.characterMove(true, extend);

    if (is_eof(editor)) {
      return;
    }
  } while (text_obj.cls(current_char(editor)) === text_obj.CLS_WHITESPACE);

  const starting_cls = text_obj.cls(current_char(editor));

  while (text_obj.cls(next_char(editor)) === starting_cls) {
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
export function back_word(editor: Editor, bigword: boolean) {
  // we always want to move one character back no matter what
  editor.selectionController.characterMove(/* forward */ false, /* extend */ false);

  // find the end of the previous word
  while (text_obj.cls(current_char(editor)) === text_obj.CLS_WHITESPACE) {
    editor.selectionController.characterMove(/* forward */ false, /* extend */ false);

    if (is_bof(editor)) {
      break;
    }
  }

  // go backwards until we find a new word class
  const starting_cls = text_obj.cls(current_char(editor));
  if (bigword) {
    while (text_obj.cls(current_char(editor)) !== text_obj.CLS_WHITESPACE) {
      editor.selectionController.characterMove(/* forward */ false, /* extend */ false);

      if (is_bof(editor)) {
        break;
      }
    }
  } else {
    while (text_obj.cls(current_char(editor)) === starting_cls) {
      editor.selectionController.characterMove(/* forward */ false, /* extend */ false);

      if (is_bof(editor)) {
        break;
      }
    }
  }

  // we moved one too far
  if (text_obj.cls(current_char(editor)) !== starting_cls || is_bof(editor)) {
    editor.selectionController.characterMove(/* forward */ true, /* extend */ false);
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
export function back_char(editor: Editor, extend: boolean) {
  if (
    (selection_direction(editor) !== "forwards"
      && current_char(editor) === "\n")
    || editor.selection.focusOffset < 1
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
export function forward_char(editor: Editor, extend: boolean) {
  if (is_eof(editor)) {
    return;
  }

  // normal mode
  if (editor.selection.isCollapsed && next_char(editor) === "\n") {
    return;
  }

  // visual mode allows
  if (
    selection_direction(editor) !== "backwards"
    && current_char(editor) === "\n"
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
  editor: Editor,
  extend: boolean,
  inclusive: boolean = false,
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
  editor: Editor,
  extend: boolean,
  inclusive: boolean = false,
) {
  while (next_char(editor) !== "\n" && !is_eof(editor)) {
    editor.selectionController.characterMove(true, extend);
  }
  if (inclusive && next_char(editor) === "\n") {
    editor.selectionController.characterMove(true, extend);
  }
}

/**
 * Used for `I` and `^`.
 *
 * Goes to the first non-whitespace character in the line.
 */
export function first_non_whitespace(editor: Editor, extend: boolean = false) {
  if (is_eol(editor)) {
    return;
  }

  // TODO(someday): this probably has bad / weird implications for visual mode
  beginning_of_line(editor, extend, /* inclusive */ true);

  // In multiline text, beginning_of_line with inclusive=true may land us on the
  // newline of the previous line. If so, move forward to the current line.
  if (current_char(editor) === "\n") {
    editor.selectionController.characterMove(true, extend);
    // After moving forward, we're ON the first char of the line.
    // If it's already non-whitespace, we're done.
    if (!is_eol(editor) && !is_eof(editor) && text_obj.cls(current_char(editor)) !== text_obj.CLS_WHITESPACE) {
      return;
    }
  }

  // Skip past any leading whitespace by checking next_char.
  // (We're at focusOffset=0, so next_char is the first char of line)
  while (!is_eol(editor) && !is_eof(editor) && text_obj.cls(next_char(editor)) === text_obj.CLS_WHITESPACE) {
    editor.selectionController.characterMove(true, extend);
  }

  // The loop exits when next_char is NOT whitespace, but current_char is still
  // the last whitespace (or empty at focusOffset=0). Move one more to land ON
  // the first non-whitespace character.
  if (!is_eol(editor) && !is_eof(editor)) {
    editor.selectionController.characterMove(true, extend);
  }
}

/**
 * Delete the current selection range.
 */
export function delete_selection(editor: Editor, forward: boolean) {
  if (editor.selection.isCollapsed) {
    throw new Error("cannot delete collapsed selections");
  }

  editor.deleteSelection(/* action */ Ci.nsIEditor.ePrevious, /* stripWrappers */ Ci.nsIEditor.eStrip);

  if (forward && !is_eol(editor)) {
    forward_char(editor, false);
  }
}

function selection_direction(
  editor: Editor,
): "forwards" | "backwards" | "collapsed" {
  if (editor.selection.isCollapsed) {
    return "collapsed";
  }

  if (editor.selection.anchorOffset < editor.selection.focusOffset) {
    return "forwards";
  }

  return "backwards";
}

export function preceding_char(editor: Editor): string | null {
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

export function current_char(editor: Editor): string {
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content");
  }

  return content.charAt(editor.selection.focusOffset - 1);
}

export function next_char(editor: Editor): string {
  const content = editor.selection.focusNode?.textContent;
  if (content == null) {
    throw new Error("No focused text content, cannot move forward");
  }

  return content.charAt(editor.selection.focusOffset);
}

function is_empty_line(editor: Editor): boolean {
  // An empty line is when we're on a newline and either:
  // 1. The previous character is also a newline (empty line between text)
  // 2. The next character is also a newline (empty line between text)
  return (
    current_char(editor) === "\n"
    && (preceding_char(editor) === "\n" || next_char(editor) === "\n")
  );
}

export function is_bof(
  editor: Editor,
  pos: "left" | "current" = "current",
): boolean {
  switch (pos) {
    case "left":
      return editor.selection.focusOffset - 1 <= 0;
    case "current":
      return editor.selection.focusOffset <= 0;
    default:
      throw assert_never(pos);
  }
}

export function is_eof(editor: Editor): boolean {
  return (
    editor.selection.focusOffset
      === editor.selection.focusNode?.textContent?.length
  );
}

export function is_eol(editor: Editor): boolean {
  return current_char(editor) === "\n";
}

// ── Text-object selection helpers ─────────────────────────────────────────────
// These are intentionally unexported; they are implementation details of
// select_motion and are not part of the public motions API.

/**
 * Move the caret to `start` (collapsing the selection), then extend it to
 * `end`.  Both values are 0-based DOM cursor positions (i.e. the same index
 * space as `focusOffset`).
 */
function select_absolute_range(editor: Editor, start: number, end: number): void {
  const steps_to_start = editor.selection.focusOffset - start;
  for (let i = 0; i < Math.abs(steps_to_start); i++) {
    editor.selectionController.characterMove(steps_to_start > 0 ? false : true, false);
  }
  const steps_to_end = end - start;
  for (let i = 0; i < steps_to_end; i++) {
    editor.selectionController.characterMove(true, true);
  }
}

/**
 * Find the innermost pair of `quote` characters that encloses `offset` on the
 * same line.  Returns DOM cursor positions (exclusive end) suitable for
 * passing directly to `select_absolute_range`.
 *
 * `offset` is the 0-based vim cursor position (= `focusOffset - 1`).
 */
function find_quote_range(
  text: string,
  offset: number,
  quote: string,
  inner: boolean,
): { start: number; end: number } | null {
  const line_start = text.lastIndexOf("\n", offset - 1) + 1;
  const line_end_idx = text.indexOf("\n", offset);
  const line_end = line_end_idx === -1 ? text.length : line_end_idx;
  const line = text.slice(line_start, line_end);
  const pos_in_line = offset - line_start;

  const positions: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === quote) positions.push(i);
  }

  // Pair quotes in order: 0-1, 2-3, 4-5, …
  for (let i = 0; i < positions.length - 1; i += 2) {
    const qs = positions[i]!;
    const qe = positions[i + 1]!;
    if (qs <= pos_in_line && pos_in_line <= qe) {
      return inner
        ? { start: line_start + qs + 1, end: line_start + qe }
        : { start: line_start + qs, end: line_start + qe + 1 };
    }
  }

  return null;
}

/**
 * Find the innermost matching bracket pair (`open`/`close`) that encloses
 * `offset`.  Returns DOM cursor positions (exclusive end) suitable for passing
 * directly to `select_absolute_range`.
 *
 * `offset` is the 0-based vim cursor position (= `focusOffset - 1`).
 */
function find_bracket_range(
  text: string,
  offset: number,
  open: string,
  close: string,
  inner: boolean,
): { start: number; end: number } | null {
  // Search backward for the matching open bracket
  let depth = 0;
  let start = -1;
  for (let i = offset; i >= 0; i--) {
    if (text[i] === close && i !== offset) depth++;
    else if (text[i] === open) {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;

  // Search forward for the matching close bracket
  depth = 0;
  let end = -1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    }
  }
  if (end === -1) return null;

  return inner ? { start: start + 1, end } : { start, end: end + 1 };
}

/**
 * Find the innermost HTML tag pair that encloses `offset`.
 *
 * `offset` is the 0-based vim cursor position (`focusOffset - 1`).
 *
 * Returns DOM cursor positions (exclusive end) for use with
 * `select_absolute_range`.  `inner` selects the content between the tags;
 * `outer` (`!inner`) selects the entire `<tag>…</tag>` span.
 */
function find_tag_range(
  text: string,
  offset: number,
  inner: boolean,
): { start: number; end: number } | null {
  // Search backward for an opening tag `<tagname` (not a closing tag `</`).
  let open_start = -1;
  for (let i = offset; i >= 0; i--) {
    if (text[i] === "<" && text[i + 1] !== "/") {
      open_start = i;
      break;
    }
  }

  if (open_start === -1) return null;

  // Find the end of the opening tag (the `>`).
  const open_end = text.indexOf(">", open_start);
  if (open_end === -1) return null;

  // Extract the tag name (ASCII alphanumeric / hyphen / underscore only).
  let name_end = open_start + 1;
  while (name_end < text.length && /[\w-]/.test(text[name_end]!)) name_end++;
  const tag_name = text.slice(open_start + 1, name_end);

  if (!tag_name) return null;

  // Find the matching closing tag.
  const close_tag = `</${tag_name}>`;
  const close_start = text.indexOf(close_tag, open_end);

  if (close_start === -1) return null;

  // Make sure the cursor is actually inside this element.
  if (offset < open_start || offset > close_start + close_tag.length - 1) return null;

  return inner
    ? { start: open_end + 1, end: close_start }
    : { start: open_start, end: close_start + close_tag.length };
}

/**
 * Select text between the current cursor position and the nth occurrence of
 * `character` in the given direction, in preparation for a pending operator.
 *
 * - `f` — forward to char (inclusive)
 * - `F` — backward to char (inclusive)
 * - `t` — forward until char (exclusive)
 * - `T` — backward until char (exclusive)
 *
 * The search is restricted to the current line (no newline crossing).
 *
 * Returns `true` when the character was found and a selection was made,
 * `false` when the search failed (no change to the editor).
 */
export function select_find_char(
  editor: Editor,
  find_type: "f" | "F" | "t" | "T",
  character: string,
  count: number,
): boolean {
  const text = editor.selection.focusNode?.textContent ?? "";

  // `focus` is the DOM offset (1-based).  The vim cursor is ON text[focus-1].
  const focus = editor.selection.focusOffset;

  const forward = find_type === "f" || find_type === "t";

  // Restrict search to the current line.
  const line_start = text.lastIndexOf("\n", focus - 2) + 1; // first char of line (0-based)
  const line_end_raw = text.indexOf("\n", focus);
  const line_end = line_end_raw === -1 ? text.length : line_end_raw;

  let found_index = -1;
  let occurrences = 0;

  if (forward) {
    // Start searching from the character *after* the vim cursor .
    for (let i = focus; i < line_end; i++) {
      if (text[i] === character) {
        occurrences++;
        if (occurrences === count) {
          found_index = i;
          break;
        }
      }
    }
  } else {
    // Start searching from the character *before* the vim cursor .
    for (let i = focus - 2; i >= line_start; i--) {
      if (text[i] === character) {
        occurrences++;
        if (occurrences === count) {
          found_index = i;
          break;
        }
      }
    }
  }

  if (found_index === -1) return false;

  // Collapse selection to the vim cursor position (DOM offset: focus-1).
  back_char(editor, false);

  if (forward) {
    const target_end = find_type === "f" ? found_index + 1 : found_index;
    const steps = target_end - (focus - 1);
    for (let i = 0; i < steps; i++) forward_char(editor, true);
  } else {
    const target_start = find_type === "F" ? found_index : found_index + 1;
    const steps = (focus - 1) - target_start;
    for (let i = 0; i < steps; i++) back_char(editor, true);
  }

  return true;
}
