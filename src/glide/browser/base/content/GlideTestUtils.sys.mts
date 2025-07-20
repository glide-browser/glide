// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// ======================================================================================================
// If you copy code written in test files into this file, you **WILL NEED TO RENAME CERTAIN VARIABLES**.
//
// For example, `is` must be `g.is`, every test specific global **MUST USE `g.$`.
// ======================================================================================================

/**
 * Object mimicking the global scope used for test functions.
 *
 * This is needed as we can't easily add the test specific scope to global variables
 * accessible in this file as the testing framework expects the tests to not leave any
 * global variables around and I could not figure out how to get `delete window[prop]` to
 * actually clean things up always.`
 */
const g: {
  // note: we have to explicitly list out the symbols we want
  //       as there's an LSP bug where it otherwise thinks these
  //       don't exist.
  is: typeof is;
  todo_is: typeof todo_is;
  sleep_frames: typeof sleep_frames;
  EventUtils: typeof EventUtils;
  TestUtils: typeof TestUtils;
} = {} as any;

declare var content: TestContent;

const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { dedent } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/dedent.mjs"
);
const GlideEventUtils = ChromeUtils.importESModule(
  "chrome://glide/content/event-utils.mjs",
  { global: "current" }
);

class GlideTestUtilsClass {
  commandline = new GlideCommandLineTestUtils();

  /**
   * Extracts the function body to a string, writes that to `glide.ts` in
   * the current profile directory and simulates `:config_reload`.
   *
   * Note this means you currently **cannot** capture any variables inside the given
   * function.
   */
  async reload_config(config_fn: () => void): Promise<void> {
    this.write_config(config_fn);

    // TODO(glide): proper solution for this - we need to do it because otherwise
    //              we'll sometimes get unhandled rejection errors when reloading
    //              the builtin addon.
    await g.sleep_frames(5);
    return await GlideBrowser.reload_config();
  }

  write_config(config_fn: () => void, filename = "glide.ts"): void {
    // get config file path & touch it
    let configFile = Services.dirsvc!.QueryInterface!(Ci.nsIProperties).get(
      "ProfD",
      Ci.nsIFile
    );
    configFile.append("glide");
    configFile.append(filename);
    try {
      configFile.remove(/* recursive */ false);
    } catch (_) {}
    configFile.create(Ci.nsIFile.NORMAL_FILE_TYPE!, 0o600);
    console.debug("config file: ", configFile.path);

    // write contents
    var outStream = Cc[
      "@mozilla.org/network/file-output-stream;1"
    ]!.createInstance(Ci.nsIFileOutputStream);
    outStream.init(
      configFile,
      0x02 | 0x08 | 0x20, // write, create, truncate
      0o666,
      0
    );
    const config_str = this.#get_function_body(config_fn);
    outStream.write(config_str, config_str.length);
    outStream.close();
  }

  // `String(func)` but without the enclosing `function $name {}`
  #get_function_body(func: () => void): string {
    const str = func.toString();
    const body = str.substring(str.indexOf("{") + 1, str.lastIndexOf("}"));
    return dedent(body).trimEnd();
  }

  /**
   * Take a given key sequence and synthesize events for each keyn,
   *
   * e.g. `ab<C-d>` will fire three different events, a, b, and ctrl+c
   */
  async synthesize_keyseq(keyseq: string) {
    // note: we intentionally do *not* use the available `EventUtils.synthesizeKey` function
    //       so that we can test our modified version of it in `src/glide/browser/base/content/event-utils.mts`
    await GlideEventUtils.synthesize_keyseq(keyseq);
  }

  async wait_for_mode(mode: GlideMode) {
    await g.TestUtils.waitForCondition(
      () => GlideBrowser.state.mode === mode,
      `Waiting for mode to be "${mode}" mode`
    );
  }

  /**
   * Helpers for setting text inputs, applying motions and expecting caret positions / text.
   */
  make_input_test_helpers(browser: any, opts: { text_start: "end" | number }) {
    let name: string;
    let assertion_index: number;

    return {
      async set_text(text: string, test_name: string) {
        name = test_name;
        assertion_index = 0;
        await SpecialPowers.spawn(
          browser,
          [text, opts.text_start],
          async (text, text_start) => {
            const textarea = content.document.getElementById(
              "textarea-1"
            )! as HTMLTextAreaElement;
            textarea.focus();
            textarea.value = text;

            const pos = text_start === "end" ? textarea.value.length : 1;
            textarea.setSelectionRange(pos, pos);
          }
        );

        await g.sleep_frames(3);

        if (GlideBrowser.state.mode !== "normal") {
          g.EventUtils.synthesizeKey("KEY_Escape");
          await g.TestUtils.waitForCondition(
            () => GlideBrowser.state.mode === "normal",
            "Waiting for `normal` mode"
          );
        }
      },

      async is_text(expected_text: string) {
        const text = await SpecialPowers.spawn(browser, [], async () => {
          const textarea = content.document.getElementById(
            "textarea-1"
          )! as HTMLTextAreaElement;
          return textarea.value;
        });
        g.is(text, expected_text, `${name}/${assertion_index}`);
      },

      async set_selection(pos: number, expected_char?: string) {
        const char = await SpecialPowers.spawn(browser, [pos], async pos => {
          const el = content.document.getElementById(
            "textarea-1"
          )! as HTMLTextAreaElement;
          el.setSelectionRange(pos + 1, pos + 1);
          return el.value.charAt(pos);
        });

        if (expected_char !== undefined) {
          g.is(char, expected_char, `${name}/${assertion_index}/selection`);
        }
      },

      async test_motion(
        motion: string,
        expected_pos: number,
        expected_char: string,
        state?: "todo"
      ) {
        await GlideTestUtils.synthesize_keyseq(motion);
        await g.sleep_frames(3);

        const [position, char] = await SpecialPowers.spawn(
          browser,
          [],
          async () => {
            const textarea = content.document.getElementById(
              "textarea-1"
            )! as HTMLTextAreaElement;
            const pos = textarea.selectionStart! - 1;
            return [pos, textarea.value.charAt(pos)];
          }
        );

        (state === "todo" ? g.todo_is : g.is)(
          position,
          expected_pos,
          `${name}/${assertion_index}`
        );
        (state === "todo" ? g.todo_is : g.is)(
          char,
          expected_char,
          `${name}/${assertion_index}`
        );
        assertion_index++;

        // set position to expected if this case is still todo so the next case is consistent
        if (state === "todo") {
          await SpecialPowers.spawn(
            browser,
            [expected_pos],
            async expected_pos =>
              (
                content.document.getElementById(
                  "textarea-1"
                )! as HTMLTextAreaElement
              ).setSelectionRange(expected_pos + 1, expected_pos + 1)
          );
        }
      },

      async test_edit(
        motion: string,
        expected_text: string,
        expected_pos: number,
        expected_char: string
      ) {
        if (GlideBrowser.state.mode !== "normal") {
          g.EventUtils.synthesizeKey("KEY_Escape");
          await g.TestUtils.waitForCondition(
            () => GlideBrowser.state.mode === "normal",
            "Waiting for `normal` mode"
          );
        }

        await GlideTestUtils.synthesize_keyseq(motion);
        await g.sleep_frames(3);

        const [text, position] = await SpecialPowers.spawn(
          browser,
          [],
          async () => {
            const textarea = content.document.getElementById(
              "textarea-1"
            )! as HTMLTextAreaElement;
            return [textarea.value, textarea.selectionStart! - 1];
          }
        );
        g.is(text, expected_text, `${name}/${assertion_index}`);
        g.is(position, expected_pos, `${name}/${assertion_index}`);
        g.is(
          text.charAt(position),
          expected_char,
          `${name}/${assertion_index}`
        );
        assertion_index++;
      },

      async test_selection(
        motion: string,
        expected_selection: string,
        state?: "todo"
      ) {
        await GlideTestUtils.synthesize_keyseq(motion);
        await g.sleep_frames(3);

        const selected_text = await SpecialPowers.spawn(
          browser,
          [],
          async () => {
            const textarea = content.document.getElementById(
              "textarea-1"
            )! as HTMLTextAreaElement;
            return textarea.value.slice(
              textarea.selectionStart!,
              textarea.selectionEnd!
            );
          }
        );
        (state === "todo" ? g.todo_is : g.is)(
          selected_text,
          expected_selection,
          `${name}/${assertion_index}`
        );
        assertion_index++;
      },
    };
  }

  /**
   * This function is only expected to be called from `testing/mochitets/browser-test.js` so
   * that we can add all of the global variables that are defined in the test functions, into
   * the `g` variable in this test util module.
   *
   * Without this, things like `EventUtils`, `TestUtils` etc would never be accessible.
   */
  __load_globals(obj: any): void {
    Object.assign(g, obj);
  }
}

class GlideCommandLineTestUtils {
  /**
   * Open the commandline with 3 fake options inserted.
   */
  async open() {
    await GlideTestUtils.synthesize_keyseq(":");

    await new Promise(r => requestAnimationFrame(r));

    const commandLine = this.#get_commandline();

    // override the real options so tests are stable
    commandLine.set_completion_options([
      {
        name: "examplecmd",
        description: "This is how you do the thing",
      },
      {
        name: "anothercmd",
        description: "This is how you do another thing",
      },
      {
        name: "foo",
        description: "This is how you do foo",
      },
    ]);

    // opening the commandline should result in insert mode
    await g.TestUtils.waitForCondition(
      () =>
        document!.getElementById("glide-toolbar-mode-button")!.textContent ===
        "command",
      "Waiting for mode button to show `command` mode"
    );
  }

  get_input_content() {
    return (
      document!.querySelector(
        '[anonid="glide-commandline-input"]'
      ) as HTMLInputElement
    ).value;
  }

  current_source_header() {
    const sources = this.#get_commandline().querySelectorAll(".section-header");
    return Array.from(sources.values()).find(
      element => !(element!.parentElement! as HTMLElement).hidden
    )?.textContent;
  }

  visible_rows(): HTMLElement[] {
    return Array.from(
      this.#get_commandline().querySelectorAll(".gcl-option")
    ).filter(row => !(row as HTMLElement).hidden) as HTMLElement[];
  }

  focused_row() {
    const focused_rows = this.#get_commandline().querySelectorAll(".focused");
    g.is(focused_rows.length, 1, "Only one command should be selected");

    return focused_rows[0];
  }

  #get_commandline(): GlideCommandLine {
    return assert_present(
      document!.querySelector("glide-commandline") as
        | GlideCommandLine
        | undefined,
      "no glide-commandline element found"
    );
  }
}

export const GlideTestUtils = new GlideTestUtilsClass();
