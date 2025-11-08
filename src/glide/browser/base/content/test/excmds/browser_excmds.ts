// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

add_setup(async function setup() {
  await GlideTestUtils.reload_config(function _() {});
});

const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
const SCROLL_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/excmds/scroll_test.html";

function current_url() {
  return gBrowser.selectedBrowser?.currentURI.spec;
}

add_task(async function test_tab_switching() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, INPUT_TEST_FILE + "?i=0");
  await BrowserTestUtils.browserLoaded(browser);
  let second_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, INPUT_TEST_FILE + "?i=1");
  let third_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, INPUT_TEST_FILE + "?i=2");

  is(current_url(), INPUT_TEST_FILE + "?i=2");

  await keys("<C-j>");
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_next wraps around");

  await keys("<C-j>");
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_next advances forward once");

  await keys("<C-k>");
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_prev moves backward once");

  await keys("<C-k>");
  is(current_url(), INPUT_TEST_FILE + "?i=2", "tab_prev wraps back around");

  BrowserTestUtils.removeTab(second_tab);
  BrowserTestUtils.removeTab(third_tab);
});

add_task(async function test_tab_close() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.mapleader = "<Space>";
  });
  let second_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, INPUT_TEST_FILE + "?i=1");
  let third_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, INPUT_TEST_FILE + "?i=2");

  is(current_url(), INPUT_TEST_FILE + "?i=2");

  await keys(" d");
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_close moves backwards");

  await keys(".");
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_close moves backwards");

  BrowserTestUtils.removeTab(second_tab);
  BrowserTestUtils.removeTab(third_tab);
});

add_task(async function test_scrolling() {
  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async browser => {
    async function get_scroll(): Promise<[number, number]> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return [content.window.scrollX, content.window.scrollY];
      });
    }

    const max_y = await SpecialPowers.spawn(browser, [], async () => {
      return content.window.scrollMaxY;
    });

    await vertical_scroll_tests({ min_y: 0, max_y, get_scroll });
  });

  await horizontal_scroll_tests(SCROLL_TEST_FILE);
});

add_task(async function test_scrolling_pdf() {
  await BrowserTestUtils.withNewTab(
    "http://mochi.test:8888/browser/toolkit/components/pdfjs/test/file_pdfjs_test.pdf",
    async browser => {
      async function get_scroll(): Promise<[number, number]> {
        return await SpecialPowers.spawn(browser, [], async () => {
          const container = content.document.getElementById("viewerContainer")!;
          return [container.scrollLeft, container.scrollTop];
        });
      }

      const { max_y, min_y } = await SpecialPowers.spawn(browser, [], async () => {
        const container = content.document.getElementById("viewerContainer")!;
        return { max_y: container.scrollTopMax, min_y: container.scrollTop };
      });

      await vertical_scroll_tests({
        min_y,
        max_y,
        get_scroll,
        // for some reason, G goes *almost* to the actual bottom of the PDF
        // I *think* this is a Firefox/PDF.js bug but I haven't investigated deeply
        G_wip: true,
      });
    },
  );
});

async function vertical_scroll_tests(
  { min_y, max_y, get_scroll, G_wip }: {
    min_y: number;
    max_y: number;
    get_scroll(): Promise<[number, number]>;
    G_wip?: boolean;
  },
) {
  const interval = 50;

  var min_x = 0;

  var [x, y] = await get_scroll();
  is(x, min_x);
  is(y, min_y);

  var curr_x = 0;

  var last_y = min_y;

  await keys("<C-d>");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-d> should retain the x position`);
  Assert.greater(y, last_y, `<C-d> should increase y (last=${last_y}, y=${y})`);

  last_y = y;

  await keys("<C-d>");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-d> should retain the x position`);
  Assert.greater(y, last_y, `Second <C-d> should increase y (last=${last_y}, y=${y})`);

  await keys("<C-u>");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-u> should retain the x position`);
  is(y, last_y, `<C-u> should decrease y to the previous <C-d>`);

  await keys("<C-u>");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-u> should retain the x position`);
  is(y, min_y, `Second <C-u> should decrease y to the minimum`);

  await keys("gg");
  var [x, y] = await get_scroll();

  // Test j scrolls down
  await keys("j");
  await sleep_frames(interval);
  var [x, new_y] = await get_scroll();
  Assert.greater(new_y, y, `j should scroll down`);

  // Test k scrolls up
  await keys("k");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  Assert.lessOrEqual(y, min_y, `k should scroll back up`);

  await keys("G");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `G should retain the x position`);
  if (G_wip) {
    todo_is(y, max_y, `G should go to the max y`);
  } else {
    Assert.greaterOrEqual(y, max_y, `G should go to the max y`);
  }

  await keys("gg");
  await sleep_frames(interval);
  var [x, y] = await get_scroll();
  is(x, curr_x, `gg should retain the x position`);
  is(y, min_y, `gg should go to the minimum y`);
}

async function horizontal_scroll_tests(url: string) {
  await BrowserTestUtils.withNewTab(url, async browser => {
    async function get_x(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return content.window.scrollX;
      });
    }

    var min_x = 0;

    var x = await get_x();
    is(x, min_x);

    for (let i = 0; i < 10; i++) {
      await keys("l");
    }
    // ensure we give enough frame time to complete the horizontal scroll
    // TODO(glide): better solution for this
    await sleep_frames(100);

    var curr_x = await get_x();
    isnot(curr_x, 0, `repeated \`l\` should move the scroll x position`);

    // Test h scrolls left
    for (let i = 0; i < 10; i++) {
      await keys("h");
    }
    await sleep_frames(100);
    var new_x = await get_x();
    is(new_x, min_x, `h should scroll to the left edge`);
  });
}

add_task(async function test_gi_focuses_last_used_input() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.focus();
    });
    await sleep_frames(100);

    await wait_for_mode("insert");

    await keys("hello");

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1")!.blur();
    });

    await wait_for_mode("normal");

    await keys("gi");

    await wait_for_mode("insert");

    await keys(" world");
    const inputContent = await SpecialPowers.spawn(
      browser,
      [],
      async () => (content.document.getElementById("input-1") as HTMLInputElement).value,
    );
    is(inputContent, "hello world", "gi should focus the previously used input element");
  });
});

add_task(async function test_set_string_option() {
  await keys(":set yank_highlight #ff0000<CR>");
  is(glide.o.yank_highlight, "#ff0000", "String option should be updated to new value");

  await keys(":set yank_highlight rgb(255,0,0)<CR>");
  is(glide.o.yank_highlight, "rgb(255,0,0)", "String option should accept complex string values");
});

add_task(async function test_set_number_option() {
  await keys(":set mapping_timeout 500<CR>");
  is(glide.o.mapping_timeout, 500, "Number option should be updated to new value");

  await keys(":set mapping_timeout 0<CR>");
  is(glide.o.mapping_timeout, 0, "Number option should accept zero");
});

declare global {
  interface ExcmdRegistry {
    test_command: {};
  }
}

add_task(async function test_excmd_callback_receives_tab_id() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create(
      { name: "test_command", description: "Test command to verify tab_id parameter" },
      ({ tab_id }) => {
        glide.g.value = tab_id;
      },
    );
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await keys(":test_command<CR>");
    await sleep_frames(10);

    const active_tab = await glide.tabs.active();
    is(glide.g.value, active_tab.id, "Excmd callback should receive tab_id that matches the active tab ID");
  });
});

add_task(async function test_excmd_callback_receives_unparsed_args() {
  await GlideTestUtils.reload_config(function _() {
    glide.excmds.create({ name: "test_command", description: "Test command" }, ({ args_arr }) => {
      glide.g.value = args_arr;
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await glide.excmds.execute("test_command");
    await sleep_frames(10);
    isjson(glide.g.value, [], "Excmd callback should receive empty args as none were passed");

    await glide.excmds.execute("test_command Hello");
    await sleep_frames(10);
    isjson(glide.g.value, ["Hello"], "Excmd callback should receive 1 arg");

    await glide.excmds.execute("test_command Hello world");
    await sleep_frames(10);
    isjson(glide.g.value, ["Hello", "world"], "Excmd callback should receive 2 args");

    await glide.excmds.execute("test_command \"Hello world\"");
    await sleep_frames(10);
    isjson(glide.g.value, ["Hello world"], "Excmd callback should get quoted args");
  });
});

add_task(async function test_tab_new() {
  const initial_tab_count = gBrowser.tabs.length;

  await keys(":tab_new<CR>");
  await TestUtils.waitForCondition(
    () => gBrowser.tabs.length === initial_tab_count + 1,
    "Waiting for new tab to be created",
  );

  is(gBrowser.tabs.length, initial_tab_count + 1, "tab_new should create a new tab");
  is(gBrowser.selectedTab, gBrowser.tabs[gBrowser.tabs.length - 1], "New tab should be focused");
  is(gBrowser.selectedBrowser.currentURI.spec, "about:newtab", "New tab should open with blank or newtab page");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  // with url
  await keys(`:tab_new "${INPUT_TEST_FILE}"<CR>`);
  await TestUtils.waitForCondition(
    () => gBrowser.tabs.length === initial_tab_count + 1,
    "Waiting for new tab with URL to be created",
  );
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  is(gBrowser.tabs.length, initial_tab_count + 1, "tab_new with URL should create a new tab");
  is(gBrowser.selectedTab, gBrowser.tabs[gBrowser.tabs.length - 1], "New tab with URL should be focused");
  is(gBrowser.selectedBrowser.currentURI.spec, INPUT_TEST_FILE, "New tab should load the specified URL");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_keys() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", ";", "keys :");
  });

  ok(GlideTestUtils.commandline.get_element()?.hidden, "commandline should be hidden at the start");
  await keys(";");
  ok(GlideTestUtils.commandline.get_element()!.hidden, "commandline should be shown after pressing ;");

  GlideTestUtils.commandline.get_element()!.close();
});

add_task(async function test_clear_removes_notifications() {
  await GlideTestUtils.reload_config(function _() {});

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    GlideBrowser.add_notification("test-notification", {
      label: "Test notification that should be cleared",
      priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
    });
    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("test-notification") !== null,
      "Waiting for notification to appear",
    );
    is(gNotificationBox.allNotifications.length, 1, "notification should be added");

    AppMenuNotifications.showNotification("update-available");
    await TestUtils.waitForCondition(
      () => AppMenuNotifications.activeNotification !== null,
      "Waiting for appmenu notification to appear",
    );

    await keys(":clear<CR>");
    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("test-notification") === null,
      "Waiting for notification to disappear",
    );
    await TestUtils.waitForCondition(
      () => AppMenuNotifications.activeNotification == null,
      "Waiting for appmenu notification to disappear",
    );

    is(gNotificationBox.allNotifications.length, 0, ":clear should remove all notifications");
    is(
      gNotificationBox.getNotificationWithValue("test-notification"),
      null,
      "Test notification should be removed after :clear",
    );
  });
});

add_task(async function test_copy_excmd_single_notification() {
  await GlideTestUtils.reload_config(function _() {});

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await keys(":profile_dir<CR>");
    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("glide-profile-dir") !== null,
      "Waiting for profile_dir notification to appear",
    );

    const profile_dir = PathUtils.profileDir;

    await keys(":copy<CR>");
    await sleep_frames(10);

    const clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, profile_dir, "Clipboard should contain the profile directory path");

    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("glide-profile-dir") === null,
      "Waiting for notification to be removed after copy",
    );
    is(
      gNotificationBox.getNotificationWithValue("glide-profile-dir"),
      null,
      "Notification should be removed after copying",
    );
  });
});
