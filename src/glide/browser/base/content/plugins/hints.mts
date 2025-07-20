// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * This file defines *some* of the hints setup, other parts
 * are scattered throughout the codebase.
 *
 * Keymaps are also defined separately in `./keymaps.mts`.
 *
 * **note**: any global types are in ./hints-types.d.ts
 */

import type { Sandbox } from "../sandbox.mts";

export function init(sandbox: Sandbox) {
  const { glide } = sandbox;

  glide.modes.register("hint", { caret: "block" });

  glide.autocmds.create("ModeChanged", "hint:*", async () => {
    // browser dev toolbox pref to inspect hint styling
    // `...` at the top-right then `Disable Popup Auto-Hide`
    if (!glide.prefs.get("ui.popup.disable_autohide")) {
      await glide.excmds.execute("hints_remove");
    }
  });
}
