// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";
declare var document: Document;

add_task(async function test_creat_element_attributes() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      document.body!.appendChild(DOM.create_element("div", { attributes: { foo: "bar" } }));
      glide.g.value = document.body!.lastElementChild!.getAttribute("foo");
    });
  });

  await glide.keys.send("~");
  is(glide.g.value, "bar");
});
