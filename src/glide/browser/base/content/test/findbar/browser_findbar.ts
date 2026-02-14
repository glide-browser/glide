// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_findbar_open_close_basic() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    notok(glide.findbar.is_open(), "findbar should be closed initially");

    await glide.findbar.open();

    ok(glide.findbar.is_open(), "findbar should be open after calling open()");
    ok(glide.findbar.is_focused(), "findbar should be focused after calling open()");
    is(gFindBar!.findMode, gFindBar!.FIND_NORMAL, "findbar should be in normal mode");

    await glide.findbar.close();
    await until(() => !glide.findbar.is_open(), "Waiting for findbar to close");
    notok(glide.findbar.is_focused(), "findbar should not be focused after calling close()");
  });
});

add_task(async function test_findbar_open_mode_normal() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ mode: "normal" });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar.findMode, findbar.FIND_NORMAL, "findbar should be in normal mode");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_open_mode_typeahead() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ mode: "typeahead" });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar.findMode, findbar.FIND_TYPEAHEAD, "findbar should be in typeahead mode");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_open_mode_links() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ mode: "links" });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar.findMode, findbar.FIND_LINKS, "findbar should be in links mode");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_open_idempotent() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open();
    ok(!findbar.hidden, "findbar should be visible after first open()");

    await glide.findbar.open();
    ok(!findbar.hidden, "findbar should still be visible after second open()");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_open_highlight_all() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ highlight_all: true });

    ok(!findbar.hidden, "findbar should be visible");
    ok(findbar._highlightAll, "highlight all should be enabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");

    await glide.findbar.open({ highlight_all: false });

    ok(!findbar.hidden, "findbar should be visible");
    ok(!findbar._highlightAll, "highlight all should be disabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });

  glide.prefs.clear("findbar.highlightAll");
});

add_task(async function test_findbar_open_whole_words() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ whole_words: true });

    ok(!findbar.hidden, "findbar should be visible");
    ok(findbar._entireWord, "entire word matching should be enabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");

    await glide.findbar.open({ whole_words: false });

    ok(!findbar.hidden, "findbar should be visible");
    ok(!findbar._entireWord, "entire word matching should be disabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });

  glide.prefs.clear("findbar.entireword");
});

add_task(async function test_findbar_open_match_casing() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ match_casing: true });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar._typeAheadCaseSensitive, 1, "case sensitive matching should be enabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");

    await glide.findbar.open({ match_casing: false });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar._typeAheadCaseSensitive, 0, "case sensitive matching should be disabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_open_match_diacritics() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    const findbar = await gFindBarPromise;

    await glide.findbar.open({ match_diacritics: true });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar.browser.finder._matchDiacritics, true, "diacritics matching should be enabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");

    await glide.findbar.open({ match_diacritics: false });

    ok(!findbar.hidden, "findbar should be visible");
    is(findbar.browser.finder._matchDiacritics, false, "diacritics matching should be disabled");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
  });
});

add_task(async function test_findbar_is_focused() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await glide.findbar.open();

    ok(glide.findbar.is_focused(), "findbar should be focused after calling open()");

    (document!.getElementById("urlbar-input") as HTMLElement).focus();

    notok(glide.findbar.is_focused(), "findbar should not be focused after focusing another UI element");
    ok(glide.findbar.is_open(), "findbar should still be open after focusing another UI element");

    await glide.findbar.close();
    await until(() => !glide.findbar.is_open(), "Waiting for findbar to close");
  });
});

registerCleanupFunction(function _() {
  glide.prefs.clear("accessibility.typeaheadfind.flashBar");
});
