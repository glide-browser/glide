/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

declare var content: TestContent;

const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs");

const INPUT_TEST_URI = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_keys_send_backspace() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("insert", "~", async () => {
      await glide.keys.send("<BS>");
    });
  });

  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.focus();
      input.value = "hello";
    });
    await sleep_frames(3);
    is(GlideBrowser.state.mode, "insert", "Should be in insert mode when input is focused");

    await keys("~");
    await sleep_frames(5);

    is(
      await SpecialPowers.spawn(browser, [], async () => {
        const input = content.document.getElementById<HTMLInputElement>("input-1")!;
        return input.value;
      }),
      "hell",
      "glide.keys.send('<BS>') should delete the text",
    );
  });
});

add_task(async function test_keys_send_space() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    for (const space of [" ", "<space>", "<Space>"]) {
      await SpecialPowers.spawn(browser, [], async () => {
        const input = content.document.getElementById<HTMLInputElement>("input-1")!;
        input.focus();
        input.value = "hello";
      });
      await sleep_frames(3);
      is(GlideBrowser.state.mode, "insert", "Should be in insert mode when input is focused");

      await glide.keys.send(`${space}world`);
      await sleep_frames(10);

      is(
        await SpecialPowers.spawn(browser, [], async () => {
          const input = content.document.getElementById<HTMLInputElement>("input-1")!;
          return input.value;
        }),
        "hello world",
        `glide.keys.send('${space}') should send a space`,
      );
    }
  });
});

add_task(async function test_keys_send_arrow_keys() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_URI, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const input = content.document.getElementById<HTMLInputElement>("input-1")!;
      input.focus();
      input.value = "hello";
      input.setSelectionRange(5, 5);
    });
    await sleep_frames(3);
    is(GlideBrowser.state.mode, "insert", "Should be in insert mode when input is focused");
    is(
      await SpecialPowers.spawn(browser, [], async () => {
        const input = content.document.getElementById<HTMLInputElement>("input-1")!;
        return input.selectionStart;
      }),
      5,
      "selection should be at the end",
    );

    await glide.keys.send("<left>");
    await sleep_frames(5);

    is(
      await SpecialPowers.spawn(browser, [], async () => {
        const input = content.document.getElementById<HTMLInputElement>("input-1")!;
        return input.selectionStart;
      }),
      4,
      "glide.keys.send('<left>') should move cursor left",
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const textarea = content.document.getElementById<HTMLTextAreaElement>("textarea-1")!;
      textarea.focus();
      textarea.value = "first line\nsecond line";
      textarea.setSelectionRange(11, 11);
    });
    await sleep_frames(3);

    var cursor_pos = await SpecialPowers.spawn(browser, [], async () => {
      const textarea = content.document.getElementById<HTMLTextAreaElement>("textarea-1")!;
      return textarea.selectionStart;
    });
    is(cursor_pos, 11);

    await glide.keys.send("<up>");
    await sleep_frames(5);

    cursor_pos = await SpecialPowers.spawn(browser, [], async () => {
      const textarea = content.document.getElementById<HTMLTextAreaElement>("textarea-1")!;
      return textarea.selectionStart;
    });
    Assert.less(cursor_pos!, 11, `glide.keys.send('<up>') should move cursor up (expected < 11, got ${cursor_pos})`);
  });
});

add_task(async function test_keys_send_downcast() {
  for (
    const [input, key] of [["<lt>", "<"], ["<LT>", "<"], ["<Bar>", "|"], ["<bar>", "|"], ["<Bslash>", "\\"]] as const
  ) {
    void glide.keys.send(input);

    const event = await glide.keys.next();

    is(event.key, key, `glide.keys.send('${input}') should send a '${key}' event`);
  }
});

// dprint-ignore
const KEYS = [
  // single chars
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "=", "+",
  "[", "]", "{", "}", "\\", "|", ";", ":", "'", "\"", ",", ".", "<", ">",
  "/", "?", "`", "~",

  // standard special keys
  "<space>", "<Space>", "<SPACE>", "<tab>", "<Tab>", "<TAB>",
  "<cr>", "<CR>", "<enter>", "<Enter>", "<return>", "<Return>",
  "<esc>", "<Esc>", "<ESC>", "<bs>", "<BS>", "<backspace>", "<Backspace>",
  "<del>", "<Del>", "<DEL>", "<delete>", "<Delete>",
  "<insert>", "<Insert>", "<INSERT>",

  // navigation keys
  "<up>", "<Up>", "<UP>",
  "<down>", "<Down>", "<DOWN>",
  "<left>", "<Left>", "<LEFT>",
  "<right>", "<Right>", "<RIGHT>",
  "<home>", "<Home>", "<HOME>",
  "<end>", "<End>", "<END>",
  "<pageup>", "<PageUp>", "<PageUp>", "<PgUp>",
  "<pagedown>", "<PageDown>", "<PageDown>", "<PgDn>",

  // function keys
  "<F1>", "<F2>", "<F3>", "<F4>", "<F5>", "<F6>",
  "<F7>", "<F8>", "<F9>", "<F10>", "<F11>", "<F12>",

  // control + char
  "<C-a>", "<C-b>", "<C-c>", "<C-d>", "<C-e>", "<C-f>", "<C-g>", "<C-h>",
  "<C-i>", "<C-j>", "<C-k>", "<C-l>", "<C-m>", "<C-n>", "<C-o>", "<C-p>",
  "<C-q>", "<C-r>", "<C-s>", "<C-t>", "<C-u>", "<C-v>", "<C-w>", "<C-x>",
  "<C-y>", "<C-z>", "<C-0>", "<C-1>", "<C-2>", "<C-3>", "<C-4>", "<C-5>",
  "<C-6>", "<C-7>", "<C-8>", "<C-9>",

  // control + special keys
  "<C-space>", "<C-Space>", "<C-Up>", "<C-Down>", "<C-Left>", "<C-Right>",
  "<C-Home>", "<C-End>", "<C-PageUp>", "<C-PageDown>", "<C-BS>", "<C-Del>",
  "<C-Enter>", "<C-Tab>",

  // shift + char
  "<S-a>", "<S-b>", "<S-c>", "<S-d>", "<S-e>", "<S-f>", "<S-g>", "<S-h>",
  "<S-i>", "<S-j>", "<S-k>", "<S-l>", "<S-m>", "<S-n>", "<S-o>", "<S-p>",
  "<S-q>", "<S-r>", "<S-s>", "<S-t>", "<S-u>", "<S-v>", "<S-w>", "<S-x>",
  "<S-y>", "<S-z>",

  // shift + special keys
  "<S-space>", "<S-Space>", "<S-Up>", "<S-Down>", "<S-Left>", "<S-Right>",
  "<S-Home>", "<S-End>", "<S-PageUp>", "<S-PageDown>", "<S-Tab>", "<S-Enter>",
  "<S-BS>", "<S-Del>", "<S-F1>", "<S-F2>", "<S-F3>", "<S-F4>", "<S-F5>", "<S-F6>",
  "<S-F7>", "<S-F8>", "<S-F9>", "<S-F10>", "<S-F11>", "<S-F12>",

  // super + char
  "<D-a>", "<D-b>", "<D-c>", "<D-d>", "<D-e>", "<D-f>", "<D-g>", "<D-h>",
  "<D-i>", "<D-j>", "<D-k>", "<D-l>", "<D-m>", "<D-n>", "<D-o>", "<D-p>",
  "<D-q>", "<D-r>", "<D-s>", "<D-t>", "<D-u>", "<D-v>", "<D-w>", "<D-x>",
  "<D-y>", "<D-z>", "<D-0>", "<D-1>", "<D-2>", "<D-3>", "<D-4>", "<D-5>",
  "<D-6>", "<D-7>", "<D-8>", "<D-9>",

  // multiple modifiers
  "<C-S-a>", "<C-S-b>", "<C-S-c>", "<C-S-d>", "<C-S-e>", "<C-S-Up>", "<C-S-Down>",
  "<C-S-Left>", "<C-S-Right>", "<C-S-Home>", "<C-S-End>", "<C-S-Tab>",

  // numberpad
  "<kPlus>", "<kMinus>", "<kMultiply>", "<kDivide>", "<kEnter>", "<kPoint>",
  "<k0>", "<k1>", "<k2>", "<k3>", "<k4>",
  "<k5>", "<k6>", "<k7>", "<k8>", "<k9>",

  // misc
  "<Clear>", "<Pause>", "<ScrollLock>", "<PrintScreen>",
  "<Help>", "<ContextMenu>", "<NumLock>", "<CapsLock>",
  "<AudioVolumeUp>", "<AudioVolumeDown>", "<AudioVolumeMute>",
  "<MediaPlayPause>", "<MediaStop>", "<MediaTrackNext>", "<MediaTrackPrevious>",
  "<BrowserBack>", "<BrowserForward>", "<BrowserRefresh>", "<BrowserStop>",
  "<BrowserSearch>", "<BrowserFavorites>", "<BrowserHome>",
];

// note: this test just verifies that no errors happen when sending the above keys.
//       it does not verify that each key is actually mapped to the right semantics.
add_task(async function test_all_keys() {
  for (const key of KEYS) {
    void glide.keys.send(key);
    const received = await glide.keys.next();
    is(received.glide_key, Keys.normalize(key));
  }
});

add_task(async function test_leader() {
  for (const leader of ["<leader>", "<Leader>"]) {
    void glide.keys.send(leader);
    const key_event = await glide.keys.next();
    is(key_event.key, " ", `${leader} key should be sent as a space`);
  }
});
