// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document & { documentElement: HTMLElement };

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const Mirror = ChromeUtils.importESModule("chrome://glide/content/document-mirror.mjs", { global: "current" });

function create_test_doc(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}
add_task(async function test_initial_dom_structure_mirroring() {
  const source = create_test_doc(`
    <!DOCTYPE html>
    <html>
      <head><title>Test Doc</title></head>
      <body>
        <div id="container">
          <p class="para">Hello <strong>world</strong>!</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      </body>
    </html>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  is(mirror.title, "Test Doc", "Title should be mirrored");
  is(mirror.querySelectorAll("p").length, 1);
  is(mirror.querySelectorAll("li").length, 2);
  is(mirror.querySelector("p.para")!.textContent, "Hello world!");

  const container = mirror.getElementById("container");
  ok(container, "Container should exist");
  is(container.children.length, 2);

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_adding_elements() {
  const source = create_test_doc("<body><div id='root'></div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const new_div = DOM.create_element("div", { id: "new-div", textContent: "New content" }, source);
  source.getElementById("root")?.appendChild(new_div);

  await sleep_frames(20);

  const mirrored_div = mirror.getElementById("new-div");
  ok(mirrored_div, "New div should be mirrored");
  is(mirrored_div.textContent, "New content", "Text content should match");

  const nested = DOM.create_element("span", { className: "nested", textContent: "Nested" }, source);
  new_div.appendChild(nested);

  await sleep_frames(20);

  const mirrored_nested = mirror.querySelector("#new-div .nested");
  ok(mirrored_nested, "Nested element should be mirrored");
  is(mirrored_nested!.textContent, "Nested", "Nested text should match");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_removing_elements() {
  const source = create_test_doc(`
    <body>
      <div id="parent">
        <div id="child1">Child 1</div>
        <div id="child2">Child 2</div>
        <div id="child3">Child 3</div>
      </div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const child2 = source.getElementById("child2")!;
  child2.remove();
  await sleep_frames(20);
  ok(mirror.getElementById("child1"), "Child 1 should still exist");
  ok(!mirror.getElementById("child2"), "Child 2 should be removed from mirror");
  ok(mirror.getElementById("child3"), "Child 3 should still exist");

  const child3 = source.getElementById("child3")!;
  child3.remove();
  await sleep_frames(20);
  ok(mirror.getElementById("child1"), "Child 1 should still exist");
  ok(!mirror.getElementById("child2"), "Child 2 should still not exist");
  ok(!mirror.getElementById("child3"), "Child 3 should be removed");

  source.getElementById("parent")?.remove();

  await sleep_frames(20);

  ok(!mirror.getElementById("parent"), "Parent should be removed");
  ok(!mirror.getElementById("child1"), "Child 1 should be removed");
  ok(!mirror.getElementById("child2"), "Child 2 should still not exist");
  ok(!mirror.getElementById("child3"), "Child 3 should still not exist");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_text_content_changes() {
  const source = create_test_doc(`
    <body>
      <p id="para">Original text</p>
      <div id="div">Div <span>span</span> text</div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const para = source.getElementById("para")!;
  para.textContent = "Changed text";

  await sleep_frames(20);

  is(mirror.getElementById("para")!.textContent, "Changed text", "Text should be updated");

  source.getElementById("div")!.firstChild!.nodeValue = "Modified ";

  await sleep_frames(20);

  is(mirror.getElementById("div")?.textContent, "Modified span text", "Text node should be updated");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_attribute_mutations() {
  const source = create_test_doc(`
    <body>
      <div id="test" class="original" data-value="123"></div>
      <input id="input" type="text" disabled />
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const div = source.getElementById("test")!;
  const input = source.getElementById("input") as HTMLInputElement;

  div.setAttribute("data-new", "value");
  await sleep_frames(20);
  is(mirror.getElementById("test")?.getAttribute("data-new"), "value");

  div.setAttribute("class", "modified");
  await sleep_frames(20);
  is(mirror.getElementById("test")?.className, "modified");

  div.removeAttribute("data-value");
  await sleep_frames(20);
  ok(!mirror.getElementById("test")?.hasAttribute("data-value"));

  ok((mirror.getElementById("input") as HTMLInputElement)!.disabled);
  input.removeAttribute("disabled");
  await sleep_frames(20);
  ok(!(mirror.getElementById("input") as HTMLInputElement)!.disabled);

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_moving_elements() {
  const source = create_test_doc(`
    <body>
      <div id="container1">
        <div id="moveable">Move me</div>
      </div>
      <div id="container2"></div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const moveable = source.getElementById("moveable")!;
  const container2 = source.getElementById("container2")!;
  container2.appendChild(moveable!);

  await sleep_frames(20);

  const mirrored_moveable = mirror.getElementById("moveable");
  is(mirrored_moveable!.parentElement!.id, "container2", "Element should be moved to container2");
  ok(!mirror.querySelector("#container1 #moveable"), "Element should not be in container1");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_reordering_elements() {
  const source = create_test_doc(`
    <body>
      <ul id="list">
        <li id="item1">1</li>
        <li id="item2">2</li>
        <li id="item3">3</li>
      </ul>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const list = source.getElementById("list")!;
  const item1 = source.getElementById("item1")!;
  const item3 = source.getElementById("item3")!;

  list.insertBefore(item1, item3.nextSibling);

  await sleep_frames(20);

  const mirror_list = mirror.getElementById("list");
  const children = Array.from(mirror_list!.children);
  is(children[0]!.id, "item2", "First should be item2");
  is(children[1]!.id, "item3", "Second should be item3");
  is(children[2]!.id, "item1", "Third should be item1");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_complex_nested_mutations() {
  const source = create_test_doc(`
    <body>
      <div id="root">
        <div class="level1">
          <div class="level2">
            <span>Deep content</span>
          </div>
        </div>
      </div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const new_element = source.createElement("div");
  new_element.innerHTML = `
    <article>
      <header><h1>Title</h1></header>
      <section>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </section>
    </article>
  `;
  source.getElementById("root")!.appendChild(new_element);

  await sleep_frames(20);

  ok(mirror.querySelector("article"));
  is(mirror.querySelectorAll("article p").length, 2);
  is(mirror.querySelector("h1")?.textContent, "Title");

  // bidirectional
  mirror.querySelector("article p")!.textContent = "Paragraph x";
  await sleep_frames(20);
  is(mirror.querySelector("article p")!.textContent, "Paragraph x");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_rapid_mutations() {
  const source = create_test_doc("<body><div id='container'></div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const container = source.getElementById("container")!;

  for (let i = 0; i < 10; i++) {
    container.appendChild(DOM.create_element("div", { id: `div${i}`, textContent: `Content ${i}` }, source));
  }

  await sleep_frames(20);

  for (let i = 0; i < 10; i++) {
    const mirrored_div = mirror.getElementById(`div${i}`);
    ok(mirrored_div, `div${i} should exist`);
    is(mirrored_div!.textContent, `Content ${i}`, `div${i} content should match`);
  }

  for (let i = 0; i < 10; i++) {
    source.getElementById(`div${i}`)!.setAttribute("data-index", String(i * 2));
  }

  await sleep_frames(20);

  for (let i = 0; i < 10; i++) {
    is(
      mirror.getElementById(`div${i}`)!.getAttribute("data-index"),
      String(i * 2),
      `div${i} data-index should be updated`,
    );
  }

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_stop_mirroring_cleanup() {
  const source = create_test_doc("<body><div id='test'>Test</div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  Mirror.stop_mirroring(mirror);

  source.getElementById("test")!.setAttribute("data-after", "stop");
  source.body!.appendChild(DOM.create_element("div", { id: "after-stop" }, source));

  await sleep_frames(20);

  ok(!mirror.getElementById("test")?.hasAttribute("data-after"), "Attribute should not be added after stopping");
  ok(!mirror.getElementById("after-stop"), "Element should not be added after stopping");
});

add_task(async function test_re_mirroring() {
  const source = create_test_doc("<body><div id='test'>Original</div></body>");
  const target = document.implementation.createHTMLDocument();

  let mirror = Mirror.mirror_into_document(source, target);
  source.getElementById("test")!.textContent = "First mirror";
  await sleep_frames(20);
  is(mirror.getElementById("test")?.textContent, "First mirror", "First mirror should work");

  is(
    await new Promise(() => Mirror.mirror_into_document(source, target)).catch((e) => String(e)),
    "Error: alreading mirroring, call stop_mirroring() first",
  );

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_empty_text_nodes() {
  const source = create_test_doc("<body><div id='test'></div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const div = source.getElementById("test")!;
  div.appendChild(source.createTextNode(""));
  await sleep_frames(20);

  is(mirror.getElementById("test")!.childNodes.length, 1, "Should have empty text node");

  div.firstChild!.nodeValue = "Now has text";
  await sleep_frames(20);

  is(mirror.getElementById("test")!.textContent, "Now has text", "Text should be updated");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_comment_node_types() {
  const source = create_test_doc("<body><div id='test'><!--comment--></div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  is(mirror.getElementById("test")!.childNodes.length, 1);
  is(mirror.getElementById("test")!.firstChild!.nodeType, Node.COMMENT_NODE, "Should be comment node");
  is(mirror.getElementById("test")!.firstChild!.nodeValue, "comment");

  source.getElementById("test")!.firstChild!.nodeValue = "modified comment";
  await sleep_frames(20);

  is(mirror.getElementById("test")?.firstChild?.nodeValue, "modified comment", "Comment should be updated");

  Mirror.stop_mirroring(mirror);
});

add_task(async function test_document_fragments() {
  const source = create_test_doc("<body><div id='container'></div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const fragment = source.createDocumentFragment();
  for (let i = 0; i < 5; i++) {
    fragment.appendChild(DOM.create_element("div", { id: `frag-${i}`, textContent: `Fragment ${i}` }, source));
  }

  source.getElementById("container")!.appendChild(fragment);

  await sleep_frames(20);

  for (let i = 0; i < 5; i++) {
    const mirrored_div = mirror.getElementById(`frag-${i}`);
    ok(mirrored_div, `Fragment div ${i} should exist`);
    is(mirrored_div!.textContent, `Fragment ${i}`, `Fragment ${i} content should match`);
  }
});

add_task(async function test_replace_document_element() {
  const source = create_test_doc("<body><div id='original'>Original</div></body>");
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const new_body = source.createElement("body");
  new_body.innerHTML = "<div id='new'>New content</div>";
  source.documentElement!.replaceChild(new_body, source.body!);

  await sleep_frames(20);

  ok(!mirror.getElementById("original"), "Original should be gone");
  ok(mirror.getElementById("new"), "New content should exist");
  is(mirror.getElementById("new")!.textContent, "New content", "New content should match");
});

add_task(async function test_simultaneous_mutation_types() {
  const source = create_test_doc(`
    <body>
      <div id="div1">Content 1</div>
      <div id="div2">Content 2</div>
      <div id="div3">Content 3</div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  source.getElementById("div1")?.setAttribute("class", "modified");
  source.getElementById("div2")?.remove();
  source.body!.appendChild(DOM.create_element("div", { id: "div4", textContent: "Content 4" }, source));
  source.getElementById("div3")!.textContent = "Modified 3";

  await sleep_frames(20);

  is(mirror.getElementById("div1")?.className, "modified", "div1 class should be modified");
  ok(!mirror.getElementById("div2"), "div2 should be removed");
  is(mirror.getElementById("div3")?.textContent, "Modified 3", "div3 text should be modified");
  ok(mirror.getElementById("div4"), "div4 should exist");
  is(mirror.getElementById("div4")?.textContent, "Content 4", "div4 content should match");
  is(mirror.getElementById("div4")?.previousElementSibling?.id, "div3", "div4 should be placed after div3");
});

add_task(async function test_insert_before_siblings() {
  const source = create_test_doc(`
    <body>
      <div id="container">
        <div id="first">First</div>
        <div id="third">Third</div>
      </div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  // insert between existing elements
  const container = source.getElementById("container");
  container!.insertBefore(
    DOM.create_element("div", { id: "second", textContent: "Second" }, source),
    source.getElementById("third"),
  );

  await sleep_frames(20);

  const mirror_container = mirror.getElementById("container");
  const children = Array.from(mirror_container!.children);
  is(children.length, 3, "Should have 3 children");
  is(children[0]!.id, "first");
  is(children[1]!.id, "second");
  is(children[2]!.id, "third");

  // insert at beginning
  container!.insertBefore(
    DOM.create_element("div", { id: "zeroth", textContent: "Zeroth" }, source),
    container!.firstChild,
  );

  await sleep_frames(20);

  const updatedChildren = Array.from(mirror_container!.children);
  is(updatedChildren[0]?.id, "zeroth");
});

add_task(async function test_whitespace_handling() {
  const source = create_test_doc(`<body>
    <div id="test">
      Text with
      
      multiple lines
      and     spaces
    </div>
  </body>`);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const original_text = source.getElementById("test")?.textContent;
  const mirrored_text = mirror.getElementById("test")?.textContent;

  is(mirrored_text, original_text, "Whitespace should be preserved exactly");

  const div = source.getElementById("test");
  div!.firstChild!.nodeValue = "\n\t\tTabbed content\n";

  await sleep_frames(20);

  is(
    mirror.getElementById("test")?.firstChild?.nodeValue,
    "\n\t\tTabbed content\n",
    "Modified whitespace should match",
  );
});

add_task(async function test_replace_node_type() {
  const source = create_test_doc(`
    <body>
      <div id="container">
        <span id="replaceme">I'm a span</span>
      </div>
    </body>
  `);
  const mirror = Mirror.mirror_into_document(source, document.implementation.createHTMLDocument());

  const container = source.getElementById("container")!;
  container.replaceChild(
    DOM.create_element("div", {
      id: "replaced",
      textContent: "I'm a div now",
    }, source),
    source.getElementById("replaceme")!,
  );

  await sleep_frames(20);

  ok(!mirror.getElementById("replaceme"), "Old span should be gone");
  const replaced = mirror.getElementById("replaced");
  ok(replaced, "New div should exist");
  is(replaced!.tagName, "DIV", "Should be a DIV element");
  is(replaced!.textContent, "I'm a div now", "Content should match");
});
