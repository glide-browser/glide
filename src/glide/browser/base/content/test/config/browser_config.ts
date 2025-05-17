/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

const CONFIG_LINE_COL_REGEX = /(?<!@glide\.ts):(\d+):(\d+)/g;

declare global {
  interface GlideGlobals {
    value?: unknown;
  }
}

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {
    // empty placeholder config file
  });
});

add_task(async function test_g_mapleader_normalizes_input() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.mapleader = "<C-C-d>";
  });

  is(
    GlideBrowser.api.g.mapleader,
    "<C-d>",
    "glide.g.mapleader assignments should be normalized"
  );
});

declare global {
  interface GlideGlobals {
    test_prop?: boolean;
    received_key?: string;
    error_thrown?: boolean;
    unexpected_error?: string;
  }
}

add_task(async function test_g_stores_arbitrary_data() {
  await GlideTestUtils.reload_config(function _() {
    // @ts-expect-error incorrect type assignment
    glide.g.test_prop = "<C-C-d>";
    glide.g.test_prop = true;
  });

  ok(GlideBrowser.api.g.test_prop, "glide.g.test_prop should be retained");
});

add_task(async function test_keymap_reloading() {
  EventUtils.synthesizeKey(";");
  await sleep_frames(5);
  is(GlideBrowser.state.mode, "normal");

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", ";", "mode_change insert");
  });

  EventUtils.synthesizeKey(";");
  await sleep_frames(5);
  is(GlideBrowser.state.mode, "insert");
});

add_task(async function test_invalid_config_notification() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      // @ts-expect-error
      glide.nonexistent_method();
    });

    await sleep_frames(5);

    let notification_box = gBrowser.getNotificationBox();
    let notification =
      notification_box.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred while evaluating `@glide.ts:2:7` - TypeError: glide.nonexistent_method is not a function",
      "Notification should contain error message"
    );

    // verify the reload button exists and works
    let reload_button = notification.querySelector(
      "[data-l10n-id='glide-error-notification-reload-config-button']"
    );
    ok(reload_button, "Reload config button should exist");

    // note: *not* using reload config directly
    GlideTestUtils.write_config(function _() {
      glide.keymaps.set("normal", ";", "w");
    });

    // @ts-ignore
    reload_button.click();
    await sleep_frames(5);
    ok(
      !notification_box.getNotificationWithValue("glide-config-error"),
      "Notification should be removed after fixing config + reload"
    );
    is(
      notification_box.currentNotification,
      null,
      "No notification should be present"
    );
  });
});

add_task(
  async function test_invalid_config_notification_cleared_after_reloading() {
    await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
      await GlideTestUtils.reload_config(function _() {
        // @ts-expect-error
        glide.nonexistent_method();
      });

      await sleep_frames(5);

      let notification_box = gBrowser.getNotificationBox();
      let notification =
        notification_box.getNotificationWithValue("glide-config-error");

      ok(notification, "Error notification should be shown");
      is(
        // @ts-ignore
        notification.shadowRoot.querySelector(".message").textContent.trim(),
        "An error occurred while evaluating `@glide.ts:2:7` - TypeError: glide.nonexistent_method is not a function",
        "Notification should contain error message"
      );

      // note: *not* using reload config directly
      GlideTestUtils.write_config(function _() {
        glide.keymaps.set("normal", ";", "w");
      });

      // TODO(glide): test util for executing a command with keys
      await GlideExcmds.execute("config_reload");

      await sleep_frames(5);
      ok(
        !notification_box.getNotificationWithValue("glide-config-error"),
        "Notification should be removed after fixing config + reload"
      );
      is(
        notification_box.currentNotification,
        null,
        "No notification should be present"
      );
    });
  }
);

add_task(async function test_invalid_config_notification_nested_stack_trace() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      // @ts-ignore
      glide.prefs.set("wow why does this pref not exist?", true);
    });

    await sleep_frames(5);

    let notification_box = gBrowser.getNotificationBox();
    let notification =
      notification_box.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot
        .querySelector(".message")
        .textContent.trim()
        .replace(CONFIG_LINE_COL_REGEX, ":X:X"),
      "An error occurred while evaluating `set@chrome://glide/content/browser.mjs:X:X\n@glide.ts:2:13` - Error: Invalid pref name wow why does this pref not exist?",
      "Notification should contain error message"
    );
  });
});

add_task(async function test_glide_prefs_get() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = undefined;

      glide.prefs.set("browser.active_color", "#EE0000");

      glide.g.value = glide.prefs.get("browser.active_color");
    });

    await sleep_frames(5);

    is(GlideBrowser.api.g.value, "#EE0000");
  });
});

add_task(async function test_glide_prefs_clear() {
  const glide = GlideBrowser.api;
  const pre = glide.prefs.get("browser.active_color");

  glide.prefs.set("browser.active_color", "#EE0001");
  isnot(glide.prefs.get("browser.active_color"), pre);

  glide.prefs.clear("browser.active_color");

  is(glide.prefs.get("browser.active_color"), pre);
});

add_task(async function test_keys_next_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>k", async () => {
      const key_event = await glide.keys.next();
      assert(key_event instanceof KeyboardEvent);
      glide.g.received_key = key_event.glide_key;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("k");
    await sleep_frames(5);

    EventUtils.synthesizeKey("a");
    await sleep_frames(10);

    is(
      GlideBrowser.api.g.received_key,
      "a",
      "glide.keys.next() should capture the 'a' key correctly"
    );
  });
});

add_task(async function test_keys_next_str_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>s", async () => {
      glide.g.received_key = await glide.keys.next_str();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("s");
    await sleep_frames(5);

    EventUtils.synthesizeKey("l", { ctrlKey: true });
    await sleep_frames(10);

    is(
      GlideBrowser.api.g.received_key,
      "<C-l>",
      "glide.keys.next_str() should capture the '<C-l>' key correctly"
    );
  });
});

add_task(async function test_keys_next_concurrency_disallowed() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>c", async () => {
      try {
        const first_promise = glide.keys.next();

        try {
          await glide.keys.next();
          glide.g.error_thrown = false;
        } catch (e) {
          // This is expected
          glide.g.error_thrown = true;
        }

        const key_event = await first_promise;
        glide.g.received_key = key_event.glide_key;
      } catch (e) {
        glide.g.unexpected_error = String(e);
      }
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("c");
    await sleep_frames(10);

    EventUtils.synthesizeKey("x");
    await sleep_frames(10);

    // Verify an error was thrown for the second call
    ok(
      GlideBrowser.api.g.error_thrown,
      "Second call to glide.keys.next() should throw an error"
    );
    is(
      GlideBrowser.api.g.received_key,
      "x",
      "First call should still receive the key correctly"
    );
    ok(
      !GlideBrowser.api.g.unexpected_error,
      "No unexpected errors should occur"
    );
  });
});

add_task(async function test_keys_next_special_keys() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>p", async () => {
      glide.g.received_key = await glide.keys.next_str();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("p");
    await sleep_frames(5);

    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(10);

    is(
      GlideBrowser.api.g.received_key,
      "<Esc>",
      "glide.keys.next_str() should capture the Escape key correctly"
    );
  });
});

add_task(async function test_glide_ctx_url() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>u", () => {
      glide.g.value = glide.ctx.url;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("u");
    await sleep_frames(5);

    is(
      GlideBrowser.api.g.value,
      INPUT_TEST_URI,
      "glide.ctx.url should return the current page URL"
    );
  });
});

add_task(async function test_glide_excmds_execute() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = "initial";

    glide.keymaps.set("normal", "<Space>e", async () => {
      await glide.excmds.execute("config_reload");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("e");
    await sleep_frames(5);

    is(
      GlideBrowser.api.g.value,
      undefined,
      "After config reload, the value should be reset to undefined"
    );
  });
});

add_task(async function test_webext_listener_error() {
  await GlideTestUtils.reload_config(function _() {
    browser.webRequest.onCompleted.addListener(
      _ => {
        throw new Error(`an error in webRequest callback`);
      },
      { urls: ["*://*/*/input_test.html"] }
    );
  });
  await sleep_frames(5);

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);
    GlideBrowser.flush_pending_error_notifications();

    let notification_box = gBrowser.getNotificationBox();
    let notification =
      notification_box.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "An error occurred inside a Web Extension listener at @glide.ts:3:11 - Error: an error in webRequest callback",
      "Notification should contain error message"
    );
  });
});

add_task(async function test_webext_storage_api_listener_error() {
  // this API should hit a different code path than the listener test above

  await GlideTestUtils.reload_config(function _() {
    browser.storage.onChanged.addListener(() => {
      throw new Error("an error in the storage listener");
    });

    glide.keymaps.set("normal", "<Space>q", async () => {
      await browser.storage.local.set({ testKey: "testValue" });
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);
    EventUtils.synthesizeKey(" ");
    EventUtils.synthesizeKey("q");
    await sleep_frames(5);
    GlideBrowser.flush_pending_error_notifications();
    await sleep_frames(5);

    let notification_box = gBrowser.getNotificationBox();
    let notification =
      notification_box.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "An error occurred inside a Web Extension listener at @glide.ts:2:9 - Error: an error in the storage listener",
      "Notification should contain error message"
    );
  });
});
