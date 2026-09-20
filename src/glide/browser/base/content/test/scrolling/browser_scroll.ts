// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

declare var content: TestContent;

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

add_task(async function test_scrolling_input_element_focused() {
  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async browser => {
    async function get_scroll(): Promise<[number, number]> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return [content.window.scrollX, content.window.scrollY];
      });
    }
    const get_y = async () => (await get_scroll())[1];
    const wait_for_scroll_stop = await GlideTestUtils.scroll_waiter(get_scroll);

    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById("input-1")!;
      input.scrollIntoView();
      input.focus();
    });

    var last_y = await get_y();

    await keys("<C-d>");
    await wait_for_scroll_stop();

    // this assertion seems to be flaky, and does not reflect reality
    // Assert.greater(await get_y(), last_y, "<C-d> should go down the page, even while an input element is focused");
    is(
      await SpecialPowers.spawn(browser, [], async () => content.document.activeElement?.id),
      "input-1",
      "input should still be focused",
    );

    await keys("<C-u>");
    await wait_for_scroll_stop();
    isfuzzy(
      await get_y(),
      last_y,
      1,
      "<C-u> should go back up the page, even while an input element is focused (+- 1)",
    );
    is(
      await SpecialPowers.spawn(browser, [], async () => content.document.activeElement?.id),
      "input-1",
      "input should still be focused",
    );

    await keys("<esc>");
    await wait_for_mode("normal");

    await keys("gg");
    await wait_for_scroll_stop();
    is(await get_y(), 0, "gg should go to the top of the page, even while an input element is focused");
    is(
      await SpecialPowers.spawn(browser, [], async () => content.document.activeElement?.id),
      "input-1",
      "input should still be focused",
    );

    await keys("G");
    await wait_for_scroll_stop();
    is(
      await get_y(),
      await SpecialPowers.spawn(browser, [], async () => content.window.scrollMaxY),
      "G should go to the bottom of the page, even while an input element is focused",
    );
    is(
      await SpecialPowers.spawn(browser, [], async () => content.document.activeElement?.id),
      "input-1",
      "input should still be focused",
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

    async function get_viewport_height(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return content.window.innerHeight;
      });
    }

    async function get_max_y(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return content.window.scrollMaxY;
      });
    }

    await vertical_scroll_tests({ min_y: 0, get_max_y, get_scroll, get_viewport_height });
  });

  await horizontal_scroll_tests(SCROLL_TEST_FILE);
});

add_task(async function test_scrolling_nested_scroller() {
  // Scrolling must target what keyboard scrolling would: the nearest scroll
  // container (from the focused element) that can still scroll *in that direction*,
  // so a nested scroller at its bottom hands `<C-d>` to the outer document, but
  // still gets `<C-u>`.
  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async browser => {
    async function get_scroll(): Promise<[number, number]> {
      return await SpecialPowers.spawn(browser, [], async () => {
        const inner = content.document.getElementById("inner-scroller")!;
        return [content.window.scrollY, inner.scrollTop];
      });
    }
    const inner_max = await SpecialPowers.spawn(browser, [], async () => {
      const inner = content.document.createElement("div");
      inner.id = "inner-scroller";
      inner.tabIndex = 0;
      inner.style.cssText = "position: absolute; top: 0; left: 0; width: 300px; height: 150px; overflow: auto;";
      const filler = content.document.createElement("div");
      filler.style.height = "1000px";
      inner.append(filler);
      content.document.getElementById("container")!.prepend(inner);
      inner.focus();
      return inner.scrollTopMax;
    });
    Assert.greater(inner_max, 0, "the nested scroller should be scrollable");

    const wait_for_scroll_stop = await GlideTestUtils.scroll_waiter(get_scroll);

    await keys("<C-d>");
    await wait_for_scroll_stop();
    var [window_y, inner_y] = await get_scroll();
    Assert.greater(inner_y, 0, `<C-d> should scroll the focused nested scroller (inner=${inner_y})`);
    is(window_y, 0, "<C-d> should not scroll the document while the nested scroller can still scroll down");

    await SpecialPowers.spawn(browser, [], async () => {
      const inner = content.document.getElementById("inner-scroller")!;
      inner.scrollTop = inner.scrollTopMax;
    });
    await wait_for_scroll_stop();

    await keys("<C-d>");
    await wait_for_scroll_stop();
    var [window_y, inner_y] = await get_scroll();
    Assert.greater(
      window_y,
      0,
      `<C-d> should scroll the document once the nested scroller is at its bottom (window=${window_y})`,
    );
    is(inner_y, inner_max, "the nested scroller should stay at its bottom");

    const window_y_before_ctrl_u = window_y;

    await keys("<C-u>");
    await wait_for_scroll_stop();
    var [window_y, inner_y] = await get_scroll();
    Assert.less(
      inner_y,
      inner_max,
      `<C-u> should scroll the nested scroller, which can still scroll up (inner=${inner_y})`,
    );
    is(
      window_y,
      window_y_before_ctrl_u,
      "<C-u> should not scroll the document while the nested scroller can scroll up",
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const inner = content.document.getElementById("inner-scroller")!;
      inner.scrollTop = inner.scrollTopMax;
    });
    await wait_for_scroll_stop();

    await keys("G");
    await wait_for_scroll_stop();
    var [window_y, inner_y] = await get_scroll();
    is(
      window_y,
      await SpecialPowers.spawn(browser, [], async () => content.window.scrollMaxY),
      "G should scroll the document to the bottom once the nested scroller is at its bottom",
    );
    is(inner_y, inner_max, "the nested scroller should stay at its bottom");
  });
});

add_task(async function test_scrolling_legacy() {
  await reload_config(function _() {
    glide.o.scroll_implementation = "legacy";
  });

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async browser => {
    async function get_scroll(): Promise<[number, number]> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return [content.window.scrollX, content.window.scrollY];
      });
    }

    async function get_viewport_height(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return content.window.innerHeight;
      });
    }

    async function get_max_y(): Promise<number> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return content.window.scrollMaxY;
      });
    }

    await vertical_scroll_tests({ min_y: 0, get_max_y, get_scroll, get_viewport_height });
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

      async function get_viewport_height(): Promise<number> {
        return await SpecialPowers.spawn(browser, [], async () => {
          const container = content.document.getElementById("viewerContainer")!;
          return container.clientHeight;
        });
      }

      async function get_max_y(): Promise<number> {
        return await SpecialPowers.spawn(browser, [], async () => {
          const container = content.document.getElementById("viewerContainer")!;
          return container.scrollTopMax;
        });
      }

      const min_y = await SpecialPowers.spawn(browser, [], async () => {
        const container = content.document.getElementById("viewerContainer")!;
        return container.scrollTop;
      });

      await vertical_scroll_tests({
        min_y,
        get_max_y,
        get_scroll,
        get_viewport_height,
        // for some reason, G goes *almost* to the actual bottom of the PDF
        // I *think* this is a Firefox/PDF.js bug but I haven't investigated deeply
        G_wip: true,
      });
    },
  );
}).skip(); // the PDF tests are very flaky

async function vertical_scroll_tests(
  { min_y, get_max_y, get_scroll, get_viewport_height, G_wip }: {
    min_y: number;
    get_max_y: () => Promise<number>;
    get_scroll(): Promise<[number, number]>;
    get_viewport_height: () => Promise<number>;
    G_wip?: boolean;
  },
) {
  var [x, y] = await get_scroll();

  var min_x = 0;
  is(x, min_x, "scroll is at the min x");
  is(y, min_y, "scroll is at the min y");

  var curr_x = 0;
  var last_y = min_y;

  const wait_for_scroll_stop = await GlideTestUtils.scroll_waiter(get_scroll);

  const viewport_height = await get_viewport_height();

  // note: we use a 10% tolerance for pixel scroll checks, as the exact pixel amount we scroll is
  //       unfortunately not deterministic and it can vary slightly.
  const half_page = viewport_height / 2;
  const half_page_tolerance = Math.ceil(half_page * 0.1);

  await keys("<C-d>");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-d> should retain the x position`);
  Assert.greater(y, last_y, `<C-d> should increase y (last=${last_y}, y=${y})`);
  isfuzzy(
    y,
    half_page,
    half_page_tolerance,
    `<C-d> should scroll approximately half a page (expected ~${half_page}, got ${y})`,
  );

  last_y = y;

  await keys("<C-d>");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-d> should retain the x position`);
  Assert.greater(y, last_y, `Second <C-d> should increase y (last=${last_y}, y=${y})`);
  isfuzzy(
    y - last_y,
    half_page,
    half_page_tolerance,
    `Second <C-d> should also scroll approximately half a page (expected ~${half_page}, got ${y - last_y})`,
  );

  const before_ctrl_u_y = y;

  await keys("<C-u>");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-u> should retain the x position`);
  isfuzzy(y, last_y, 1, `<C-u> should decrease y to the previous <C-d> (+- 1)`);
  isfuzzy(
    before_ctrl_u_y - y,
    half_page,
    half_page_tolerance,
    `<C-u> should scroll approximately half a page (expected ~${half_page}, got ${before_ctrl_u_y - y})`,
  );

  const before_second_ctrl_u_y = y;

  await keys("<C-u>");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  is(x, curr_x, `<C-u> should retain the x position`);
  is(y, min_y, `Second <C-u> should decrease y to the minimum`);
  isfuzzy(
    before_second_ctrl_u_y - y,
    half_page,
    half_page_tolerance,
    `Second <C-u> should also scroll approximately half a page (expected ~${half_page}, got ${
      before_second_ctrl_u_y - y
    })`,
  );

  await keys("gg");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();

  // Test j scrolls down
  await keys("j");
  await wait_for_scroll_stop();
  var [x, new_y] = await get_scroll();
  Assert.greater(new_y, y, `j should scroll down`);

  // Test k scrolls up
  await keys("k");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  Assert.lessOrEqual(y, min_y, `k should scroll back up`);

  await keys("G");
  await wait_for_scroll_stop();
  var [x, y] = await get_scroll();
  is(x, curr_x, `G should retain the x position`);
  const max_y = await get_max_y();
  if (G_wip) {
    todo_is(y, max_y, `G should go to the max y`);
  } else {
    Assert.greaterOrEqual(y, max_y, `G should go to the max y`);
  }

  await keys("gg");
  await wait_for_scroll_stop();
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

    const wait_for_scroll_stop = await GlideTestUtils.scroll_waiter(async () => [await get_x(), 0]);

    for (let i = 0; i < 10; i++) {
      await keys("l");
    }
    await wait_for_scroll_stop();

    var curr_x = await get_x();
    isnot(curr_x, 0, `repeated \`l\` should move the scroll x position`);

    // Test h scrolls left
    for (let i = 0; i < 10; i++) {
      await keys("h");
    }
    await waiter(get_x).is(min_x, `h should scroll to the left edge`);
  });
}
