// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

declare global {
  interface GlideGlobals {
    /** Marker that a single autocmd was triggered. */
    triggered?: boolean;

    /** Collects the order of multiple autocmd callbacks. */
    calls?: string[];

    autocmds?: any[];
  }
}

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_setup(async function setup() {
  await reload_config(function _() {
    glide.g.calls = [];
    glide.g.triggered = false;
  });
});

add_task(async function test_autocmd_regexp_filter() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test\.html/, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmds.create("UrlEnter", /definitely-wont-match/, () => {
      glide.g.calls!.push("bad-call");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(["expected-call"], "UrlEnter autocmd should be triggered on matching URL");
  });
});

add_task(async function test_autocmd_host_filter() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", { hostname: "mochi.test" }, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmds.create("UrlEnter", { hostname: "definitely-wont-match" }, () => {
      glide.g.calls!.push("bad-call");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(
      ["expected-call"],
      "UrlEnter autocmd should be triggered on matching hostname",
    );
  });
});

add_task(async function test_multiple_autocmd_callbacks_all_fire() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("first");

      return () => {
        glide.g.calls!.push("first-cleanup");
      };
    });

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("second");

      return () => {
        glide.g.calls!.push("second-cleanup");
      };
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(
      ["first", "second"],
      "All registered autocmd callbacks should fire in registration order",
    );

    await BrowserTestUtils.reloadTab(gBrowser.selectedTab);

    isjson(
      glide.g.calls,
      ["first", "second", "first-cleanup", "second-cleanup", "first", "second"],
      "All registered autocmd callbacks should fire in registration order",
    );
  });
});

add_task(async function test_autocmd_error() {
  await reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      throw new Error("ruh roh");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    let notification = await until(() => gNotificationBox.getNotificationWithValue("glide-autocmd-error"));

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "Error occurred in UrlEnter autocmd `@glide.ts:2:9` - Error: ruh roh",
      "Notification should contain error message",
    );

    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_autocmd_cleanup_error() {
  await reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      return () => {
        throw new Error("dead");
      };
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await BrowserTestUtils.reloadTab(gBrowser.selectedTab);

    let notification = await until(() => gNotificationBox.getNotificationWithValue("glide-buffer-cleanup-error"));

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "Error occurred in UrlEnter cleanup `@glide.ts:3:11` - Error: dead",
      "Notification should contain error message",
    );

    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_urlenter_triggered_by_tab_switch() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("enter");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    const frame_time = await waiter(num_calls).is(1, "Initial navigation should trigger exactly once");

    const tab1 = gBrowser.selectedTab;

    await BrowserTestUtils.withNewTab("about:mozilla", async _ => {
      await sleep_frames(frame_time * 2);
      is(num_calls(), 1, "Opening non-matching page should not trigger UrlEnter");

      await BrowserTestUtils.switchTab(gBrowser, tab1);
      await waiter(num_calls).is(2, "Switching tabs should retrigger UrlEnter for an already loaded page");
    });
  });
});

add_task(async function test_autocmd_multiple_matching_tabs_triggers_once_each() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("enter");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(["enter"]);
    const tab1 = gBrowser.selectedTab;

    await BrowserTestUtils.withNewTab(INPUT_TEST_URI + "?second", async _ => {
      await waiter(() => glide.g.calls).isjson(["enter", "enter"]);
      const tab2 = gBrowser.selectedTab;

      await BrowserTestUtils.switchTab(gBrowser, tab1);
      await BrowserTestUtils.switchTab(gBrowser, tab2);
      await waiter(() => glide.g.calls).isjson(
        ["enter", "enter", "enter", "enter"],
        "Switching between already loaded matching tabs should trigger again",
      );
    });
  });
});

add_task(async function test_about_blank_with_hostname_filter() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", { hostname: "example.com" }, () => {
      glide.g.calls!.push("should-not-trigger");
    });
  });

  await BrowserTestUtils.withNewTab("about:blank", async _ => {
    await sleep_frames(5);

    isjson(glide.g.calls, [], "UrlEnter autocmd with hostname filter should not trigger for about:blank");
  });
});

add_task(async function test_mode_changed_autocmd() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "*", args => {
      glide.g.calls!.push(`${args.old_mode}->${args.new_mode}`);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await waiter(() => glide.g.calls).isjson(["null->normal"]);

    // insert
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await waiter(() => glide.g.calls).isjson(["null->normal", "normal->insert"]);

    // normal
    await keys("<esc>");
    await waiter(() => glide.g.calls).isjson(["null->normal", "normal->insert", "insert->normal"]);

    // visual
    await keys("v");
    await waiter(() => glide.g.calls).isjson([
      "null->normal",
      "normal->insert",
      "insert->normal",
      "normal->visual",
    ]);

    // normal
    await keys("<esc>");
    await waiter(() => glide.g.calls).isjson([
      "null->normal",
      "normal->insert",
      "insert->normal",
      "normal->visual",
      "visual->normal",
    ], "ModeChanged autocmd should track all mode transitions");
  });
});

add_task(async function test_mode_changed_autocmd_config_reload() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "*", args => {
      glide.g.calls!.push(`${args.old_mode}->${args.new_mode}`);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(
      ["null->normal"],
      "ModeChanged autocmd should be called for the initial mode load",
    );
  });
});

add_task(async function test_mode_changed_specific_pattern() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "normal:insert", () => {
      glide.g.calls!.push("normal-to-insert");
    });

    glide.autocmds.create("ModeChanged", "insert:*", args => {
      glide.g.calls!.push(`leaving-insert-to-${args.new_mode}`);
    });

    glide.autocmds.create("ModeChanged", "*:visual", args => {
      glide.g.calls!.push(`${args.old_mode}-entering-visual`);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    // insert
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await waiter(() => glide.g.calls).isjson(["normal-to-insert"]);

    // normal
    await keys("<esc>");
    await waiter(() => glide.g.calls).isjson(["normal-to-insert", "leaving-insert-to-normal"]);

    // visual
    await keys("v");
    await waiter(() => glide.g.calls).isjson([
      "normal-to-insert",
      "leaving-insert-to-normal",
      "normal-entering-visual",
    ], "ModeChanged autocmd patterns should match correctly");

    // normal
    await keys("<esc>");
  });
});

add_task(async function test_mode_changed_multiple_callbacks() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "*", () => {
      glide.g.calls!.push("first");
    });

    glide.autocmds.create("ModeChanged", "*", () => {
      glide.g.calls!.push("second");
    });

    glide.autocmds.create("ModeChanged", "normal:insert", () => {
      glide.g.calls!.push("specific");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await waiter(() => glide.g.calls).isjson(["first", "second"]);

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await waiter(() => glide.g.calls).isjson(
      ["first", "second", "first", "second", "specific"],
      "Multiple ModeChanged autocmds should fire in registration order",
    );
  });
});

add_task(async function test_mode_changed_error_handling() {
  await reload_config(function _() {
    glide.autocmds.create("ModeChanged", "*", () => {
      throw new Error("mode change failed");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });

    let notification = await until(() => gNotificationBox.getNotificationWithValue("glide-autocmd-error"));

    ok(notification, "Error notification should be shown");
    ok(
      notification.shadowRoot
        .querySelector(".message")
        ?.textContent?.includes("Error occurred in ModeChanged autocmd"),
      "Notification should indicate ModeChanged autocmd error",
    );
    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_urlenter_triggered_on_config_reload() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("UrlEnter", /input_test/, () => {
        glide.g.calls!.push("reloaded-config");
      });
    });

    await waiter(() => glide.g.calls).isjson(
      ["reloaded-config"],
      "UrlEnter autocmd should be triggered on config reload for already loaded tabs",
    );
  });
});

add_task(async function test_urlenter_tab_id() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("UrlEnter", /input_test/, ({ tab_id }) => {
        glide.g.calls!.push(`${tab_id}`);
      });
    });

    await waiter(() => glide.g.calls).isjson(
      [String((await glide.tabs.active()).id)],
      "UrlEnter autocmd should be passed a tab ID that matches the active tab ID",
    );
  });
});

add_task(async function test_startup_triggered_on_config_reload() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("ConfigLoaded", () => {
        glide.g.calls!.push("reloaded-config");
      });
    });

    await waiter(() => glide.g.calls).isjson(
      ["reloaded-config"],
      "ConfigLoaded autocmd should be triggered on config reload after initial startup",
    );
  });
});

add_task(async function test_window_loaded() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("WindowLoaded", () => {
      glide.g.calls!.push("window-loaded");
    });
  });

  await using win = await GlideTestUtils.new_window();

  await until(() => win.GlideBrowser?.api?.g?.calls?.length === 1);

  isjson(
    win.GlideBrowser.api.g.calls,
    ["window-loaded"],
    "WindowLoaded autocmd should be triggered on initial window startup",
  );
});

add_task(async function test_window_loaded_not_called_on_reload() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("WindowLoaded", () => {
      glide.g.calls!.push("window-loaded");
    });
  });

  isjson(glide.g.calls, [], "WindowLoaded autocmd should not be triggered on config reload");
});

add_task(async function test_key_state_changed_autocmd() {
  await reload_config(function _() {
    glide.g.autocmds = [];

    glide.autocmds.create("KeyStateChanged", args => {
      glide.g.autocmds!.push({ ...args });
    });

    glide.keymaps.set("normal", "gt", () => {});
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("gtj");

    await until(() => glide.g.autocmds?.length === 3);

    is(
      JSON.stringify(glide.g.autocmds),
      JSON.stringify([
        { mode: "normal", sequence: ["g"], partial: true },
        {
          mode: "normal",
          sequence: ["g", "t"],
          partial: false,
        },
        { mode: "normal", sequence: ["j"], partial: false },
      ]),
    );
  });
});

add_task(async function test_autocmd_remove() {
  await reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test\.html/, function autocmd() {
      glide.g.calls!.push("expected-call");
      glide.g.value = glide.autocmds.remove("UrlEnter", autocmd);
    });

    glide.autocmds.create("UrlEnter", /input_test\.html/, () => {
      glide.g.test_checked = true;
    });
  });

  const calls = ["expected-call"];

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.calls).isjson(calls, "UrlEnter autocmd should be triggered on matching URL");
    is(glide.g.value, true, "`glide.autocmds.remove()` should return true after removing an autocmd");
  });

  glide.g.test_checked = false;

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.g.test_checked).ok("other UrlEnter autocmds should still be triggered");
    isjson(glide.g.calls, calls, "Original UrlEnter autocmd should not be triggered after being removed");
  });

  is(
    glide.autocmds.remove("UrlEnter", () => {}),
    false,
    "`glide.autocmds.remove()` should return false if the the autocmd did not exist",
  );
});

function num_calls() {
  return (glide.g.calls ?? []).length;
}
