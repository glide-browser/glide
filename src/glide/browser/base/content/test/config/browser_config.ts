/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

const CONFIG_LINE_COL_REGEX = /(?<!@glide\.ts):(\d+):(\d+)/g;

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
