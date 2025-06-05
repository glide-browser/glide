/**
 * This file defines *all* builtin keymappings.
 */

const { MOTIONS } = ChromeUtils.importESModule(
  "chrome://glide/content/motions.mjs"
);

export function init(glide: Glide) {
  glide.keymaps.set("normal", "<leader>r", "reload");
  glide.keymaps.set("normal", "<leader>R", "reload_hard");
  glide.keymaps.set("normal", "<leader><leader>", "commandline_show tab ");

  glide.keymaps.set("normal", "gg", "scroll_top");
  glide.keymaps.set("normal", "G", "scroll_bottom");
  glide.keymaps.set("normal", "gg", "scroll_top");
  glide.keymaps.set("normal", "G", "scroll_bottom");
  glide.keymaps.set(["insert", "normal"], "<C-d>", "scroll_page_down");
  glide.keymaps.set(["normal", "insert"], "<C-u>", "scroll_page_up");

  // ignore mode
  glide.keymaps.set(
    ["normal", "insert", "visual"],
    "<S-Esc>",
    "mode_change ignore"
  );
  glide.keymaps.set("ignore", "<S-Esc>", "mode_change normal");

  // history
  glide.keymaps.set(["normal", "insert"], "<C-h>", "back");
  glide.keymaps.set(["normal", "insert"], "<C-l>", "forward");

  // hint mode
  glide.keymaps.set("normal", "f", "hint");
  glide.keymaps.set("normal", "F", "hint --action=newtab-click");
  glide.keymaps.set("normal", "<leader>f", "hint --location=browser-ui");
  glide.keymaps.set("hint", "<Esc>", "hints_remove");

  // command mode
  glide.keymaps.set("command", "<Esc>", "mode_change normal");
  glide.keymaps.set("command", "<Tab>", "commandline_focus_next");
  glide.keymaps.set("command", "<S-Tab>", "commandline_focus_back");
  glide.keymaps.set("command", "<C-d>", () => {
    GlideCommands.remove_active_commandline_browser_tab();
  });

  // tabs
  glide.keymaps.set("normal", "<leader>d", "tab_close");
  glide.keymaps.set(["normal", "insert"], "<C-j>", "tab_next");
  glide.keymaps.set(["normal", "insert"], "<C-k>", "tab_prev");

  glide.keymaps.set("normal", ".", "repeat");
  glide.keymaps.set("normal", ":", "commandline_show");

  glide.keymaps.set(
    ["insert", "visual", "op-pending"],
    "<Esc>",
    "mode_change normal"
  );

  glide.keymaps.set("normal", "i", "mode_change insert --automove=left");
  glide.keymaps.set("normal", "a", "mode_change insert");
  glide.keymaps.set("normal", "A", "mode_change insert --automove=endline");

  glide.keymaps.set("normal", "u", "undo");

  // vim motions
  glide.keymaps.set("normal", "d", "mode_change op-pending --operator=d", {
    retain_key_display: true,
  });
  glide.keymaps.set("normal", "c", "mode_change op-pending --operator=c", {
    retain_key_display: true,
  });
  for (const motion of MOTIONS) {
    glide.keymaps.set("op-pending", motion, "execute_motion");
  }

  glide.keymaps.set(["normal", "visual"], "w", "motion w");
  glide.keymaps.set(["normal", "visual"], "W", "motion W");
  glide.keymaps.set("normal", "b", "motion b");
  glide.keymaps.set("normal", "B", "motion B");
  glide.keymaps.set("normal", "x", "motion x");
  glide.keymaps.set("normal", "o", "motion o");
  glide.keymaps.set("normal", "{", "motion {");
  glide.keymaps.set("normal", "}", "motion }");
  glide.keymaps.set("normal", "r", "r");

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
  glide.keymaps.set("visual", "y", "visual_selection_copy");

  // jumplist
  glide.keymaps.set("normal", "<C-o>", "jumplist_back");
  glide.keymaps.set("normal", "<C-i>", "jumplist_forward");
}
