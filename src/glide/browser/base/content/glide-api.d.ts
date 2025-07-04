declare global {
  var glide: {
    ctx: {
      /**
       * The currently active mode.
       */
      mode: GlideMode;

      url: string;

      /**
       * The operating system Glide is running on.
       */
      os: "linux" | "win" | "macosx" | "ios" | "android" | "other";

      /**
       * Whether or not the currently focused element is editable.
       *
       * This includes but is not limited to `<textarea>`, `<input>`, `contenteditable=true`.
       */
      is_editing(): Promise<boolean>;
    };

    /**
     * Set browser-wide options.
     */
    /// @docs-expand-type-reference
    o: glide.Options;

    /**
     * Set buffer specific options.
     *
     * This has the exact same API as `glide.o`.
     */
    bo: Partial<glide.Options>;

    options: {
      /**
       * Returns either a buffer-specific option, or the global version. In that order
       */
      get<Name extends keyof glide.Options>(name: Name): glide.Options[Name];
    };

    autocmds: {
      /**
       * Create an autocmd that will be invoked whenever the focused URL changes.
       *
       * This includes:
       *   1. URL changes within the same tab
       *   2. Switching tabs
       *   3. Navigating back and forth in history within the same tab
       */
      create<const Event extends "UrlEnter">(
        event: Event,
        pattern: glide.AutocmdPatterns[Event],
        callback: (args: glide.AutocmdArgs[Event]) => void
      ): void;

      /**
       * Create an autocmd that will be invoked whenever the mode changes.
       *
       * The pattern is matched against `old_mode:new_mode`. You can also use `*` as a placeholder
       * to match *any* mode.
       *
       * for example, to define an autocmd that will be fired every time visual mode is entered:
       *
       * `*:visual`
       *
       * or when visual mode is left:
       *
       * `visual:*`
       *
       * or transitioning from visual to insert:
       *
       * `visual:insert`
       *
       * or for just any mode:
       *
       * `*`
       */
      create<const Event extends "ModeChanged">(
        event: Event,
        pattern: glide.AutocmdPatterns[Event],
        callback: (args: glide.AutocmdArgs[Event]) => void
      ): void;

      /**
       * Create an autocmd that will be invoked whenever the config is loaded.
       *
       * Called once on initial load and again every time the config is reloaded.
       */
      create<const Event extends "ConfigLoaded">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void
      ): void;

      /**
       * Create an autocmd that will be invoked when the window is initially loaded.
       *
       * **note**: this is not invoked when the config is reloaded.
       */
      create<const Event extends "WindowLoaded">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void
      ): void;

      create<const Event extends glide.AutocmdEvent>(
        event: Event,
        pattern: glide.AutocmdPatterns[Event] extends never ?
          (args: glide.AutocmdArgs[Event]) => void
        : glide.AutocmdPatterns[Event],
        callback?: (args: glide.AutocmdArgs[Event]) => void
      ): void;
    };

    prefs: {
      /**
       * Set a preference. This is an alternative to `prefs.js` / [`about:config`](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
       * that all customisation can be represented in a single `glide.ts` file.
       *
       * **warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling `glide.pref()` in callbacks
       *              will result in the pref being properly applied everywhere.
       *
       * **warning**: there is also no guarantee that these settings will be applied when first loaded, sometimes a restart is required.
       */
      set(name: string, value: string | number | boolean): void;

      /**
       * Get the value of a pref.
       *
       * If the pref is not defined, then `undefined` is returned.
       */
      get(name: string): string | number | boolean | undefined;

      /**
       * Reset the pref value back to its default.
       */
      clear(name: string): void;
    };

    /**
     * Equivalent to `vim.g`.
     *
     * You can also store arbitrary data here in a typesafe fashion with:
     * ```ts
     * declare global {
     *   interface GlideGlobals {
     *     my_prop?: boolean;
     *   }
     * }
     * ```
     */
    g: GlideGlobals;

    tabs: {
      /**
       * Returns the active tab for the currently focused window.
       *
       * This is equivalent to:
       * ```ts
       * const tab = await browser.tabs.query({
       *   active: true,
       *   currentWindow: true,
       * })[0];
       * ```
       * But with additional error handling for invalid states.
       */
      active(): Promise<glide.TabWithID>;
    };

    excmds: {
      /**
       * Execute an excmd, this is the same as typing `:cmd --args`.
       */
      execute(cmd: glide.ExcmdString): Promise<void>;

      /**
       * Create a new excmd.
       */
      create<const Excmd extends glide.ExcmdCreateProps>(
        info: Excmd,
        fn: () => void | Promise<void>
      ): Excmd;
    };

    content: {
      /**
       * Execute a function in the content process for the given tab.
       *
       * The given function will be stringified before being sent across processes, which
       * means it **cannot** capture any outside variables.
       *
       * If you need to pass some context into the function, use `args`, e.g.
       *
       * ```ts
       * function set_body_border_style(css: string) {
       *  document.body.style.setProperty('border', css)
       * }
       * await glide.content.execute(set_body_border_style, { tab_id, args: ["20px dotted pink"] })
       * ```
       *
       * Note: all `args` must be JSON serialisable.
       */
      execute<F extends (...args: any[]) => any>(
        func: F,
        opts: {
          /**
           * The ID of the tab into which to inject.
           *
           * Or the tab object as returned by `glide.tabs.active()`.
           */
          tab_id: number | glide.TabWithID;
        } & (Parameters<F> extends [] ?
          {
            /**
             * Note: the given function doesn't take any arguments but if
             *       it did, you could pass them here.
             */
            args?: undefined;
          }
        : {
            /**
             * Arguments to pass to the given function.
             *
             * **Must** be JSON serialisable
             */
            args: Parameters<F>;
          })
      ): Promise<ReturnType<F>>;
    };

    keymaps: {
      set<const LHS>(
        modes: GlideMode | GlideMode[],
        lhs: $keymapcompletions.T<LHS>,
        rhs: glide.ExcmdValue,
        opts?: glide.KeymapOpts | undefined
      ): void;

      /**
       * Remove the mapping of {lhs} for the {modes} where the map command applies.
       *
       * The mapping may remain defined for other modes where it applies.
       */
      del(
        modes: GlideMode | GlideMode[],
        lhs: string,
        opts?: glide.KeymapDeleteOpts
      ): void;

      /**
       * List all global key mappings.
       *
       * If a key mapping is defined for multiple modes, multiple entries
       * will be returned for each mode.
       */
      list(modes?: GlideMode | GlideMode[]): glide.Keymap[];
    };

    hints: {
      /**
       * Find and show hints for "clickable" elements in the content frame.
       *
       * An optional `action()` function can be passed that will be invoked when
       * a hint is selected.
       */
      show(opts?: {
        /**
         * *Only* show hints for all elements matching this [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors).
         *
         * @example "li, textarea"
         * @example "[id="my-element"]"
         */
        selector?: string;

        /**
         * *Also* show hints for all elements matching this [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors)
         * as well as the default set of [hintable elements](https://glide-browser.app/hints#hintable-elements).
         *
         * @example "li, textarea"
         * @example "[id="my-element"]"
         */
        include?: string;

        /**
         * *Only* show hints for elements that are editable.
         */
        editable?: boolean;

        /**
         * If only one hint is generated, automatically activate it.
         *
         * @default false
         */
        auto_activate?: boolean;

        /**
         * Callback invoked when the selected hint is chosen.
         *
         * This is executed in the content process.
         */
        action?:
          | "click"
          | "newtab-click"
          | ((target: HTMLElement) => Promise<void>);

        /**
         * Which area to generate hints for.
         *
         * - `content` - Show hints for clickable elements within the web page (links, buttons, etc.)
         * - `chrome` - Show hints for browser interface elements (toolbar buttons, tabs, menus, etc.)
         *
         * @default "content"
         */
        location?: glide.HintLocation;
      }): void;
    };

    buf: {
      keymaps: {
        set<const LHS>(
          modes: GlideMode | GlideMode[],
          lhs: $keymapcompletions.T<LHS>,
          rhs: glide.ExcmdValue,
          opts?: Omit<glide.KeymapOpts, "buffer"> | undefined
        ): void;

        /**
         * Remove the mapping of {lhs} for the {modes} where the map command applies.
         *
         * The mapping may remain defined for other modes where it applies.
         */
        del(
          modes: GlideMode | GlideMode[],
          lhs: string,
          opts?: Omit<glide.KeymapDeleteOpts, "buffer"> | undefined
        ): void;
      };
    };

    keys: {
      /**
       * Send a key sequence to the browser, simulating physical key presses.
       *
       * The key sequence can include multiple regular keys, special keys, and modifiers.
       *
       * For example:
       *
       * ```ts
       * // Send a simple key sequence, each char is sent separately
       * await glide.keys.send("hello");
       *
       * // Send with modifiers, results in two events
       * // - { ctrlKey: true, key: 'a' }
       * // - { ctrlKey: true, key: 'c' }
       * await glide.keys.send("<C-a><C-c>");
       * ```
       */
      send<const Keys>(
        keyseq: $keymapcompletions.T<Keys> | { glide_key: string },
        opts?: glide.KeySendOptions
      ): Promise<void>;

      /**
       * Returns a `Promise` that resolves to a `{@link glide.KeyEvent}`.
       *
       * This blocks other input events from being processed until the promise resolves.
       *
       * Note: there can only be one `Promise` registered at any given time.
       */
      next(): Promise<glide.KeyEvent>;

      /**
       * Returns a `Promise` that resolves to a string representation of the last input event.
       *
       * This blocks other input events from being processed until the promise resolves.
       *
       * @example {'d'}
       * @example {'<C-l>'}
       *
       * Note: there can only be one `Promise` registered at any given time.
       */
      next_str(): Promise<string>;
    };

    modes: {
      /**
       * Register a custom `mode`.
       *
       * **note**: you must *also* register it as a type like so:
       *
       * ```typescript
       * declare global {
       *   interface GlideModes {
       *     leap: "leap";
       *   }
       * }
       * glide.modes.register('leap', { caret: 'normal' })
       * ```
       */
      register<Mode extends keyof GlideModes>(
        mode: Mode,
        opts: { caret: "block" | "line" | "underline" }
      ): void;
    };
  };

  /**
   * Defines all the supported modes.
   *
   * **note**: the key is what defines the list of supported modes, currently the value is
   *           not used for anything.
   *
   * **note**: you must *also* register it at runtime like so:
   *
   * ```typescript
   * declare global {
   *   interface GlideModes {
   *     leap: "leap";
   *   }
   * }
   * glide.modes.register('leap', { caret: 'normal' })
   * ```
   */
  interface GlideModes {
    normal: "normal";
    insert: "insert";
    visual: "visual";
    ignore: "ignore";
    command: "command";
    "op-pending": "op-pending";
  }

  /**
   * All of the supported modes.
   *
   * See {@link GlideModes} for more information.
   */
  type GlideMode = keyof GlideModes;

  interface GlideGlobals {
    mapleader: string;
  }

  /**
   * Assert an invariant. An \`AssertionError\` will be thrown if `value` is falsy.
   */
  function assert(value: unknown, message?: string): asserts value;

  /**
   * The inverse of `{@link assert}`, useful for blowing up when the condition becomes `truthy`.
   */
  function todo_assert(value: unknown, message?: string): void;

  /**
   * Interface used to define types for excmds, intended for declaration merging.
   *
   * e.g.
   * ```typescript
   * const cmd = glide.excmds.create(
   *   { name: "my_excmd", description: "..." },
   *   () => {
   *     // ...
   *   }
   * );
   * declare global {
   *   interface ExcmdRegistry {
   *     my_excmd: typeof cmd;
   *   }
   * }
   * ```
   */
  export interface ExcmdRegistry {}

  namespace glide {
    /**
     * Corresponds to `glide.o` or `glie.bo`.
     */
    /// @docs-skip
    export type Options = {
      /**
       * How long to wait until cancelling a partial keymapping execution.
       *
       * For example, `glide.keymaps.set('insert', 'jj', 'mode_change normal')`, after
       * pressing `j` once, this option determines how long the delay should be until
       * the `j` key is considered fully pressed and the mapping sequence is reset.
       *
       * note: this only applies in insert mode.
       *
       * @default 200
       */
      mapping_timeout: number;

      /**
       * Color used to briefly highlight text when it's yanked.
       *
       * @example "#ff6b35" // Orange highlight
       * @default "#edc73b"
       */
      yank_highlight: glide.RGBString;

      /**
       * How long, in milliseconds, to highlight the selection for when it's yanked.
       *
       * @default 150
       */
      yank_highlight_time: number;

      /**
       * The maximum number of entries to include in the jumplist, i.e.
       * how far back in history will the jumplist store.
       *
       * @default 100
       */
      jumplist_max_entries: number;
    };

    export type RGBString = `#${string}`;

    /// @docs-skip
    export type TabWithID = Omit<Browser.Tabs.Tab, "id"> & { id: number };

    export type KeyEvent = KeyboardEvent & {
      /**
       * The vim notation of the KeyEvent, e.g.
       *
       * `{ ctrlKey: true, key: 's' }` -> `'<C-s>'`
       */
      glide_key: string;
    };

    export type KeySendOptions = {
      /**
       * Send the key event(s) directly through to the builtin Firefox
       * input handler and skip all of the mappings defined in Glide.
       */
      skip_mappings?: boolean;
    };

    /// @docs-skip
    export type ExcmdCreateProps = {
      name: string;
      description: string;
    };

    /// @docs-skip
    export type ExcmdValue =
      import("./browser-excmds-registry.mjs").GlideCommandValue;

    /// @docs-skip
    export type ExcmdString =
      // builtin
      | import("./browser-excmds-registry.mjs").GlideCommandString
      // custom
      | keyof ExcmdRegistry
      | `${keyof ExcmdRegistry} ${string}`;

    type HintLocation = "content" | "browser-ui";

    type Keymap = {
      lhs: string;
      rhs: glide.ExcmdValue;
      description: string | undefined;
      mode: GlideMode;
    };

    type KeymapOpts = {
      description?: string | undefined;

      /**
       * If `true`, creates a buffer-local mapping for the current buffer.
       *
       * @default {false}
       */
      buffer?: boolean;

      /**
       * If true, the key sequence will be displayed even after the mapping is executed.
       *
       * This is useful for mappings that are conceptually chained but are not *actually*, e.g. `diw`.
       *
       * @default false
       */
      retain_key_display?: boolean;
    };

    type KeymapDeleteOpts = Pick<KeymapOpts, "buffer">;

    type AutocmdEvent =
      | "UrlEnter"
      | "ModeChanged"
      | "ConfigLoaded"
      | "WindowLoaded";
    type AutocmdPatterns = {
      UrlEnter: RegExp | { hostname?: string };
      ModeChanged: "*" | `${GlideMode | "*"}:${GlideMode | "*"}`;
      ConfigLoaded: null;
      WindowLoaded: null;
    };
    type AutocmdArgs = {
      UrlEnter: { readonly url: string; readonly tab_id: number };
      ModeChanged: {
        /**
         * This may be `null` when first loading Glide or when reloading the config.
         */
        readonly old_mode: GlideMode | null;
        readonly new_mode: GlideMode;
      };
      ConfigLoaded: {};
      WindowLoaded: {};
    };
  }

  /**
   * Dedent template function.
   *
   * Inspired by the https://www.npmjs.com/package/dedent package.
   */
  function dedent(arg: string): string;
  function dedent(strings: TemplateStringsArray, ...values: unknown[]): string;

  /**
   * Dedent template function for syntax highlighting.
   *
   * Inspired by the https://www.npmjs.com/package/dedent package.
   *
   * note: we don't support passing in arguments to these functions as we would have to
   *       support escaping them, to not make it easy to accidentally cause XSS
   */
  function html(arg: TemplateStringsArray): string;

  /**
   * Dedent template function for syntax highlighting.
   *
   * Inspired by the https://www.npmjs.com/package/dedent package.
   *
   * note: we don't support passing in arguments to these functions as we would have to
   *       support escaping them, to not make it easy to accidentally cause XSS
   */
  function css(arg: TemplateStringsArray): string;

  namespace $keymapcompletions {
    /**
     * This type takes in a string literal type, e.g. `<C-`, `a`, `<leader>`
     * and resolves a new string literal type union type that represents as many
     * valid additional entries as possible.
     *
     * `<C-` -> `<C-a>` | `<C-D-` ...
     * `<leader>` -> `<leader>f` | `<leader><CR>` ...
     * `g` -> `gg` | `gj` ...
     */
    type T<LHS> =
      LHS extends "" ? SingleKey
      : LHS extends "<" ? SpecialKey | `<${ModifierKey}-`
      : LHS extends `${infer S}<${infer M}-` ?
        | `${S}<${M}-${Exclude<StripAngles<SingleKey>, ModifierKey>}>`
        | `${S}<${M}-${ModifierKey}-`
        | (S & {})
      : LHS extends `${infer S}<` ? `${S}${SpecialKey}` | S
      : LHS extends `${infer S}` ? `${S}${SingleKey}` | S
      : LHS;

    /**
     * e.g. a, b, <leader>
     */
    type SingleKey =
      | StringToUnion<"abcdefghijklmnoprstuvwxyz">
      | StringToUnion<"ABCDEFGHIJKLMNOPRSTUVWXYZ">
      | StringToUnion<"0123456789">
      | SpecialKey;

    type SpecialKey =
      | "<space>"
      | "<tab>"
      | "<esc>"
      | "<escape>"
      | "<space>"
      | "<enter>"
      | "<backspace>"
      | "<BS>"
      | "<CR>"
      | "<leader>"
      | "<up>"
      | "<down>"
      | "<left>"
      | "<right>"
      | "<del>"
      | "<home>"
      | "<end>"
      | "<pageup>"
      | "<pagedown>"
      | "<F1>"
      | "<F2>"
      | "<F3>"
      | "<F4>"
      | "<F5>"
      | "<F6>"
      | "<F7>"
      | "<F8>"
      | "<F9>"
      | "<F10>"
      | "<F11>"
      | "<F12>"
      | "<lt>"
      | "<bar>"
      | "<bslash>";

    type ModifierKey = "C" | "D" | "A" | "S";

    type StringToUnion<S extends string> =
      S extends `${infer First}${infer Rest}` ? First | StringToUnion<Rest>
      : never;

    /**
     * `<foo>` -> `foo`
     */
    type StripAngles<K extends SingleKey> =
      K extends `<${infer Inner}>` ? Inner : K;
  }
}

export {};
