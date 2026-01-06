// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const INPUT_TEST_URL = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

async function newtab() {
  const current_tab = gBrowser.selectedTab;

  if (glide.ctx.os === "macosx") {
    await keys("<D-t>");
  } else {
    await keys("<C-t>");
  }

  await waiter(() => gBrowser.selectedTab).isnot(current_tab);

  const tab = gBrowser.selectedTab;

  return {
    [Symbol.dispose]() {
      gBrowser.removeTab(tab);
    },
  };
}

add_task(async function test_newtab_url() {
  is(glide.o.newtab_url, "about:newtab");

  await reload_config(function _() {
    glide.o.newtab_url = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
  });

  await sleep_frames(5);
  using _ = await newtab();

  is(glide.o.newtab_url, INPUT_TEST_URL);
  await waiter(() => glide.ctx.url.toString()).is(INPUT_TEST_URL, "new tab should be created with the custom url");
});

add_task(async function test_newtab_url__local_file() {
  await reload_config(function _() {
    glide.o.newtab_url = "file://"
      + glide.path.join(
        glide.path.cwd,
        "browser",
        "glide",
        "browser",
        "base",
        "content",
        "test",
        "mode",
        "input_test.html",
      );
  });
  await sleep_frames(5);

  using _ = await newtab();
  await waiter(() => glide.ctx.url.toString().startsWith("file://")).ok(
    "new tab should be created with the local file url",
  );
  is(
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => content.document.title),
    "Test for auto mode switching",
  );
});

add_task(async function test_newtab_url__buffer() {
  await reload_config(function _() {
    glide.autocmds.create("UrlEnter", /about:newtab/, () => {
      glide.bo.newtab_url = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
    });
  });

  is(glide.o.newtab_url, "about:newtab");
  is(glide.bo.newtab_url, undefined);
  await sleep_frames(5);

  using _ = await newtab();
  await waiter(() => glide.ctx.url.toString()).is("about:newtab", "new tab should be created with the default url");
  is(glide.bo.newtab_url, INPUT_TEST_URL);

  using _2 = await newtab();
  await waiter(() => glide.ctx.url.toString()).is(INPUT_TEST_URL, "new tab should be created with the custom url");
  is(glide.o.newtab_url, "about:newtab");
  is(glide.bo.newtab_url, undefined);

  using _3 = await newtab();
  await waiter(() => glide.ctx.url.toString()).is(
    "about:newtab",
    "new tab should go back to being created with the default url",
  );
});
