// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";
const VIDEO_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/video_test.html";

add_task(async function test_auto_disabled__input_focus() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  is(glide.ctx.mode, "normal");

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const element = content.document.getElementById("input-1") as HTMLInputElement;
      element.focus();
    });

    await sleep_frames(10);
    is(glide.ctx.mode, "normal", "we should still be in normal mode after focusing an input element");
  });
});

add_task(async function test_auto_disabled__video_fullscreen() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  await BrowserTestUtils.withNewTab(VIDEO_FILE, async browser => {
    await wait_for_mode("normal");

    await SpecialPowers.spawn(browser, [], async () => {
      const video = content.document.getElementById("testVideo") as HTMLVideoElement;
      await video.requestFullscreen();
      await ContentTaskUtils.waitForCondition(
        () => !!content.document.fullscreenElement,
        "Waiting for fullscreen to be active",
      );
    });

    is(glide.ctx.mode, "normal", "Mode should stay as `normal` after entering fullscreen");

    await SpecialPowers.spawn(browser, [], async () => {
      await content.document.exitFullscreen();
      await ContentTaskUtils.waitForCondition(() => !content.document.fullscreenElement, "Waiting to exit fullscreen");
    });

    is(glide.ctx.mode, "normal", "Mode should stay as `normal` when exiting fullscreen");
  });
});

add_task(async function test_auto_disabled__commandline_mode_switching() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  is(glide.ctx.mode, "normal");

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":");
    await wait_for_mode("command");

    await keys("<esc>");
    await wait_for_mode("normal");
  });
});

add_task(async function test_auto_disabled__hints() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.switch_mode_on_focus = false;
  });

  is(glide.ctx.mode, "normal");

  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    await wait_for_mode("hint");

    await keys("<esc>");
    await wait_for_mode("normal");
  });
});
