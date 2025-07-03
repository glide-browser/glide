/**
 * This file defines *some* of the hints setup, other parts
 * are scattered throughout the codebase.
 *
 * Keymaps are also defined separately in `./keymaps.mts`.
 *
 * **note**: any global types are in ./hints-types.d.ts
 */

export function init(glide: Glide) {
  glide.modes.register("hint", { caret: "block" });

  glide.autocmds.create("ModeChanged", "hint:*", async () => {
    // browser dev toolbox pref to inspect hint styling
    // `...` at the top-right then `Disable Popup Auto-Hide`
    if (!glide.prefs.get("ui.popup.disable_autohide")) {
      await glide.excmds.execute("hints_remove");
    }
  });
}
