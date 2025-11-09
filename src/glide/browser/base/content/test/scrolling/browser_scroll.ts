// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

const SCROLL_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/excmds/scroll_test.html";

add_task(async function test_scrolling_triggers_notification() {
  Services.prefs.setBoolPref("glide.notifications.scroll_instant_to_smooth", false);
  await glide.fs.write(
    glide.path.join(glide.path.profile_dir, "glide__compatibility_oldest_version.txt"),
    "0.1.52a_20251026025613/20251026025613",
  );
  // call it manually here as testing on_startup things is tricky right now
  await GlideBrowser._setup_scroll_breaking_change_notification();

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    await new Promise((r) => setTimeout(r, 250));

    const notification = await until(() => gNotificationBox.getNotificationWithValue("glide-breaking-scroll"));

    Assert.stringContains(notification.shadowRoot.textContent || "", "Smooth scrolling is now the default");

    const link = notification.shadowRoot.querySelector(".message")!.children[0]! as HTMLAnchorElement;
    // rewrite the link to an allowed URL so mochitest doesn't complain about external requests.
    link.href = "https://example.com/";
    link.click();

    await waiter(() => {
      console.log(glide.ctx.url.toString());
      return glide.ctx.url.toString() === "https://example.com/";
    }).ok();

    notok(
      gNotificationBox.getNotificationWithValue("glide-breaking-scroll"),
      "notification should be removed after clicking it",
    );

    await glide.excmds.execute("tab_close");
  });

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    await new Promise((r) => setTimeout(r, 250));

    notok(
      gNotificationBox.getNotificationWithValue("glide-breaking-scroll"),
      "notification should not be triggered twice",
    );
  });
});

add_task(async function test_scrolling_does_NOT_trigger_notification_for_new_profile() {
  Services.prefs.setBoolPref("glide.notifications.scroll_instant_to_smooth", false);
  await glide.fs.write(
    glide.path.join(glide.path.profile_dir, "glide__compatibility_oldest_version.txt"),
    "0.1.54a_20251026025613/20251026025613",
  );
  // call it manually here as testing on_startup things is tricky right now
  await GlideBrowser._setup_scroll_breaking_change_notification();

  await BrowserTestUtils.withNewTab(SCROLL_TEST_FILE, async _ => {
    await keys("jjjjjj");

    await new Promise((r) => setTimeout(r, 250));

    notok(
      gNotificationBox.getNotificationWithValue("glide-breaking-scroll"),
      "There should not be any notification if the oldest version a user used is greater than 0.1.53a",
    );
  });
});
