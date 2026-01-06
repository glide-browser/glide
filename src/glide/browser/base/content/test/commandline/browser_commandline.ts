// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/commandline/basic.html";
const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_basic_commandline() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    await keys("foo");
    is(GlideTestUtils.commandline.get_input_content(), "foo", "key presses should be entered into the input element");

    await keys("<esc>");
    await wait_for_mode("normal");
    ok(
      document!.querySelector<HTMLElement>("glide-commandline")!.hidden,
      "Commandline should be hidden after pressing escape",
    );
  });
});

add_task(async function test_basic_filtering() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    await keys("ex");
    await waiter(() => GlideTestUtils.commandline.visible_rows().length === 1).ok();

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(visible_rows[0]!.querySelector(".excmd")!.textContent, "examplecmd", "Correct command should be visible");

    await keys("<Backspace><Backspace>");
    await waiter(() => GlideTestUtils.commandline.visible_rows().length === 3).ok();

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await waiter(() => GlideTestUtils.commandline.focused_row()?.children[0]?.textContent).is("examplecmd");
    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter",
    );
  });
});

add_task(async function test_basic_tabbing() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    // tab goes forward
    for (let i = 0; i < visible_rows.length; i++) {
      // the first row should be focused without needing to `tab`
      if (i !== 0) {
        await keys("<tab>");
      }

      const focused_row = GlideTestUtils.commandline.focused_row();
      const visible = visible_rows[i];

      is(focused_row, visible, `Tab should focus row ${i}`);
    }

    // shift+tab goes back
    for (let i = visible_rows.length - 1; i >= 0; i--) {
      await keys("<S-Tab>");
      const focused_row = GlideTestUtils.commandline.focused_row();
      const row_index = i === 0 ? visible_rows.length - 1 : i - 1;
      is(focused_row, visible_rows[row_index], `Shift+Tab should focus row ${row_index}`);
    }

    // filtering maintains selection when possible
    const focused_row = GlideTestUtils.commandline.focused_row();

    await keys("foo");

    ok(focused_row!.classList.contains("focused"), "Selection should be maintained when filtered item remains visible");
  });
});

add_task(async function test_tabs() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await new Promise(r => requestAnimationFrame(r));

    await keys("tab ");

    is(
      GlideTestUtils.commandline.current_source_header(),
      "tabs",
      "entering `tab ` should result in open tab completions",
    );
    let visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 2, "there should only be 2 tab options present");
    is(visible_rows[0]!.querySelector(".url")!.textContent, "about:blank", "Default tab should be the first option");
    is(visible_rows[1]!.querySelector(".url")!.textContent, FILE, "Current tab should be the second option");

    // filtering
    await keys("bas");

    is(GlideTestUtils.commandline.get_input_content(), "tab bas");
    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 1, "there should only be 1 tab option present after filtering");
    is(visible_rows[0]!.querySelector(".url")!.textContent, FILE, "Current tab should be the only option");

    await keys("<Backspace><Backspace><Backspace><Backspace>");
    is(GlideTestUtils.commandline.get_input_content(), "tab");
    is(
      GlideTestUtils.commandline.current_source_header(),
      "ex commands",
      "pressing backspace should result in excmd completions",
    );
    await keys("<esc>");
  });
});

add_task(async function test_excmd_enter() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();
    await waiter(() => GlideTestUtils.commandline.visible_rows().length > 0).ok();

    await keys("ex");
    await waiter(() => GlideTestUtils.commandline.visible_rows().length).is(1);

    let visible_rows = GlideTestUtils.commandline.visible_rows();

    is(visible_rows.length, 1, "Only one command should match 'ex'");
    is(visible_rows[0]!.querySelector(".excmd")!.textContent, "examplecmd", "Correct command should be visible");

    await keys("<Backspace><Backspace>");
    await waiter(() => GlideTestUtils.commandline.visible_rows().length).is(3);

    visible_rows = GlideTestUtils.commandline.visible_rows();
    is(visible_rows.length, 3, "All commands should be shown");

    await waiter(() => GlideTestUtils.commandline.focused_row()?.children[0]?.textContent).is("examplecmd");

    is(
      GlideTestUtils.commandline.focused_row()!.children[0]!.textContent,
      "examplecmd",
      "the focused command should be retained after editing the filter",
    );
  });
});

add_task(async function test_commandline_closes_on_blur() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await GlideTestUtils.commandline.open();

    const commandline = document!.querySelector("glide-commandline") as GlideCommandLine;
    const input = commandline.querySelector<HTMLInputElement>("[anonid=\"glide-commandline-input\"]");

    ok(!commandline.hidden, "Commandline should be visible after opening");
    await waiter(() => document!.activeElement).is(input, "Input should have focus");

    await keys("test");
    is(input!.value, "test", "Input should contain 'test'");

    // Move focus to browser content
    gBrowser.selectedBrowser.focus();
    await waiter(() => commandline.hidden).ok();
    await wait_for_mode("normal");
  });
});

add_task(async function test_commandline_custom_excmd_arguments() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await reload_config(function _() {
      glide.excmds.create({ name: "my_long_command_name", description: "bar" }, ({ args_arr }) => {
        glide.g.value = args_arr;
        glide.g.test_checked = true;
      });
    });

    await keys(":my_long_command_name foo bar");
    await waiter(() => GlideTestUtils.commandline.get_input_content() === "my_long_command_name foo bar").ok();

    await keys("<CR>");

    await TestUtils.waitForCondition(() => glide.g.test_checked === true, "Waiting for excmd to be executed");

    isjson(glide.g.value, ["foo", "bar"], "arguments should be passed to the excmd");
  });
});

add_task(async function test_commandline_tab_reopen() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("<space><space>");
    await waiter(() => GlideTestUtils.commandline.focused_row()?.classList.contains("TabCompletionOption")).ok();

    await keys("<esc>");
    await until(() => GlideBrowser.state.mode === "normal");

    await keys("<space><space>");
    await waiter(() => GlideTestUtils.commandline.focused_row()?.classList.contains("TabCompletionOption")).ok();
  });
});

add_task(async function test_commandline_keymaps() {
  await reload_config(function _() {});

  await reload_config(function _() {
    glide.excmds.create({ name: "foobarbaz" }, () => {});
    glide.keymaps.set("normal", "<leader>~~~", "foobarbaz" as any);
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":foobarbaz");
    await until(() => GlideTestUtils.commandline.focused_row()?.children[0]?.textContent === "foobarbaz");

    is(GlideTestUtils.commandline.focused_row()?.children[2]?.textContent, "<leader>~~~");
  });
});

add_task(async function test_commandline_focus_to_content() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await reload_config(function _() {
      glide.excmds.create({ name: "my_long_command_name", description: "bar" }, ({ args_arr }) => {
        glide.g.value = args_arr;
        glide.g.test_checked = true;
      });
    });

    await keys(":foo");
    await waiter(() => document?.activeElement?.getAttribute("anonid") === "glide-commandline-input").ok();

    is(document?.activeElement?.getAttribute("anonid"), "glide-commandline-input", "commandline should be focused");

    EventUtils.synthesizeKey("KEY_Escape");

    await TestUtils.waitForCondition(
      () => document?.activeElement?.tagName.toLowerCase() === "browser",
      "content should be focused",
    );
  });
});

add_task(async function test_commandline_exit_autocmd() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await reload_config(function _() {
      glide.autocmds.create("CommandLineExit", () => {
        glide.g.test_checked = true;
        glide.g.test_state = glide.ctx.mode;
      });
    });

    await keys(":foo");
    await sleep_frames(5);
    await keys("<esc>");

    await waiter(() => glide.g.test_checked).ok("CommandLineExit autocmd should be triggered");
    is(glide.g.test_state, "normal", "mode when the CommandLineExit autocmd is triggered should be normal");
  });
});

add_task(async function test_commandline_show_api() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.commandline.show();
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await until(() => glide.g.test_checked);

    is(glide.ctx.mode, "command", "the commandline should be open, so the mode should be command");
  });
});

add_task(async function test_commandline_show_api__input() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.commandline.show({ input: "foobarbazbing" });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await until(() => glide.g.test_checked);

    is(glide.ctx.mode, "command", "the commandline should be open, so the mode should be command");
    is(
      GlideTestUtils.commandline.visible_rows().length,
      0,
      "no rows should be visible because the input should be \"foobarbazbing\" which doesn't match anything",
    );
  });
});

add_task(async function test_commandline_show_api__options() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.commandline.show({
        options: Array.from({ length: 10 }, (_, i) => i + 1).map((num) => ({
          label: `Number ${num}`,
          execute() {
            console.log("executing", { num });
            glide.g.value = num;
          },
        })),
      });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await until(() => glide.g.test_checked);

    is(glide.ctx.mode, "command", "the commandline should be open, so the mode should be command");
    is(GlideTestUtils.commandline.visible_rows().length, 10, "all custom options should be present");
    is(
      GlideTestUtils.commandline.focused_row()?.textContent?.trim(),
      "Number 1",
      "the first custom option should be focused",
    );

    await keys("<Enter>");
    await waiter(() => glide.g.value).is(1);

    const commandline = GlideTestUtils.commandline.get_element()!;
    const rendered = commandline.querySelector("[anonid=\"glide-commandline-completions-custom-options\"]");
    is(rendered, null, "The custom options should be removed when the commandline is closed");
  });

  // selecting another option
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await until(() => glide.g.test_checked);

    await keys("<Down><Down>");
    await keys("<Enter>");

    await waiter(() => glide.g.value).is(3);
  });

  // normal commandline should work
  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys(":");
    await wait_for_mode("command");
    isnot(
      GlideTestUtils.commandline.focused_row()?.textContent?.trim(),
      "Number 1",
      "opening the commandline the standard way should not display custom options",
    );
  });
});

add_task(async function test_commandline_show_api__options_matches() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.commandline.show({
        options: Array.from({ length: 10 }, (_, i) => i + 1).map((num) => ({
          label: `Number ${num}`,
          matches: () => num % 2 === 0,
          execute() {
            console.log("executing", { num });
            glide.g.value = num;
          },
        })),
      });
      glide.g.test_checked = true;
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await until(() => glide.g.test_checked);

    is(glide.ctx.mode, "command", "the commandline should be open, so the mode should be command");
    is(GlideTestUtils.commandline.visible_rows().length, 5, "all even custom options should be present");
    is(
      GlideTestUtils.commandline.focused_row()?.textContent?.trim(),
      "Number 2",
      "the second custom option should be focused",
    );

    await keys("<Enter>");
    await waiter(() => glide.g.value).is(2);
  });
});

add_task(async function test_commandline_show_api__options_render() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      await glide.commandline.show({
        title: "custom rendered options",
        options: [
          {
            label: "Option A",
            render() {
              return DOM.create_element("div", {
                attributes: { "data-testid": "custom-render-a" },
                style: { display: "flex", alignItems: "center", gap: "8px" },
                children: [
                  DOM.create_element("span", { className: "custom-icon", children: ["[A]"] }),
                  DOM.create_element("span", { className: "custom-label", children: ["Custom Option A"] }),
                ],
              });
            },
            execute() {
              glide.g.value = "A";
            },
          },
          {
            label: "Option B",
            description: "This uses the default rendering",
            execute() {
              glide.g.value = "B";
            },
          },
        ],
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await wait_for_mode("command");

    is(GlideTestUtils.commandline.current_source_header(), "custom rendered options");
    is(GlideTestUtils.commandline.visible_rows().length, 2, "all custom options should be present");

    // custom render()
    const option_a = GlideTestUtils.commandline.visible_rows()[0];
    is(
      option_a?.querySelector("[data-testid='custom-render-a']")?.querySelector(".custom-icon")?.textContent,
      "[A]",
      "option A should have a custom icon",
    );

    // default render()
    const option_b = GlideTestUtils.commandline.visible_rows()[1];
    ok(option_b?.classList.contains("CustomCompletionOption"), "option B should have default class");
    is(option_b?.querySelector(".label")?.textContent, "Option B", "option B should have default label");

    await keys("<Enter>");
    await waiter(() => glide.g.value).is("A");
  });
});

add_task(async function test_commandline_show_api__options_render__mutations_work() {
  await reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const option_a = DOM.create_element("div", {
        attributes: { "data-testid": "custom-render-a" },
        style: { display: "flex", alignItems: "center", gap: "8px" },
        children: [
          DOM.create_element("span", { className: "custom-icon", children: ["[A]"] }),
          DOM.create_element("span", { className: "custom-label", children: ["Custom Option A"] }),
        ],
      });

      await glide.commandline.show({
        title: "custom rendered options",
        options: [
          {
            label: "Option A",
            render() {
              return option_a;
            },
            matches() {
              option_a.childNodes[0]!.textContent = "[A modified]";
              return null;
            },
            execute() {
              glide.g.value = "A";
            },
          },
          {
            label: "Option B",
            description: "This uses the default rendering",
            execute() {
              glide.g.value = "B";
            },
          },
        ],
      });
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await wait_for_mode("command");

    is(GlideTestUtils.commandline.current_source_header(), "custom rendered options");
    is(GlideTestUtils.commandline.visible_rows().length, 2, "all custom options should be present");

    await keys("aa");
    await keys("<BS><BS>");

    const option_a = GlideTestUtils.commandline.visible_rows()[0];
    is(
      option_a?.querySelector("[data-testid='custom-render-a']")?.querySelector(".custom-icon")?.textContent,
      "[A modified]",
      "option A's element should have a modified icon due to the `matches()` callback",
    );

    await keys("<Enter>");
    await waiter(() => glide.g.value).is("A");
  });
});

add_task(async function test_basic_commandline() {
  await reload_config(function _() {
    glide.keymaps.set("command", "<esc>", "mode_change normal");

    glide.keymaps.set("normal", "~", () => {
      glide.g.value = glide.commandline.is_active();
    });
  });

  await BrowserTestUtils.withNewTab(FILE, async () => {
    await keys("~");
    await waiter(() => glide.g.value).is(false);

    await keys(":<esc>~");
    await waiter(() => glide.g.value).is(true);
  });

  await reload_config(function _() {});
});

add_task(async function test_suggested_command_is_default() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await keys(":profile_dir<CR>");
    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("glide-profile-dir") !== null,
      "Waiting for profile_dir notification to appear",
    );

    const profile_dir = PathUtils.profileDir;

    await keys(":");
    is(GlideTestUtils.commandline.focused_row()?.children[0]?.textContent, "copy");
    is(GlideTestUtils.commandline.visible_rows().length, GlideBrowser.commandline_excmds.length);

    await keys("<CR>");
    await sleep_frames(10);

    const clipboard_text = await navigator.clipboard.readText();
    is(clipboard_text, profile_dir, "Clipboard should contain the profile directory path");

    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("glide-profile-dir") === null,
      "Waiting for notification to be removed after copy",
    );
    is(
      gNotificationBox.getNotificationWithValue("glide-profile-dir"),
      null,
      "Notification should be removed after copying",
    );
  });
});

add_task(async function test_multiple_commands_suggested() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    // Suggest a :copy command.
    await keys(":profile_dir<CR>");
    await TestUtils.waitForCondition(
      () => gNotificationBox.getNotificationWithValue("glide-profile-dir") !== null,
      "Waiting for profile_dir notification to appear",
    );

    // Suggest a :clear command.
    await keys(":set invalid_option some_value<CR>");

    // Suggest a :config_reload command.
    await write_config(function _() {});
    await until(() => gNotificationBox.getNotificationWithValue("glide-config-reload-notification"));

    // Verify that our suggestions are shown in order.
    await keys(":");
    await wait_for_mode("command");
    is(GlideTestUtils.commandline.focused_row()?.children[0]?.textContent, "config_reload");
    is(GlideTestUtils.commandline.row_cmd(0), "config_reload");
    is(GlideTestUtils.commandline.row_cmd(1), "clear");
    is(GlideTestUtils.commandline.row_cmd(2), "copy");
    is(GlideTestUtils.commandline.visible_rows().length, GlideBrowser.commandline_excmds.length);

    // Verify that duplicates are shown in order from most recent.
    await keys("set invalid_option some_value<CR>");
    await keys(":");
    await wait_for_mode("command");
    is(GlideTestUtils.commandline.row_cmd(0), "clear");
    is(GlideTestUtils.commandline.row_cmd(1), "config_reload");
    is(GlideTestUtils.commandline.row_cmd(2), "copy");
    is(GlideTestUtils.commandline.visible_rows().length, GlideBrowser.commandline_excmds.length);
  });
});

add_task(async function test_non_command_not_suggested() {
  await reload_config(function _() {});

  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    GlideBrowser.add_notification("test-notification", {
      label: "Test notification",
      buttons: [
        { label: "test" },
      ],
      priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
    });

    await keys(":");
    await wait_for_mode("command");

    is(GlideTestUtils.commandline.focused_row()?.children[0]?.textContent, "back");
    is(GlideTestUtils.commandline.visible_rows().length, GlideBrowser.commandline_excmds.length);
  });
});
