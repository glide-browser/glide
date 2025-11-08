// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;
declare var document: Document;

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

const KEYS_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/key_test.html";

const FULLSCREEN_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/fullscreen_test.html";

const CLIPBOARD_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/clipboard_test.html";

declare global {
  interface GlideGlobals {
    invoked_buffer?: number;
    invoked_global?: number;
    invoked_after_reload?: number;
  }
}

add_setup(async () => {
  GlideBrowser.key_manager.reset_sequence();

  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("insert", "jj", "mode_change normal");
  });

  await sleep_frames(1);
});

add_task(async function test_jj_insert_middle() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById("input-2")! as HTMLInputElement;
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    await keys("j");
    await sleep_frames(5);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-2")!
        .value;
    });
    is(
      value,
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Partial insert mapping matches should insert the key",
    );

    await keys("j");
    await sleep_frames(4);

    value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-2")!
        .value;
    });

    // content should not have `jj` now
    is(value, INPUT_TEST_URI);

    const [selection_start, selection_end] = await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      return [input.selectionStart, input.selectionEnd];
    });
    is(selection_start, 40);
    is(selection_end, 40);
  });
});

add_task(async function test_jj_insert_end() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await sleep_frames(1);

    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      input.value = uri;
      input.focus();
    });

    await sleep_frames(1);
    await keys("j");
    await sleep_frames(4);

    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-2")!
        .value;
    });
    is(value, INPUT_TEST_URI + "j");

    await keys("j");
    await sleep_frames(3);

    // content should be the exact same
    is(
      await SpecialPowers.spawn(browser, [], async () =>
        content.document.getElementById<HTMLInputElement>("input-2")!.value),
      INPUT_TEST_URI,
    );
    is(
      await SpecialPowers.spawn(browser, [], async () => content.document.getElementById("input-2")!.matches(":focus")),
      true,
      "input should still have focus",
    );
  });
});

add_task(async function test_jj_partial_cancel_by_other_keypress() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    await keys("j");
    await sleep_frames(1);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-2")!
        .value;
    });
    await sleep_frames(2);
    is(value, "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html");

    await keys("e");
    await sleep_frames(4);

    // content should now have `je`
    is(
      await SpecialPowers.spawn(browser, [], async () => {
        return content.document.getElementById<HTMLInputElement>("input-2")!
          .value;
      }),
      "http://mochi.test:8888/browser/glide/brojewser/base/content/test/mode/input_test.html",
    );

    const [selection_start, selection_end] = await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      return [input.selectionStart, input.selectionEnd];
    });
    is(selection_start, 42);
    is(selection_end, 42);
  });
});

add_task(async function test_j_cancel_by_escape() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    await keys("j");
    await sleep_frames(2);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-2")!
        .value;
    });
    is(
      value,
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Partial insert mapping matches should insert the key",
    );

    await keys("<esc>");
    await sleep_frames(3);
    is(GlideBrowser.state.mode, "normal", "Esc after a single j should go to normal mode");

    // content should be back to original
    is(
      await SpecialPowers.spawn(browser, [], async () =>
        content.document.getElementById<HTMLInputElement>("input-2")!.value),
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Escape should keep partial j insertion",
    );

    const [selection_start, selection_end] = await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      return [input.selectionStart, input.selectionEnd];
    });
    is(selection_start, 41);
    is(selection_end, 41);
  });
});

add_task(async function test_jj_switching_elements() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.value = "foo";
      input.focus();
    });

    await keys("fj");
    await sleep_frames(5);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById<HTMLInputElement>("input-1")!
        .value;
    });
    is(value, "foofj", "Partial insert mapping matches should insert the key");

    // start a new context
    await keys("<esc>");
    await sleep_frames(3);

    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-2")!;
      input.value = "other";
      input.focus();
    });

    await sleep_frames(3);
    await keys("j");
    await sleep_frames(4);

    const [first_value, second_value] = await SpecialPowers.spawn(browser, [], async () => {
      return [
        content.document.getElementById<HTMLInputElement>("input-1")!.value,
        content.document.getElementById<HTMLInputElement>("input-2")!.value,
      ];
    });

    is(first_value, "foofj", "first content should be the same as before");
    is(second_value, "otherj", "second content should have j inserted");
  });
});

add_task(async function test_mapped_keys_no_events() {
  await BrowserTestUtils.withNewTab(KEYS_TEST_URI, async browser => {
    await GlideTestUtils.reload_config(function _() {
      try {
        glide.keymaps.del("normal", "m");
      } catch {}
    });

    // verify the event listeners are working by sending an unmapped key
    await keys("m");
    await sleep_frames(2);
    let captured_events = await SpecialPowers.spawn(browser, [], async () => {
      return {
        keydown: content.document.getElementById("keydown-events")!.children.length,
        keypress: content.document.getElementById("keypress-events")!.children.length,
        keyup: content.document.getElementById("keyup-events")!.children.length,
      };
    });
    is(captured_events.keydown, 1, "Unmapped key should trigger keydown");
    is(captured_events.keypress, 1, "Unmapped key should trigger keypress");
    is(captured_events.keyup, 1, "Unmapped key should trigger keyup");

    // mapped key sequence
    await keys("..");
    await sleep_frames(2);
    captured_events = await SpecialPowers.spawn(browser, [], async () => {
      return {
        keydown: content.document.getElementById("keydown-events")!.children.length,
        keypress: content.document.getElementById("keypress-events")!.children.length,
        keyup: content.document.getElementById("keyup-events")!.children.length,
      };
    });
    is(captured_events.keydown, 1, "Mapped key sequence should not trigger additional keydown");
    is(captured_events.keypress, 1, "Mapped key sequence should not trigger additional keypress");
    is(captured_events.keyup, 1, "Mapped key sequence should not trigger additional keyup");
  });
});

add_task(async function test_Escape_to_exit_fullscreen() {
  const { DOMFullscreenTestUtils } = ChromeUtils.importESModule(
    "resource://testing-common/DOMFullscreenTestUtils.sys.mjs",
  );

  DOMFullscreenTestUtils.init(
    // @ts-ignore
    this,
    window,
  );

  await BrowserTestUtils.withNewTab(FULLSCREEN_TEST_URI, async browser => {
    // basic
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    is(window.fullScreen, true, "window should now be in full screen mode");

    await keys("<esc>");

    await DOMFullscreenTestUtils.waitForFullScreenState(browser, false);
    is(window.fullScreen, false, "window should not be in full screen mode after pressing Escape");

    // <Esc> from insert mode will still exit full screen, because this is a better
    // default for now asI think the more common case for DOM full screen will be
    // when playing videos, where being able to press `<Esc>` once to exit full screen
    // is much more intuitive.
    //
    // in the future, this should likely be updated to check if the user is focused,
    // on an input element, as `<Esc>` *should* mean switch to normal mode in that case.
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    is(window.fullScreen, true, "window should now be in full screen mode");

    await SpecialPowers.spawn(browser, [], async () => content.document.getElementById("input-1")!.focus());
    await sleep_frames(1);
    await keys("ab<esc>");
    await sleep_frames(1);
    is(window.fullScreen, false, "window not be in full screen mode");
  });
});

add_task(async function test_d_op_pending_q_normal() {
  // Test that pressing "d" enters op-pending mode and then pressing "q" goes back to normal mode because q is not mapped
  await keys("d");
  await sleep_frames(4);
  is(GlideBrowser.state.mode, "op-pending", "Pressing 'd' enters op-pending mode");
  await keys("q");
  await sleep_frames(4);
  is(GlideBrowser.state.mode, "normal", "Pressing 'q' in op-pending mode returns to normal mode");
});

add_task(async function test_mapping_user_gesture_activation() {
  await BrowserTestUtils.withNewTab(CLIPBOARD_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.keymaps.set("normal", "yc", async () => {
        await glide.content.execute(async () => {
          const button = document!.getElementById("copy-button") as HTMLButtonElement;
          button.click();
        }, { tab_id: await glide.tabs.active() });

        glide.g.test_checked = true;
      });
    });

    await keys("yc");
    await sleep_frames(10);

    // clicking the button should attempt to copy the contents of a `<textarea>` to
    // the clipboard which will only work if user gestures were recently registered.
    is(await navigator.clipboard.readText(), "This is the test content to copy");
  });
});

add_task(async function test_buf_local_keymaps_override_global() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.invoked_buffer = 0;
      glide.g.invoked_global = 0;

      glide.keymaps.set("normal", "q", () => {
        glide.g.invoked_global!++;
      });

      glide.buf.keymaps.set("normal", "q", () => {
        glide.g.invoked_buffer!++;
      });
    });

    await keys("q");
    await sleep_frames(3);
    is(glide.g.invoked_buffer, 1, "Buffer-local mapping should be executed in the originating buffer");
    is(glide.g.invoked_global, 0, "Global mapping should be shadowed by the buffer-local mapping");

    // Open a new tab to clear buffer-local mappings.
    const new_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, KEYS_TEST_URI);

    await keys("q");
    await sleep_frames(3);
    is(glide.g.invoked_buffer, 1, "Buffer-local mapping should not fire in a different buffer");
    is(glide.g.invoked_global, 1, "Global mapping should be executed in buffers without a buffer-local override");

    BrowserTestUtils.removeTab(new_tab);
  });
});

add_task(async function test_global_keymaps_can_be_deleted_in_buf() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.invoked_buffer = 0;
      glide.g.invoked_global = 0;

      glide.keymaps.set("normal", "q", () => {
        glide.g.invoked_global!++;
      });

      glide.buf.keymaps.del("normal", "q");
    });

    await keys("q");
    await sleep_frames(3);
    is(glide.g.invoked_buffer, 0, "No mapping should be invoked");
    is(glide.g.invoked_global, 0, "Global mapping should be deleted");

    // Open a new tab to clear buffer-local mappings.
    const new_tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, KEYS_TEST_URI);

    await keys("q");
    await waiter(() => glide.g.invoked_global).is(
      1,
      "Global mapping should be executed in buffers without a buffer-local deletion",
    );
    is(glide.g.invoked_buffer, 0, "No mapping should be invoked");

    BrowserTestUtils.removeTab(new_tab);
  });
});

add_task(async function test_buf_keymaps_registered_after_config_reload() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.g.invoked_buffer = 0;
      glide.g.invoked_global = 0;
      glide.g.invoked_after_reload = 0;

      glide.keymaps.set("normal", "t", () => {
        glide.g.invoked_global!++;
      });

      glide.buf.keymaps.set("normal", "t", () => {
        glide.g.invoked_buffer!++;
      });

      glide.buf.keymaps.set("normal", "r", () => {
        glide.g.invoked_buffer!++;
      });
    });

    await keys("t");
    await waiter(() => glide.g.invoked_buffer).is(1, "Initial buffer keymap should work");
    is(glide.g.invoked_global, 0, "Global keymap should be overridden");

    // Reload config with different buffer keymaps
    await GlideTestUtils.reload_config(function _() {
      glide.g.invoked_buffer = 0;
      glide.g.invoked_global = 0;
      glide.g.invoked_after_reload = 0;

      glide.keymaps.set("normal", "t", () => {
        glide.g.invoked_global!++;
      });

      // Add a new buffer keymap after reload
      glide.buf.keymaps.set("normal", "u", () => {
        glide.g.invoked_after_reload!++;
      });

      // Keep one of the original keymaps
      glide.buf.keymaps.set("normal", "r", () => {
        glide.g.invoked_buffer!++;
      });
    });

    await keys("t");
    await waiter(() => glide.g.invoked_global).is(1, "Global keymap should now be active");
    is(glide.g.invoked_buffer, 0, "Old buffer keymap should not fire");

    // Test that new buffer keymap 'u' works
    await keys("u");
    await waiter(() => glide.g.invoked_after_reload).is(1, "New buffer keymap registered after reload should work");

    // Test that kept buffer keymap 'r' still works
    await keys("r");
    await waiter(() => glide.g.invoked_buffer).is(1, "Kept buffer keymap should still work after reload");

    // Open new tab to verify buffer keymaps don't leak
    await BrowserTestUtils.withNewTab(KEYS_TEST_URI, async _ => {
      await keys("u");
      is(glide.g.invoked_after_reload, 1, "Buffer keymap should not fire in new tab");

      await keys("t");
      await waiter(() => glide.g.invoked_global).is(2, "Global keymap should work in new tab");
    });
  });
});

add_task(async function test_shift_with_another_modifier() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      glide.keymaps.set("normal", "<D-S-c>", () => {
        glide.g.value = true;
      });
    });

    await keys("<D-S-c>");

    is(glide.g.value, true);
  });
});

// toolkit/content/globalOverlay.js
declare function goQuitApplication(event: any): void;

add_task(async function test_mappings_ignored_with_browser_modals() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.warnOnQuit", true],
      ["browser.warnOnQuitShortcut", true],
    ],
  });

  setTimeout(() => {
    goQuitApplication({ metaKey: true, ctrlKey: true });
  }, 0);

  await waiter(() => document.getElementById("main-window")!.getAttribute("window-modal-open")).is("true");

  await sleep_frames(50);
  await keys("<tab><tab><tab>"); // select "cancel"

  // space should trigger the button instead of being used as the actual <leader> when the modal is open
  await keys("<leader>");
  await waiter(() => document.getElementById("main-window")!.getAttribute("window-modal-open")).is(null);
});
