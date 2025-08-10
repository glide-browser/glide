// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_basic_message_usage() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async _ => {
    await GlideTestUtils.reload_config(function _() {
      const messenger = glide.messengers.create<{ my_message: never }>((message) => {
        switch (message.name) {
          case "my_message": {
            glide.g.value = "my_message";
            break;
          }

          default: {
            ((_: never) => {})(message.name);
            throw new Error(`unexpected message ${message.name}`);
          }
        }
      });

      glide.keymaps.set("normal", "gt", ({ tab_id }) => {
        messenger.content.execute((messenger) => {
          messenger.send("my_message");
        }, { tab_id });
      });
    });

    await GlideTestUtils.synthesize_keyseq("gt");
    await sleep_frames(10);
    is(GlideBrowser.api.g.value, "my_message", "the message should be sent through to the parent config");
  });
});
