// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import type { GlideExcmdInfo } from "./browser-excmds-registry.mts";

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
  isnot: typeof isnot;
  isjson: typeof isjson;
  ok: typeof ok;
  notok: typeof notok;
  todo_is: typeof todo_is;
  sleep_frames: typeof sleep_frames;
  EventUtils: typeof EventUtils;
  TestUtils: typeof TestUtils;
  keys: typeof keys;
  gBrowser: typeof gBrowser;
  BrowserTestUtils: typeof BrowserTestUtils;
} = {} as any;

declare var content: TestContent;

const { assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { dedent } = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");

class GlideTestUtilsClass {
  commandline = new GlideCommandLineTestUtils();

  /**
   * Create a new foreground tab with the given URI.
   *
   * Behaves the same as `BrowserTestUtils.openNewForegroundTab()` but also defines
   * `[Symbol.dispose]()` so you can use it with `using`.
   */
  async new_tab(uri?: string): Promise<BrowserTab> {
    const tab = await g.BrowserTestUtils.openNewForegroundTab(g.gBrowser, uri);
    return Object.assign(tab, {
      [Symbol.dispose]() {
        g.BrowserTestUtils.removeTab(tab);
      },
    });
  }

  /**
   * Create a new foreground window.
   *
   * Behaves the same as `BrowserTestUtils.openNewBrowserWindow()` but also defines
   * `[Symbol.dispose]()` so you can use it with `using`.
   */
  async new_window(): Promise<Window & { [Symbol.asyncDispose](): Promise<void> }> {
    const win = await g.BrowserTestUtils.openNewBrowserWindow();
    return Object.assign(win, {
      [Symbol.asyncDispose]() {
        g.BrowserTestUtils.closeWindow(win);
      },
    });
  }

  /**
   * Extracts the function body to a string, writes that to `glide.ts` in
   * the current profile directory and simulates `:config_reload`.
   *
   * Note this means you currently **cannot** capture any variables inside the given
   * function.
   */
  async reload_config(config_fn: () => void): Promise<void> {
    await this.write_config(config_fn);

    // TODO(glide): proper solution for this - we need to do it because otherwise
    //              we'll sometimes get unhandled rejection errors when reloading
    //              the builtin addon.
    await g.sleep_frames(5);
    return await GlideBrowser.reload_config();
  }

  async write_config(config_fn: () => void, path = "glide.ts"): Promise<void> {
    const absolute = PathUtils.join(PathUtils.profileDir, "glide", ...(path.split("/")));
    await IOUtils.makeDirectory(PathUtils.parent(absolute)!, { createAncestors: true, ignoreExisting: true });
    await IOUtils.writeUTF8(absolute, this.#get_function_body(config_fn));
  }

  // `String(func)` but without the enclosing `function $name {}`
  #get_function_body(func: () => void): string {
    const str = func.toString();
    const body = str.substring(str.indexOf("{") + 1, str.lastIndexOf("}"));
    return dedent(body).trimEnd();
  }

  async wait_for_mode(mode: GlideMode, name?: string) {
    try {
      await g.TestUtils.waitForCondition(
        () => GlideBrowser.state.mode === mode,
        name ?? `Waiting for mode to be "${mode}" mode`,
      );
    } catch (err) {
      throw new Error(`${err} (current mode: "${GlideBrowser.state.mode}")`, { cause: err });
    }
  }

  async until<R>(cb: () => R | undefined | null, name?: string): Promise<R> {
    await g.TestUtils.waitForCondition(cb, name ?? String(cb), /* interval */ 10, /* max tries */ 500);
    return cb()!;
  }

  waiter(getter: () => unknown): GlideTestWaiter {
    const tries = 500;
    const interval = 10;

    const frame_counter = {
      count: -1,
      _stopped: false,
      start() {
        if (this._stopped) return;
        this.count++;
        requestAnimationFrame(this.start.bind(this));
      },
      stop(): number {
        this._stopped = true;
        return this.count;
      },
    };
    frame_counter.start();

    // like `TestUtils.waitForCondition()` but includes the last value returned by the getter
    // in the timeout error, so that failures are actually debuggable from the logs.
    async function wait_for(condition: () => Promise<boolean>, name: string, expected: () => string) {
      try {
        await g.TestUtils.waitForCondition(condition, name, interval, tries);
      } catch (err) {
        let actual: string;
        try {
          actual = safe_stringify(await getter());
        } catch (_) {
          actual = "<threw>";
        }
        throw new Error(`${err} (got ${actual}, expected ${expected()})`, { cause: err });
      }
    }

    // values can be XPCOM objects (getters that throw) or cyclic, neither of which `JSON.stringify` likes
    function safe_stringify(value: unknown): string {
      try {
        return JSON.stringify(value) ?? String(value);
      } catch (_) {
        try {
          return String(value);
        } catch (_) {
          return "<unserialisable>";
        }
      }
    }

    return {
      async is(value: unknown, name?: string) {
        await wait_for(
          async () => (await getter()) === value,
          name ?? (String(getter) + ` === ${value}`),
          () => safe_stringify(value),
        );
        g.is(await getter(), value, name);
        return frame_counter.stop();
      },
      async isnot(value, name) {
        await wait_for(
          async () => (await getter()) !== value,
          name ?? (String(getter) + ` !== ${value}`),
          () => `anything but ${safe_stringify(value)}`,
        );
        g.isnot(await getter(), value, name);
        return frame_counter.stop();
      },

      async isjson(value, name) {
        const serialised = JSON.stringify(value, typeof value === "object" && value ? Object.keys(value).sort() : null);

        await wait_for(
          async () => {
            const resolved = await getter();
            return JSON.stringify(
              resolved,
              typeof resolved === "object" && resolved ? Object.keys(resolved).sort() : null,
            ) === serialised;
          },
          name ?? (String(getter) + ` === ${value}`),
          () => serialised,
        );
        g.isjson(await getter(), value, name);
        return frame_counter.stop();
      },

      async ok(message?: string) {
        await wait_for(
          async () => Boolean(await getter()),
          message ?? (String(getter) + ` === <truthy>`),
          () => "<truthy>",
        );
        g.ok(await getter(), message);
        return frame_counter.stop();
      },
      async notok(message?: string) {
        await wait_for(
          async () => !(await getter()),
          message ?? (String(getter) + ` === <not truthy>`),
          () => "<not truthy>",
        );
        g.notok(await getter(), message);
        return frame_counter.stop();
      },
    };
  }

  async wait_for_scroll_stop() {
    const waiter = await this.scroll_waiter();
    return await waiter();
  }

  async scroll_waiter(get_scroll?: () => Promise<[number, number]>): Promise<() => Promise<void>> {
    if (!get_scroll) {
      get_scroll = async function get_scroll(): Promise<[number, number]> {
        return await SpecialPowers.spawn(g.gBrowser.selectedBrowser, [], async () => {
          return [content.window.scrollX, content.window.scrollY];
        });
      };
    }

    const [x, y] = await get_scroll();
    const state = { x, y };

    // how many consecutive samples (each `SAMPLE_FRAMES` apart) the scroll position
    // must be unchanged for before we consider scrolling to have stopped.
    const STABLE_SAMPLES = 3;
    const SAMPLE_FRAMES = 5;

    async function wait_for_scroll_stop() {
      await g.sleep_frames(SAMPLE_FRAMES); // ensure scrolling starts

      await GlideTestUtils.until(async () => {
        let [x, y] = await get_scroll!();

        for (let i = 0; i < STABLE_SAMPLES; i++) {
          await g.sleep_frames(SAMPLE_FRAMES);

          const [new_x, new_y] = await get_scroll!();
          if (new_x !== x || new_y !== y) {
            // we're still scrolling
            state.x = new_x;
            state.y = new_y;
            return false;
          }
        }

        state.x = x;
        state.y = y;
        return true;
      });
    }

    return wait_for_scroll_stop;
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
        await SpecialPowers.spawn(browser, [text, opts.text_start], async (text, text_start) => {
          const textarea = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
          textarea.focus();
          textarea.value = text;

          const pos = text_start === "end" ? textarea.value.length : 1;
          textarea.setSelectionRange(pos, pos);
        });

        await g.sleep_frames(3);

        if (GlideBrowser.state.mode !== "normal") {
          g.EventUtils.synthesizeKey("KEY_Escape");
          await g.TestUtils.waitForCondition(() => GlideBrowser.state.mode === "normal", "Waiting for `normal` mode");
        }
      },

      async is_text(expected_text: string) {
        const text = await SpecialPowers.spawn(browser, [], async () => {
          const textarea = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
          return textarea.value;
        });
        g.is(text, expected_text, `${name}/${assertion_index}`);
      },

      async set_selection(pos: number, expected_char?: string) {
        const char = await SpecialPowers.spawn(browser, [pos], async pos => {
          const el = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
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
        state?: "todo",
      ) {
        await g.keys(motion);
        await g.sleep_frames(3);

        const [position, char] = await SpecialPowers.spawn(browser, [], async () => {
          const textarea = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
          const pos = textarea.selectionStart! - 1;
          return [pos, textarea.value.charAt(pos)];
        });

        (state === "todo" ? g.todo_is : g.is)(position, expected_pos, `${name}/${assertion_index}`);
        (state === "todo" ? g.todo_is : g.is)(char, expected_char, `${name}/${assertion_index}`);
        assertion_index++;

        // set position to expected if this case is still todo so the next case is consistent
        if (state === "todo") {
          await SpecialPowers.spawn(browser, [expected_pos], async expected_pos =>
            (
              content.document.getElementById("textarea-1")! as HTMLTextAreaElement
            ).setSelectionRange(expected_pos + 1, expected_pos + 1));
        }
      },

      async test_edit(
        motion: string,
        expected_text: string,
        expected_pos: number,
        expected_char: string,
      ) {
        if (GlideBrowser.state.mode !== "normal") {
          g.EventUtils.synthesizeKey("KEY_Escape");
          await g.TestUtils.waitForCondition(() => GlideBrowser.state.mode === "normal", "Waiting for `normal` mode");
        }

        await g.keys(motion);
        await g.sleep_frames(3);

        const [text, position] = await SpecialPowers.spawn(browser, [], async () => {
          const textarea = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
          return [textarea.value, textarea.selectionStart! - 1];
        });
        g.is(text, expected_text, `${name}/${assertion_index}`);
        g.is(position, expected_pos, `${name}/${assertion_index}`);
        g.is(text.charAt(position), expected_char, `${name}/${assertion_index}`);
        assertion_index++;
      },

      async test_selection(
        motion: string,
        expected_selection: string,
        state?: "todo",
      ) {
        await g.keys(motion);
        await g.sleep_frames(3);

        const selected_text = await SpecialPowers.spawn(browser, [], async () => {
          const textarea = content.document.getElementById("textarea-1")! as HTMLTextAreaElement;
          return textarea.value.slice(textarea.selectionStart!, textarea.selectionEnd!);
        });
        (state === "todo" ? g.todo_is : g.is)(selected_text, expected_selection, `${name}/${assertion_index}`);
        assertion_index++;
      },
    };
  }

  make_temp_directory(...parts: string[]): nsIFile {
    const file = Services.dirsvc.get("TmpD", Ci.nsIFile);
    for (const part of parts) {
      file.append(part);
      if (!file.exists()) {
        file.create(Ci.nsIFile.DIRECTORY_TYPE, 0o755);
      }
    }
    file.normalize();
    return file;
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
    // override the real options so tests are stable
    const override_excmds: GlideExcmdInfo[] = [
      { name: "examplecmd", description: "This is how you do the thing", content: false, repeatable: false },
      { name: "anothercmd", description: "This is how you do another thing", content: false, repeatable: false },
      { name: "foo", description: "This is how you do foo", content: false, repeatable: false },
    ];
    GlideBrowser._commandline_excmds = override_excmds;
    GlideBrowser.api.autocmds.create("CommandLineExit", () => {
      if (GlideBrowser._commandline_excmds === override_excmds) {
        GlideBrowser._commandline_excmds = null;
      }
      // TODO(someday): remove this autocmd once its been executed once
    });

    await g.keys(":");

    await new Promise(r => requestAnimationFrame(r));

    // opening the commandline should result in insert mode
    await g.TestUtils.waitForCondition(() =>
      document!.getElementById("glide-toolbar-mode-button")!.textContent
        === "command", "Waiting for mode button to show `command` mode");
  }

  get_input_content() {
    return (
      document!.querySelector("[anonid=\"glide-commandline-input\"]") as HTMLInputElement
    ).value;
  }

  current_source_header() {
    const sources = this.#expect_commandline().querySelectorAll(".section-header");
    return Array.from(sources.values()).find(element => !(element!.parentElement! as HTMLElement).hidden)?.textContent;
  }

  visible_rows(): HTMLElement[] {
    return Array.from(this.#expect_commandline().querySelectorAll(".gcl-option")).filter(row =>
      row && !(row as HTMLElement).hidden && !((row.parentElement?.parentElement as HTMLElement)?.hidden)
    ) as HTMLElement[];
  }

  row_cmd(n: number): string | null | undefined {
    return this.visible_rows()[n]?.children[0]?.textContent;
  }

  focused_row() {
    const focused_rows = this.#expect_commandline().querySelectorAll(".focused");
    if (focused_rows.length > 1) {
      g.is(focused_rows.length, 1, "Only one command should be selected");
    }

    return focused_rows[0];
  }

  get_element(): GlideCommandLine | undefined {
    return document!.querySelector("glide-commandline") as
      | GlideCommandLine
      | undefined;
  }

  #expect_commandline(): GlideCommandLine {
    return assert_present(this.get_element(), "no glide-commandline element found");
  }
}

export const GlideTestUtils = new GlideTestUtilsClass();
