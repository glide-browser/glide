/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
const SCROLL_TEST_FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/excmds/scroll_test.html";

function current_url() {
  return gBrowser.selectedBrowser?.currentURI.spec;
}

add_task(async function test_tab_switching() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, INPUT_TEST_FILE + "?i=0");
  await BrowserTestUtils.browserLoaded(browser);
  let second_tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    INPUT_TEST_FILE + "?i=1"
  );
  let third_tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    INPUT_TEST_FILE + "?i=2"
  );

  is(current_url(), INPUT_TEST_FILE + "?i=2");

  EventUtils.synthesizeKey("j", { ctrlKey: true });
  await new Promise(r => requestAnimationFrame(r));
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_next wraps around");

  EventUtils.synthesizeKey("j", { ctrlKey: true });
  await new Promise(r => requestAnimationFrame(r));
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_next advances forward once");

  EventUtils.synthesizeKey("k", { ctrlKey: true });
  await new Promise(r => requestAnimationFrame(r));
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_prev moves backward once");

  EventUtils.synthesizeKey("k", { ctrlKey: true });
  await new Promise(r => requestAnimationFrame(r));
  is(current_url(), INPUT_TEST_FILE + "?i=2", "tab_prev wraps back around");

  BrowserTestUtils.removeTab(second_tab);
  BrowserTestUtils.removeTab(third_tab);
});

add_task(async function test_tab_close() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.mapleader = "<Space>";
  });
  let second_tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    INPUT_TEST_FILE + "?i=1"
  );
  let third_tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    INPUT_TEST_FILE + "?i=2"
  );

  is(current_url(), INPUT_TEST_FILE + "?i=2");

  EventUtils.synthesizeKey(" ");
  EventUtils.synthesizeKey("d");
  await new Promise(r => requestAnimationFrame(r));
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_close moves backwards");

  EventUtils.synthesizeKey(".");
  await sleep_frames(3);
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_close moves backwards");

  BrowserTestUtils.removeTab(second_tab);
  BrowserTestUtils.removeTab(third_tab);
});

add_task(async function test_scrolling() {
  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async browser => {
    async function get_scroll(): Promise<[number, number]> {
      return await SpecialPowers.spawn(browser, [], async () => {
        return [
          parseInt(content.window.scrollX),
          parseInt(content.window.scrollY),
        ];
      });
    }

    const max_y = await SpecialPowers.spawn(browser, [], async () => {
      return parseInt(content.window.scrollMaxY);
    });
    var min_x = 0;
    var min_y = 0;

    var [x, y] = await get_scroll();
    is(x, min_x);
    is(y, min_y);

    for (let i = 0; i < 10; i++) {
      EventUtils.synthesizeKey("l");
    }
    // ensure we give enough frame time to complete the horizontal scroll
    // TODO(glide): better solution for this
    await sleep_frames(100);

    var [curr_x] = await get_scroll();
    isnot(curr_x, 0, `repeated \`l\` should move the scroll x position`);

    EventUtils.synthesizeKey("G");
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `G should retain the x position`);
    is(y, max_y, `G should go to the max y`);

    EventUtils.synthesizeKey("g");
    EventUtils.synthesizeKey("g");
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `gg should retain the x position`);
    is(y, min_y, `gg should go to the minimum y`);

    var last_y = min_y;

    EventUtils.synthesizeKey("d", { ctrlKey: true });
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-d> should retain the x position`);
    ok(y > last_y, `<C-d> should increase y (last=${last_y}, y=${y})`);

    last_y = y;

    EventUtils.synthesizeKey("d", { ctrlKey: true });
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-d> should retain the x position`);
    ok(y > last_y, `Second <C-d> should increase y (last=${last_y}, y=${y})`);

    EventUtils.synthesizeKey("u", { ctrlKey: true });
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-u> should retain the x position`);
    is(y, last_y, `<C-u> should decrease y to the previous <C-d>`);

    EventUtils.synthesizeKey("u", { ctrlKey: true });
    await sleep_frames(5);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-u> should retain the x position`);
    is(y, min_y, `Second <C-u> should decrease y to the minimum`);
  });
});
