// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");

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

  is(glide.g.mapleader, "<C-d>", "glide.g.mapleader assignments should be normalized");
});

declare global {
  interface GlideGlobals {
    test_prop?: boolean;
    test_state?: string;
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

  ok(glide.g.test_prop, "glide.g.test_prop should be retained");
});

add_task(async function test_keymap_reloading() {
  await keys(";");
  is(GlideBrowser.state.mode, "normal");

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", ";", "mode_change insert");
  });

  await keys(";");
  is(GlideBrowser.state.mode, "insert");
});

add_task(async function test_buf_prefs_set() {
  await GlideTestUtils.reload_config(function _() {
    glide.prefs.set("smoothscroll", false);

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.buf.prefs.set("smoothscroll", true);
      glide.g.test_state = "enter";
      return () => {
        glide.g.test_state = "cleanup";
      };
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await until(() => glide.g.test_state === "enter");
    is(glide.prefs.get("smoothscroll"), true, "pref should be set via UrlEnter");
  });

  await until(() => glide.g.test_state === "cleanup");

  is(glide.prefs.get("smoothscroll"), false, "pref should be restored after navigating away");

  glide.prefs.clear("smoothscroll");
});

add_task(async function test_buf_prefs_set_new_pref() {
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.buf.prefs.set("mynewpref", true);
      glide.g.test_state = "enter";
      return () => {
        glide.g.test_state = "cleanup";
      };
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await until(() => glide.g.test_state === "enter");
    is(glide.prefs.get("mynewpref"), true, "pref should be set via UrlEnter");
  });

  await until(() => glide.g.test_state === "cleanup");

  is(glide.prefs.get("mynewpref"), undefined, "pref should be cleared after navigating away");
});

add_task(async function test_invalid_config_notification() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      // @ts-expect-error
      glide.nonexistent_method();
    });

    const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-config-error"));

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
    await GlideTestUtils.write_config(function _() {
      glide.keymaps.set("normal", ";", "motion w");
    });

    (reload_button as HTMLElement).click();
    await waiter(() => gNotificationBox.getNotificationWithValue("glide-config-error")).notok(
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

    const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-config-error"));

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred while evaluating `@glide.ts:2:7` - TypeError: glide.nonexistent_method is not a function",
      "Notification should contain error message",
    );

    // note: *not* using reload config directly
    await GlideTestUtils.write_config(function _() {
      glide.keymaps.set("normal", ";", "motion w");
    });

    // TODO(glide): test util for executing a command with keys
    await GlideExcmds.execute("config_reload");

    await waiter(() => gNotificationBox.getNotificationWithValue("glide-config-error")).notok(
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

    const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-config-error"));

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
  is(glide.prefs.get("ui.highlight"), undefined);

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = undefined;

      glide.prefs.set("ui.highlight", "#edc73b");
    });

    await waiter(() => glide.prefs.get("ui.highlight")).is("#edc73b");
    glide.prefs.clear("ui.highlight");
  });
});

add_task(async function test_glide_prefs_get() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = undefined;

      glide.prefs.set("browser.active_color", "#EE0000");

      glide.g.value = glide.prefs.get("browser.active_color");
    });

    await waiter(() => glide.g.value).is("#EE0000");
  });
});

add_task(async function test_glide_prefs_get_undefined_pref() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.value = "unset";
      glide.g.value = glide.prefs.get("my_new_pref");
    });

    await waiter(() => glide.g.value).is(undefined);
  });
});

add_task(async function test_glide_prefs_clear() {
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
    await keys("<Space>k");

    await keys("a");

    await TestUtils.waitForCondition(
      () => glide.g.received_key === "a",
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
    await keys("<Space>s");

    await keys("<C-l>");

    await TestUtils.waitForCondition(
      () => glide.g.received_key === "<C-l>",
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
        } catch {
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
    await keys("<Space>c");

    await keys("x");

    await TestUtils.waitForCondition(
      () => glide.g.received_key === "x",
      "First call should still receive the key correctly",
      10,
    );

    // Verify an error was thrown for the second call
    ok(glide.g.error_thrown, "Second call to glide.keys.next() should throw an error");
    is(glide.g.received_key, "x", "First call should still receive the key correctly");
    ok(!glide.g.unexpected_error, "No unexpected errors should occur");
  });
});

add_task(async function test_keys_next_special_keys() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>p", async () => {
      glide.g.received_key = await glide.keys.next_str();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>p");

    await keys("<Esc>");

    await TestUtils.waitForCondition(
      () => glide.g.received_key === "<Esc>",
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
    await keys("<Space>z");

    await keys("b");

    await TestUtils.waitForCondition(
      () => glide.g.received_key === "b",
      "glide.keys.next_passthrough() should capture the 'b' key correctly",
      10,
    );
    is(
      glide.g.value,
      "b triggered",
      "glide.keys.next_passthrough() should pass keys through to their original mappings",
    );
  });
});

add_task(async function test_glide_ctx_url() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>u", () => {
      glide.g.value = glide.ctx.url.toString();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>u");

    is(glide.g.value, INPUT_TEST_URI, "glide.ctx.url should return the current page URL");
  });
});

add_task(async function test_glide_ctx_version() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.ctx.version;
    });
  });

  await keys("~");

  ok(glide.g.value, "glide.ctx.version should be present and non-empty");
  is(typeof glide.g.value, "string", "glide.ctx.version should be a string");
  is(glide.g.value, Services.appinfo.version, "glide.ctx.version should return the current version");
});

add_task(async function test_glide_ctx_firefox_version() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.ctx.firefox_version;
    });
  });

  await keys("~");

  ok(glide.g.value, "glide.ctx.firefox_version should be present and non-empty");
  is(typeof glide.g.value, "string", "glide.ctx.firefox_version should be a string");
  is(
    glide.g.value,
    AppConstants.GLIDE_FIREFOX_VERSION,
    "glide.ctx.firefox_version should return the current firefox version",
  );
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
    await keys("<Space>e");
    await waiter(() => glide.g.value).is("initial", "After config reload, the value should be reset to undefined");
  });
});

add_task(async function test_webext_listener_error() {
  await GlideTestUtils.reload_config(function _() {
    browser.webRequest.onCompleted.addListener(_ => {
      throw new Error(`an error in webRequest callback`);
    }, { urls: ["*://*/*/input_test.html"] });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    const notification = await until(() => {
      GlideBrowser.flush_pending_error_notifications();
      return gNotificationBox.getNotificationWithValue("glide-config-error");
    }, "an error notification should be reported");

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
    await keys("<Space>q");
    await sleep_frames(50);
    GlideBrowser.flush_pending_error_notifications();

    const notification = gNotificationBox.getNotificationWithValue("glide-config-error");

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

  ok(glide.g.sb.has_fetch, "fetch should be available in config sandbox");
  ok(glide.g.sb.has_setTimeout, "setTimeout should be available in config sandbox");
  ok(glide.g.sb.has_console, "console should be available in config sandbox");
  ok(glide.g.sb.has_document, "document should be available in config sandbox");
  ok(glide.g.sb.has_navigator, "navigator should be available in config sandbox");
  ok(!glide.g.sb.has_openDialog, "openDialog should NOT be available in config sandbox");
  ok(!glide.g.sb.has_GlideBrowser, "GlideBrowser should NOT be available in config sandbox");
  ok(!glide.g.sb.has_ChromeUtils, "ChromeUtils should NOT be available in config sandbox");
  ok(!glide.g.sb.has_Services, "Services should NOT be available in config sandbox");
  ok(!glide.g.sb.has_Components, "Components should NOT be available in config sandbox");
  ok(!glide.g.sb.has_Cu, "Cu should NOT be available in config sandbox");
  ok(!glide.g.sb.has_Cc, "Cc should NOT be available in config sandbox");
  ok(!glide.g.sb.has_Ci, "Ci should NOT be available in config sandbox");
  ok(!glide.g.sb.has_gBrowser, "gBrowser should NOT be available in config sandbox");
  ok(!glide.g.sb.has_gNotificationBox, "gNotificationBox should NOT be available in config sandbox");
  ok(!glide.g.sb.has_BrowserTestUtils, "BrowserTestUtils should NOT be available in config sandbox");
  ok(!glide.g.sb.has_GlideTestUtils, "GlideTestUtils should NOT be available in config sandbox");
  ok(!glide.g.sb.has_GlideExcmds, "GlideExcmds should NOT be available in config sandbox");
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
    await keys("<Space>0");

    is(glide.g.value, "from hello excmd", "the excmd callback should set g.value");

    // ensure removed after reload
    await GlideTestUtils.reload_config(function _() {
      glide.keymaps.set("normal", "<leader>0", "my_test_command");
    });
    await keys("<Space>0");

    const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-excmd-error"));

    ok(notification, "Error notification should be shown");
    is(
      // @ts-ignore
      notification.shadowRoot.querySelector(".message").textContent.trim(),
      "An error occurred executing excmd `my_test_command` - Error: Unknown excmd: `my_test_command`",
      "Notification should contain error message",
    );
  });
});

add_task(async function test_excmds_create__content() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create(
      { name: "my_test_command", description: "test" },
      glide.content.fn(() => {
        document.body!.dataset["glide_test_marker"] = "content_fn_executed";
      }),
    );

    glide.keymaps.set("normal", "~", "my_test_command");
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("~");

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.body!.dataset["glide_test_marker"] === "content_fn_executed",
        "content function should mutate the body",
      );
    });
  });
});

add_task(async function test_excmds_create__content__args() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create(
      { name: "my_test_command", description: "test" },
      glide.content.fn((props) => {
        document.body!.dataset["glide_test_marker"] = props.args_arr.join(" ");
      }),
    );

    glide.keymaps.set("normal", "~", "my_test_command foo bar");
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("~");

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.body!.dataset["glide_test_marker"] === "foo bar",
        "content function should mutate the body",
      );
    });
  });
});

add_task(async function test_keymaps_set__content() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set(
      "normal",
      "~",
      glide.content.fn(() => {
        document.body!.dataset["glide_test_marker"] = "content_fn_executed";
      }),
    );
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("~");

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.body!.dataset["glide_test_marker"] === "content_fn_executed",
        "content function should mutate the body",
      );
    });
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
    await keys("<Space>t");
    await waiter(() => glide.g.value).is("after send", "glide.keys.send() should trigger the 'j' keymap");
  });
});

add_task(async function test_keys_send_to_input_element() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("insert", "<C-k>", async () => {
      await glide.keys.send("hello");
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.focus();
      input.value = "";
    });
    await waiter(() => GlideBrowser.state.mode).is("insert");

    await keys("<C-k>");
    await until(() => glide.g.test_checked);

    is(
      await SpecialPowers.spawn(browser, [], async () =>
        content.document.getElementById<HTMLInputElement>("input-1")!.value),
      "hello",
      "glide.keys.send() should insert text into focused input element",
    );
  });
});

add_task(async function test_keys_send_accepts_glide_key() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.g.value = "before next";

      const key = await glide.keys.next();
      glide.g.value = "before send";

      await glide.keys.send(key);
      glide.g.test_checked = true;
    });

    glide.keymaps.set("normal", "j", () => {
      glide.g.value = "after send";
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("~");
    await waiter(() => glide.g.value).is("before next", "should wait for the next key");

    await keys("j");
    await until(() => glide.g.test_checked);

    is(glide.g.value, "after send", "glide.keys.send() should trigger the 'j' keymap");
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
    await keys("<Space>t");
    await waiter(() => glide.g.value).is(
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
    await keys("<Space>t");
    await waiter(() => GlideBrowser.state.mode).is("test_custom_mode", "we should switch to the custom mode");

    await keys("j");
    await waiter(() => glide.g.value).is(
      "from custom mode keymap",
      "the custom mode keymap callback should be invoked",
    );

    await glide.excmds.execute("mode_change normal");
  });
});

add_task(async function test_registering_mode_twice_results_in_an_error() {
  await GlideTestUtils.reload_config(function _() {
    glide.modes.register("normal", { caret: "block" });
  });

  const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-config-error"));

  ok(notification, "Error notification should be shown");
  is(
    // @ts-ignore
    notification.shadowRoot
      .querySelector(".message")
      .textContent.trim()
      .replaceAll(CONFIG_LINE_COL_REGEX, ":X:X"),
    "An error occurred while evaluating `register@chrome://glide/content/browser-api.mjs:X:X\n@glide.ts:1:13` - Error: The `normal` mode has already been registered. Modes can only be registered once",
    "Notification should contain error message",
  );
});

add_task(async function test_modes_list() {
  await GlideTestUtils.reload_config(function _() {
    glide.modes.register("test_custom_mode", { caret: "underline" });

    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.modes.list();
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("~");
    await until(() => glide.g.value);

    isjson(glide.g.value, [
      "normal",
      "visual",
      "ignore",
      "insert",
      "command",
      "op-pending",
      "hint",
      "test_custom_mode",
    ]);
  });
});

add_task(async function test_ctx_mode() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      glide.g.value = glide.ctx.mode;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>t");
    await waiter(() => glide.g.value).is(
      "normal",
      "the keymap should be invoked and set the value to the current mode",
    );
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
        void html`<div>${arg}</div>`;
      } catch (err) {
        glide.g.error_message = String(err);
      }
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>t");
    await waiter(() => glide.g.value).is("<!---->\n<div>foo</div>");
    is(
      glide.g.error_message,
      "Error: The html template function does not support interpolating arguments as escaping is not implemented.",
    );
  });
});

add_task(async function test_os() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    ok(glide.ctx.os, "glide.ctx.os is not empty");
    is(typeof glide.ctx.os, "string", "glide.ctx.os should be set to a string");
  });
});

add_task(async function test_options_get() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.yank_highlight_time = 50;

    glide.autocmds.create("UrlEnter", /input_test\.html/, () => {
      glide.bo.yank_highlight_time = 100;
    });
  });

  is(glide.options.get("yank_highlight_time"), 50, "global option should be retrieved correctly");

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await waiter(() => glide.options.get("yank_highlight_time")).is(100, "buffer option should be retrieved correctly");
  });
});

add_task(async function test_keys_parse() {
  const base: Omit<glide.KeyNotation, "key"> = { alt: false, ctrl: false, meta: false, shift: false };
  const parse = glide.keys.parse;
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
  } catch {
    ok(true, "Correctly handles <>");
  }
  try {
    parse("<X-a>");
    ok(false, "Should throw on invalid modifier");
  } catch {
    ok(true, "Correctly throws on invalid modifier");
  }
});

add_task(async function test_keymap_callback_receives_tab_id() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>i", ({ tab_id }) => {
      glide.g.value = tab_id;
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>i");
    await until(() => glide.g.test_checked);

    const active_tab = await glide.tabs.active();
    is(glide.g.value, active_tab.id, "Keymap callback should receive tab_id that matches the active tab ID");
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
    await waiter(() => glide.g.value).is(
      "Error: assert_never: impossible to call: \"value\"",
      "assert_never should throw an error",
    );
  });
});

add_task(async function test_ensure() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = ensure("foo");
  });

  is(glide.g.value, "foo", "ensure should return the value");

  await GlideTestUtils.reload_config(function _() {
    try {
      ensure(false);
    } catch (err) {
      glide.g.value = String(err);
    }
  });

  is(glide.g.value, "Error: Expected a truthy value, got `false`", "ensure should throw an error on falsy input");
});

add_task(async function test_hint_css_property_cleared_on_reload() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_size = "30px";
  });

  is(glide.o.hint_size, "30px");
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "30px",
    "setting hint_size should set a css variable",
  );

  await GlideTestUtils.reload_config(function _() {});

  is(glide.o.hint_size, "11px");
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "",
    "css var should be unset after config reload",
  );
});

add_task(async function test_bo_hint_size() {
  await GlideTestUtils.reload_config(function _() {
    glide.bo.hint_size = "30px";
  });

  is(glide.o.hint_size, "11px");
  is(glide.bo.hint_size, "30px");
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "30px",
    "setting bo.hint_size should set a css variable",
  );

  await GlideTestUtils.reload_config(function _() {});

  is(glide.o.hint_size, "11px");
  is(glide.bo.hint_size, undefined);
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "",
    "css var should be unset after config reload",
  );

  await GlideTestUtils.reload_config(function _() {
    glide.bo.hint_size = "30px";
  });
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "30px",
    "setting bo.hint_size should set a css variable",
  );

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    is(
      document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
      "",
      "Loading a new buffer should reset the hint size",
    );
  });
});

add_task(async function test_bo_hint_size__resets_to_custom_size() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_size = "20px";

    glide.autocmds.create("UrlEnter", /input_test/, () => {
      glide.bo.hint_size = "30px";
    });
  });

  is(glide.o.hint_size, "20px");
  is(glide.bo.hint_size, undefined);
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "20px",
    "setting o.hint_size should set a css variable",
  );

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    is(glide.bo.hint_size, "30px");
    is(
      document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
      "30px",
      "Loading the input_test buffer should set the hint size",
    );
  });

  is(glide.bo.hint_size, undefined);
  is(
    document.documentElement.style.getPropertyValue("--glide-hint-font-size"),
    "20px",
    "Leaving the input_test buffer should reset the hint size",
  );
});

add_task(async function test_add_excmd_while_commandline_is_cached() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    // open commandline so it is cached
    await GlideTestUtils.commandline.open();
    await waiter(() => glide.ctx.mode).is("command");

    await keys("<esc>");
    await waiter(() => glide.ctx.mode).is("normal");

    await GlideTestUtils.reload_config(function _() {
      glide.excmds.create({ name: "hello" }, () => {});
    });

    await keys(":hello");
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

    await keys("~");
    await waiter(() => glide.g.value).is(".contents {}");
  });
});

add_task(async function test_fs_read_file_not_found() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.read("notfound.css", "utf8").catch((e) => e);
      });
    });

    await keys("~");

    const value = await until(() => glide.g.value);

    ok(
      value instanceof GlideBrowser.config_sandbox.FileNotFoundError,
      "reading an undefined file results in a FileNotFoundError",
    );
    is(value.name, "FileNotFoundError");
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

    await keys("~");
    await waiter(() => glide.g.value).is(".contents {}");
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

    await keys("~");
    await waiter(() => glide.g.value).is("#id {}");
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

    await keys("~");
    await waiter(() => glide.g.value).is(true);

    glide.g.value = undefined;
    await IOUtils.remove(test_path);

    await keys("~");
    await waiter(() => glide.g.value).is(false);
  });
});

add_task(async function test_fs_stat() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    const test_path = PathUtils.join(PathUtils.profileDir, "glide", "test_file.txt");
    await IOUtils.writeUTF8(test_path, "test content");

    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.stat("test_file.txt");
      });
    });

    await keys("~");

    const result = await until(() => glide.g.value as glide.FileInfo | undefined);
    is(result.type, "file");
    is(typeof result.size, "number");
    is(typeof result.creation_time, "number");
    is(typeof result.last_accessed, "number");
    is(typeof result.last_modified, "number");
    is(typeof result.path, "string");

    await IOUtils.remove(test_path);
  });
});

add_task(async function test_fs_stat_directory() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    const test_path = PathUtils.join(PathUtils.profileDir, "glide", "test_file.txt");
    await IOUtils.writeUTF8(test_path, "test content");

    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        glide.g.value = await glide.fs.stat(glide.path.profile_dir);
      });
    });

    await keys("~");

    const result = await until(() => glide.g.value as glide.FileInfo | undefined);
    is(result.type, "directory");
    is(typeof result.size, "number");
    is(typeof result.creation_time, "number");
    is(typeof result.last_accessed, "number");
    is(typeof result.last_modified, "number");
    is(typeof result.path, "string");

    await IOUtils.remove(test_path);
  });
});

add_task(async function test_fs_stat_not_found() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async () => {
    await GlideTestUtils.reload_config(async function _() {
      glide.keymaps.set("normal", "~", async () => {
        await glide.fs.stat("nonexistent_file.txt").catch((err) => {
          glide.g.value = err;
        });
      });
    });

    await keys("~");

    const result = await until(() => glide.g.value as FileNotFoundError | undefined);
    is(result.name, "FileNotFoundError");
    ok(result.path.endsWith("nonexistent_file.txt"), "Error should include the path");
  });
});

add_task(async function test_path_cwd() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.cwd;
  });
  Assert.greater(glide.g.value.length, 0, "glide.path.cwd should not be empty");
});

add_task(async function test_path_home_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.home_dir;
  });
  Assert.greater(glide.g.value.length, 0, "glide.path.home_dir should not be empty");
});

add_task(async function test_path_profile_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.profile_dir;
  });
  Assert.greater(glide.g.value.length, 0, "glide.path.profile_dir should not be empty");
});

add_task(async function test_path_temp_dir() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.temp_dir;
  });
  Assert.greater(glide.g.value.length, 0, "glide.path.temp_dir should not be empty");
});

add_task(async function test_path_join() {
  await IOUtils.makeDirectory(PathUtils.join("/tmp", "foo", "bar"), { createAncestors: true, ignoreExisting: true });
  await IOUtils.writeUTF8(PathUtils.join("/tmp", "foo", "bar", "baz.txt"), "");

  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.path.join("/tmp", "foo", "bar", "baz.txt");
  });
  is(glide.g.value, "/tmp/foo/bar/baz.txt");

  await IOUtils.remove(PathUtils.join("/tmp", "foo", "bar", "baz.txt"));
});

add_task(async function test_env() {
  await GlideTestUtils.reload_config(function _() {
    glide.env.set("TEST_VAR", "test_value");
    glide.g.value = glide.env.get("TEST_VAR");
  });
  is(glide.g.value, "test_value");

  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.env.get("NONEXISTENT_VAR_XYZ123");
  });
  is(glide.g.value, null, "env.get() should return null for nonexistent variables");
});

add_task(async function test_env_delete() {
  await GlideTestUtils.reload_config(function _() {
    glide.env.set("DELETE_TEST_VAR", "to_be_deleted");
    glide.env.delete("DELETE_TEST_VAR");
    glide.g.value = glide.env.get("DELETE_TEST_VAR");
  });
  is(glide.g.value, null, "env.delete() should remove the environment variable");

  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.env.delete("NONEXISTENT_VAR_ABC789");
  });
  is(glide.g.value, null, "env.delete() should return null for nonexistent variables");
});

add_task(async function test_styles_add() {
  const visible_width = get_tabs_bar_width();

  await GlideTestUtils.reload_config(function _() {
    glide.styles.add(css`
      #TabsToolbar {
        visibility: collapse !important;
      }
    `);
  });
  Assert.less(get_tabs_bar_width(), visible_width, "applying the custom css should make the tabs toolbar smaller");

  await GlideTestUtils.reload_config(function _() {});

  is(
    get_tabs_bar_width(),
    visible_width,
    "reloading the config without the custom css should revert the tabs toolbar to the previous width",
  );
});

add_task(async function test_styles_add_duplicate_id() {
  await GlideTestUtils.reload_config(function _() {
    glide.styles.add(`#TabsToolbar {}`, { id: "my-styles" });

    try {
      glide.styles.add(`#TabsToolbar {}`, { id: "my-styles" });
    } catch (error) {
      glide.g.value = error;
    }
  });

  await waiter(() => glide.g.value).ok();

  is((glide.g.value as Error).message, "A style element has already been registered with ID 'my-styles'");
});

add_task(async function test_styles_add_duplicate_id_does_not_apply_styles() {
  const visible_width = get_tabs_bar_width();

  await GlideTestUtils.reload_config(function _() {
    // empty placeholder
    glide.styles.add(`#TabsToolbar {}`, { id: "my-styles" });

    try {
      // actually do the thing in this one, which should fail and not be applied
      glide.styles.add(
        css`
          #TabsToolbar {
            visibility: collapse !important;
          }
        `,
        { id: "my-styles" },
      );
    } catch {
      // expected
    }
  });

  is(get_tabs_bar_width(), visible_width, "duplicate style call should not apply styles");
});

add_task(async function test_styles_remove() {
  const visible_width = get_tabs_bar_width();

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "!", () => {
      glide.styles.add(
        css`
          #TabsToolbar {
            visibility: collapse !important;
          }
        `,
        { id: "my-id" },
      );
    });
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.styles.remove("my-id");
    });
  });

  // run the test multiple times to ensure that the same style can be added and removed multiple times
  for (let i = 0; i < 2; i++) {
    await keys("!");
    Assert.less(
      get_tabs_bar_width(),
      visible_width,
      `applying the custom css should make the tabs toolbar smaller (i=${i})`,
    );

    await keys("~");

    is(
      get_tabs_bar_width(),
      visible_width,
      `removing the custom css should revert the tabs toolbar to the previous width (i=${i})`,
    );
    is(glide.g.value, true, `remove() should return \`true\` as the styles were removed (i=${i})`);
  }
});

add_task(async function test_styles_has() {
  const visible_width = get_tabs_bar_width();

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "!", () => {
      glide.styles.add(
        css`
          #TabsToolbar {
            visibility: collapse !important;
          }
        `,
        { id: "my-id" },
      );
    });
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.styles.has("my-id");
      glide.styles.remove("my-id");
    });
    glide.keymaps.set("normal", "0", () => {
      glide.g.value = glide.styles.has("my-id");
    });
  });

  await keys("0");
  is(glide.g.value, false, `glide.styles.has() should return \`false\` when the styles have not been added yet`);

  await keys("!");
  Assert.less(get_tabs_bar_width(), visible_width, `applying the custom css should make the tabs toolbar smaller`);

  await keys("~");

  is(
    get_tabs_bar_width(),
    visible_width,
    `removing the custom css should revert the tabs toolbar to the previous width`,
  );
  is(glide.g.value, true, `glide.styles.has() should return \`true\` when the styles are added`);
});

add_task(async function test_styles_remove_unknown_id() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.value = glide.styles.remove("my-styles");
  });
  await waiter(() => glide.g.value).is(false);
});

function get_tabs_bar_width(): number {
  const element = document.getElementById("TabsToolbar")!;
  return element.getBoundingClientRect().width!;
}
