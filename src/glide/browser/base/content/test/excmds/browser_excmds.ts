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

  await GlideTestUtils.synthesize_keyseq("<C-j>");
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_next wraps around");

  await GlideTestUtils.synthesize_keyseq("<C-j>");
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_next advances forward once");

  await GlideTestUtils.synthesize_keyseq("<C-k>");
  is(current_url(), INPUT_TEST_FILE + "?i=0", "tab_prev moves backward once");

  await GlideTestUtils.synthesize_keyseq("<C-k>");
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

  await GlideTestUtils.synthesize_keyseq(" d");
  is(current_url(), INPUT_TEST_FILE + "?i=1", "tab_close moves backwards");

  await GlideTestUtils.synthesize_keyseq(".");
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
      await GlideTestUtils.synthesize_keyseq("l");
    }
    // ensure we give enough frame time to complete the horizontal scroll
    // TODO(glide): better solution for this
    await sleep_frames(100);

    var [curr_x] = await get_scroll();
    isnot(curr_x, 0, `repeated \`l\` should move the scroll x position`);

    await GlideTestUtils.synthesize_keyseq("G");
    var [x, y] = await get_scroll();
    is(x, curr_x, `G should retain the x position`);
    is(y, max_y, `G should go to the max y`);

    await GlideTestUtils.synthesize_keyseq("gg");
    var [x, y] = await get_scroll();
    is(x, curr_x, `gg should retain the x position`);
    is(y, min_y, `gg should go to the minimum y`);

    var last_y = min_y;

    await GlideTestUtils.synthesize_keyseq("<C-d>");
    await sleep_frames(50);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-d> should retain the x position`);
    ok(y > last_y, `<C-d> should increase y (last=${last_y}, y=${y})`);

    last_y = y;

    await GlideTestUtils.synthesize_keyseq("<C-d>");
    await sleep_frames(50);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-d> should retain the x position`);
    ok(y > last_y, `Second <C-d> should increase y (last=${last_y}, y=${y})`);

    await GlideTestUtils.synthesize_keyseq("<C-u>");
    await sleep_frames(50);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-u> should retain the x position`);
    is(y, last_y, `<C-u> should decrease y to the previous <C-d>`);

    await GlideTestUtils.synthesize_keyseq("<C-u>");
    await sleep_frames(50);
    var [x, y] = await get_scroll();
    is(x, curr_x, `<C-u> should retain the x position`);
    is(y, min_y, `Second <C-u> should decrease y to the minimum`);

    await GlideTestUtils.synthesize_keyseq("gg");
    var [x, y] = await get_scroll();

    // Test j scrolls down
    await GlideTestUtils.synthesize_keyseq("j");
    await sleep_frames(50);
    var [x, new_y] = await get_scroll();
    ok(new_y > y, `j should scroll down`);

    // Test k scrolls up
    await GlideTestUtils.synthesize_keyseq("k");
    await sleep_frames(50);
    var [x, y] = await get_scroll();
    is(y, min_y, `k should scroll back up`);

    // Test h scrolls left
    for (let i = 0; i < 10; i++) {
      await GlideTestUtils.synthesize_keyseq("h");
    }
    await sleep_frames(100);
    var [new_x, y] = await get_scroll();
    is(new_x, min_x, `h should scroll to the left edge`);
  });
});
