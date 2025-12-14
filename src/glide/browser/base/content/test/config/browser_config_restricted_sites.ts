// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document;

add_task(async function test_executeScript__restrictedDomain() {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.webextensions.restrictedDomains", "example.com"]],
  });

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async ({ tab_id }) => {
      const results = await browser.scripting.executeScript({
        world: "MAIN",
        func() {
          document.body!.setAttribute("data-test-marker", "executed");
          return document.body!.textContent!.trim();
        },
        target: { tabId: tab_id },
      });
      console.log("RESULTS", results);
      glide.g.value = results[0]?.result;
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(
    "http://example.com/browser/docshell/test/browser/dummy_page.html",
    async browser => {
      await keys("~");
      await waiter(() => glide.g.test_checked).ok();

      const marker = await SpecialPowers.spawn(browser, [], () =>
        content.document.body.getAttribute("data-test-marker"));
      is(marker, "executed", "Script should execute on webextensions restricted domain example.com");

      is(glide.g.value, "just a dummy html file", "script return values should be propagated");
    },
  );
});
