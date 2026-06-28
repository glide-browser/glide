// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

declare global {
  interface GlideModes {
    leap: "leap";
    hop: "hop";
  }
}

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

async function focus_input(browser: any) {
  await SpecialPowers.spawn(browser, [], async () => {
    const element = content.document.getElementById("input-1") as HTMLInputElement;
    element.focus();
  });
}

add_task(async function test_ignore_mode_new_tab_stays_in_ignore_mode() {
  await glide.excmds.execute("mode_change normal");

  await keys("<S-Esc>");

  try {
    await BrowserTestUtils.withNewTab(FILE, async browser => {
      await focus_input(browser);

      await sleep_frames(10);
      is(
        glide.ctx.mode,
        "ignore",
        "we should still be in ignore mode after opening a new tab and focusing an input element",
      );
    });
  } finally {
    await glide.excmds.execute("mode_change normal");
  }
});

add_task(async function test_custom_ignore_mode_stays_on_focus() {
  await reload_config(function _() {
    glide.modes.register("leap", { caret: "line", switch_mode_on_focus: false });
  });

  try {
    await glide.excmds.execute("mode_change leap");

    await BrowserTestUtils.withNewTab(FILE, async browser => {
      await focus_input(browser);

      await sleep_frames(10);
      is(
        glide.ctx.mode,
        "leap",
        "a custom mode registered with `switch_mode_on_focus: false` should not auto-switch to insert on focus",
      );
    });
  } finally {
    await glide.excmds.execute("mode_change normal");
  }
});

add_task(async function test_custom_ignore_mode_stays_on_blur() {
  await reload_config(function _() {
    glide.modes.register("leap", { caret: "line", switch_mode_on_focus: false });
  });

  try {
    await BrowserTestUtils.withNewTab(FILE, async browser => {
      await focus_input(browser);
      await glide.excmds.execute("mode_change leap");

      // blur the input - in a `switch_mode_on_focus: false` mode this should
      // not reset us back to normal mode
      await SpecialPowers.spawn(browser, [], async () => {
        (content.document.getElementById("input-1") as HTMLInputElement).blur();
      });

      await sleep_frames(10);
      is(glide.ctx.mode, "leap", "a custom ignore-like mode should not reset to normal mode on blur");
    });
  } finally {
    await glide.excmds.execute("mode_change normal");
  }
});

add_task(async function test_custom_mode_without_flag_switches_on_focus() {
  await reload_config(function _() {
    glide.modes.register("hop", { caret: "block" });
  });

  try {
    await glide.excmds.execute("mode_change hop");

    await BrowserTestUtils.withNewTab(FILE, async browser => {
      await focus_input(browser);

      await sleep_frames(10);
      is(
        glide.ctx.mode,
        "insert",
        "a custom mode without `switch_mode_on_focus: false` should still auto-switch to insert on focus",
      );
    });
  } finally {
    await glide.excmds.execute("mode_change normal");
  }
});

add_task(async function test_runtime_switch_mode_on_focus_change_resyncs_content() {
  // regression test: toggling `switch_mode_on_focus` at runtime (not through a config
  // reload, and without any mode change) must re-sync the content process, otherwise it
  // keeps using the value cached at the last mode change and focus/blur switching breaks
  await reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById<HTMLInputElement>("input-1")!.focus();
    });

    await sleep_frames(10);
    is(glide.ctx.mode, "normal", "focus should not switch modes while `switch_mode_on_focus` is disabled");

    glide.o.switch_mode_on_focus = true;

    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.blur();
      input.focus();
    });

    await wait_for_mode("insert", "focus should switch to insert after enabling `switch_mode_on_focus` at runtime");
  });
});

add_task(async function test_modes_get_returns_config() {
  await reload_config(function _() {
    glide.modes.register("leap", { caret: "line", switch_mode_on_focus: false });

    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.modes.get("leap");
      glide.g.value2 = glide.modes.get("ignore");
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("~");
    await until(() => glide.g.value);

    isjson(glide.g.value, { caret: "line", switch_mode_on_focus: false }, "get() returns the custom mode config");
    isjson(
      glide.g.value2,
      { caret: "line", switch_mode_on_focus: false },
      "the builtin `ignore` mode is registered with `switch_mode_on_focus: false`",
    );
  });
});
