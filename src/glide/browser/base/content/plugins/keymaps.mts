// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * This file defines *all* builtin keymappings.
 */

import type { Sandbox } from "../sandbox.mts";

const { MOTIONS } = ChromeUtils.importESModule("chrome://glide/content/motions.mjs");
const hinting = ChromeUtils.importESModule("chrome://glide/content/hinting.mjs");

export function init(sandbox: Sandbox) {
  const { glide } = sandbox;

  glide.keymaps.set("normal", "<leader>r", "reload");
  glide.keymaps.set("normal", "<leader>R", "reload_hard");
  glide.keymaps.set("normal", "<leader><leader>", "commandline_show tab ");

  glide.keymaps.set("normal", "gg", "scroll_top");
  glide.keymaps.set("normal", "G", "scroll_bottom");
  glide.keymaps.set(["insert", "normal"], "<C-d>", "scroll_page_down");
  glide.keymaps.set(["normal", "insert"], "<C-u>", "scroll_page_up");

  // ignore mode
  glide.keymaps.set(["normal", "insert", "visual"], "<S-Esc>", "mode_change ignore");
  glide.keymaps.set("ignore", "<S-Esc>", "mode_change normal");

  // history
  if (glide.ctx.os === "macosx") {
    glide.keymaps.set(["normal", "insert"], "<C-h>", "back");
    glide.keymaps.set(["normal", "insert"], "<C-l>", "forward");
  } else {
    // we don't use <C-l> on linux as it would conflict with a builtin keymap
    glide.keymaps.set(["normal", "insert"], "<A-h>", "back");
    glide.keymaps.set(["normal", "insert"], "<A-l>", "forward");
  }

  // hint mode
  glide.keymaps.set("normal", "f", "hint");
  glide.keymaps.set("normal", "F", "hint --action=newtab-click");
  glide.keymaps.set("normal", "<leader>f", "hint --location=browser-ui");
  glide.keymaps.set(
    "normal",
    "gI",
    () => glide.hints.show({ auto_activate: true, editable: true, pick: hinting.pickers.biggest_area }),
    { description: "Focus the largest editable element on the page" },
  );
  glide.keymaps.set("hint", "<Esc>", "hints_remove");

  // page navigation
  glide.keymaps.set("normal", "gi", "focusinput last");
  glide.keymaps.set(["normal", "insert"], "<C-,>", "blur");
  glide.keymaps.set("normal", "gu", "go_up");
  glide.keymaps.set("normal", "gU", "go_to_root");

  // command mode
  glide.keymaps.set("command", "<Esc>", "commandline_toggle");
  glide.keymaps.set("command", "<Tab>", "commandline_focus_next");
  glide.keymaps.set("command", "<S-Tab>", "commandline_focus_back");
  glide.keymaps.set("command", "<Down>", "commandline_focus_next");
  glide.keymaps.set("command", "<Up>", "commandline_focus_back");
  glide.keymaps.set("command", "<Enter>", "commandline_accept");
  glide.keymaps.set("command", "<C-d>", "commandline_delete");

  // tabs
  glide.keymaps.set("normal", "<leader>d", "tab_close");
  glide.keymaps.set(["normal", "insert"], "<C-j>", "tab_next");
  glide.keymaps.set(["normal", "insert"], "<C-k>", "tab_prev");

  glide.keymaps.set("normal", ".", "repeat");
  glide.keymaps.set("normal", ":", "commandline_show");

  glide.keymaps.set(["insert", "visual", "op-pending"], "<Esc>", "mode_change normal");
  glide.keymaps.set(["insert", "visual", "op-pending"], "<C-[>", "mode_change normal");

  glide.keymaps.set("normal", "i", "mode_change insert --automove=left");
  glide.keymaps.set("normal", "a", "mode_change insert");
  glide.keymaps.set("normal", "A", "mode_change insert --automove=endline");

  glide.keymaps.set("normal", "u", "undo");

  // vim motions
  glide.keymaps.set("normal", "d", "mode_change op-pending --operator=d", { retain_key_display: true });
  glide.keymaps.set("normal", "c", "mode_change op-pending --operator=c", { retain_key_display: true });
  for (const motion of MOTIONS) {
    glide.keymaps.set("op-pending", motion, "execute_motion");
  }

  glide.keymaps.set(["normal", "visual"], "w", "motion w");
  glide.keymaps.set(["normal", "visual"], "W", "motion W");
  glide.keymaps.set("normal", "e", "motion e");
  glide.keymaps.set("normal", "b", "motion b");
  glide.keymaps.set("normal", "B", "motion B");
  glide.keymaps.set("normal", "x", "motion x");
  glide.keymaps.set("normal", "X", "motion X");
  glide.keymaps.set("normal", "o", "motion o");
  glide.keymaps.set("normal", "{", "motion {");
  glide.keymaps.set("normal", "}", "motion }");
  glide.keymaps.set("normal", "r", "r");
  glide.keymaps.set("normal", "s", "motion s");
  glide.keymaps.set(["normal", "visual"], "I", "motion I");

  // TODO(glide-motions): more general support for numbers like this
  glide.keymaps.set("normal", "0", "motion 0");
  glide.keymaps.set("normal", "$", "motion $");
  glide.keymaps.set("normal", "h", "caret_move left");
  glide.keymaps.set("normal", "l", "caret_move right");
  glide.keymaps.set("normal", "j", "caret_move down");
  glide.keymaps.set("normal", "k", "caret_move up");
  glide.keymaps.set("normal", "yy", "url_yank");

  // visual motions
  glide.keymaps.set("normal", "v", "motion v");
  glide.keymaps.set("visual", "h", "motion vh");
  glide.keymaps.set("visual", "l", "motion vl");
  glide.keymaps.set("visual", "d", "motion vd");
  glide.keymaps.set("visual", "c", "motion vc");
  glide.keymaps.set("visual", "y", "visual_selection_copy");

  // jumplist
  // note: unlike Vim, we define these keymaps in insert mode as well
  //       as it can be jarring when switching tabs, for the jumplist
  //       to stop working just because you had an input element
  //       focused in a particular tab
  glide.keymaps.set(["normal", "insert"], "<C-o>", "jumplist_back");
  glide.keymaps.set(["normal", "insert"], "<C-i>", "jumplist_forward");

  glide.keymaps.set("normal", "yf", () =>
    glide.hints.show({
      selector: "[href]",
      async action({ content }) {
        let href = await content.execute((target) => (target as HTMLAnchorElement).href);
        if (href.startsWith("mailto:")) {
          href = href.slice(7);
        }
        if (href.startsWith("tel:") || href.startsWith("sms:")) {
          href = href.slice(4);
        }
        await navigator.clipboard.writeText(href);
      },
    }), { description: "Yank the URL of the selected hintable link to the clipboard" });
}
