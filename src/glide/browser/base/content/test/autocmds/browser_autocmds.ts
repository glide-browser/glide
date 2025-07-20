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
  }
}

const INPUT_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];
    glide.g.triggered = false;
  });
});

add_task(async function test_autocmd_regexp_filter() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test\.html/, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmds.create("UrlEnter", /definitely-wont-match/, () => {
      glide.g.calls!.push("bad-call");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);
    isjson(
      GlideBrowser.api.g.calls,
      ["expected-call"],
      "UrlEnter autocmd should be triggered on matching URL"
    );
  });
});

add_task(async function test_autocmd_host_filter() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", { hostname: "mochi.test" }, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmds.create(
      "UrlEnter",
      { hostname: "definitely-wont-match" },
      () => {
        glide.g.calls!.push("bad-call");
      }
    );
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);
    isjson(
      GlideBrowser.api.g.calls,
      ["expected-call"],
      "UrlEnter autocmd should be triggered on matching hostname"
    );
  });
});

add_task(async function test_multiple_autocmd_callbacks_all_fire() {
  await GlideTestUtils.reload_config(function _() {
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
    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      ["first", "second"],
      "All registered autocmd callbacks should fire in registration order"
    );

    await BrowserTestUtils.reloadTab(gBrowser.selectedTab);

    isjson(
      GlideBrowser.api.g.calls,
      ["first", "second", "first-cleanup", "second-cleanup", "first", "second"],
      "All registered autocmd callbacks should fire in registration order"
    );
  });
});

add_task(async function test_autocmd_error() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      throw new Error("ruh roh");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue(
      "glide-autocmd-error"
    );

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "Error occurred in UrlEnter autocmd `@glide.ts:2:9` - Error: ruh roh",
      "Notification should contain error message"
    );

    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_autocmd_cleanup_error() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      return () => {
        throw new Error("dead");
      };
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    await BrowserTestUtils.reloadTab(gBrowser.selectedTab);
    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue(
      "glide-buffer-cleanup-error"
    );

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "Error occurred in UrlEnter cleanup `@glide.ts:3:11` - Error: dead",
      "Notification should contain error message"
    );

    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_urlenter_triggered_by_tab_switch() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("enter");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    is(num_calls(), 1, "Initial navigation should trigger exactly once");

    const tab1 = gBrowser.selectedTab;

    await BrowserTestUtils.withNewTab("about:mozilla", async _ => {
      await sleep_frames(5);

      is(
        num_calls(),
        1,
        "Opening non-matching page should not trigger UrlEnter"
      );

      await BrowserTestUtils.switchTab(gBrowser, tab1);
      await sleep_frames(5);

      is(
        num_calls(),
        2,
        "Switching tabs should retrigger UrlEnter for an already loaded page"
      );
    });
  });
});

add_task(
  async function test_autocmd_multiple_matching_tabs_triggers_once_each() {
    await GlideTestUtils.reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("UrlEnter", /input_test/, () => {
        glide.g.calls!.push("enter");
      });
    });

    await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
      await sleep_frames(5);
      const tab1 = gBrowser.selectedTab;

      await BrowserTestUtils.withNewTab(INPUT_TEST_URI + "?second", async _ => {
        await sleep_frames(5);
        const tab2 = gBrowser.selectedTab;

        isjson(
          GlideBrowser.api.g.calls,
          ["enter", "enter"],
          "Each matching navigation should trigger UrlEnter once"
        );

        await BrowserTestUtils.switchTab(gBrowser, tab1);
        await BrowserTestUtils.switchTab(gBrowser, tab2);
        await sleep_frames(5);

        isjson(
          GlideBrowser.api.g.calls,
          ["enter", "enter", "enter", "enter"],
          "Switching between already loaded matching tabs should trigger again"
        );
      });
    });
  }
);

add_task(async function test_about_blank_with_hostname_filter() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("UrlEnter", { hostname: "example.com" }, () => {
      glide.g.calls!.push("should-not-trigger");
    });
  });

  await BrowserTestUtils.withNewTab("about:blank", async _ => {
    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      [],
      "UrlEnter autocmd with hostname filter should not trigger for about:blank"
    );
  });
});

add_task(async function test_mode_changed_autocmd() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "*", args => {
      glide.g.calls!.push(`${args.old_mode}->${args.new_mode}`);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await sleep_frames(5);

    // insert
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await sleep_frames(5);

    // normal
    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(5);

    // visual
    EventUtils.synthesizeKey("v");
    await sleep_frames(5);

    // normal
    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      [
        "null->normal",
        "normal->insert",
        "insert->normal",
        "normal->visual",
        "visual->normal",
      ],
      "ModeChanged autocmd should track all mode transitions"
    );
  });
});

add_task(async function test_mode_changed_autocmd_config_reload() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("ModeChanged", "*", args => {
      glide.g.calls!.push(`${args.old_mode}->${args.new_mode}`);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(10);

    isjson(
      GlideBrowser.api.g.calls,
      ["null->normal"],
      "ModeChanged autocmd should be called for the initial mode load"
    );
  });
});

add_task(async function test_mode_changed_specific_pattern() {
  await GlideTestUtils.reload_config(function _() {
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
    await sleep_frames(5);

    // insert
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await sleep_frames(5);

    // normal
    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(5);

    // visual
    EventUtils.synthesizeKey("v");
    await sleep_frames(5);

    // normal
    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      [
        "normal-to-insert",
        "leaving-insert-to-normal",
        "normal-entering-visual",
      ],
      "ModeChanged autocmd patterns should match correctly"
    );
  });
});

add_task(async function test_mode_changed_multiple_callbacks() {
  await GlideTestUtils.reload_config(function _() {
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
    await sleep_frames(5);

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      ["first", "second", "first", "second", "specific"],
      "Multiple ModeChanged autocmds should fire in registration order"
    );
  });
});

add_task(async function test_mode_changed_error_handling() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ModeChanged", "*", () => {
      throw new Error("mode change failed");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await sleep_frames(5);

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue(
      "glide-autocmd-error"
    );

    ok(notification, "Error notification should be shown");
    ok(
      notification.shadowRoot
        .querySelector(".message")
        ?.textContent?.includes("Error occurred in ModeChanged autocmd"),
      "Notification should indicate ModeChanged autocmd error"
    );
    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_urlenter_triggered_on_config_reload() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    await GlideTestUtils.reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("UrlEnter", /input_test/, () => {
        glide.g.calls!.push("reloaded-config");
      });
    });

    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      ["reloaded-config"],
      "UrlEnter autocmd should be triggered on config reload for already loaded tabs"
    );
  });
});

add_task(async function test_urlenter_tab_id() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    await GlideTestUtils.reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("UrlEnter", /input_test/, ({ tab_id }) => {
        glide.g.calls!.push(`${tab_id}`);
      });
    });

    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      [String((await GlideBrowser.api.tabs.active()).id)],
      "UrlEnter autocmd should be pass tab ID that matches the active tab ID"
    );
  });
});

add_task(async function test_startup_triggered_on_config_reload() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    await GlideTestUtils.reload_config(function _() {
      glide.g.calls = [];

      glide.autocmds.create("ConfigLoaded", () => {
        glide.g.calls!.push("reloaded-config");
      });
    });

    await sleep_frames(5);

    isjson(
      GlideBrowser.api.g.calls,
      ["reloaded-config"],
      "ConfigLoaded autocmd should be triggered on config reload after initial startup"
    );
  });
});

add_task(async function test_window_loaded() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("WindowLoaded", () => {
      glide.g.calls!.push("window-loaded");
    });
  });

  const win: Window = await BrowserTestUtils.openNewBrowserWindow();
  await sleep_frames(10);

  isjson(
    win.GlideBrowser.api.g.calls,
    ["window-loaded"],
    "WindowLoaded autocmd should be triggered on initial window startup"
  );

  BrowserTestUtils.closeWindow(win);
});

add_task(async function test_window_loaded_not_called_on_reload() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmds.create("WindowLoaded", () => {
      glide.g.calls!.push("window-loaded");
    });
  });

  isjson(
    GlideBrowser.api.g.calls,
    [],
    "WindowLoaded autocmd should not be triggered on config reload"
  );
});

function num_calls() {
  return (GlideBrowser.api.g.calls ?? []).length;
}
