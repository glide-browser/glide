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
    const findbar = await gFindBarPromise;
    ok(findbar.hidden, "findbar should be hidden initially");

    await glide.findbar.open();

    ok(!findbar.hidden, "findbar should be visible after calling open()");
    is(findbar.findMode, findbar.FIND_NORMAL, "findbar should be in normal mode");

    await glide.findbar.close();
    await until(() => findbar.hidden, "Waiting for findbar to close");
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
