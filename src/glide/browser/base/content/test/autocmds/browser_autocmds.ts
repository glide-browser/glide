/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

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

    glide.autocmd.create("UrlEnter", /input_test\.html/, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmd.create("UrlEnter", /definitely-wont-match/, () => {
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

    glide.autocmd.create("UrlEnter", { hostname: "mochi.test" }, () => {
      glide.g.calls!.push("expected-call");
    });

    glide.autocmd.create(
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

    glide.autocmd.create("UrlEnter", /input_test/, () => {
      glide.g.calls!.push("first");

      return () => {
        glide.g.calls!.push("first-cleanup");
      };
    });

    glide.autocmd.create("UrlEnter", /input_test/, () => {
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
    glide.autocmd.create("UrlEnter", /input_test/, () => {
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
  });
});

add_task(async function test_autocmd_cleanup_error() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmd.create("UrlEnter", /input_test/, () => {
      return () => {
        throw new Error("ruh roh");
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
      "Error occurred in UrlEnter cleanup `@glide.ts:3:11` - Error: ruh roh",
      "Notification should contain error message"
    );
  });
});

add_task(async function test_urlenter_triggered_by_tab_switch() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.calls = [];

    glide.autocmd.create("UrlEnter", /input_test/, () => {
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

      glide.autocmd.create("UrlEnter", /input_test/, () => {
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

function num_calls() {
  return (GlideBrowser.api.g.calls ?? []).length;
}
