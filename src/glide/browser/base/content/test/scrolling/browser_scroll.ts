// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

const SCROLL_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/excmds/scroll_test.html";

const breaking_change_pref = "glide.notifications.scroll_instant_to_smooth";

async function setup({ version }: { version: string } = { version: "0.1.52a" }) {
  await SpecialPowers.pushPrefEnv({
    set: [
      [breaking_change_pref, false],
    ],
  });
  await glide.fs.write(
    glide.path.join(glide.path.profile_dir, "glide__compatibility_oldest_version.txt"),
    `${version}_20251026025613/20251026025613`,
  );
  // call it manually here as testing on_startup things is tricky right now
  await GlideBrowser._setup_scroll_breaking_change_notification();
  GlideBrowser.notify_scroll_breaking_change?.();
}

add_task(async function test_scrolling_triggers_notification() {
  await setup();

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    const notification = await until(() =>
      AppMenuNotifications.notifications.find((n) => n.id === "glide-smooth-scroll-default")
    );

    // rewrite the link to an allowed URL so mochitest doesn't complain about external requests.
    notification.mainAction.docs_url = "https://example.com/";
    notification.mainAction.callback();

    await waiter(() => glide.ctx.url.toString() === "https://example.com/").ok();

    notok(
      AppMenuNotifications.notifications.find((n) => n.id === "glide-smooth-scroll-default"),
      "notification should be removed after clicking it",
    );

    await glide.excmds.execute("tab_close");
  });

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    notok(
      gNotificationBox.getNotificationWithValue("glide-breaking-scroll"),
      "notification should not be triggered twice",
    );
  });
});

add_task(async function test_scrolling_does_NOT_trigger_notification_for_new_profile() {
  await setup({ version: "0.1.54a" });

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    notok(
      AppMenuNotifications.notifications.find((n) => n.id === "glide-smooth-scroll-default"),
      "There should not be any notification if the oldest version a user used is greater than 0.1.53a",
    );
  });
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

add_task(async function test_scrolling_legacy() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.scroll_implementation = "legacy";
  });

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
  const interval = 100;

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

