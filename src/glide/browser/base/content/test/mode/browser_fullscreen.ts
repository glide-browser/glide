// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const VIDEO_FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/video_test.html";

add_task(async function test_video_fullscreen() {
  await BrowserTestUtils.withNewTab(VIDEO_FILE, async browser => {
    await GlideTestUtils.wait_for_mode("normal");

    await SpecialPowers.spawn(browser, [], async () => {
      const video = content.document.getElementById(
        "testVideo"
      ) as HTMLVideoElement;
      await video.requestFullscreen();
    });

    await GlideTestUtils.wait_for_mode("insert");
    is(
      GlideBrowser.state.mode,
      "insert",
      "Mode should be `insert` when video is in fullscreen"
    );

    await SpecialPowers.spawn(browser, [], async () => {
      await content.document.exitFullscreen();
    });

    await GlideTestUtils.wait_for_mode("normal");
    is(
      GlideBrowser.state.mode,
      "normal",
      "Mode should be `normal` after exiting video fullscreen"
    );
  });
});

add_task(async function test_video_fullscreen_does_not_switch_on_ignore_mode() {
  await BrowserTestUtils.withNewTab(VIDEO_FILE, async browser => {
    await GlideTestUtils.wait_for_mode("normal");
    await GlideTestUtils.synthesize_keyseq("<S-Esc>");

    await SpecialPowers.spawn(browser, [], async () => {
      const video = content.document.getElementById(
        "testVideo"
      ) as HTMLVideoElement;
      await video.requestFullscreen();
    });

    await sleep_frames(10);

    await SpecialPowers.spawn(browser, [], async () => {
      await content.document.exitFullscreen();
    });

    await sleep_frames(10);
    is(
      GlideBrowser.state.mode,
      "ignore",
      "Mode should stay as `ignore` when exiting fullscreen"
    );
  });
});
