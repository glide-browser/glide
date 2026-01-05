// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

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

    await wait_for_mode("normal", "Mode should return to 'normal' after pressing Escape");
    Assert.strictEqual(get_hints().length, 0, "Hints should be removed after exiting hint mode");
  });
});

add_task(async function test_F_shows_hints() {
  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("F");
    await wait_for_hints();
    is(GlideBrowser.state.mode, "hint", "Mode should be 'hint' after pressing 'F'");
    Assert.greater(get_hints().length, 0, "Hints should be visible on the page");

    await keys("<esc>");
    await wait_for_mode("normal");
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

    await wait_for_mode("normal");
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
    await wait_for_mode("normal");

    await waiter(() => gBrowser.selectedBrowser?.currentURI.spec).is(FILE);

    await sleep_frames(3);
  });
});

add_task(async function test_auto_activate_single_hint__action() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () =>
      glide.hints.show({
        auto_activate: true,
        action() {
          glide.g.value = true;
        },
      }));
  });

  await BrowserTestUtils.withNewTab(SINGLE_HINT_FILE, async _ => {
    await keys("f");
    await wait_for_mode("normal");

    await waiter(() => glide.g.value).ok("executing the hint should execute the action() function");
  });
});

add_task(async function test_auto_activate_always() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () =>
      glide.hints.show({
        auto_activate: "always",
        pick({ hints }) {
          glide.g.value2 = hints.length;
          return hints;
        },
        action() {
          glide.g.value = true;
        },
      }));
  });

  await BrowserTestUtils.withNewTab(FILE, async _ => {
    await keys("f");
    await wait_for_mode("normal");

    await waiter(() => glide.g.value2).ok();
    Assert.greater(glide.g.value2, 1, "more than 1 hint should be generated");

    await waiter(() => glide.g.value).ok("auto_activate: 'always' should execute immediately even with multiple hints");
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
        pick: ({ hints }) => {
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
      const summary = content.document.getElementById("summary-1")!;
      summary.scrollIntoView();
      return (summary as any).parentElement!.open;
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
      () => (content.document.getElementById("summary-1")!.parentElement! as any).open,
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

add_task(async function test_pick_hint_chars() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_chars = "abc";

    glide.keymaps.set("normal", "f", () => {
      glide.hints.show({
        pick: ({ hints }) => hints.slice(0, 2),
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints.length, 2);
    is(hints[0]?.label, "a");
    is(hints[1]?.label, "b");

    await keys("<esc>");
  });
});

add_task(async function test_hint_pick__content() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () => {
      glide.hints.show({
        pick: async ({ hints, content }) => {
          const texts = await content.map((element) => element.textContent ?? "");
          assert(Array.isArray(texts));
          assert(texts.length === 2);
          glide.g.value = texts;
          return hints;
        },
      });
    });
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <a id="s1" onclick="this.textContent = 's1-modified'">s1</a>
      <a id="s2" onclick="this.textContent = 's2-modified'">s2</a>
    </body>
    </html>
  `;

  await BrowserTestUtils.withNewTab("data:text/html," + encodeURI(html), async browser => {
    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints.length, 2);
    isjson(glide.g.value, ["s1", "s2"]);

    await keys(hints[0]!.label);

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.getElementById("s1")?.textContent === "s1-modified",
        "executing the hint should modify the element",
      );
    });
  });
});

add_task(async function test_hint_generator_config() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_label_generator = ({ hints }) => {
      return ["foo", "bar", "baz"].slice(0, hints.length);
    };
    glide.keymaps.set("normal", "f", () => {
      glide.hints.show({
        pick: ({ hints }) => hints.slice(0, 2),
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints[0]?.label, "foo");
    is(hints[1]?.label, "bar");
    is(hints.length, 2);
    await keys("<esc>");
  });
});

add_task(async function test_numeric_hint_generator() {
  await GlideTestUtils.reload_config(function _() {
    glide.o.hint_label_generator = glide.hints.label_generators.numeric;
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    const initial_tab_count = gBrowser.tabs.length;
    await keys("F");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints[0]?.label, "1");
    is(hints[1]?.label, "2");
    is(hints[9]?.label, "10");

    await keys("1<CR>");
    await sleep_frames(3);

    const final_tab_count = gBrowser.tabs.length;
    is(final_tab_count, initial_tab_count + 1, "<CR> should select first hint");
    is(GlideBrowser.state.mode, "normal", "Mode should return to 'normal' after following hint");

    if (final_tab_count > initial_tab_count) {
      gBrowser.removeTab(gBrowser.selectedTab);
    }
  });
});

add_task(async function test_hint_generator__content() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "f", () => {
      glide.hints.show({
        label_generator: async ({ content }) => {
          const texts = await content.map((element) => element.textContent ?? "");
          assert(Array.isArray(texts));
          assert(texts.length === 2);
          return texts;
        },
        pick: ({ hints }) => hints.slice(0, 2),
      });
    });
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <a id="s1" onclick="this.textContent = 's1-modified'">s1</a>
      <a id="s2" onclick="this.textContent = 's2-modified'">s2</a>
    </body>
    </html>
  `;

  await BrowserTestUtils.withNewTab("data:text/html," + encodeURI(html), async browser => {
    await keys("f");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints.length, 2);
    is(hints[0]!.label, "s1");
    is(hints[1]!.label, "s2");

    await keys("s1");

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.getElementById("s1")?.textContent === "s1-modified",
        "executing the hint should modify the element",
      );
    });
  });
});

add_task(async function test_hint_action_function__basic() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.hints.show({
        selector: "a",
        async action({ content }) {
          const href = await content.execute(async (target) => (target as HTMLAnchorElement).href);
          glide.g.value = href;
        },
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("~");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    Assert.greater(hints.length, 0, "Should have resolved some hints");
    await keys(hints[0]!.label);

    await waiter(() => typeof glide.g.value).is("string");

    is(glide.g.value, "http://mochi.test:8888/browser/glide/browser/base/content/test/hints/hints_test.html#section1");
  });
});

add_task(async function test_hint_action_function__multiple_calls() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.hints.show({
        selector: "a",
        async action({ content }) {
          const result1 = await content.execute((target) => (target as HTMLAnchorElement).href);
          const result2 = await content.execute((target) => (target as HTMLAnchorElement).href);
          glide.g.value = [result1, result2];
        },
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("~");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    Assert.greater(hints.length, 0, "Should have resolved some hints");
    await keys(hints[0]!.label);

    await waiter(() => glide.g.value).ok();

    isjson(glide.g.value, [
      "http://mochi.test:8888/browser/glide/browser/base/content/test/hints/hints_test.html#section1",
      "http://mochi.test:8888/browser/glide/browser/base/content/test/hints/hints_test.html#section1",
    ]);
  });
});

add_task(async function test_hint_action_function__complex_return() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.hints.show({
        selector: "a",
        async action({ content }) {
          const value = await content.execute(async (target) => ({ id: target.id, arr: [1, 2, 3] }));
          glide.g.value = value;
        },
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("~");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    Assert.greater(hints.length, 0, "Should have resolved some hints");
    await keys(hints[0]!.label);

    await waiter(() => glide.g.value).ok();
    isjson(glide.g.value, { id: "", arr: [1, 2, 3] });
  });
});

add_task(async function test_hint_action_function__bad_return() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.hints.show({
        selector: "a",
        async action({ content }) {
          await content.execute(async (target) => target).catch((err) => {
            assert((err as Error).name === "DataCloneError");
            glide.g.value = String(err);
          });
        },
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async _browser => {
    await keys("~");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    Assert.greater(hints.length, 0, "Should have resolved some hints");
    await keys(hints[0]!.label);

    await waiter(() => glide.g.value).ok("Returning a HTMLElement should error");

    is(
      String(glide.g.value),
      "DataCloneError: Could not clone hint action() return value; Only JSON serialisable values can be returned",
    );
  });
});

add_task(async function test_clear_no_hints_notification_on_retrigger() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", () => glide.hints.show({ selector: "[data-no-such-element]" }));
  });

  await BrowserTestUtils.withNewTab(FILE, async (_) => {
    await keys("~");

    await waiter(() => gNotificationBox.getNotificationWithValue("glide-no-hints-found")).ok(
      "Waiting for 'No hints found' notification to appear",
    );

    await keys("f");
    await wait_for_hints();

    await waiter(() => gNotificationBox.getNotificationWithValue("glide-no-hints-found")).is(
      null,
      "Notification should be cleared when hints are successfully found",
    );

    Assert.greater(get_hints().length, 0, "Hints should be visible");

    await keys("<esc>");
  });
});

add_task(async function test_yf_copies_link_url() {
  await GlideTestUtils.reload_config(function _() {});

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <a id="link1" href="https://example.com/page1">Link 1</a>
      <a id="link2" href="https://example.com/page2">Link 2</a>
      <a id="link3" href="https://example.com/page3">Link 3</a>
      <a id="link4" href="mailto:test@example.com">Email Link</a>
      <a id="link5" href="tel:1234567890">Phone Link</a>
      <a id="link6" href="sms:1234567890">SMS Link</a>
      <input id="input1" type="text" value="Input 1">
      <button id="button1">Button 1</button>
      <textarea id="textarea1">Textarea 1</textarea>
    </body>
    </html>
  `;

  await BrowserTestUtils.withNewTab("data:text/html," + encodeURI(html), async () => {
    await keys("f");
    await wait_for_hints();
    const initial_hints = GlideHints.get_active_hints();
    is(initial_hints.length, 9, "Hints should be visible on the page");
    await keys("<esc>");

    await keys("yf");
    await wait_for_hints();

    const hints = GlideHints.get_active_hints();
    is(hints.length, 6, "Should show hints only for links with href, not for input/button/textarea");
    is(GlideBrowser.state.mode, "hint", "Mode should be 'hint' after pressing 'yf'");

    await keys(hints[0]!.label);
    await wait_for_mode("normal");

    let clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, "https://example.com/page1", "First link URL should be copied to clipboard");
    is(GlideBrowser.state.mode, "normal", "Should return to normal mode after copying");

    await keys("yf");
    await wait_for_hints();
    const hints2 = GlideHints.get_active_hints();
    await keys(hints2[2]!.label);
    await wait_for_mode("normal");

    clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, "https://example.com/page3", "Third link URL should be copied to clipboard");

    await keys("yf");
    await wait_for_hints();
    const hints3 = GlideHints.get_active_hints();
    await keys(hints3[3]!.label);
    await wait_for_mode("normal");

    clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, "test@example.com", "Email should be copied to clipboard");

    await keys("yf");
    await wait_for_hints();
    const hints4 = GlideHints.get_active_hints();
    await keys(hints4[4]!.label);
    await wait_for_mode("normal");

    clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, "1234567890", "Phone number should be copied to clipboard");

    await keys("yf");
    await wait_for_hints();
    const hints5 = GlideHints.get_active_hints();
    await keys(hints5[5]!.label);
    await wait_for_mode("normal");

    clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, "1234567890", "Phone number should be copied to clipboard");
  });
});
