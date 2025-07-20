// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

function uri(i: number) {
  return `${INPUT_TEST_URI}?i=${i}`;
}

function current_url() {
  return gBrowser.selectedBrowser?.currentURI.spec;
}

async function keys(keyseq: string) {
  await GlideTestUtils.synthesize_keyseq(keyseq);
}

add_task(async function test_jumplist_basic_navigation() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, uri(0));
  await BrowserTestUtils.browserLoaded(browser);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(1));
  const tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(2));

  is(current_url(), uri(2));

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(1), "<C-o> jumps back once");

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(0), "Second <C-o> jumps back again");

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(0), "<C-o> at start stays put");

  await keys("<C-i>");
  await sleep_frames(5);
  is(current_url(), uri(1), "<C-i> jumps forward once");

  await keys("<C-i>");
  await sleep_frames(5);
  is(current_url(), uri(2), "Second <C-i> jumps forward again");

  await keys("<C-i>");
  await sleep_frames(5);
  is(current_url(), uri(2), "<C-i> at tip stays put");

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_jumplist_prunes_forward_slice() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, uri(0));
  await BrowserTestUtils.browserLoaded(browser);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(1));
  const tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(2));

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(1), "<C-o> moves back to tab1");

  const tab3 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(3));
  is(current_url(), uri(3));

  await keys("<C-i>");
  await sleep_frames(5);
  is(current_url(), uri(3), "Forward slice was pruned – <C-i> does nothing");

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(1), "<C-o> still navigates backwards after prune");

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab3);
});

add_task(async function test_jumplist_max_entries_trim() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, uri(0));
  await BrowserTestUtils.browserLoaded(browser);

  const max_entries = GlideBrowser.api.o.jumplist_max_entries;
  GlideBrowser.api.o.jumplist_max_entries = 10;

  try {
    // Open 11 additional tabs so that we end up with 12 entries (0–11).
    const tabs: Array<any> = [];
    for (let i = 1; i <= 11; i++) {
      tabs.push(await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(i)));
    }

    // We should now be on the last tab (i=11).
    is(current_url(), uri(11));

    // Jump backwards 11 times – this would normally reach i=0, but because the
    // first two entries are trimmed we should land on i=2.
    for (let i = 0; i < 11; i++) {
      await keys("<C-o>");
    }
    await sleep_frames(10);

    is(
      current_url(),
      uri(2),
      "After overflow trim, earliest entry should be i=2"
    );

    for (const tab of tabs) {
      BrowserTestUtils.removeTab(tab);
    }
  } finally {
    GlideBrowser.api.o.jumplist_max_entries = max_entries;
  }
});

add_task(async function test_jumplist_deleted_intermediary_tab() {
  const browser = gBrowser.tabContainer.allTabs.at(0).linkedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, uri(0));
  await BrowserTestUtils.browserLoaded(browser);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(1));
  const tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(2));
  const tab3 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(3));
  const tab4 = await BrowserTestUtils.openNewForegroundTab(gBrowser, uri(4));

  is(current_url(), uri(4), "Currently on tab4");

  await keys("<C-o><C-o>");
  await sleep_frames(5);
  is(current_url(), uri(2), "Jumped back to tab2");

  // delete tab3 while we're *not* on it
  BrowserTestUtils.removeTab(tab3);

  await keys("<C-i>");
  await sleep_frames(5);
  is(current_url(), uri(4), "Skipped deleted tab3 and jumped to tab4");

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(2), "Can still jump backwards");

  // delete tab2 while we're on it
  BrowserTestUtils.removeTab(tab2);
  await sleep_frames(5);

  ok(current_url() !== uri(2), "No longer on deleted tab2");

  await keys("<C-o>");
  await sleep_frames(5);
  is(current_url(), uri(1), "Skipped deleted tab2 and jumped to tab1");

  await keys("<C-i><C-i>");
  await sleep_frames(5);
  is(current_url(), uri(4), "Skipped deleted tabs and jumped to tab4");

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab4);
});
