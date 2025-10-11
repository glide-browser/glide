/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// TODO(glide): frecency sorting?

/**
 * Represents the possible commandline "groups" that can exist.
 *
 * This is needed as we support multiple different groups for defining
 * options that should be shown in the command line, e.g. open tabs & ex commands
 */
export type GlideCommandlineGroup = "excmd" | "tab";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
  const { assert_present, assert_never, is_present } = ChromeUtils.importESModule(
    "chrome://glide/content/utils/guards.mjs",
  );

  // placeholder function for html`...` usage for syntax highlighting
  const html = String.raw;

  class GlideCommandLine extends MozXULElement implements GlideCommandLineInterface {
    static get markup() {
      return html`
        <html:div
          anonid="glide-commandline-container"
          class="glide-commandline-container"
        >
          <html:div anonid="glide-commandline-completions">
            <html:div anonid="glide-commandline-completions-excmd">
              <html:div class="section-header">ex commands</html:div>
              <html:table class="gcl-table"></html:table>
            </html:div>
            <html:div anonid="glide-commandline-completions-tabs" hidden="true">
              <html:div class="section-header">tabs</html:div>
              <html:table class="gcl-table"></html:table>
            </html:div>
          </html:div>
          <!-- Note: add a new section here and you *must* update
                     - \`#get_group_for_row()\`
                     - \`GlideCommandlineGroup\` 

                    and then fix the corresponding type errors.
          -->

          <html:div anonid="glide-commandline-holder">
            <html:span anonid="glide-colon"></html:span>
            <html:input
              anonid="glide-commandline-input"
              placeholder=""
            ></html:input>
          </html:div>
        </html:div>
      `;
    }

    #focused_index: number = -1;
    #options: GlideCommandlineCompletionOption[] = [];
    #log: ConsoleInstance = null as any;

    /**
     * Text that the input should be set to when opening / showing the UI.
     */
    #prefill: string = "";

    /**
     * Maps `<tr>` elements in the `tab` group to browser tab instances.
     */
    #row_to_tab: WeakMap<Element, BrowserTab> = new WeakMap();

    #last_action: "switch-focus" | "keypress" | null = null;

    constructor() {
      super();

      this.#log = console.createInstance
        ? console.createInstance({ prefix: "glide-commandline", maxLogLevelPref: "glide.logging.loglevel" })
        // `console.createInstance` doesn't seem to be available in tests...
        // TODO(glide): is there a way to fix this?
        : (console as any);

      this.#init_excmds();

      this.addEventListener("focusout", () => {
        if (!Services.prefs.getBoolPref("ui.popup.disable_autohide", false)) {
          this.close();
        }
      });

      this.addEventListener("keypress", event => {
        if (event.keyCode == event.DOM_VK_TAB) {
          event.preventDefault();
          this.#handle_tab(event.shiftKey);
        } else if (event.keyCode == event.DOM_VK_RETURN) {
          event.preventDefault();
          this.accept_focused();
        } else if (event.keyCode == event.DOM_VK_ESCAPE) {
          event.preventDefault();
          this.close();
        } else {
          this.#last_action = "keypress";
        }
      }, true);
    }

    get options() {
      return this.#options;
    }

    get prefill(): string {
      return this.#prefill;
    }

    set prefill(value: string) {
      this.#prefill = value;

      const input = this.#get_input();
      if (input) {
        input.value = value;
      }

      this._filter_table();
    }

    _render_completions_table(options = this.#options) {
      const table = this.query_selector_first(".gcl-table:not([hidden])");
      if (!table) {
        throw new Error("Could not find a non-hidden `.gcl-table` XUL element");
      }

      table.innerHTML = "";

      for (const option of options) {
        const row = DOM.create_element("tr", {
          className: "ExcmdCompletionOption gcl-option",
          children: [
            DOM.create_element("td", { className: "excmd", children: option.name }),
            DOM.create_element("td", { className: "documentation", children: option.description }),
            DOM.create_element("td", {
              className: option.keymap ? "keymap" : "keymap empty",
              children: option.keymap ?? "",
            }),
          ],
        });
        table.appendChild(row);
      }
    }

    /**
     * Overwrite the options for the command line & render the updated table
     */
    set_completion_options(options: GlideCommandlineCompletionOption[]) {
      this.#options = options;
      this._render_completions_table();
      this._set_focused_index(0);
    }

    connectedCallback() {
      this.hidden = true;
      this.appendChild((this.constructor as any).fragment);

      this.set_completion_options(this.#options);

      this.show();

      const input = this.#get_input();
      input?.addEventListener("input", () => this._filter_table());
    }

    show({ prefill }: { prefill?: string } = {}) {
      const input = this.#get_input();

      if (!this.hidden) {
        input!.focus();
        return;
      }

      this.hidden = false;

      if (input) {
        input.value = prefill ?? this.prefill;
        input.focus();
      }

      this._filter_table();
      this._set_focused_index(0);
    }

    close() {
      if (this.hidden) {
        return;
      }

      this.hidden = true;
    }

    toggle() {
      if (this.hidden) {
        this.show();
      } else {
        this.close();
      }
    }

    focus_next() {
      this.#handle_tab(false);
    }

    focus_back() {
      this.#handle_tab(true);
    }

    #handle_tab(reverse: boolean) {
      this.#last_action = "switch-focus";

      const rows = this.query_selector_all<HTMLElement>(".gcl-option");
      if (!rows.length) {
        return;
      }

      const focused_index = this.#focused_index === -1
        ? reverse
          ? rows.length
          : -1
        : this.#focused_index;

      const new_index = reverse
        ? this.#previous_visible_completion(rows, focused_index)
        : this.#next_visible_completion(rows, focused_index);

      this._set_focused_index(new_index);
    }

    #get_excmds_group() {
      return this.get_element<HTMLElement>("glide-commandline-completions-excmd")!;
    }

    #get_tabs_group() {
      return this.get_element<HTMLElement>("glide-commandline-completions-tabs")!;
    }

    async #toggle_tabs() {
      // TODO(glide): more general logic here
      const excmds = this.#get_excmds_group();
      const tabs = this.#get_tabs_group();
      tabs.hidden = !tabs.hidden;
      excmds.hidden = !excmds.hidden;

      if (tabs.hidden) {
        this.#focused_index = -1;
        this._filter_table();
        return;
      }

      this.refresh_tabs({ new_index: -1 });
    }

    #init_excmds() {
      this.#options = [];

      const excmdKeymaps = new Map<string, string>();
      for (const keymaps of GlideBrowser.api.keymaps.list("normal")) {
        if (typeof keymaps.rhs === "string") {
          excmdKeymaps.set(keymaps.rhs as string, keymaps.lhs);
        }
      }

      for (const command of GLIDE_EXCOMMANDS) {
        if (excmdKeymaps.has(command.name)) {
          command.keymap = excmdKeymaps.get(command.name);
        }
        this.#options.push(command);
      }

      for (let command of GlideBrowser.user_excmds.values()) {
        if (excmdKeymaps.has(command.name)) {
          this.#options.push({ ...command, keymap: excmdKeymaps.get(command.name) });
        } else {
          this.#options.push(command);
        }
      }
    }

    refresh_data() {
      this.#init_excmds();
      // TODO(glide): only if tabs active
      this.refresh_tabs({ new_index: null });

      // force a re-render
      this.set_completion_options(this.#options);
    }

    refresh_tabs({ new_index }: { new_index: number | null }) {
      const tabs = this.#get_tabs_group();
      const tabs_table = assert_present(tabs.childNodes.item(1)) as HTMLElement;
      tabs_table.innerHTML = "";

      // TODO(glide): fine grained updates

      for (const tab of gBrowser.tabContainer.allTabs) {
        const row = DOM.create_element("tr", { className: "TabCompletionOption gcl-option" });
        row.replaceChildren(
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
        );

        this.#row_to_tab.set(row, tab);
        tabs_table.appendChild(row);
      }

      if (new_index !== null) {
        // force a refresh
        this._set_focused_index(new_index);
      }
      this._filter_table();
    }

    async accept_focused(): Promise<void> {
      const row = this.#get_active_row();
      if (!row) {
        return;
      }
      await this.#execute_option(row);
      this.close();
    }

    #get_excmd_from_row(row: HTMLElement): string {
      const cmd = row.querySelector(".excmd")!.textContent;
      if (!cmd) {
        throw new Error("Could not resolve an excmd name from the focused row");
      }
      return cmd;
    }

    async #execute_option(row: HTMLElement) {
      const group = this.#get_group_for_row(row);

      switch (group) {
        case "excmd": {
          var command: string;
          if (this.#last_action === "switch-focus") {
            // if the last thing the user did was switch from one completion to another, e.g. with `<Tab>` or `<S-Tab>`
            // then we should use the focused row as thats what would be expected.
            command = this.#get_excmd_from_row(row);
          } else {
            command = this.#get_input()!.value;

            // if the input isn't a valid command then we should use the focused row as the input was likely only used
            // to filter out completions, e.g. input `conf` to get `config` as the focused row.
            if (!GlideExcmds.is_known_command(command)) {
              command = this.#get_excmd_from_row(row);
            }
          }

          this.#log.info(`executing excmd: \`${command}\``);

          // we can't statically guarantee that the command is valid but `.execute()`
          // will gracefully handle that case with a helpful error message
          await GlideExcmds.execute(command as any);
          break;
        }
        case "tab": {
          const tab = assert_present(
            this.#row_to_tab.get(row),
            `No corresponding browser tab for row at ${this.#focused_index}`,
          );
          this.#log.debug(`switching to tab ${gBrowser.tabContainer.allTabs.indexOf(tab)}`);
          gBrowser.selectedTab = tab;
          break;
        }
        default:
          throw assert_never(group);
      }
    }

    #get_active_row(rows?: NodeListOf<HTMLElement>): HTMLElement | null {
      // TODO(glide): consider caching this query, I'm unsure if this
      //              could be a noticable performance hit
      if (!rows) {
        rows = this.#get_rows();
      }
      if (!rows.length) {
        this.#log.error("exec: no options found");
        return null;
      }

      if (this.#focused_index === -1) {
        this.#log.warn(`exec: nothing focused - focused_index=${this.#focused_index}`);
        return null;
      }

      const row = rows.item(this.#focused_index);
      if (!row) {
        this.#log.error(`exec: focused index is invalid, no option for index=${this.#focused_index}`);
        return null;
      }

      return row;
    }

    #get_rows(): NodeListOf<HTMLElement> {
      return this.query_selector_all<HTMLElement>(".gcl-option");
    }

    remove_focused_browser_tab() {
      if (this.get_active_group() !== "tab") {
        return null;
      }

      const rows = this.#get_rows();
      const row = this.#get_active_row(rows);
      if (!row) {
        return null;
      }

      const tab = assert_present(
        this.#row_to_tab.get(row),
        `No corresponding browser tab for row at ${this.#focused_index}`,
      );
      gBrowser.removeTab(tab);

      // keep the focused index, unless if there are no more tabs below, in that
      // case we move the index backwards.
      //
      // note that there should *always* be another tab to move focus to, as if the last
      // tab is closed then the window is also closed.

      const next_index = this.#next_visible_completion(rows, this.#focused_index);
      const is_at_end = next_index < this.#focused_index;

      let new_index: number;
      if (is_at_end) {
        new_index = this.#previous_visible_completion(rows, this.#focused_index);
      } else {
        new_index = this.#focused_index;
      }

      this.refresh_tabs({ new_index });
    }

    get_active_group(): GlideCommandlineGroup {
      const top = assert_present(this.get_element("glide-commandline-completions"));
      for (const child of top.childNodes) {
        if (!child || (child as HTMLElement).hidden) {
          continue;
        }

        return this.#get_group_name(child as HTMLElement);
      }

      throw new Error("Could not resolve the active commandline group. This should never happen");
    }

    #get_group_name(element: HTMLElement): GlideCommandlineGroup {
      const group = element.attributes.getNamedItem("anonid")!.value;
      switch (group) {
        case "glide-commandline-completions-excmd":
          return "excmd";
        case "glide-commandline-completions-tabs":
          return "tab";
        default:
          throw new Error(`unexpected commandline option group: ${group}`);
      }
    }

    #get_group_for_row(row: HTMLElement): GlideCommandlineGroup {
      return this.#get_group_name(row.parentElement!.parentElement! as HTMLElement);
    }

    #next_visible_completion(
      rows: NodeListOf<HTMLElement>,
      from_index: number,
      _guard = false,
    ): number {
      let index = from_index + 1;
      while (index < rows.length) {
        const completion = rows.item(index)!;
        if (
          !completion.hidden
          // skip over options where the entire group is hidden
          && !(completion.parentElement?.parentElement as HTMLElement | null)
            ?.hidden
        ) {
          return index;
        }

        index++;
      }

      if (!_guard) {
        return this.#next_visible_completion(rows, -1, true);
      }

      return -1;
    }

    #previous_visible_completion(
      rows: NodeListOf<HTMLElement>,
      from_index: number,
      _guard = false,
    ): number {
      let index = from_index - 1;
      while (index >= 0) {
        const completion = rows.item(index)!;
        if (
          !completion.hidden
          // skip over options where the entire group is hidden
          && !(completion.parentElement?.parentElement as HTMLElement | null)
            ?.hidden
        ) {
          return index;
        }

        index--;
      }

      if (!_guard) {
        return this.#previous_visible_completion(rows, rows.length, true);
      }

      return -1;
    }

    _set_focused_index(index: number) {
      const rows = this.#get_rows();
      const previous_index = this.#focused_index;

      if (this.#focused_index >= 0 && this.#focused_index < rows.length) {
        rows[this.#focused_index]?.classList.remove("focused");
      }

      if (index >= 0 && index < rows.length) {
        this.#focused_index = index;

        const focused_row = rows[index]!;
        focused_row.classList.add("focused");

        const scroll_opts: ScrollIntoViewOptions = { block: "nearest", behavior: "instant" };

        const step = 2;

        if (index <= step) {
          // if we're at the top of the command line frame then we need to ensure
          // that the section headers are also in view, otherwise going down and then
          // coming back up would result in the header disappearing forever
          this.query_selector_all(".section-header").forEach(e => e.scrollIntoView(scroll_opts));
        }

        const scroll_element = this.#get_scrollview_element(rows, index, previous_index, step)
          ?? focused_row;

        scroll_element.scrollIntoView(scroll_opts);
      } else {
        this.#focused_index = -1;
      }
    }

    /**
     * During a state transition, returns the new element that we should ensure is visible.
     *
     * The `step` argument is used to control how many rows ahead we should proactively scroll to.
     */
    #get_scrollview_element(
      rows: NodeListOf<HTMLElement>,
      index: number,
      previous_index: number,
      step: number,
    ): Element | undefined {
      // the helper functions this is passed to will automatically dec/inc the given index
      // so for a `step: 1` input, without this we'd actually be scrolling 2 elements ahead.
      step = step - 1;

      const is_reverse = index < previous_index;
      if (is_reverse) {
        const next = this.#previous_visible_completion(rows, index - step);
        if (next > index) {
          // prevent wrapping around from the top to the bottom
          return;
        }

        return rows[next];
      }

      const next = this.#next_visible_completion(rows, index + step);
      if (next < index) {
        // prevent wrapping around from the bottom to the top
        return;
      }

      return rows[next];
    }

    _filter_table() {
      const input = this.#get_input();
      const filter_value = (input as HTMLInputElement).value.toLowerCase();

      const space_index = filter_value.indexOf(" ");
      const command_filter = space_index !== -1 ? filter_value.slice(0, space_index) : filter_value;
      const args = space_index !== -1 ? filter_value.slice(space_index + 1) : filter_value;

      // TODO(glide): more general support for custom completion options
      const tabs = this.#get_tabs_group();
      if (filter_value.startsWith("tab ")) {
        if (!tabs || tabs.hidden) {
          this.#toggle_tabs();
          return;
        }
      } else {
        if (tabs && !tabs.hidden) {
          this.#toggle_tabs();
          return;
        }
      }

      const rows = this.#get_rows();

      // We need to refresh the focused row under two different conditions:
      //
      // 1. The new filter results in the focused row being hidden.
      //
      // 2. There is no focused row.
      //    This can happen when there are no rows matching a filter and then
      //    the filter is edited so that there *are* matching rows..
      let should_refresh_focused_row = this.#focused_index === -1;

      rows.forEach((row, index) => {
        const parent = row.parentElement?.parentElement as HTMLElement | null;
        if (!parent) {
          throw new Error("invalid dom");
        }

        if (parent.hidden) {
          // continue, the current row is part of a hidden group
          return;
        }

        const group = this.#get_group_for_row(row);

        const matches = ((): boolean => {
          switch (group) {
            case "excmd": {
              const candidates = [
                row.querySelector(".excmd"),
                row.querySelector(".documentation"),
              ]
                .map(element => element?.textContent?.toLowerCase())
                .filter(is_present);

              // TODO(glide): better fuzzy finding
              return candidates.some(candidate => candidate.includes(command_filter));
            }
            case "tab": {
              const candidates = [
                row.querySelector(".label"),
                row.querySelector(".url"),
              ]
                .map(element => element?.textContent?.toLowerCase())
                .filter(is_present);

              // TODO(glide): better fuzzy finding
              return candidates.some(candidate => candidate.includes(args));
            }
            default:
              throw assert_never(group);
          }
        })();

        if (index === this.#focused_index && !matches) {
          should_refresh_focused_row = true;
        }

        row.hidden = !matches;
      });

      if (should_refresh_focused_row) {
        this._set_focused_index(this.#next_visible_completion(rows, 0));
      }
    }

    get _focused_index() {
      return this.#focused_index;
    }

    #get_input(): HTMLInputElement | null {
      return this.get_element("glide-commandline-input") as HTMLInputElement | null;
    }

    get_element<T extends Node = Element>(anonid: string): T | null {
      return this.querySelector(`[anonid=${anonid}]`) as any;
    }

    query_selector_first<T extends Node = Element>(
      selectors: string,
    ): T | null {
      return this.querySelector(selectors) as any;
    }

    query_selector_all<T extends Node = Element>(
      selectors: string,
    ): NodeListOf<T> {
      return this.querySelectorAll(selectors) as any;
    }
  }

  customElements.define("glide-commandline", GlideCommandLine as any);
}
