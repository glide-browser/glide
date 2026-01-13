// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

declare var document: Document;
declare var content: TestContent;

add_task(async function test_create_element_attributes() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      document.body!.appendChild(DOM.create_element("div", { attributes: { foo: "bar" } }));
      glide.g.value = document.body!.lastElementChild!.getAttribute("foo");
    });
  });

  await glide.keys.send("~");
  is(glide.g.value, "bar");
});

add_task(async function test_create_element_children_shorthand() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      document.body!.appendChild(DOM.create_element("div", ["foo", DOM.create_element("span", ["text"])]));

      const element = document.body!.lastElementChild!;
      assert(element.childNodes.length === 2);
      assert(element.childNodes[0]?.textContent === "foo");
      assert(element.childNodes[1]?.nodeName === "SPAN");
      assert(element.childNodes[1]?.textContent === "text");

      glide.g.test_checked = true;
    });
  });

  await glide.keys.send("~");
  await until(() => glide.g.test_checked);
});

add_task(async function test_create_element_children_shorthand_with_props() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      document.body!.appendChild(
        DOM.create_element("div", [DOM.create_element("span", ["text"])], { attributes: { foo: "modified" } }),
      );

      const element = document.body!.lastElementChild!;
      assert(element.getAttribute("foo") === "modified");
      assert(element.childNodes.length === 1);
      assert(element.childNodes[0]?.nodeName === "SPAN");
      assert(element.childNodes[0]?.textContent === "text");

      glide.g.test_checked = true;
    });
  });

  await glide.keys.send("~");
  await until(() => glide.g.test_checked);
});

add_task(async function test_create_element_children_shorthand_mutually_exclusive() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      try {
        DOM.create_element("div", ["child"], { children: ["bar"] });
      } catch (err) {
        glide.g.value = String(err);
      }
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("Error: Cannot pass both a `children` array and `props.children`");
});

add_task(async function test_create_element_props_cannot_pass_both() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      try {
        DOM.create_element("div", { id: "other" }, { id: "bar" });
      } catch (err) {
        glide.g.value = String(err);
      }
    });
  });

  await glide.keys.send("~");
  await waiter(() => glide.g.value).is("Error: Cannot pass props twice");
});

add_task(async function test_available_in_content() {
  await reload_config(function _() {
    glide.keymaps.set(
      "normal",
      "~",
      glide.content.fn(async () => {
        document.body!.appendChild(DOM.create_element("div", { id: "my-glide-tester-element" }));
      }),
    );
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await glide.keys.send("~");

    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.getElementById("my-glide-tester-element"),
        "Waiting for keymapping fn to create element",
      );
    });
  });
});
