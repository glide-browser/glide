// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/// <reference path="../../../dist/api-bundled.d.ts" />

// Valid: no args
glide.content.execute(() => {}, { tab_id: 10 });

// Valid: no args can provide undefined
glide.content.execute(() => {}, { tab_id: 10, args: undefined });

// @ts-expect-error func with args key not provided
glide.content.execute((str: string) => {}, { tab_id: 10 });

// @ts-expect-error func with args but empty args array
glide.content.execute((str: string) => {}, { args: [], tab_id: 10 });

// @ts-expect-error invalid arg type
glide.content.execute((str: string) => {}, { args: [99], tab_id: 10 });

// Valid: valid func with args given
glide.content.execute((str: string) => {}, { args: ["str"], tab_id: 10 });

glide.content.execute((str: string) => {}, {
  // @ts-expect-error too many args given
  args: ["str", "foo"],
  tab_id: 10,
});

glide.content.execute((str: string, num: number) => {}, {
  // @ts-expect-error only providing one arg
  args: ["str"],
  tab_id: 10,
});

// Valid: providing all args
glide.content.execute((str: string, num: number) => {}, { args: ["str", 1], tab_id: 10 });

// Valid: optional arguments not passed
// TODO(glide): is it possible to make `args` not required here?
glide.content.execute((str?: string) => {}, { args: [], tab_id: 10 });

// Valid: optional arguments passed
glide.content.execute((str?: string) => {}, { args: ["foo"], tab_id: 10 });

// @ts-expect-error optional arguments are type checked
glide.content.execute((str?: string) => {}, { args: [1], tab_id: 10 });

glide.keymaps.set("normal", "<up>", "help");
glide.keymaps.set("normal", "0_2", "help");
glide.keymaps.set("normal", "a", "help");
glide.keymaps.set("normal", "Z", "help");
glide.keymaps.set("normal", "5", "help");
glide.keymaps.set("normal", "<up>", "help");
glide.keymaps.set("normal", "<esc>", "help");
glide.keymaps.set("normal", "<F12>", "help");
glide.keymaps.set("normal", "<C-a>", "help");
glide.keymaps.set("normal", "<A-s>", "help");
glide.keymaps.set("insert", "<S-tab>", "help");
glide.keymaps.set("normal", "<C-A-d>", "help");
glide.keymaps.set("normal", "<C-S-v>", "help");
glide.keymaps.set("normal", "gh", "help");
glide.keymaps.set("normal", "gT", "help");
glide.keymaps.set("normal", "gg", "help");
glide.keymaps.set("normal", "g<up>", "help");
glide.keymaps.set("normal", "g<home>", "help");
glide.keymaps.set("normal", "y", "help");
glide.keymaps.set("normal", "<C-k>", "help");
glide.keymaps.set("normal", "x", "help");
glide.keymaps.set("normal", "p", "help");
glide.keymaps.set("normal", "<C-space>", "help");
glide.keymaps.set("normal", "<S-F5>", "help");

// @ts-expect-error empty string
glide.keymaps.set("normal", "", "help");
// @ts-expect-error partially completed modifier
glide.keymaps.set("normal", "<A-", "help");

glide.autocmds.create("ConfigLoaded", () => {});
// @ts-expect-error no callback provided
glide.autocmds.create("ConfigLoaded");

// excmds
// @ts-expect-error no command type defined
glide.excmds.execute("bad_command");

declare global {
  interface ExcmdRegistry {
    my_test_command: {};
  }
}
glide.excmds.execute("my_test_command");

const cmd = glide.excmds.create({ name: "wow_cool", description: "" }, () => {});
declare global {
  interface ExcmdRegistry {
    wow_cool: typeof cmd;
  }
}
glide.excmds.execute("wow_cool");

browser.tabs.query({});

// @ts-expect-error missing args
browser.tabs.query();

function takes_tab(_tab: Browser.Tabs.Tab): void {}

browser.tabs.get(1).then(tab => takes_tab(tab));

// @ts-expect-error invalid arg type
takes_tab({});
