/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

const KEYS_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/key_test.html";

const FULLSCREEN_TEST_URI =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/fullscreen_test.html";

add_task(async function test_jj_insert_middle() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    GlideBrowser.key_manager.reset_sequence();

    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById("input-2");
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    EventUtils.synthesizeKey("j");
    await sleep_frames(5);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById("input-2").value;
    });
    is(
      value,
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Partial insert mapping matches should insert the key"
    );

    EventUtils.synthesizeKey("j");
    await sleep_frames(4);

    value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById("input-2").value;
    });

    // content should not have `jj` now
    is(value, INPUT_TEST_URI);

    const [selection_start, selection_end] = await SpecialPowers.spawn(
      browser,
      [],
      async () => {
        const input = content.document.getElementById("input-2");
        return [input.selectionStart, input.selectionEnd];
      }
    );
    is(selection_start, 40);
    is(selection_end, 40);
  });
});

add_task(async function test_jj_insert_end() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    GlideBrowser.key_manager.reset_sequence();
    await sleep_frames(1);

    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById("input-2");
      input.value = uri;
      input.focus();
    });

    await sleep_frames(1);
    EventUtils.synthesizeKey("j");
    await sleep_frames(4);

    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById("input-2").value;
    });
    is(value, INPUT_TEST_URI + "j");

    EventUtils.synthesizeKey("j");
    await sleep_frames(3);

    // content should be the exact same
    is(
      await SpecialPowers.spawn(
        browser,
        [],
        async () => content.document.getElementById("input-2").value
      ),
      INPUT_TEST_URI
    );
    is(
      await SpecialPowers.spawn(browser, [], async () =>
        content.document.getElementById("input-2").matches(":focus")
      ),
      true,
      "input should still have focus"
    );
  });
});

add_task(async function test_jj_partial_cancel_by_other_keypress() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    GlideBrowser.key_manager.reset_sequence();
    await sleep_frames(1);

    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById("input-2");
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    EventUtils.synthesizeKey("j");
    await sleep_frames(1);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById("input-2").value;
    });
    await sleep_frames(2);
    is(
      value,
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html"
    );

    EventUtils.synthesizeKey("e");
    await sleep_frames(4);

    // content should now have `je`
    is(
      await SpecialPowers.spawn(browser, [], async () => {
        return content.document.getElementById("input-2").value;
      }),
      "http://mochi.test:8888/browser/glide/brojewser/base/content/test/mode/input_test.html"
    );

    const [selection_start, selection_end] = await SpecialPowers.spawn(
      browser,
      [],
      async () => {
        const input = content.document.getElementById("input-2");
        return [input.selectionStart, input.selectionEnd];
      }
    );
    is(selection_start, 42);
    is(selection_end, 42);
  });
});

add_task(async function test_j_cancel_by_escape() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    GlideBrowser.key_manager.reset_sequence();
    await sleep_frames(1);

    await SpecialPowers.spawn(browser, [INPUT_TEST_URI], async uri => {
      const input = content.document.getElementById("input-2");
      input.value = uri;
      input.focus();
      input.setSelectionRange(40, 40);
    });

    EventUtils.synthesizeKey("j");
    await sleep_frames(2);
    let value = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.getElementById("input-2").value;
    });
    is(
      value,
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Partial insert mapping matches should insert the key"
    );

    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(3);
    is(
      GlideBrowser.state.mode,
      "normal",
      "Esc after a single j should go to normal mode"
    );

    // content should be back to original
    is(
      await SpecialPowers.spawn(
        browser,
        [],
        async () => content.document.getElementById("input-2").value
      ),
      "http://mochi.test:8888/browser/glide/brojwser/base/content/test/mode/input_test.html",
      "Escape should keep partial j insertion"
    );

    const [selection_start, selection_end] = await SpecialPowers.spawn(
      browser,
      [],
      async () => {
        const input = content.document.getElementById("input-2");
        return [input.selectionStart, input.selectionEnd];
      }
    );
    is(selection_start, 41);
    is(selection_end, 41);
  });
});

add_task(async function test_mapped_keys_no_events() {
  await BrowserTestUtils.withNewTab(KEYS_TEST_URI, async browser => {
    await GlideTestUtils.reload_config(function _() {
      try {
        glide.keymaps.del("normal", "m");
      } catch (_) {}
    });

    // verify the event listeners are working by sending an unmapped key
    EventUtils.synthesizeKey("m");
    await sleep_frames(2);
    let captured_events = await SpecialPowers.spawn(browser, [], async () => {
      return {
        keydown:
          content.document.getElementById("keydown-events").children.length,
        keypress:
          content.document.getElementById("keypress-events").children.length,
        keyup: content.document.getElementById("keyup-events").children.length,
      };
    });
    is(captured_events.keydown, 1, "Unmapped key should trigger keydown");
    is(captured_events.keypress, 1, "Unmapped key should trigger keypress");
    is(captured_events.keyup, 1, "Unmapped key should trigger keyup");

    // mapped key sequence
    EventUtils.synthesizeKey("j");
    EventUtils.synthesizeKey("j");
    await sleep_frames(2);
    captured_events = await SpecialPowers.spawn(browser, [], async () => {
      return {
        keydown:
          content.document.getElementById("keydown-events").children.length,
        keypress:
          content.document.getElementById("keypress-events").children.length,
        keyup: content.document.getElementById("keyup-events").children.length,
      };
    });
    is(
      captured_events.keydown,
      1,
      "Mapped key sequence should not trigger additional keydown"
    );
    is(
      captured_events.keypress,
      1,
      "Mapped key sequence should not trigger additional keypress"
    );
    is(
      captured_events.keyup,
      1,
      "Mapped key sequence should not trigger additional keyup"
    );
  });
});

add_task(async function test_Escape_to_exit_fullscreen() {
  const { DOMFullscreenTestUtils } = ChromeUtils.importESModule(
    "resource://testing-common/DOMFullscreenTestUtils.sys.mjs"
  );

  DOMFullscreenTestUtils.init(
    // @ts-ignore
    this,
    window
  );

  await BrowserTestUtils.withNewTab(FULLSCREEN_TEST_URI, async browser => {
    // basic
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    is(window.fullScreen, true, "window should now be in full screen mode");

    EventUtils.synthesizeKey("KEY_Escape");

    await DOMFullscreenTestUtils.waitForFullScreenState(browser, false);
    is(
      window.fullScreen,
      false,
      "window should not be in full screen mode after pressing Escape"
    );

    // <Esc> from insert mode doesn't exit full screen
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    is(window.fullScreen, true, "window should now be in full screen mode");

    await SpecialPowers.spawn(browser, [], async () =>
      content.document.getElementById("input-1").focus()
    );
    await sleep_frames(1);
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("KEY_Escape");
    await sleep_frames(1);
    is(window.fullScreen, true, "window should still be in full screen mode");
    is(
      await SpecialPowers.spawn(
        browser,
        [],
        async () => content.document.getElementById("input-1").value
      ),
      "ab",
      "input element should have key pressed inserted"
    );

    EventUtils.synthesizeKey("KEY_Escape");
    await DOMFullscreenTestUtils.waitForFullScreenState(browser, false);
    is(
      window.fullScreen,
      false,
      "window should not be in full screen mode after pressing Escape in normal mode"
    );
  });
});

add_task(async function test_d_op_pending_q_normal() {
  // Test that pressing "d" enters op-pending mode and then pressing "q" goes back to normal mode because q is not mapped
  GlideBrowser.key_manager.reset_sequence();
  await sleep_frames(1);

  EventUtils.synthesizeKey("d");
  await sleep_frames(4);
  is(
    GlideBrowser.state.mode,
    "op-pending",
    "Pressing 'd' enters op-pending mode"
  );
  EventUtils.synthesizeKey("q");
  await sleep_frames(4);
  is(
    GlideBrowser.state.mode,
    "normal",
    "Pressing 'q' in op-pending mode returns to normal mode"
  );
});
