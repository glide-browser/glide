// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;
declare var document: Document & { documentElement: HTMLElement };

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

const CONFIG_LINE_COL_REGEX = /(?<!@glide\.ts):(\d+):(\d+)/g;

declare global {
  interface GlideGlobals {
    value?: any;
    error_message?: unknown;
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

  is(GlideBrowser.api.g.mapleader, "<C-d>", "glide.g.mapleader assignments should be normalized");
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
  await GlideTestUtils.synthesize_keyseq(";");
  is(GlideBrowser.state.mode, "normal");

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", ";", "mode_change insert");
  });

  await GlideTestUtils.synthesize_keyseq(";");
  is(GlideBrowser.state.mode, "insert");
});

add_task(async function test_buf_prefs_set() {
  await GlideTestUtils.reload_config(function _() {
    glide.prefs.set("smoothscroll", false);

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.buf.prefs.set("smoothscroll", true);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(10);

    is(GlideBrowser.api.prefs.get("smoothscroll"), true, "pref should be set via UrlEnter");
  });

  await sleep_frames(10);

  is(GlideBrowser.api.prefs.get("smoothscroll"), false, "pref should be restored after navigating away");

  GlideBrowser.api.prefs.clear("smoothscroll");
});

add_task(async function test_buf_prefs_set_new_pref() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.buf.prefs.set("mynewpref", true);
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(10);

    is(GlideBrowser.api.prefs.get("mynewpref"), true, "pref should be set via UrlEnter");
  });

  await sleep_frames(10);

  is(GlideBrowser.api.prefs.get("mynewpref"), undefined, "pref should be cleared after navigating away");
});

add_task(async function test_invalid_config_notification() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      // @ts-expect-error
      glide.nonexistent_method();
    });

    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred while evaluating `@glide.ts:2:7` - TypeError: glide.nonexistent_method is not a function",
      "Notification should contain error message",
    );

    // verify the reload button exists and works
    let reload_button = notification.querySelector("[data-l10n-id='glide-error-notification-reload-config-button']");
    ok(reload_button, "Reload config button should exist");

    // note: *not* using reload config directly
    GlideTestUtils.write_config(function _() {
      glide.keymaps.set("normal", ";", "motion w");
    });

    // @ts-ignore
    reload_button.click();
    await sleep_frames(5);
    ok(
      !gNotificationBox.getNotificationWithValue("glide-config-error"),
      "Notification should be removed after fixing config + reload",
    );
    is(gNotificationBox.currentNotification, null, "No notification should be present");
  });
});

add_task(async function test_invalid_config_notification_cleared_after_reloading() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      // @ts-expect-error
      glide.nonexistent_method();
    });

    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred while evaluating `@glide.ts:2:7` - TypeError: glide.nonexistent_method is not a function",
      "Notification should contain error message",
    );

    // note: *not* using reload config directly
    GlideTestUtils.write_config(function _() {
      glide.keymaps.set("normal", ";", "motion w");
    });

    // TODO(glide): test util for executing a command with keys
    await GlideExcmds.execute("config_reload");

    await sleep_frames(5);
    ok(
      !gNotificationBox.getNotificationWithValue("glide-config-error"),
      "Notification should be removed after fixing config + reload",
    );
    is(gNotificationBox.currentNotification, null, "No notification should be present");
  });
});

add_task(async function test_invalid_config_notification_nested_stack_trace() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      function my_func() {
        throw new Error("ruh roh");
      }

      my_func();
    });

    await sleep_frames(5);

    let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot
        .querySelector(".message")
        .textContent.trim()
        .replaceAll(CONFIG_LINE_COL_REGEX, ":X:X"),
      "An error occurred while evaluating `my_func@glide.ts:2:9\n@chrome://glide/config/glide.ts:X:X` - Error: ruh roh",
      "Notification should contain error message",
    );

    gNotificationBox.removeNotification(notification);
  });
});

add_task(async function test_glide_prefs_set() {
  is(GlideBrowser.api.prefs.get("ui.highlight"), undefined);

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = undefined;

      glide.prefs.set("ui.highlight", "#edc73b");
    });

    await sleep_frames(5);

    is(GlideBrowser.api.prefs.get("ui.highlight"), "#edc73b");
    GlideBrowser.api.prefs.clear("ui.highlight");
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

add_task(async function test_glide_prefs_get_undefined_pref() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = "unset";
      glide.g.value = glide.prefs.get("my_new_pref");
    });

    await sleep_frames(5);

    is(GlideBrowser.api.g.value, undefined);
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
    await GlideTestUtils.synthesize_keyseq("<Space>k");

    await GlideTestUtils.synthesize_keyseq("a");

    await TestUtils.waitForCondition(
      () => GlideBrowser.api.g.received_key === "a",
      "glide.keys.next() should capture the 'a' key correctly",
      10,
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
    await GlideTestUtils.synthesize_keyseq("<Space>s");

    await GlideTestUtils.synthesize_keyseq("<C-l>");

    await TestUtils.waitForCondition(
      () => GlideBrowser.api.g.received_key === "<C-l>",
      "glide.keys.next() should capture the '<C-l>' key correctly",
      10,
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
    await GlideTestUtils.synthesize_keyseq("<Space>c");

    await GlideTestUtils.synthesize_keyseq("x");

    await TestUtils.waitForCondition(
      () => GlideBrowser.api.g.received_key === "x",
      "First call should still receive the key correctly",
      10,
    );

    // Verify an error was thrown for the second call
    ok(GlideBrowser.api.g.error_thrown, "Second call to glide.keys.next() should throw an error");
    is(GlideBrowser.api.g.received_key, "x", "First call should still receive the key correctly");
    ok(!GlideBrowser.api.g.unexpected_error, "No unexpected errors should occur");
  });
});

add_task(async function test_keys_next_special_keys() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>p", async () => {
      glide.g.received_key = await glide.keys.next_str();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>p");

    await GlideTestUtils.synthesize_keyseq("<Esc>");

    await TestUtils.waitForCondition(
      () => GlideBrowser.api.g.received_key === "<Esc>",
      "glide.keys.next_str() should capture the Escape key correctly",
      10,
    );
  });
});

add_task(async function test_keys_next_passthrough_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>z", async () => {
      const key_event = await glide.keys.next_passthrough();
      assert(key_event instanceof KeyboardEvent);
      glide.g.received_key = key_event.glide_key;
    });

    glide.keymaps.set("normal", "b", async () => {
      glide.g.value = "b triggered";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>z");

    await GlideTestUtils.synthesize_keyseq("b");

    await TestUtils.waitForCondition(
      () => GlideBrowser.api.g.received_key === "b",
      "glide.keys.next_passthrough() should capture the 'b' key correctly",
      10,
    );
    is(
      GlideBrowser.api.g.value,
      "b triggered",
      "glide.keys.next_passthrough() should pass keys through to their original mappings",
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
    await GlideTestUtils.synthesize_keyseq("<Space>u");

    is(GlideBrowser.api.g.value, INPUT_TEST_URI, "glide.ctx.url should return the current page URL");
  });
});

add_task(async function test_glide_excmds_execute() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = "initial";

    glide.keymaps.set("normal", "<Space>e", async () => {
      glide.g.value = "updated";
      await glide.excmds.execute("config_reload");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>e");
    await sleep_frames(20);

    is(GlideBrowser.api.g.value, "initial", "After config reload, the value should be reset to undefined");
  });
});

add_task(async function test_webext_listener_error() {
  await GlideTestUtils.reload_config(function _() {
    browser.webRequest.onCompleted.addListener(_ => {
      throw new Error(`an error in webRequest callback`);
    }, { urls: ["*://*/*/input_test.html"] });
  });
  await sleep_frames(5);

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await TestUtils.waitForCondition(() => {
      GlideBrowser.flush_pending_error_notifications();
      return gNotificationBox.getNotificationWithValue("glide-config-error") != null;
    }, "an error notification should be reported");
    await sleep_frames(100); // this seems to fix race conditions somehow

    let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "An error occurred inside a Web Extension listener at @glide.ts:2:9 - Error: an error in webRequest callback",
      "Notification should contain error message",
    );
    gNotificationBox.removeNotification(notification);
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
    await GlideTestUtils.synthesize_keyseq("<Space>q");
    await sleep_frames(50);
    GlideBrowser.flush_pending_error_notifications();

    let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

    ok(notification, "Error notification should be shown");
    is(
      notification.shadowRoot.querySelector(".message")?.textContent?.trim(),
      "An error occurred inside a Web Extension listener at @glide.ts:2:9 - Error: an error in the storage listener",
      "Notification should contain error message",
    );

    gNotificationBox.removeNotification(notification);
  });
}).skip(); // this test is very flaky, not worth it for now

declare global {
  interface GlideGlobals {
    sb?: any;
  }
}

add_task(async function test_config_sandbox_properties() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.sb = {};

    // These should be available (common web APIs)
    glide.g.sb.has_fetch = typeof fetch !== "undefined";
    glide.g.sb.has_setTimeout = typeof setTimeout !== "undefined";
    glide.g.sb.has_console = typeof console !== "undefined";
    glide.g.sb.has_document = typeof document !== "undefined";
    glide.g.sb.has_navigator = typeof navigator !== "undefined";

    // These should NOT be available (internals)
    glide.g.sb.has_openDialog = typeof openDialog !== "undefined";
    glide.g.sb.has_GlideBrowser = typeof GlideBrowser !== "undefined";
    glide.g.sb.has_ChromeUtils = typeof ChromeUtils !== "undefined";
    glide.g.sb.has_Services = typeof Services !== "undefined";
    glide.g.sb.has_Components = typeof Components !== "undefined";
    glide.g.sb.has_Cu = typeof Cu !== "undefined";
    glide.g.sb.has_Cc = typeof Cc !== "undefined";
    glide.g.sb.has_Ci = typeof Ci !== "undefined";
    glide.g.sb.has_gBrowser = typeof gBrowser !== "undefined";
    glide.g.sb.has_gNotificationBox = typeof gNotificationBox !== "undefined";
    glide.g.sb.has_BrowserTestUtils = typeof BrowserTestUtils !== "undefined";
    glide.g.sb.has_GlideTestUtils = typeof GlideTestUtils !== "undefined";
    glide.g.sb.has_GlideExcmds = typeof GlideExcmds !== "undefined";
  });

  ok(GlideBrowser.api.g.sb.has_fetch, "fetch should be available in config sandbox");
  ok(GlideBrowser.api.g.sb.has_setTimeout, "setTimeout should be available in config sandbox");
  ok(GlideBrowser.api.g.sb.has_console, "console should be available in config sandbox");
  ok(GlideBrowser.api.g.sb.has_document, "document should be available in config sandbox");
  ok(GlideBrowser.api.g.sb.has_navigator, "navigator should be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_openDialog, "openDialog should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_GlideBrowser, "GlideBrowser should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_ChromeUtils, "ChromeUtils should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_Services, "Services should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_Components, "Components should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_Cu, "Cu should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_Cc, "Cc should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_Ci, "Ci should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_gBrowser, "gBrowser should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_gNotificationBox, "gNotificationBox should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_BrowserTestUtils, "BrowserTestUtils should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_GlideTestUtils, "GlideTestUtils should NOT be available in config sandbox");
  ok(!GlideBrowser.api.g.sb.has_GlideExcmds, "GlideExcmds should NOT be available in config sandbox");
});

declare global {
  interface ExcmdRegistry {
    my_test_command: {};
  }
}
add_task(async function test_excmds_create() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create({ name: "my_test_command", description: "test" }, () => {
      glide.g.value = "from hello excmd";
    });

    glide.keymaps.set("normal", "<leader>0", "my_test_command");
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>0");

    is(GlideBrowser.api.g.value, "from hello excmd", "the excmd callback should set g.value");

    // ensure removed after reload
    await GlideTestUtils.reload_config(function _() {
      glide.keymaps.set("normal", "<leader>0", "my_test_command");
    });
    await GlideTestUtils.synthesize_keyseq("<Space>0");
    await sleep_frames(10);

    let notification = gNotificationBox.getNotificationWithValue("glide-excmd-error");

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred executing excmd `my_test_command` - Error: Unknown excmd: `my_test_command`",
      "Notification should contain error message",
    );
  });
});

add_task(async function test_keys_send_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = "before send";
      await glide.keys.send("j");
    });

    glide.keymaps.set("normal", "j", () => {
      glide.g.value = "after send";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(50);

    is(GlideBrowser.api.g.value, "after send", "glide.keys.send() should trigger the 'j' keymap");
  });
});

add_task(async function test_keys_send_to_input_element() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("insert", "<C-k>", async () => {
      await glide.keys.send("hello");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.focus();
      input.value = "";
    });
    await sleep_frames(3);
    is(GlideBrowser.state.mode, "insert", "Should be in insert mode when input is focused");

    await GlideTestUtils.synthesize_keyseq("<C-k>");
    await sleep_frames(5);

    is(
      await SpecialPowers.spawn(browser, [], async () => {
        const input = content.document.getElementById<HTMLInputElement>("input-1")!;
        return input.value;
      }),
      "hello",
      "glide.keys.send() should insert text into focused input element",
    );
  });
});

add_task(async function test_keys_send_accepts_glide_key() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = "before next";

      const key = await glide.keys.next();
      glide.g.value = "before send";

      await glide.keys.send(key);
    });

    glide.keymaps.set("normal", "j", () => {
      glide.g.value = "after send";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(50);

    is(GlideBrowser.api.g.value, "before next", "should wait for the next key");

    await GlideTestUtils.synthesize_keyseq("j");
    await sleep_frames(10);

    is(GlideBrowser.api.g.value, "after send", "glide.keys.send() should trigger the 'j' keymap");
  });
});

add_task(async function test_keys_send_skip_mappings() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = "from first mapping";
      await glide.keys.send("j", { skip_mappings: true });
    });

    glide.keymaps.set("normal", "j", () => {
      glide.g.value = "j keymap triggered";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(50);

    is(
      GlideBrowser.api.g.value,
      "from first mapping",
      "glide.keys.send() with skip_mappings: true should not trigger the 'j' keymap",
    );
  });
});

declare global {
  interface GlideModes {
    test_custom_mode: "test_custom_mode";
  }
}

add_task(async function test_custom_modes() {
  await GlideTestUtils.reload_config(function _() {
    glide.modes.register("test_custom_mode", { caret: "underline" });

    glide.keymaps.set("normal", "<Space>t", async () => {
      await glide.excmds.execute("mode_change test_custom_mode");
    });

    glide.keymaps.set("test_custom_mode", "j", async () => {
      glide.g.value = "from custom mode keymap";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(10);
    is(GlideBrowser.state.mode, "test_custom_mode", "we should switch to the custom mode");

    await GlideTestUtils.synthesize_keyseq("j");
    await sleep_frames(10);
    is(GlideBrowser.api.g.value, "from custom mode keymap", "the custom mode keymap callback should be invoked");

    await GlideBrowser.api.excmds.execute("mode_change normal");
  });
});

add_task(async function test_registering_mode_twice_results_in_an_error() {
  await GlideTestUtils.reload_config(function _() {
    glide.modes.register("normal", { caret: "block" });
  });

  await sleep_frames(100);

  let notification = gNotificationBox.getNotificationWithValue("glide-config-error");

  ok(notification, "Error notification should be shown");
  is(
    // @ts-ignore
    notification.shadowRoot
      .querySelector(".message")
      .textContent.trim()
      .replaceAll(CONFIG_LINE_COL_REGEX, ":X:X"),
    "An error occurred while evaluating `register@chrome://glide/content/browser.mjs:X:X\n@glide.ts:1:13` - Error: The `normal` mode has already been registered. Modes can only be registered once",
    "Notification should contain error message",
  );
});

add_task(async function test_ctx_mode() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = glide.ctx.mode;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(10);
    is(GlideBrowser.api.g.value, "normal", "the keymap should be invoked and set the value to the current mode");
  });
});

add_task(async function test_dedent_helpers() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = html`
        <!---->
        <div>foo</div>
      `;

      const arg = "foo";
      try {
        // @ts-expect-error
        html`<div>${arg}</div>`;
      } catch (err) {
        glide.g.error_message = String(err);
      }
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>t");
    await sleep_frames(10);
    is(GlideBrowser.api.g.value, "<!---->\n<div>foo</div>");
    is(
      GlideBrowser.api.g.error_message,
      "Error: The html template function does not support interpolating arguments as escaping is not implemented.",
    );
  });
});

add_task(async function test_os() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    ok(GlideBrowser.api.ctx.os, "glide.ctx.os is not empty");
    is(typeof GlideBrowser.api.ctx.os, "string", "glide.ctx.os should be set to a string");
  });
});

add_task(async function test_options_get() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.yank_highlight_time = 50;

    glide.autocmds.create("UrlEnter", /input_test\.html/, () => {
      glide.bo.yank_highlight_time = 100;
    });
  });

  is(GlideBrowser.api.options.get("yank_highlight_time"), 50, "global option should be retrieved correctly");

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(10);
    is(GlideBrowser.api.options.get("yank_highlight_time"), 100, "buffer option should be retrieved correctly");
  });
});

add_task(async function test_keys_parse() {
  const base: Omit<glide.KeyNotation, "key"> = { alt: false, ctrl: false, meta: false, shift: false };
  const parse = GlideBrowser.api.keys.parse;
  isjson(parse("a"), { key: "a", ...base });
  isjson(parse("b"), { key: "b", ...base });
  isjson(parse("H"), { key: "H", ...base });
  isjson(parse("<S-h>"), { key: "h", ...base, shift: true });
  isjson(parse("<S-H>"), { key: "H", ...base, shift: true });
  isjson(parse("<C-S-h>"), { key: "h", ...base, ctrl: true, shift: true });
  isjson(parse("<S-C-h>"), { key: "h", ...base, ctrl: true, shift: true });
  isjson(parse("<S-A-D-C-h>"), { key: "h", alt: true, meta: true, ctrl: true, shift: true });

  // Special keys
  isjson(parse("<space>"), { key: "<Space>", ...base });
  isjson(parse("<Space>"), { key: "<Space>", ...base });
  isjson(parse("<leader>"), { key: "<leader>", ...base });
  isjson(parse("<Tab>"), { key: "<Tab>", ...base });
  isjson(parse("<CR>"), { key: "<CR>", ...base });
  isjson(parse("<Esc>"), { key: "<Esc>", ...base });
  isjson(parse("<BS>"), { key: "<BS>", ...base });
  isjson(parse("<Del>"), { key: "<Del>", ...base });
  isjson(parse("<F1>"), { key: "<F1>", ...base });
  isjson(parse("<F11>"), { key: "<F11>", ...base });

  // Special aliases
  isjson(parse("<lt>"), { key: "<lt>", ...base });
  isjson(parse("<Bar>"), { key: "<Bar>", ...base });
  isjson(parse("<Bslash>"), { key: "<Bslash>", ...base });
  isjson(parse("|"), { key: "|", ...base });
  isjson(parse("<"), { key: "<", ...base });
  isjson(parse("\\"), { key: "\\", ...base });

  // Special keys with modifiers
  isjson(parse("<S-<>"), { key: "<", ...base, shift: true });
  isjson(parse("<C-lt>"), { key: "<lt>", ...base, ctrl: true });
  isjson(parse("<C-Bar>"), { key: "<Bar>", ...base, ctrl: true });
  isjson(parse("<C-Bslash>"), { key: "<Bslash>", ...base, ctrl: true });

  // Mixed case special keys
  isjson(parse("<space>"), { key: "<Space>", ...base });
  isjson(parse("<SPACE>"), { key: "<Space>", ...base });
  isjson(parse("<SpAcE>"), { key: "<Space>", ...base });
  isjson(parse("<tab>"), { key: "<Tab>", ...base });
  isjson(parse("<TAB>"), { key: "<Tab>", ...base });

  // Edge cases
  isjson(parse(""), { key: "", ...base });
  try {
    parse("<>");
    ok(false, "Should error on <>");
  } catch (e) {
    ok(true, "Correctly handles <>");
  }
  try {
    parse("<X-a>");
    ok(false, "Should throw on invalid modifier");
  } catch (e) {
    ok(true, "Correctly throws on invalid modifier");
  }
});

add_task(async function test_keymap_callback_receives_tab_id() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>i", ({ tab_id }) => {
      glide.g.value = tab_id;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.synthesize_keyseq("<Space>i");
    await sleep_frames(10);

    const active_tab = await GlideBrowser.api.tabs.active();
    is(GlideBrowser.api.g.value, active_tab.id, "Keymap callback should receive tab_id that matches the active tab ID");
  });
});

add_task(async function test_assert_never() {
  await GlideTestUtils.reload_config(function _() {
    try {
      // @ts-expect-error
      assert_never("value");
    } catch (err) {
      glide.g.value = String(err);
    }
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await sleep_frames(5);

    is(
      GlideBrowser.api.g.value,
      "Error: assert_never: impossible to call: \"value\"",
      "assert_never should throw an error",
    );
  });
});

add_task(async function test_ensure() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = ensure("foo");
  });

  is(GlideBrowser.api.g.value, "foo", "ensure should return the value");

  await GlideTestUtils.reload_config(function _() {
    try {
      ensure(false);
    } catch (err) {
      glide.g.value = String(err);
    }
  });

  is(
    GlideBrowser.api.g.value,
    "Error: Expected a truthy value, got `false`",
    "ensure should throw an error on falsy input",
  );
});

add_task(async function test_hint_css_property_cleared_on_reload() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_size = "30px";
  });

  is(GlideBrowser.api.o.hint_size, "30px");
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "30px",
    "setting hint_size should set a css variable",
  );

  await GlideTestUtils.reload_config(function _() {});

  is(GlideBrowser.api.o.hint_size, "11px");
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "",
    "css var should be unset after config reload",
  );
});

add_task(async function test_add_excmd_while_commandline_is_cached() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    // open commandline so it is cached
    await GlideTestUtils.commandline.open();
    await sleep_frames(2);
    await GlideTestUtils.synthesize_keyseq("<esc>");
    await TestUtils.waitForCondition(() =>
      document!.getElementById("glide-toolbar-mode-button")!.textContent
        === "normal", "Waiting for mode button to show `normal` mode");

    await GlideTestUtils.reload_config(function _() {
      glide.excmds.create({ name: "hello" }, () => {});
    });

    await GlideTestUtils.synthesize_keyseq(":hello");
    is(GlideTestUtils.commandline.focused_row()?.textContent, "hello", "commandline should show the newly added excmd");
  });
});

add_task(async function test_fs_read() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await IOUtils.writeUTF8(PathUtils.join(PathUtils.profileDir, "glide", "thing.css"), ".contents {}");

    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.read("thing.css", "utf8");
      });
    });

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(10);

    is(GlideBrowser.api.g.value, ".contents {}");
  });
});

add_task(async function test_fs_read_file_not_found() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.read("notfound.css", "utf8").catch((e) => e);
      });
    });

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(10);

    ok(
      GlideBrowser.api.g.value instanceof GlideBrowser.config_sandbox.FileNotFoundError,
      "reading an undefined file results in a FileNotFoundError",
    );
    is(GlideBrowser.api.g.value.name, "FileNotFoundError");
  });
});

add_task(async function test_fs_write() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        await glide.fs.write("my.css", ".contents {}");
        glide.g.value = await glide.fs.read("my.css", "utf8");
      });
    });

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(10);

    is(GlideBrowser.api.g.value, ".contents {}");
  });
});

add_task(async function test_fs_write_new_dir() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        await glide.fs.write("missing-dir/nested/new.css", "#id {}");
        glide.g.value = await glide.fs.read("missing-dir/nested/new.css", "utf8");
      });
    });

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(10);

    is(GlideBrowser.api.g.value, "#id {}");
  });
});

add_task(async function test_fs_exists() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    const test_path = PathUtils.join(PathUtils.profileDir, "glide", "thing.css");
    await IOUtils.writeUTF8(test_path, ".contents {}");

    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.exists("thing.css");
      });
    });

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(5);
    is(GlideBrowser.api.g.value, true);

    await IOUtils.remove(test_path);

    await GlideTestUtils.synthesize_keyseq("~");
    await sleep_frames(5);
    is(GlideBrowser.api.g.value, false);
  });
});

add_task(async function test_path_cwd() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.cwd;
  });
  ok(GlideBrowser.api.g.value.length > 0, "glide.path.cwd should not be empty");
});

add_task(async function test_path_home_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.home_dir;
  });
  ok(GlideBrowser.api.g.value.length > 0, "glide.path.home_dir should not be empty");
});

add_task(async function test_path_profile_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.profile_dir;
  });
  ok(GlideBrowser.api.g.value.length > 0, "glide.path.profile_dir should not be empty");
});

add_task(async function test_path_temp_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.temp_dir;
  });
  ok(GlideBrowser.api.g.value.length > 0, "glide.path.temp_dir should not be empty");
});

add_task(async function test_path_join() {
  await IOUtils.makeDirectory(PathUtils.join("/tmp", "foo", "bar"), { createAncestors: true, ignoreExisting: true });
  await IOUtils.writeUTF8(PathUtils.join("/tmp", "foo", "bar", "baz.txt"), "");

  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.join("/tmp", "foo", "bar", "baz.txt");
  });
  is(GlideBrowser.api.g.value, "/tmp/foo/bar/baz.txt");

  await IOUtils.remove(PathUtils.join("/tmp", "foo", "bar", "baz.txt"));
});
