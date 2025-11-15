// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/hints/hints_test.html";
const SINGLE_HINT_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/hints/single_hint_test.html";
const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_setup(async () => {
  await keys("<escape>");
  is(GlideBrowser.state.mode, "normal");
  await sleep_frames(3);
});

function get_hints(): HTMLElement[] {
  return Array.from(document!.querySelectorAll(".glide-internal-hint-marker")) as HTMLElement[];
}

async function wait_for_hints(): Promise<HTMLElement[]> {
  await TestUtils.waitForCondition(
    () => get_hints().length > 0,
    "waiting for hints to be shown",
    5, // ms interval
  );
  await sleep_frames(2);
  return get_hints();
}

add_task(async function test_f_shows_hints() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    await wait_for_hints();
    is(GlideBrowser.state.mode, "hint", "Mode should be 'hint' after pressing 'f'");
    Assert.greater(get_hints().length, 0, "Hints should be visible on the page");

    await keys("<escape>");
    await sleep_frames(5);

    is(GlideBrowser.state.mode, "normal", "Mode should return to 'normal' after pressing Escape");
    Assert.strictEqual(get_hints().length, 0, "Hints should be removed after exiting hint mode");
  });
});

add_task(async function test_F_shows_hints() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("F");
    await wait_for_hints();
    is(GlideBrowser.state.mode, "hint", "Mode should be 'hint' after pressing 'F'");
    Assert.greater(get_hints().length, 0, "Hints should be visible on the page");
  });
});

add_task(async function test_hints_follow_link() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    await wait_for_hints();

    const first_hint = get_hints()[0];
    ok(first_hint);
    ok(first_hint.textContent);

    await keys(first_hint.textContent);

    is(GlideBrowser.state.mode, "normal", "Mode should return to 'normal' after following hint");
  });
});

add_task(async function test_F_opens_new_tab() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    const initial_tab_count = gBrowser.tabs.length;

    await keys("F");
    await wait_for_hints();

    const first_hint = get_hints()[0];
    ok(first_hint);
    ok(first_hint.textContent);

    await keys(first_hint.textContent);
    await sleep_frames(3);

    const final_tab_count = gBrowser.tabs.length;
    is(final_tab_count, initial_tab_count + 1, "F key should open a new tab when following hint");

    is(GlideBrowser.state.mode, "normal", "Mode should return to 'normal' after following hint");

    // Clean up: close the new tab
    if (final_tab_count > initial_tab_count) {
      gBrowser.removeTab(gBrowser.selectedTab);
    }
  });
});

add_task(async function test_partial_hint_filtering() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    await wait_for_hints();
    const initial_count = get_hints().length;

    await keys("a");
    const filtered_hints = get_hints().length;

    Assert.lessOrEqual(filtered_hints, initial_count, "Typing should filter hints");
    Assert.greaterOrEqual(filtered_hints, 0, "Should have some hints remaining or none if no matches");
  });
});

add_task(async function test_auto_activate_single_hint() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", "hint --auto");
  });

  await BrowserTestUtils.withNewTab(SINGLE_HINT_FILE, async _ => {
    await keys("f");
    await sleep_frames(5);

    Assert.strictEqual(GlideBrowser.state.mode, "normal", "Should have entered auto-activated to normal");

    is(gBrowser.selectedBrowser?.currentURI.spec, FILE);

    await sleep_frames(3);
  });
});

add_task(async function test_include_selector() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", "hint");
    glide.keymaps.set("normal", "F", "hint --include 'p'");
  });

  await BrowserTestUtils.withNewTab(FILE, async _ => {
    // First, test without --include
    await keys("f");
    await wait_for_hints();
    const standard_hints = get_hints();
    const standard_count = standard_hints.length;

    await keys("<Esc>");
    await sleep_frames(3);

    // Now test with --include
    await keys("F");
    await wait_for_hints();
    await sleep_frames(3);

    const extended_hints = get_hints();
    Assert.greater(
      extended_hints.length,
      standard_count,
      `Extended hints (${extended_hints.length}) should be more than standard hints (${standard_count})`,
    );
  });
});

add_task(async function test_include_click_listeners_option() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () => glide.hints.show({}));
    glide.keymaps.set("normal", "F", () => glide.hints.show({ include_click_listeners: true }));
  });

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], () => {
      content.document.querySelector(".interactive-section")!.scrollIntoView();
    });
    await sleep_frames(5);

    await keys("f");
    const original_hints = await wait_for_hints();
    Assert.greater(original_hints.length, 0, "There should be some hints shown");
    await keys("<Esc>");

    await keys("F");
    const hints = await wait_for_hints();
    Assert.greater(hints.length, original_hints.length, "including listeners should result in more hints");
    ok(gBrowser.$hints?.find((hint) => hint.element_id === "clickable-span"));
    await keys("<Esc>");
  });
});

add_task(async function test_pick_basic() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () =>
      glide.hints.show({
        pick: (hints) => {
          assert(hints.length > 1);
          return [hints[0]!];
        },
      }));
  });

  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    const hints = await wait_for_hints();

    is(hints.length, 1, "only one hint should be returned as that's what our pick function does");

    await keys("<Esc>");
  });
});

add_task(async function test_gI() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await keys("gI");
    await sleep_frames(5);

    var focument_element = await SpecialPowers.spawn(browser, [], () => content.document.activeElement?.id);
    is(focument_element, "vim-test-area", "should focus the largest editable element");

    // make ^ smaller
    await SpecialPowers.spawn(browser, [], () => {
      const textarea = content.document.getElementById("vim-test-area");
      textarea!.style.width = "50px";
      textarea!.style.height = "20px";
    });

    await keys("<Escape>gI");
    await sleep_frames(5);

    var focument_element = await SpecialPowers.spawn(browser, [], () => content.document.activeElement?.id);
    is(focument_element, "contenteditable-div-with-role-textbox", "should focus the largest editable element");
  });
});

add_task(async function test_expandable_content_can_be_hinted() {
  await GlideTestUtils.reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async browser => {
    var is_open = await SpecialPowers.spawn(browser, [], () => {
      const summary = content.document.getElementById("summary-1");
      summary.scrollIntoView();
      return summary.parentElement.open;
    });
    await sleep_frames(10);
    is(is_open, false, "<details> content should be hidden by default");

    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    const summary_hint = hints.find((hint) => hint.element_id === "summary-1");
    ok(summary_hint);

    await keys(summary_hint.label);
    await wait_for_mode("normal");

    var is_open = await SpecialPowers.spawn(
      browser,
      [],
      () => content.document.getElementById("summary-1").parentElement.open,
    );
    is(is_open, true, "<details> content should be open after activating the hint");
  });
});

add_task(async function test_hint_keymaps_are_ignored() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("hint", "f", "keys <esc>");
    glide.keymaps.set("normal", "j", "config_edit");
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("f");
    await wait_for_hints();
    const hints = GlideHints.get_active_hints();
    notok(hints.find(hint => hint.label === "f"), "'f' is hidden when mapped in hint mode");
    ok(hints.find(hint => hint.label === "j"), "'j' is not mapped in hint mode");

    await keys("<esc>");
  });
});

add_task(async function test_hint_keymaps_are_ignored() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_chars = "abc";

    glide.keymaps.set("normal", "f", () => {
      glide.hints.show({
        pick: (hints) => hints.slice(0, 2),
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints[0]?.label, "a");
    is(hints[1]?.label, "b");

    await keys("<esc>");
  });
});
