// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_go_up() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(
    "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html#foo?thing=true",
    async _ => {
      await keys("gu");
      await waiter(() => glide.ctx.url.toString()).is(
        "http://mochi.test:8888/browser/glide/browser/base/content/test/mode",
      );

      await keys("gu");
      await waiter(() => glide.ctx.url.toString()).is("http://mochi.test:8888/browser/glide/browser/base/content/test");
    },
  );
});

add_task(async function test_go_to_root() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(
    "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html#foo?thing=true",
    async _ => {
      await keys("gU");
      await waiter(() => glide.ctx.url.toString()).is("http://mochi.test:8888/");
    },
  );
});
