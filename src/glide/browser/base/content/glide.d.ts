// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

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
       * This includes but is not limited to `html:<textarea>`, `html:<input>`, `contenteditable=true`.
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
     * This has the exact same API as {@link glide.o}.
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
        callback: (args: glide.AutocmdArgs[Event]) => void,
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
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      /**
       * Create an autocmd that will be invoked whenever the key sequence changes.
       *
       * This will be fired under three circumstances:
       *
       * 1. A key is pressed that matches a key mapping.
       * 2. A key is pressed that is part of a key mapping.
       * 3. A key is pressed that cancels a previous partial key mapping sequence.
       *
       * For example, with
       * ```typescript
       * glide.keymaps.set('normal', 'gt', '...');
       * ```
       *
       * Pressing `g` will fire with `{ sequence: ["g"], partial: true }`, then either:
       * - Pressing `t` would fire `{ sequence: ["g", "t"], partial: false }`
       * - Pressing any other key would fire `{ sequence: [], partial: false }`
       *
       * Note that this is not fired for consecutive key presses for keys that don't correspond to mappings,
       * as the key state has not changed.
       */
      create<const Event extends "KeyStateChanged">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      /**
       * Create an autocmd that will be invoked whenever the config is loaded.
       *
       * Called once on initial load and again every time the config is reloaded.
       */
      create<const Event extends "ConfigLoaded">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      /**
       * Create an autocmd that will be invoked when the window is initially loaded.
       *
       * **note**: this is not invoked when the config is reloaded.
       */
      create<const Event extends "WindowLoaded">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      create<const Event extends glide.AutocmdEvent>(
        event: Event,
        pattern: glide.AutocmdPatterns[Event] extends never ? (args: glide.AutocmdArgs[Event]) => void
          : glide.AutocmdPatterns[Event],
        callback?: (args: glide.AutocmdArgs[Event]) => void,
      ): void;
    };

    prefs: {
      /**
       * Set a preference. This is an alternative to `prefs.js` / [`about:config`](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
       * that all customisation can be represented in a single `glide.ts` file.
       *
       * **warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling {@link glide.prefs.set} in callbacks
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
       * const tab = await browser.tabs.query({ active: true, currentWindow: true })[0];
       * ```
       * But with additional error handling for invalid states.
       */
      active(): Promise<glide.TabWithID>;

      /**
       * Find the first tab matching the given query filter.
       *
       * This is the same API as [browser.tabs.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/get),
       * but returns the first tab instead of an Array.
       */
      get_first(query: Browser.Tabs.QueryQueryInfoType): Promise<Browser.Tabs.Tab | undefined>;
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
        fn: (props: glide.ExcmdCallbackProps) => void | Promise<void>,
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
        opts:
          & {
            /**
             * The ID of the tab into which to inject.
             *
             * Or the tab object as returned by {@link glide.tabs.active}.
             */
            tab_id: number | glide.TabWithID;
          }
          & (Parameters<F> extends [] ? {
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
            }),
      ): Promise<ReturnType<F>>;
    };

    keymaps: {
      set<const LHS>(
        modes: GlideMode | GlideMode[],
        lhs: $keymapcompletions.T<LHS>,
        rhs: glide.ExcmdString | glide.KeymapCallback,
        opts?: glide.KeymapOpts | undefined,
      ): void;

      /**
       * Remove the mapping of {lhs} for the {modes} where the map command applies.
       *
       * The mapping may remain defined for other modes where it applies.
       */
      del(
        modes: GlideMode | GlideMode[],
        lhs: string,
        opts?: glide.KeymapDeleteOpts,
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

        /**
         * Define a callback to filter the resolved hints. It is called once with the resolved hints,
         * and must return an array of the hints you want to include.
         *
         * An empty array may be returned but will result in an error notification indicating that no
         * hints were found.
         *
         * @content this function is evaluated in the content process.
         */
        pick?: (hints: glide.ContentHint[]) => glide.ContentHint[];
      }): void;
    };

    buf: {
      prefs: {
        /**
         * Set a preference for the current buffer. When navigating to a new buffer, the pref will be reset
         * to the previous value.
         *
         * See {@link glide.prefs.set} for more information.
         */
        set(name: string, value: string | number | boolean): void;
      };

      keymaps: {
        set<const LHS>(
          modes: GlideMode | GlideMode[],
          lhs: $keymapcompletions.T<LHS>,
          rhs: glide.ExcmdString | glide.KeymapCallback,
          opts?: Omit<glide.KeymapOpts, "buffer"> | undefined,
        ): void;

        /**
         * Remove the mapping of {lhs} for the {modes} where the map command applies.
         *
         * The mapping may remain defined for other modes where it applies.
         */
        del(
          modes: GlideMode | GlideMode[],
          lhs: string,
          opts?: Omit<glide.KeymapDeleteOpts, "buffer"> | undefined,
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
        opts?: glide.KeySendOptions,
      ): Promise<void>;

      /**
       * Returns a `Promise` that resolves to a {@link glide.KeyEvent} when the next key is pressed.
       *
       * This also prevents the key input from being processed further and does *not* invoke any associated mappings.
       *
       * If you *want* to inspect keys without preventing any default behaviour, you can use {@link glide.keys.next_passthrough}.
       *
       * Note: there can only be one `Promise` registered at any given time.
       *
       * Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
       *       until another key is pressed, e.g. `<C-a>`.
       */
      next(): Promise<glide.KeyEvent>;

      /**
       * Returns a `Promise` that resolves to a {@link glide.KeyEvent} when the next key is pressed.
       *
       * Unlike {@link glide.keys.next}, this does not prevent key events from passing through into their original behaviour.
       *
       * Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
       *       until another key is pressed, e.g. `<C-a>`.
       */
      next_passthrough(): Promise<glide.KeyEvent>;

      /**
       * Returns a `Promise` that resolves to a string representation of the key, when the next key is pressed.
       *
       * This also prevents the key input from being processed further and does *not* invoke any associated mappings.
       *
       * If you *want* to inspect keys without preventing any default behaviour, you can use {@link glide.keys.next_passthrough}.
       *
       * Note: there can only be one `Promise` registered at any given time.
       *
       * Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
       *       until another key is pressed, e.g. `<C-a>`.
       *
       * @example 'd'
       * @example '<C-l>'
       */
      next_str(): Promise<string>;

      /**
       * Parse a single key notation into a structured object.
       *
       * This normalises special keys to be consistent but otherwise the
       * parsed object only containers modifiers that were in the input string.
       *
       * Shifted keys are *not* special cased, the returned key is whatever was given
       * in in the input.
       *
       * @example "<Space>" -> { key: "<Space>" }
       * @example "H" -> { key: "H" }
       * @example "<S-h>" -> { key: "h", shift: true }
       * @example "<S-H>" -> { key: "H", shift: true }
       * @example "<C-S-a>" -> { key: "A", shift: true, ctrl: true }
       * @example "<M-a>" -> { key: "a", meta: true }
       */
      parse(key_notation: string): glide.KeyNotation;
    };

    unstable: {
      /**
       * Include another file as part of your config. The given file is evluated as if it
       * was just another Glide config file.
       *
       * **note**: this only supports files that are directly relative to your config file,
       *           for example, "shared.glide.ts" or "shared/glide.ts" would work but
       *           "../shared/glide.ts" will not.
       *
       * **note**: this function cannot be called from inside a file that has been included
       *           itself, i.e. nested {@link glide.unstable.include} calls are not supported.
       *
       * @example glide.unstable.include("shared.glide.ts")
       */
      include(path: string): Promise<void>;
    };

    messengers: {
      /**
       * Create a {@link glide.ParentMessenger} that can be used to communicate with the content process.
       *
       * Communication is currently uni-directional, the content process can communicate with the main
       * process, but not the other way around.
       *
       * Sending and receiving messages is type safe & determined from the type variable passed to this function.
       * e.g. in the example below, the only message that can be sent is `my_message`.
       *
       * ```typescript
       * // create a messenger and pass in the callback that will be invoked
       * // when `messenger.send()` is called below
       * const messenger = glide.messengers.create<{ my_message: null }>((message) => {
       *   switch (message.name) {
       *     case "my_message": {
       *       // ...
       *       break;
       *     }
       *   }
       * });
       *
       * glide.keymaps.set("normal", "gt", ({ tab_id }) => {
       *   // note the `messenger.content.execute()` function intead of
       *   // the typical `glide.content.execute()` function.
       *   messenger.content.execute((messenger) => {
       *     document.addEventListener('focusin', (event) => {
       *       if (event.target.id === 'my-element') {
       *         messenger.send('my_message');
       *       }
       *     })
       *   }, { tab_id });
       * });
       * ```
       */
      create<Messages extends Record<string, any>>(
        receiver: (message: glide.Message<Messages>) => void,
      ): glide.ParentMessenger<Messages>;
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
        opts: { caret: "block" | "line" | "underline" },
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
   * Throws an error if the given value is not truthy.
   *
   * Returns the value if it is truthy.
   */
  function ensure<T>(value: T, message?: string): T extends false | "" | 0 | 0n | null | undefined ? never : T;

  /**
   * Assert an invariant. An \`AssertionError\` will be thrown if `value` is falsy.
   */
  function assert(value: unknown, message?: string): asserts value;

  /**
   * The inverse of `{@link assert}`, useful for blowing up when the condition becomes `truthy`.
   */
  function todo_assert(value: unknown, message?: string): void;

  /**
   * Helper function for asserting exhaustiveness checks.
   *
   * You can optionally pass a second argument which will be used as the error message,
   * if not given then the first argument will be stringified in the error message.
   *
   * ```typescript
   * switch (union.type) {
   *  case 'type1': ...
   *  case 'type2': ...
   *  default:
   *    throw assert_never(union.type);
   * }
   */
  function assert_never(x: never, detail?: string | Error): never;

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
     * Corresponds to {@link glide.o} or {@link glide.bo}.
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
       * The delay, in milliseconds, before showing the which key UI.
       *
       * @default 300
       */
      which_key_delay: number;

      /**
       * The maximum number of entries to include in the jumplist, i.e.
       * how far back in history will the jumplist store.
       *
       * @default 100
       */
      jumplist_max_entries: number;

      /**
       * The font size of the hint label, directly corresponds to the
       * [font-size](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size) property.
       *
       * @default "11px"
       */
      hint_size: string;
    };

    export type RGBString = `#${string}`;

    /// @docs-skip
    export type TabWithID = Omit<Browser.Tabs.Tab, "id"> & { id: number };

    /// @docs-skip
    export type KeyEvent = KeyboardEvent & {
      /**
       * The vim notation of the KeyEvent, e.g.
       *
       * `{ ctrlKey: true, key: 's' }` -> `'<C-s>'`
       */
      glide_key: string;
    };

    /// @docs-skip
    export type KeySendOptions = {
      /**
       * Send the key event(s) directly through to the builtin Firefox
       * input handler and skip all of the mappings defined in Glide.
       */
      skip_mappings?: boolean;
    };

    /// @docs-skip
    export type KeymapCallback = (props: glide.KeymapCallbackProps) => void;

    /// @docs-skip
    export type KeymapCallbackProps = {
      /**
       * The tab that the callback is being executed in.
       */
      tab_id: number;
    };

    /// @docs-skip
    export type ExcmdCreateProps = {
      name: string;
      description?: string | undefined;
    };

    /// @docs-skip
    export type ExcmdValue = glide.ExcmdString | glide.ExcmdCallback | glide.KeymapCallback;

    /// @docs-skip
    export type ExcmdCallback = (props: glide.ExcmdCallbackProps) => void;

    /// @docs-skip
    export type ExcmdCallbackProps = {
      /**
       * The tab that the callback is being executed in.
       */
      tab_id: number;

      /**
       * The args passed to the excmd.
       *
       * @example "foo -r"                      -> ["-r"]
       * @example "foo -r 'string with spaces'" -> ["-r", "string with spaces"]
       */
      args_arr: string[];
    };

    /// @docs-skip
    export type ExcmdString =
      // builtin
      | import("./browser-excmds-registry.mjs").GlideCommandString
      // custom
      | keyof ExcmdRegistry
      | `${keyof ExcmdRegistry} ${string}`;

    /// @docs-skip
    export type ContentHint = {
      id: number;
      x: number;
      y: number;
      width: number;
      height: number;
      element: HTMLElement;
    };

    export type HintLocation = "content" | "browser-ui";

    type KeyNotation = {
      /**
       * @example <leader>
       * @example h
       * @example j
       * @example K
       * @example L
       * @example <Tab>
       */
      key: string;

      // modifiers
      alt: boolean;
      ctrl: boolean;
      meta: boolean;
      shift: boolean;
    };

    type Keymap = {
      sequence: string[];
      lhs: string;
      rhs: glide.ExcmdValue;
      description: string | undefined;
      mode: GlideMode;
    };

    type KeymapOpts = {
      description?: string | undefined;

      /**
       * If `true`, applies the mapping for the current buffer instead of globally.
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
      | "WindowLoaded"
      | "KeyStateChanged";
    type AutocmdPatterns = {
      UrlEnter: RegExp | { hostname?: string };
      ModeChanged: "*" | `${GlideMode | "*"}:${GlideMode | "*"}`;
      ConfigLoaded: null;
      WindowLoaded: null;
      KeyStateChanged: null;
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
      KeyStateChanged: {
        readonly mode: GlideMode;
        readonly sequence: string[];
        readonly partial: boolean;
      };
    };

    /// doesn't render properly right now
    /// @docs-skip
    type Message<Messages extends Record<string, any>> = {
      [K in keyof Messages]: {
        name: K;
        data: Messages[K];
      };
    }[keyof Messages];

    interface ParentMessenger<Messages extends Record<string, any>> {
      content: {
        /**
         * The given callback is executed in the content process and is given a
         * {@link glide.ContentMessenger} as the first argument.
         *
         * **note**: unlike {@link glide.content.execute} the callback cannot be passed custom arguments
         */
        execute: (callback: (messenger: glide.ContentMessenger<Messages>) => void, opts: {
          /**
           * The ID of the tab into which to inject.
           *
           * Or the tab object as returned by {@link glide.tabs.active}.
           */
          tab_id: number | glide.TabWithID;
        }) => void;
      };
    }

    interface ContentMessenger<Messages extends Record<string, any>> {
      /**
       * Send a message to the receiver in the parent process.
       */
      send<MessageName extends keyof Messages>(name: MessageName): void;
    }
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

  /**
   * Helper functions for interacting with the DOM.
   *
   * **note**: this is currently only available in the main process, for
   *           updating the browser UI itself. it is not available in
   *           content processes.
   */
  var DOM: {
    /**
     * Wrapper over `document.createElement()` providing a more ergonomic API.
     *
     * Element properties that can be assigned directly can be provided as props:
     *
     * ```ts
     * DOM.create_element('img', { src: '...' });
     * ```
     *
     * You can also pass a `children` property, which will use `.replaceChildren()`:
     *
     * ```ts
     * DOM.create_element("div", {
     *   children: ["text content", DOM.create_element("img", { alt: "hint" })],
     * });
     * ```
     */
    create_element<TagName extends keyof HTMLElementTagNameMap>(
      tag_name: TagName,
      props?: DOM.CreateElementProps<TagName>,
    ): HTMLElementTagNameMap[TagName];
  };

  namespace DOM {
    type Utils = typeof DOM;

    type CreateElementProps<K extends keyof HTMLElementTagNameMap> =
      & Omit<
        Partial<NonReadonly<HTMLElementTagNameMap[K]>>,
        "children"
      >
      & {
        /**
         * Can be an individual child or an array of children.
         */
        children?: (Node | string) | Array<Node | string>;

        /**
         * Set specific CSS style properties.
         *
         * This uses the JS style naming convention for properties, e.g. `zIndex`.
         */
        style?: Partial<CSSStyleDeclaration>;
      };
  }

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
    type T<LHS> = LHS extends "" ? SingleKey
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

    type StringToUnion<S extends string> = S extends `${infer First}${infer Rest}` ? First | StringToUnion<Rest>
      : never;

    /**
     * `<foo>` -> `foo`
     */
    type StripAngles<K extends SingleKey> = K extends `<${infer Inner}>` ? Inner : K;
  }
}

/// ----------------- util types -----------------

/**
 * Filter out `readonly` properties from the given object type.
 */
type NonReadonly<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends Readonly<any> ? never : K;
  }[keyof T]
>;

export {};
