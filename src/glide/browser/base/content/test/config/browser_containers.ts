/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(async function test_containers() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.containers.create({
        name: "my-test",
        color: "red",
        icon: "tree",
      });
    });

    glide.keymaps.set("normal", "Z", () => {
      glide.g.value = glide.containers.remove((glide.g.value as glide.Container).id);
    });
  });

  await keys("~");

  const container = glide.g.value as glide.Container;
  ok(container);
  is(typeof container.id, "number");
  is(container.name, "my-test");
  is(container.icon, "tree");
  is(container.color, "red");
  is(container.cookie_store_id, `firefox-container-${container.id}`);

  await keys("Z");

  is(glide.g.value, true);
});
