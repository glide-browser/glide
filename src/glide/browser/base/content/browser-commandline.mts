/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { UpdateOption } from "./utils/browser-update.mts";

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const DocumentMirror = ChromeUtils.importESModule("chrome://glide/content/document-mirror.mjs", { global: "current" });
const { is_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { AppUpdater } = ChromeUtils.importESModule("resource://gre/modules/AppUpdater.sys.mjs", {});
const { format_download_progress, get_status_text, get_action_label, is_actionable } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/browser-update.mjs",
);

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

    // oldest notifications appear first
    const suggested: string[] = [];
    for (const notification of gNotificationBox.allNotifications) {
      const cmd = notification
        ?.querySelectorAll("button.notification-button")
        ?.[0]
        ?.getAttribute("label");
      if (cmd && cmd[0] == ":") {
        suggested.push(cmd.slice(1));
      }
    }

    const all_cmds = GlideBrowser.commandline_excmds;
    if (suggested.length > 0) {
      // move the suggested commands to the top of the list,
      // most recent first to match the displayed order of the notifications.
      all_cmds.sort(function(a, b) {
        const index_a = suggested.indexOf(a.name);
        const index_b = suggested.indexOf(b.name);
        if (index_a >= 0 && index_b >= 0) {
          return index_a - index_b;
        } else if (index_a >= 0) {
          return -1;
        } else if (index_b >= 0) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    for (const command of all_cmds) {
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
          if (focused === this.is_focused()) return;
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
          if (hidden === this.is_hidden()) {
            return;
          }
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
          if (focused === this.is_focused()) return;
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
          if (hidden === this.is_hidden()) {
            return;
          }
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
    const normalised_input = input.toLowerCase();

    options.forEach((option) => {
      const matches = ((): boolean => {
        const override = option.matches?.({ input });
        if (override != null) {
          return override;
        }

        const candidates = [
          option.name,
          option.description,
        ]
          .map(text => text?.toLowerCase())
          .filter(is_present);

        return candidates.some(candidate => candidate.includes(normalised_input));
      })();
      option.set_hidden(!matches);
    });
  }

  resolve_options() {
    const source = this;
    const options: CustomCompletionOption[] = [];

    for (const opt of this.#input_options) {
      const node = (() => {
        const node = opt.render?.();
        if (!node) return;
        return DocumentMirror.import_mirrored_node({
          node,
          mirror: GlideBrowser._mirrored_document,
          to_document: document!,
        });
      })();

      options.push({
        name: opt.label,
        description: opt.description ?? null,

        element: DOM.create_element("tr", {
          className: node ? "gcl-option" : "CustomCompletionOption gcl-option",
          children: node ?? [
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
        matches(ctx) {
          return opt.matches?.(ctx) ?? null;
        },

        is_focused() {
          return this.element.classList.contains("focused");
        },
        set_focused(focused) {
          if (focused === this.is_focused()) return;
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
          if (hidden === this.is_hidden()) {
            return;
          }
          this.element.hidden = hidden;
        },
      });
    }

    return options;
  }
}

export class UpdateCompletionSource implements GlideCompletionSource<UpdateOption> {
  id = "update";
  readonly container: HTMLElement;

  #appUpdater: AppUpdater;
  #listener: (status: number, ...args: any[]) => void;
  #status_label: HTMLElement;
  #action_row: HTMLElement;
  #action_label: HTMLElement;
  #current_status: number;
  #resolved_options: UpdateOption[] | null = null;

  constructor() {
    this.container = DOM.create_element("div", {
      attributes: { anonid: "glide-commandline-completions-update" },
      children: [
        DOM.create_element("div", { className: "section-header", children: ["update"] }),
        DOM.create_element("table", { className: "gcl-table" }),
      ],
    });

    this.#status_label = DOM.create_element("span", {
      children: ["Initializing…"],
    });

    this.#action_row = DOM.create_element("tr", {
      className: "gcl-option",
    });
    this.#action_label = DOM.create_element("td", {
      colSpan: 3,
      children: [""],
    });
    this.#action_row.appendChild(this.#action_label);
    this.#action_row.hidden = true;

    this.#appUpdater = new AppUpdater();
    this.#current_status = AppUpdater.STATUS.NEVER_CHECKED;

    this.#listener = (status: number, ...args: any[]) => {
      this.#on_status(status, ...args);
    };
    this.#appUpdater.addListener(this.#listener);
  }

  #on_status(status: number, ...args: any[]) {
    const STATUS = AppUpdater.STATUS;
    this.#current_status = status;

    if (status === STATUS.DOWNLOADING && args.length >= 2) {
      const [progress, progressMax] = args as [number, number];
      this.#status_label.textContent = format_download_progress(progress, progressMax);
    } else {
      this.#status_label.textContent = get_status_text(STATUS, status, this.#appUpdater.update);
    }

    if (is_actionable(STATUS, status)) {
      this.#action_label.textContent = get_action_label(STATUS, status, this.#appUpdater.update);
      this.#action_row.hidden = false;
    } else {
      this.#action_row.hidden = true;
    }
  }

  check() {
    if (this.#current_status === AppUpdater.STATUS.NEVER_CHECKED) {
      this.#appUpdater.check();
    }
  }

  destroy() {
    this.#appUpdater.removeListener(this.#listener);
    this.#appUpdater.stop();
  }

  get appUpdater(): AppUpdater {
    return this.#appUpdater;
  }

  get currentStatus(): number {
    return this.#current_status;
  }

  is_enabled({ input }: GlideCompletionContext) {
    return input.toLowerCase().startsWith("update");
  }

  search(_ctx: GlideCompletionContext, options: UpdateOption[]) {
    for (const option of options) {
      option.set_hidden(option.kind === "action" && !!this.#action_row.hidden);
    }
  }

  resolve_options(): UpdateOption[] {
    const source = this;
    const STATUS = AppUpdater.STATUS;

    this.#on_status(this.#current_status);

    const status_option: UpdateOption = {
      kind: "status",
      element: DOM.create_element("tr", {
        className: "gcl-option",
        children: [
          DOM.create_element("td", {
            colSpan: 3,
            children: [this.#status_label],
          }),
        ],
      }),
      async accept() {},
      async delete() {},
      matches() {
        return true;
      },
      is_focused() {
        return this.element.classList.contains("focused");
      },
      set_focused(focused) {
        if (focused === this.is_focused()) return;
        if (focused) {
          this.element.classList.add("focused");
        } else {
          this.element.classList.remove("focused");
        }
      },
      is_hidden() {
        return !!source.container.hidden;
      },
      set_hidden() {},
    };

    const action_option: UpdateOption = {
      kind: "action",
      element: this.#action_row,
      async accept() {
        const current = source.#current_status;

        if (current === STATUS.DOWNLOAD_AND_INSTALL) {
          source.#appUpdater.allowUpdateDownload();
          await GlideBrowser.upsert_commandline({ prefill: "update" });
          return;
        }

        if (current === STATUS.READY_FOR_RESTART) {
          const cancelQuit = Cc["@mozilla.org/supports-PRBool;1"]!.createInstance(Ci.nsISupportsPRBool);
          Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
          if (cancelQuit.data) {
            return;
          }

          if (Services.appinfo.inSafeMode) {
            Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
            return;
          }

          Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
        }
      },
      async delete() {},
      matches() {
        return true;
      },
      is_focused() {
        return this.element.classList.contains("focused");
      },
      set_focused(focused) {
        if (focused === this.is_focused()) return;
        if (focused) {
          this.element.classList.add("focused");
        } else {
          this.element.classList.remove("focused");
        }
      },
      is_hidden() {
        return !!source.container.hidden || !!source.#action_row.hidden;
      },
      set_hidden(hidden) {
        if (hidden === this.is_hidden()) return;
        source.#action_row.hidden = hidden;
      },
    };

    this.#resolved_options = [status_option, action_option];
    this.check();
    return this.#resolved_options;
  }
}
