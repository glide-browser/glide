// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

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
