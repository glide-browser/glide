/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document;

const FILE =
  "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_focus_input_element_activates_insert_mode() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1").focus();
    });

    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");
    EventUtils.synthesizeKey("r");
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const inputContent = await SpecialPowers.spawn(
      browser,
      [],
      async () => content.document.getElementById("input-1").value
    );

    is(
      inputContent,
      "abcr",
      "key presses should be entered into the input element"
    );
  });
});

add_task(async function test_focus_input_element_while_in_insert_mode() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1").focus();
      content.document.getElementById("input-2").focus();
    });

    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");
    EventUtils.synthesizeKey("r");

    const inputContent = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.requestAnimationFrame(r));
      return content.document.getElementById("input-2").value;
    });

    is(
      inputContent,
      "abcr",
      "key presses should be entered into the input-2 element"
    );
  });
});

add_task(async function test_about_settings_search() {
  await BrowserTestUtils.withNewTab("about:settings", async browser => {
    // search should be focused by default
    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("r");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");

    const inputContent = await SpecialPowers.spawn(
      browser,
      [],
      async () => content.document.getElementById("searchInput").value
    );

    is(
      inputContent,
      "rabc",
      "key presses should be entered into the search element"
    );
  });
});

add_task(async function test_shadow_dom() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () =>
      content.document
        .getElementById("shadow-host")
        .shadowRoot.getElementById("shadow-input")
        .focus()
    );

    // search should be focused after clicking on an input in a shadow dom
    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("r");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");

    const inputContent = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.requestAnimationFrame(r));
      return content.document
        .getElementById("shadow-host")
        .shadowRoot.getElementById("shadow-input").value;
    });

    is(
      inputContent,
      "rabc",
      "key presses should be entered into the search element"
    );
  });
});

add_task(async function test_direct_click_nested_shadow_dom() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () =>
      content.document
        .getElementById("shadow-host")
        .shadowRoot.getElementById("shadow-host-2")
        .shadowRoot.getElementById("shadow-input-2")
        .focus()
    );

    // search should be focused after clicking on an input in a shadow dom
    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("r");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");

    const inputContent = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.requestAnimationFrame(r));
      return content.document
        .getElementById("shadow-host")
        .shadowRoot.getElementById("shadow-host-2")
        .shadowRoot.getElementById("shadow-input-2").value;
    });

    is(
      inputContent,
      "rabc",
      "key presses should be entered into the search element"
    );
  });
});

add_task(async function test_focus_contenteditable_div_textbox_role() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    await SpecialPowers.spawn(browser, [], async () =>
      content.document
        .getElementById("contenteditable-div-with-role-textbox")
        .focus()
    );

    await TestUtils.waitForCondition(
      () =>
        document.getElementById("glide-toolbar-mode-button")!.textContent ===
        "insert",
      "Waiting for mode button to show `insert` mode"
    );

    EventUtils.synthesizeKey("r");
    EventUtils.synthesizeKey("a");
    EventUtils.synthesizeKey("b");
    EventUtils.synthesizeKey("c");

    const inputContent = await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => content.requestAnimationFrame(r));
      return content.document
        .getElementById("contenteditable-div-with-role-textbox")
        .children.item(0).textContent;
    });

    is(
      inputContent.trim().slice(0, 4),
      "rabc",
      "key presses should be entered into the contenteditable div element"
    );
  });
});

add_task(async function test_focus_input_element_in_ignore_mode() {
  await BrowserTestUtils.withNewTab(FILE, async browser => {
    EventUtils.synthesizeKey("KEY_Escape", { shiftKey: true });
    await sleep_frames(1);
    is(GlideBrowser.state.mode, "ignore");

    await SpecialPowers.spawn(browser, [], async () => {
      content.document.getElementById("input-1").focus();
    });
    await sleep_frames(5);
    is(
      GlideBrowser.state.mode,
      "ignore",
      "mode should still be `ignore` even after focusing an element"
    );
  });
});
