// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document;
declare var content: TestContent;

add_task(async function test_executeScript__restricted_domain() {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.webextensions.restrictedDomains", "example.com"]],
  });

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async ({ tab_id }) => {
      const results = await browser.scripting.executeScript({
        world: "MAIN",
        func() {
          document.body!.setAttribute("data-test-marker", "executed");
          return document.body!.textContent!.trim();
        },
        target: { tabId: tab_id },
      });
      glide.g.value = results[0]?.result;
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(
    "http://example.com/browser/docshell/test/browser/dummy_page.html",
    async browser => {
      await keys("~");
      await waiter(() => glide.g.test_checked).ok();

      const marker = await SpecialPowers.spawn(browser, [], () =>
        content.document.body!.getAttribute("data-test-marker"));
      is(marker, "executed", "Script should execute on webextensions restricted domain example.com");

      is(glide.g.value, "just a dummy html file", "script return values should be propagated");
    },
  );
});

add_task(async function test_contentScript_uriFilters__restricted_domain() {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.webextensions.restrictedDomains", "example.com"]],
  });

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await browser.contentScripts.register({
        matches: ["*://example.com/*"],
        runAt: "document_idle",
        js: [{ code: `document.body.setAttribute("data-content-script", "injected");` }],
      });
      await browser.contentScripts.register({
        matches: ["*://should-not-match.com/*"],
        runAt: "document_idle",
        js: [{ code: `document.body.setAttribute("data-content-script2", "injected");` }],
      });
      glide.g.test_checked = true;
    });
  });

  await until(() => glide.g.test_checked);

  await BrowserTestUtils.withNewTab(
    "http://example.com/browser/docshell/test/browser/dummy_page.html",
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        await ContentTaskUtils.waitForCondition(
          () => content.document.body!.getAttribute("data-content-script") === "injected",
          "Content script should inject on restricted domain via URI filter",
        );
      });

      const second_marker = await SpecialPowers.spawn(browser, [], () =>
        content.document.body!.getAttribute("data-content-script2"));
      is(second_marker, null, "Second content script should not inject because the URI does not match");
    },
  );

  // cleanup
  await GlideTestUtils.reload_config(function _() {});
});

add_task(async function test_tabs_create__resource_url() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await browser.tabs.create({ url: "resource://glide-docs/index.html#default-keymappings" });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab("http://example.com/browser/docshell/test/browser/dummy_page.html", async () => {
    const initial_tab_count = gBrowser.tabs.length;

    await keys("~");
    await waiter(() => glide.g.test_checked).ok();

    is(gBrowser.tabs.length, initial_tab_count + 1, "A new tab should be created");

    const tab = await until(
      async () => await glide.tabs.get_first({ url: "resource://glide-docs/index.html*" }),
      "Tab with resource://glide-docs URL should exist",
    );
    ok(tab);

    await GlideBrowser.browser_proxy_api.tabs.remove(tab.id!);
  });
});

add_task(async function test_tabs_create__about_url() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await browser.tabs.create({ url: "about:config" });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab("http://example.com/browser/docshell/test/browser/dummy_page.html", async () => {
    const initial_tab_count = gBrowser.tabs.length;

    await keys("~");
    await waiter(() => glide.g.test_checked).ok();

    is(gBrowser.tabs.length, initial_tab_count + 1, "A new tab should be created");

    const tab = await until(
      async () => await glide.tabs.get_first({ url: "about:config" }),
      "Tab with about:config URL should exist",
    );
    ok(tab);

    await GlideBrowser.browser_proxy_api.tabs.remove(tab.id!);
  });
});

add_task(async function test_tabs_update__resource_url() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async ({ tab_id }) => {
      await browser.tabs.update(tab_id, { url: "resource://glide-docs/index.html#default-keymappings" });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab("http://example.com/browser/docshell/test/browser/dummy_page.html", async () => {
    const initial_tab_count = gBrowser.tabs.length;

    await keys("~");
    await waiter(() => glide.g.test_checked).ok();

    is(gBrowser.tabs.length, initial_tab_count, "No new tabs should be created");

    const tab = await until(
      async () => await glide.tabs.get_first({ url: "resource://glide-docs/index.html*" }),
      "Active tab should be updated to resource://glide-docs URL",
    );
    ok(tab, "Tab should have navigated to privileged resource:// URL");
  });
});
