// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI_1 = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
const TEST_URI_2 = "http://example.com/";

add_task(async function test_split_views() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const tabs = (await glide.tabs.query({})) as Tuple<Browser.Tabs.Tab, 4>;

      glide.g.value = glide.unstable.split_views.create([tabs[1], tabs[2]]);
      await new Promise(resolve => setTimeout(resolve, 100));

      assert(glide.unstable.split_views.has_split_view(tabs[1]));
      assert(glide.unstable.split_views.has_split_view(tabs[2]));
      assert(!glide.unstable.split_views.has_split_view(tabs[3]));

      for (const getter of [glide.g.value.id, tabs[1].id, tabs[1]]) {
        const splitview = glide.unstable.split_views.get(getter);
        assert(splitview, `split_views.get() should return for ${getter}`);
        assert(splitview.id === glide.g.value.id);
        assert(splitview.tabs.length === 2);
        assert(splitview.tabs[0]!.id === tabs[1].id);
        assert(splitview.tabs[1]!.id === tabs[2].id);
      }

      glide.unstable.split_views.separate(tabs[1]);

      assert(!glide.unstable.split_views.has_split_view(tabs[1]));
      assert(!glide.unstable.split_views.has_split_view(tabs[2]));
      assert(!glide.unstable.split_views.has_split_view(tabs[3]));

      glide.g.test_checked = true;
    });
  });

  using _tab1 = await GlideTestUtils.new_tab(TEST_URI_1);
  using _tab2 = await GlideTestUtils.new_tab(TEST_URI_2);
  using _tab3 = await GlideTestUtils.new_tab(TEST_URI_2);

  await keys("~");
  await until(() => glide.g.test_checked, "Split view created successfully");

  const splitview = glide.g.value as glide.SplitView;
  is(typeof splitview.id, "string");
  isjson(splitview.tabs.map((tab) => tab.id), [3, 4]);
  isjson(splitview.tabs.map((tab) => tab.url), [TEST_URI_1, TEST_URI_2]);
});

add_task(async function test_create_split_view_tab_ids() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const tabs = (await glide.tabs.query({})) as Tuple<Browser.Tabs.Tab, 4>;

      glide.unstable.split_views.create([tabs[1].id!, tabs[2].id!]);
      await new Promise(resolve => setTimeout(resolve, 100));

      assert(glide.unstable.split_views.has_split_view(tabs[1]));
      assert(glide.unstable.split_views.has_split_view(tabs[2]));
      assert(!glide.unstable.split_views.has_split_view(tabs[3]));

      glide.g.test_checked = true;
    });
  });

  using _tab1 = await GlideTestUtils.new_tab(TEST_URI_1);
  using _tab2 = await GlideTestUtils.new_tab(TEST_URI_2);
  using _tab3 = await GlideTestUtils.new_tab(TEST_URI_2);

  await keys("~");
  await until(() => glide.g.test_checked, "Split view created successfully with tab IDs");
});

add_task(async function test_create_split_view_custom_id() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const tabs = (await glide.tabs.query({})) as Tuple<Browser.Tabs.Tab, 4>;

      const splitview_tabs = [tabs[1].id!, tabs[2].id!];
      const splitview = glide.unstable.split_views.create(splitview_tabs, { id: "my-splitview" });
      assert(splitview.id === "my-splitview");
      await new Promise(resolve => setTimeout(resolve, 100));

      assert(glide.unstable.split_views.get("my-splitview"));

      try {
        glide.unstable.split_views.create(splitview_tabs, { id: "my-splitview" });
      } catch (err) {
        glide.g.value = err;
      }

      glide.unstable.split_views.separate(splitview.id);
      glide.g.test_checked = true;
    });
  });

  using _tab1 = await GlideTestUtils.new_tab(TEST_URI_1);
  using _tab2 = await GlideTestUtils.new_tab(TEST_URI_2);
  using _tab3 = await GlideTestUtils.new_tab(TEST_URI_2);

  await keys("~");
  await until(() => glide.g.test_checked, "Split view created with custom ID");

  is(String(glide.g.value), "Error: Could not create a splitview; The 'my-splitview' ID is already in use");
});

add_task(async function test_create_split_view_with_pinned_tab() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const tabs = (await glide.tabs.query({})) as Tuple<Browser.Tabs.Tab, 4>;

      await browser.tabs.update(tabs[1].id, { pinned: true });

      try {
        glide.unstable.split_views.create([tabs[1].id!, tabs[2].id!]);
      } catch (err) {
        glide.g.value = err;
      }

      glide.g.test_checked = true;
    });
  });

  using _tab1 = await GlideTestUtils.new_tab(TEST_URI_1);
  using _tab2 = await GlideTestUtils.new_tab(TEST_URI_2);
  using _tab3 = await GlideTestUtils.new_tab(TEST_URI_2);

  await keys("~");
  await until(() => glide.g.test_checked, "Test to finish");

  is(String(glide.g.value), "Error: Could not create a splitview; Is one of the tabs pinned?");
});
