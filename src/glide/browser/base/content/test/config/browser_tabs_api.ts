// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {
    // empty placeholder config file
  });
});

add_task(async function test_tabs_active() {
  await GlideTestUtils.reload_config(function _() {
    const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

    glide.keymaps.set("normal", "<Space>n", async () => {
      const tab = await glide.tabs.active();
      assert(tab.url, INPUT_TEST_URI);

      const tabs: Browser.Tabs.Tab[] = [];
      const windows: Browser.Windows.Window[] = [];

      try {
        tabs.push(await browser.tabs.create({}));
        tabs.push(await browser.tabs.create({}));
        tabs.push(await browser.tabs.create({}));
        tabs.push(await browser.tabs.create({}));

        // active tab should still be the first one
        assert((await glide.tabs.active()).url, INPUT_TEST_URI);

        const all_windows = await browser.windows.getAll();
        const current_window = all_windows.find(w => w.focused)!;

        windows.push(await browser.windows.create());

        await browser.windows.update(current_window.id!, { focused: true });

        // active tab should still be the first one
        assert((await glide.tabs.active()).url, INPUT_TEST_URI);
      } finally {
        await browser.tabs.remove(tabs.map(tab => tab.id).filter(Boolean));
        for (const window of windows) {
          await browser.windows.remove(window.id!);
        }
      }

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    is(gBrowser.selectedBrowser?.currentURI.spec, INPUT_TEST_URI);

    await keys("<Space>n");
    await waiter(() => glide.g.test_checked).ok();
  });
});

add_task(async function test_tabs_get_first() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>f", async () => {
      assert(await glide.tabs.get_first({ title: "Test for auto mode switching" }));

      const missing_tab = await glide.tabs.get_first({ title: "Title doesn't exist in any tab at all" });
      assert(missing_tab === undefined);

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>f");
    await waiter(() => glide.g.test_checked).ok();
  });
});

add_task(async function test_tabs_query() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "<Space>f", async () => {
      let tabs = await glide.tabs.query({ title: "Test for auto mode switching" });
      assert(tabs.length > 0);

      tabs = await glide.tabs.query({ title: "Title doesn't exist in any tab at all" });
      assert(tabs.length === 0);

      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await keys("<Space>f");
    await waiter(() => glide.g.test_checked).ok();
  });
});
