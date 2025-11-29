/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  class GlideCommandLine extends MozXULElement implements GlideCommandLineInterface {
    static get markup() {
      // placeholder function for html`...` usage for syntax highlighting
      const html = String.raw;
      return html`
        <html:div
          anonid="glide-commandline-container"
          class="glide-commandline-container"
        >
          <html:div anonid="glide-commandline-completions">
          </html:div>

          <!-- input -->
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

    #focused_index = 0;
    #last_focused_option: GlideCompletionOption | null = null;
    #all_options: GlideCompletionOption[] = [];
    #options_by_source = new Map<GlideCompletionSource, GlideCompletionOption[]>();
    #sources: GlideCompletionSource[];

    #log: ConsoleInstance = null as any;

    /**
     * Text that the input should be set to when opening / showing the UI.
     */
    #prefill: string = "";

    constructor() {
      super();

      this.#sources = GlideBrowser.commandline_sources;

      this.#log = console.createInstance
        ? console.createInstance({ prefix: "glide-commandline", maxLogLevelPref: "glide.logging.loglevel" })
        // `console.createInstance` doesn't seem to be available in tests...
        // TODO(glide): is there a way to fix this?
        : (console as any);

      this.addEventListener("focusout", () => {
        if (!Services.prefs.getBoolPref("ui.popup.disable_autohide", false)) {
          this.close();
        }
      });
    }

    connectedCallback() {
      this.hidden = true;
      this.appendChild((this.constructor as any).fragment);

      const input = this.#get_input();
      input?.addEventListener("input", () => this.#filter_table());
    }

    #filter_table() {
      const ctx: GlideCompletionContext = { input: this.#get_input()?.value ?? "" };
      const parent = this.get_element("glide-commandline-completions")!;
      const children = [...parent.childNodes.values()];

      let found_source = false;

      for (const source of this.#sources) {
        if (!children.includes(source.container)) {
          parent.appendChild(source.container);
        }

        if (
          // right now we only support displaying a single source at once
          found_source
          || !source.is_enabled(ctx)
        ) {
          source.container.hidden = true;
          continue;
        }

        this.#log.debug(`using source: "${source.id}"`);

        found_source = true;
        source.container.hidden = false;

        var options = this.#options_by_source.get(source);
        if (!options?.length) {
          // we're showing entirely new options, so reset the index to the start of
          // the options list to avoid weird positioning based on the previous index.
          this.#focused_index = -1;

          options = source.resolve_options();
          this.#display(source, options);

          this.#all_options.push(...options);
          this.#options_by_source.set(source, options);
        }

        source.search(ctx, options);
      }

      const previous_index = this.#focused_index;
      this.#focused_index = this.#get_next_visible_option(
        this.#focused_index !== -1 ? this.#focused_index - 1 : this.#focused_index,
      );
      this.#refocus(previous_index);
    }

    #display(source: GlideCompletionSource, options: GlideCompletionOption[]) {
      source.container.children[1]!.replaceChildren(...options.map((option) => option.element));
    }

    async accept_focused(): Promise<void> {
      await this.#last_focused_option?.accept({ input: this.#get_input()?.value ?? "" });
      this.close();
    }

    async delete_focused(): Promise<void> {
      await this.#last_focused_option?.delete({ input: this.#get_input()?.value ?? "" });

      const previous_index = this.#focused_index;

      const next_index = this.#get_next_visible_option(this.#focused_index);
      const is_at_end = next_index < this.#focused_index;

      if (is_at_end) {
        this.#focused_index = this.#get_previous_visible_option(this.#focused_index);
      } else {
        this.#focused_index = this.#get_next_visible_option(this.#focused_index);
      }

      this.#refocus(previous_index);
    }

    focus_next(): void {
      const previous_index = this.#focused_index;
      this.#focused_index = this.#get_next_visible_option(this.#focused_index);
      this.#refocus(previous_index);
    }

    focus_back(): void {
      const previous_index = this.#focused_index;
      this.#focused_index = this.#get_previous_visible_option(this.#focused_index);
      this.#refocus(previous_index);
    }

    #get_next_visible_option(
      from_index: number,
      _guard = false,
    ): number {
      let index = from_index + 1;
      while (index < this.#all_options.length) {
        const option = this.#all_options[index]!;
        if (!option.is_hidden()) {
          return index;
        }

        index++;
      }

      if (!_guard) {
        return this.#get_next_visible_option(-1, true);
      }

      return -1;
    }

    #get_previous_visible_option(
      from_index: number,
      _guard = false,
    ): number {
      let index = from_index - 1;
      while (index >= 0) {
        const option = this.#all_options[index]!;
        if (!option.is_hidden()) {
          return index;
        }

        index--;
      }

      if (!_guard) {
        return this.#get_previous_visible_option(this.#all_options.length, true);
      }

      return -1;
    }

    /**
     * Ensure that `this.#focused_index` is visible and displayed as focused in the UI.
     */
    #refocus(previous_index: number) {
      const step = 2;

      this.#last_focused_option?.set_focused(false);

      const now_focused = this.#all_options[this.#focused_index];
      if (now_focused) {
        now_focused.set_focused(true);
        this.#last_focused_option = now_focused;
      }

      const scroll_opts: ScrollIntoViewOptions = { block: "nearest", behavior: "instant" };

      const scroll_element = this.#get_scrollview_element(this.#focused_index, previous_index, step)
        ?? this.#last_focused_option?.element;

      scroll_element?.scrollIntoView(scroll_opts);
    }

    /**
     * During a state transition, returns the new element that we should ensure is visible.
     *
     * The `step` argument is used to control how many rows ahead we should proactively scroll to.
     */
    #get_scrollview_element(
      index: number,
      previous_index: number,
      step: number,
    ): Element | undefined {
      // the helper functions this is passed to will automatically dec/inc the given index
      // so for a `step: 1` input, without this we'd actually be scrolling 2 elements ahead.
      step = step - 1;

      const is_reverse = index < previous_index;
      if (is_reverse) {
        const next = this.#get_previous_visible_option(index - step);
        if (next > index) {
          // prevent wrapping around from the top to the bottom
          return;
        }

        return this.#all_options[next]?.element;
      }

      const next = this.#get_next_visible_option(index + step);
      if (next < index) {
        // prevent wrapping around from the bottom to the top
        return;
      }

      return this.#all_options[next]?.element;
    }

    show({ prefill, sources }: GlideCommandLineShowOptions = {}) {
      if (sources != null) {
        this.#sources = sources;
      }

      const input = this.#get_input();

      if (!this.hidden) {
        input!.focus();
        return;
      }

      this.hidden = false;

      if (input) {
        input.value = prefill ?? this.#prefill;
        input.focus();
      }

      // bust the options cache
      this.#all_options = [];
      this.#options_by_source.clear();

      this.#focused_index = -1;
      this.#filter_table();
    }

    close() {
      // remove any custom sources
      this.#sources = GlideBrowser.commandline_sources;

      if (this.hidden) {
        return;
      }

      this.hidden = true;
      this.#last_focused_option?.set_focused(false);

      // return focus back to the content frame
      gBrowser.selectedBrowser?.focus();

      GlideBrowser.invoke_commandlineexit_autocmd();
    }

    toggle() {
      if (this.hidden) {
        this.show();
      } else {
        this.close();
      }
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
