/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const { is_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

export class ExcmdsCompletionSource implements GlideCompletionSource {
  id = "excmds";

  container = DOM.create_element("div", {
    attributes: { anonid: "glide-comandline-completions-excmd" },
    children: [
      DOM.create_element("div", { className: "section-header", children: ["ex commands"] }),
      DOM.create_element("table", { className: "gcl-table" }),
    ],
  });

  is_enabled() {
    // excmds are always enabled, as this is the fallback source that is checked last
    return true;
  }

  search({ input }: GlideCompletionContext, options: GlideCompletionOption[]) {
    input = input.toLowerCase();
    const space_index = input.indexOf(" ");
    const command_filter = space_index !== -1 ? input.slice(0, space_index) : input;

    options.forEach((option) => {
      const candidates = [
        option.element.querySelector(".excmd")?.textContent,
        option.element.querySelector(".documentation")?.textContent,
      ]
        .map(text => text?.toLowerCase())
        .filter(is_present);

      // TODO(glide): better fuzzy finding
      const matches = candidates.some(candidate => candidate.includes(command_filter));
      option.set_hidden(!matches);
    });
  }

  resolve_options() {
    const source = this;
    const excmd_keymaps = new Map<string, string>();
    for (const keymaps of GlideBrowser.api.keymaps.list("normal")) {
      if (typeof keymaps.rhs === "string") {
        excmd_keymaps.set(keymaps.rhs, keymaps.lhs);
      }
    }

    const options: GlideCompletionOption[] = [];

    for (const command of GlideBrowser.commandline_excmds) {
      const keymap = excmd_keymaps.get(command.name);

      options.push({
        element: DOM.create_element("tr", {
          className: "ExcmdCompletionOption gcl-option",
          children: [
            DOM.create_element("td", { className: "excmd", children: command.name }),
            DOM.create_element("td", { className: "documentation", children: command.description }),
            DOM.create_element("td", { className: "keymap", children: keymap ?? "" }),
          ],
        }),

        async accept(ctx) {
          // if there is no arguments given, then we just use the command for the current option
          const cmd = ctx.input.includes(" ")
            ? ctx.input
            : command.name;

          GlideBrowser._log.debug("commandline: executing", cmd);

          // we can't statically guarantee that the command is valid but `.execute()`
          // will gracefully handle that case with a helpful error message
          await GlideExcmds.execute(cmd as any);
        },

        async delete() {},

        is_focused() {
          return this.element.classList.contains("focused");
        },
        set_focused(focused) {
          if (focused) {
            this.element.classList.add("focused");
          } else {
            this.element.classList.remove("focused");
          }
        },
        is_hidden() {
          return !!source.container.hidden || !!this.element.hidden;
        },
        set_hidden(hidden) {
          this.element.hidden = hidden;
        },
      });
    }

    return options;
  }
}

interface TabCompletionOption extends GlideCompletionOption {
  tab: BrowserTab;
}

export class TabsCompletionSource implements GlideCompletionSource<TabCompletionOption> {
  id = "tabs";

  container = DOM.create_element("div", {
    attributes: { anonid: "glide-commandline-completions-tabs" },
    children: [
      DOM.create_element("div", { className: "section-header", children: ["tabs"] }),
      DOM.create_element("table", { className: "gcl-table" }),
    ],
  });

  is_enabled({ input }: GlideCompletionContext) {
    return input.toLowerCase().startsWith("tab ");
  }

  search({ input }: GlideCompletionContext, options: GlideCompletionOption[]) {
    input = input.toLowerCase();
    const space_index = input.indexOf(" ");
    const args = space_index !== -1 ? input.slice(space_index + 1) : input;

    options.forEach((option) => {
      const candidates = [
        option.element.querySelector(".label")?.textContent,
        option.element.querySelector(".url")?.textContent,
      ]
        .map(text => text?.toLowerCase())
        .filter(is_present);

      // TODO(glide): better fuzzy finding
      const matches = candidates.some(candidate => candidate.includes(args));
      option.set_hidden(!matches);
    });
  }

  resolve_options() {
    const source = this;
    const options: TabCompletionOption[] = [];

    for (const tab of gBrowser.tabContainer.allTabs) {
      const option: TabCompletionOption = {
        tab,

        element: DOM.create_element("tr", {
          className: "TabCompletionOption gcl-option",
          children: [
            DOM.create_element("td", {
              className: "status",
              children: [
                tab.selected ? "*" : null,
                tab.soundPlaying ? "🔊" : null,
                tab.muted ? "M" : null,
                tab.pinned ? "P" : null,
                !tab.linkedPanel ? "U" : null, // unloaded
              ]
                .filter(is_present)
                .join(""),
            }),
            DOM.create_element("td", {
              className: "label",
              children: [
                DOM.create_element("img", {
                  src: tab.image || "chrome://global/skin/icons/defaultFavicon.svg",
                  alt: "icon",
                }),
                tab.label,
              ],
            }),
            DOM.create_element("td", { className: "url", children: tab.linkedBrowser.currentURI.spec }),
          ],
        }),

        async accept() {
          gBrowser.selectedTab = tab;
        },
        async delete() {
          gBrowser.removeTab(this.tab);
          this.set_hidden(true);
        },

        is_focused() {
          return this.element.classList.contains("focused");
        },
        set_focused(focused) {
          if (focused) {
            this.element.classList.add("focused");
          } else {
            this.element.classList.remove("focused");
          }
        },
        is_hidden() {
          return !!source.container.hidden || !!this.element.hidden;
        },
        set_hidden(hidden) {
          this.element.hidden = hidden;
        },
      };

      options.push(option);
    }

    return options;
  }
}

interface CustomCompletionOption extends GlideCompletionOption {
  name: string;
  description: string | null;
}

export class CustomCompletionSource implements GlideCompletionSource<CustomCompletionOption> {
  id = "custom-options";
  readonly container: HTMLElement;

  #input_options: NonNullable<glide.CommandLineShowOpts["options"]>;

  constructor(props: { title?: string; options: NonNullable<glide.CommandLineShowOpts["options"]> }) {
    this.container = DOM.create_element("div", {
      attributes: { anonid: "glide-commandline-completions-custom-options" },
      children: [
        DOM.create_element("div", { className: "section-header", children: [props.title ?? "options"] }),
        DOM.create_element("table", { className: "gcl-table" }),
      ],
    });
    this.#input_options = props.options;
  }

  is_enabled() {
    // if this is configured it should take priority over everything else
    return true;
  }

  search({ input }: GlideCompletionContext, options: CustomCompletionOption[]) {
    input = input.toLowerCase();

    options.forEach((option) => {
      const candidates = [
        option.name,
        option.description,
      ]
        .map(text => text?.toLowerCase())
        .filter(is_present);

      // TODO(glide): better fuzzy finding
      const matches = candidates.some(candidate => candidate.includes(input));
      option.set_hidden(!matches);
    });
  }

  resolve_options() {
    const source = this;
    const options: CustomCompletionOption[] = [];

    for (const opt of this.#input_options) {
      options.push({
        name: opt.label,
        description: opt.description ?? null,

        element: DOM.create_element("tr", {
          className: "CustomCompletionOption gcl-option",
          children: [
            DOM.create_element("td", { className: "label", children: opt.label }),
            DOM.create_element("td", { className: "description", children: opt.description }),
          ],
        }),

        async accept(ctx) {
          opt.execute({ input: ctx.input });
        },
        async delete() {
          // not implemented for custom options yet, need to figure out naming
        },

        is_focused() {
          return this.element.classList.contains("focused");
        },
        set_focused(focused) {
          if (focused) {
            this.element.classList.add("focused");
          } else {
            this.element.classList.remove("focused");
          }
        },
        is_hidden() {
          return !!source.container.hidden || !!this.element.hidden;
        },
        set_hidden(hidden) {
          this.element.hidden = hidden;
        },
      });
    }

    return options;
  }
}
