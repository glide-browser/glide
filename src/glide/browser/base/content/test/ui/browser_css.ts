// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_glide_current_mode_color() {
  function css_var_value(name: string) {
    window.getComputedStyle(document!.documentElement!)!
      .getPropertyValue(name);
  }

  const initial_current_color = css_var_value("--glide-current-mode-color");

  isnot(initial_current_color, "", "--glide-current-mode-color should not be empty.");

  const initial_mode = glide.ctx.mode;
  const mode_color = css_var_value(`--glide-mode-${initial_mode}`);

  is(initial_current_color, mode_color, "--glide-current-mode-color should be set to the current modes color");

  const modes = glide.modes.list();
  for (const mode of modes) {
    const mode_color = css_var_value(`--glide-mode-${mode}`);
    isnot(mode_color, "", `--glide-mode-${mode} should not be empty.`);

    await glide.excmds.execute(`mode_change ${mode}`);

    const current_color = css_var_value("--glide-current-mode-color");

    is(current_color, mode_color, `--glide-current-mode-color should be set to --glide-mode-${mode}.`);
  }
});
