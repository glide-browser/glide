// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

declare global {
  interface GlideGlobals {
    /** set this at the end of a config-defined function to verify it was invoked */
    test_checked?: boolean;
  }
}

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {
    // empty placeholder config file
  });
});

add_task(async function test_tabs_functions() {
  await GlideTestUtils.reload_config(function _() {
    var i = 0;

    browser.tabs.onCreated.addListener(async () => {
      i++;
      assert(i <= 3, "this listener is still being called!");
    });

    glide.keymaps.set("normal", "<Space>n", async () => {
      await browser.tabs.create({ active: true, url: "about:blank" });
    });

    glide.keymaps.set("normal", "<Space>d", async () => {
      assert(i === 2, `Expected tab creation listener to have been called twice - got ${i}`);
      const tab = (await browser.tabs.query({})).find(tab => tab.url === "about:blank");
      assert(tab?.id, "no tab id");
      await browser.tabs.remove(tab.id);
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    is(gBrowser.selectedBrowser?.currentURI.spec, INPUT_TEST_URI);

    await keys("<Space>n");
    await waiter(() => gBrowser.selectedBrowser?.currentURI.spec).is("about:blank");

    await keys("<Space>d");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });

  // reload a new config file that doesn't include the event listener defined earlier
  // and spawn a bunch of tabs to trigger it if the listener is still registered
  await GlideTestUtils.reload_config(function _() {
    //
  });
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {});

  // ensure event listeners can be added after reloading
  await GlideTestUtils.reload_config(function _() {
    var i = 0;

    browser.tabs.onCreated.addListener(async () => {
      i++;
    });

    glide.keymaps.set("normal", "<Space>n", async () => {
      if (i !== 1) {
        throw new Error(`Expected tab creation listener to have been called once - got ${i}`);
      }
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    is(gBrowser.selectedBrowser?.currentURI.spec, INPUT_TEST_URI);
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);
  });
});

add_task(async function test_dns() {
  await GlideTestUtils.reload_config(function _() {
    browser.dns.resolve("example.com").then(r => {
      assert(r.addresses.length, "no DNS addresses resolved");
    });
  });
});

add_task(async function test_css_injection() {
  await GlideTestUtils.reload_config(function _() {
    var css_injection = { target: { tabId: 1 }, css: `body { border: 20px dotted pink; }` };
    var has_css_injection = false;

    glide.keymaps.set("normal", "<Space>n", async () => {
      if (has_css_injection) {
        await browser.scripting.removeCSS(css_injection);
      } else {
        const tab = (await browser.tabs.query({ active: true }))[0];
        assert(tab?.id, "no active tab");
        css_injection.target.tabId = tab.id;
        await browser.scripting.insertCSS(css_injection);
      }
      has_css_injection = !has_css_injection;

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);
    GlideBrowser.api.g.test_checked = undefined;

    var border_style = await SpecialPowers.spawn(browser, [], async () => {
      const styles = content.window.getComputedStyle(content.document.body!)!;
      return styles.border;
    });
    is(border_style, "20px dotted rgb(255, 192, 203)");

    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);
    GlideBrowser.api.g.test_checked = undefined;

    var border_style = await SpecialPowers.spawn(browser, [], async () => {
      const styles = content.window.getComputedStyle(content.document.body!)!;
      return styles.border;
    });
    is(border_style, "0px rgb(0, 0, 0)");
  });
});

add_task(async function test_script_injection() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>n", async () => {
      await browser.tabs.executeScript({ code: `document.body.style.border = "20px dotted pink"` });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);

    const border_style = await SpecialPowers.spawn(browser, [], async () => content.document.body!.style.border);
    is(border_style, "20px dotted pink");
  });
});

add_task(async function test_contextual_identities() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>c", async () => {
      const containers = await browser.contextualIdentities.query({});
      assert(containers && containers.length);

      const first_container = containers[0];
      assert(first_container && first_container.name && first_container.icon);

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>c");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_search_engines() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>s", async () => {
      const engines = await browser.search.get();
      assert(engines && engines.length, "no search engines found");

      const default_engine = engines.find(engine => engine.isDefault);
      assert(default_engine && default_engine.name, "Default search engine missing/incomplete");
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>s");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_error_handling_for_unsupported_apis() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>e", async () => {
      try {
        // Try to access a non-existent API
        // @ts-ignore - intentionally testing an invalid API
        await browser.nonExistentApi.someMethod();
        throw new Error("Should have thrown for non-existent API");
      } catch (e) {
        // Expected error
        if (!(e as Error).message.includes("nonExistentApi")) {
          throw new Error(`Unexpected error message: ${(e as Error).message}`);
        }
      }
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>e");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_bookmarks_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>b", async () => {
      const folder = await browser.bookmarks.create({ title: "Glide Test Folder", type: "folder" });
      await browser.bookmarks.create({ title: "Glide Test Bookmark", url: "https://example.com", parentId: folder.id });

      const results = await browser.bookmarks.search({ title: "Glide Test Bookmark" });
      assert(results.length && results[0]!.url === "https://example.com/");

      await browser.bookmarks.removeTree(folder.id);
      const after_cleanup = await browser.bookmarks.search({ title: "Glide Test Bookmark" });
      assert(after_cleanup.length === 0, "Failed to remove test bookmarks");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>b");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_history_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>h", async () => {
      const testUrl = "https://example.com/glide-test-" + Date.now();
      await browser.history.addUrl({ url: testUrl });

      const results = await browser.history.search({ text: testUrl, maxResults: 1 });
      assert(results.length && results[0]!.url === testUrl);

      await browser.history.deleteUrl({ url: testUrl });
      const after_cleanup = await browser.history.search({ text: testUrl, maxResults: 1 });
      assert(after_cleanup.length === 0, "Failed to remove history entries");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>h");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_permissions_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>p", async () => {
      await browser.permissions.contains({ permissions: ["geolocation"] });

      const permission_status = await browser.permissions.contains({ permissions: ["geolocation"] });
      assert(typeof permission_status === "boolean");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>p");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_runtime_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>p", async () => {
      const manifest = await browser.runtime.getManifest();
      assert(typeof manifest === "object" && manifest);
      assert(manifest.name === "Glide Internal");
      assert(typeof ((await browser.runtime.getURL("/foo")) === "string"));

      const platform_info = await browser.runtime.getPlatformInfo();
      assert(platform_info && platform_info.os);

      const browser_info = await browser.runtime.getBrowserInfo();
      assert(browser_info && browser_info.name && browser_info.vendor);
      todo_assert(browser_info.name === "Glide");
      assert(browser_info.vendor === "Glide");

      await glide.content.execute((parent_runtime_id: string) => {
        if (browser.runtime.id !== parent_runtime_id) {
          throw new Error("runtime ID in the parent and content frames are different");
        }
      }, { tab_id: await glide.tabs.active(), args: [browser.runtime.id] });

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>p");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_notifications_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>n", async () => {
      const notification_id = await browser.notifications.create({
        type: "basic",
        title: "Glide Test",
        message: "This is a test notification",
        iconUrl: "chrome://branding/content/icon32.png",
      });
      assert(notification_id, "Failed to create notification");

      await browser.notifications.clear(notification_id);
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>n");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_storage_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>s", async () => {
      await browser.storage.local.set({ testKey: "testValue", complexData: { nested: true, count: 42 } });

      const result = await browser.storage.local.get([
        "testKey",
        "complexData",
      ]);

      assert(result["testKey"] === "testValue", "Storage data doesn't match what was stored");
      assert((result["complexData"] as any)?.nested, "Nested data not stored correctly");
      assert((result["complexData"] as any)?.count === 42, "Count value not stored correctly");

      await browser.storage.local.remove(["testKey", "complexData"]);

      const after_cleanup = await browser.storage.local.get([
        "testKey",
        "complexData",
      ]);
      assert(Object.keys(after_cleanup).length === 0, "Failed to remove storage items");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>s");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_downloads_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>d", async () => {
      const download_id = await browser.downloads.download({
        url: "https://example.com/favicon.ico",
        filename: "glide-test-download.ico",
        conflictAction: "uniquify",
      });
      assert(typeof download_id === "number", "Expected numeric download ID");

      const downloads = await browser.downloads.search({ id: download_id });

      assert(downloads.length > 0, "Could not find the download");

      await browser.downloads.cancel(download_id);
      await browser.downloads.erase({ id: download_id });

      const after_erase = await browser.downloads.search({ id: download_id });
      assert(after_erase.length === 0, "Download was not properly erased");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>d");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_cookies_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>c", async () => {
      const test_cookie = {
        name: "GlideTestCookie",
        value: "TestValue",
        url: "https://example.com/",
        path: "/",
        secure: true,
        httpOnly: false,
        expirationDate: Date.now() / 1000 + 3600,
      };

      await browser.cookies.set(test_cookie);

      const cookie = await browser.cookies.get({ name: "GlideTestCookie", url: "https://example.com/" });

      assert(cookie && cookie.value === "TestValue", "Cookie was not set correctly");

      await browser.cookies.remove({ name: "GlideTestCookie", url: "https://example.com/" });

      const after_remove = await browser.cookies.get({ name: "GlideTestCookie", url: "https://example.com/" });

      assert(!after_remove, "Cookie was not properly removed");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>c");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_windows_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>w", async () => {
      const current_window = await browser.windows.getCurrent();
      assert(current_window && typeof current_window.id === "number", "Failed to get current window");

      const all_windows = await browser.windows.getAll();
      assert(Array.isArray(all_windows) && all_windows.length, "Failed to get all windows");

      const found_window = all_windows.find(w => w.id === current_window.id);
      assert(found_window, "Current window not found in getAll results");

      await browser.windows.update(current_window.id, { focused: true });

      const updated_window = await browser.windows.get(current_window.id);
      assert(updated_window.focused, "Window update did not work as expected");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>w");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_webRequest_api() {
  await GlideTestUtils.reload_config(function _() {
    let request_captured = false;

    const filter = { urls: ["*://example.com/*"] };

    browser.webRequest.onBeforeRequest.addListener(details => {
      if (details.url.includes("example.com")) {
        request_captured = true;
      }
      return {}; // Don't block the request
    }, filter);

    glide.keymaps.set("normal", "<Space>w", async () => {
      const tab = await browser.tabs.create({ url: "https://example.com/", active: true });

      // Wait a bit for the request to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      assert(request_captured, "Web request was not captured by listener");

      // Clean up
      if (tab.id) {
        await browser.tabs.remove(tab.id);
      }

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>w");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_sessions_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>s", async () => {
      const recently_closed = await browser.sessions.getRecentlyClosed();
      assert(Array.isArray(recently_closed), "Expected array of recently closed sessions");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>s");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_i18n_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>i", async () => {
      const message = await browser.i18n.getMessage("@@ui_locale");
      assert(typeof message === "string", "Expected string from getMessage");

      const languages = await browser.i18n.getAcceptLanguages();
      assert(Array.isArray(languages) && languages.length, "Expected non-empty array from getAcceptLanguages");

      const detection = await browser.i18n.detectLanguage("Hello world");
      assert(detection?.languages?.length, "Expected language detection results");
      assert(typeof detection.isReliable === "boolean", "Expected boolean for isReliable property");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>i");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_theme_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>t", async () => {
      const theme = { colors: { frame: "#FFFFFF", toolbar: "#F0F0F0", toolbar_text: "#000000" } };
      await browser.theme.update(theme);

      const current = await browser.theme.getCurrent();
      assert(current && current.colors);

      // Check if at least one of our colors was applied
      assert(
        current.colors.toolbar === theme.colors.toolbar
          || current.colors.frame === theme.colors.frame
          || current.colors.toolbar_text === theme.colors.toolbar_text,
        "Theme colors don't match what was set",
      );

      await browser.theme.reset();
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>t");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
});

add_task(async function test_identity_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>i", async () => {
      const id = browser.runtime.id;
      assert(typeof id === "string");

      const redirect_url = await browser.identity.getRedirectURL();
      assert(typeof redirect_url === "string");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>i");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
});

add_task(async function test_function_script_injection() {
  // -------------------- arrow function -------------------
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = (await browser.tabs.query({ active: true }))[0];
      assert(tab?.id, "no active tab");

      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document?.body?.style.setProperty("border", "5px solid green");
        },
      });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);

    const border_style = await SpecialPowers.spawn(browser, [], async () => content.document.body!.style.border);
    is(border_style, "5px solid green", "method call with no args");
  });

  // -------------------- with args -------------------

  await GlideTestUtils.reload_config(function _() {
    const BODY_STYLE = "5px solid red";
    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = (await browser.tabs.query({ active: true }))[0];
      assert(tab?.id, "no active tab");

      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        // @ts-ignore
        func: BODY_STYLE => {
          document?.body?.style.setProperty("border", BODY_STYLE as string);
        },
        args: [BODY_STYLE],
      });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);

    const border_style = await SpecialPowers.spawn(browser, [], async () => content.document.body!.style.border);
    is(border_style, "5px solid red", "method call with args");
  });

  // -------------------- function syntax -------------------
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = (await browser.tabs.query({ active: true }))[0];
      assert(tab?.id, "no active tab");

      function content() {
        document?.body?.style.setProperty("border", "5px solid green");
      }
      await browser.scripting.executeScript({ target: { tabId: tab.id }, func: content });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);

    const border_style = await SpecialPowers.spawn(browser, [], async () => content.document.body!.style.border);
    is(border_style, "5px solid green", "function syntax with no args");
  });

  // -------------------- function syntax with args -------------------
  await GlideTestUtils.reload_config(function _() {
    const BODY_STYLE = "5px solid red";
    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = (await browser.tabs.query({ active: true }))[0];
      assert(tab?.id, "no active tab");

      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        // @ts-ignore
        func: function _(BODY_STYLE) {
          document?.body?.style.setProperty("border", BODY_STYLE as string);
        },
        args: [BODY_STYLE],
      });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);

    const border_style = await SpecialPowers.spawn(browser, [], async () => content.document.body!.style.border);
    is(border_style, "5px solid red", "method call with args");
  });

  // -------------------- error handling -------------------

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = (await browser.tabs.query({ active: true }))[0];
      assert(tab?.id, "no active tab");

      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          throw new Error("this promise should be rejected");
        },
      });
      assert(results.length === 1, `expected 1 result, got ${results.length}`);

      const result = results[0];
      assert(result?.error, "expected result.error to be set");

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>n");
    await until(() => GlideBrowser.api.g.test_checked);
  });
});

add_task(async function test_runtime_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>r", async () => {
      browser.runtime.onMessage.addListener((...args: any[]) => {
        console.log({ args });
        throw new Error("yoooooo");
      });

      // Test sending a message to ourselves
      const response = await browser.runtime.sendMessage({ greeting: "hello" });

      // Either we got a response or the expected error
      if (response !== "expected error" && typeof response === "undefined") {
        throw new Error("Expected either a response or the expected error");
      }

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>r");
    await waiter(() => GlideBrowser.api.g.test_checked).ok("the handler was correctly invoked");
  });
}).skip();

add_task(async function test_commands_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>c", async () => {
      // Get all commands
      // TODO(glide): `.commands` is not defined
      const commands = await browser.commands.getAll();

      if (!Array.isArray(commands)) {
        throw new Error("Expected array from commands.getAll");
      }

      // Test that we can access command properties
      for (const command of commands) {
        if (typeof command.name !== "string") {
          throw new Error("Expected command to have a name property");
        }

        // Shortcut might be undefined if not set
        if (
          command.shortcut !== undefined
          && typeof command.shortcut !== "string"
        ) {
          throw new Error("Expected command shortcut to be a string or undefined");
        }
      }

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>c");
    await waiter(() => GlideBrowser.api.g.test_checked).ok();
  });
}).skip();

add_task(async function test_sidebarAction_api() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>s", async () => {
      await browser.sidebarAction.setTitle({ title: "Glide Test Sidebar" });

      const title = await browser.sidebarAction.getTitle({});
      if (title !== "Glide Test Sidebar") {
        throw new Error("Sidebar title was not set correctly");
      }

      await browser.sidebarAction.open();

      const isOpen = await browser.sidebarAction.isOpen({});
      if (!isOpen) {
        throw new Error("Sidebar should be open");
      }

      await browser.sidebarAction.close();

      const isClosed = !(await browser.sidebarAction.isOpen({}));
      if (!isClosed) {
        throw new Error("Sidebar should be closed");
      }

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>s");
    await until(() => GlideBrowser.api.g.test_checked);
    // The assertions are in the config
  });
}).skip();
