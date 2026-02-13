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

      /**
       * The current glide version.
       *
       * @example "0.1.53a"
       */
      version: string;

      /**
       * The firefox version that glide is based on.
       *
       * @example "145.0b6"
       */
      firefox_version: string;

      /**
       * The URL of the currently focused tab.
       */
      url: URL;

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
     *
     * You can define your own options by declaration merging `GlideOptions`:
     *
     * ```typescript
     * declare global {
     *   interface GlideOptions {
     *     my_custom_option?: boolean;
     *   }
     * }
     * ```
     */
    /// @docs-expand-type-reference
    o: GlideOptions;

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

    env: {
      /**
       * Get the value of an environment variable.
       *
       * If it does not exist `null` is returned.
       */
      get(name: string): string | null;

      /**
       * Set the value of an environment variable.
       */
      set(name: string, value: string): void;

      /**
       * Remove an environment variable.
       *
       * Does *not* error if the environment variable did not already exist.
       *
       * Returns the value of the deleted environment variable, if it did not exist `null` is returned.
       */
      delete(name: string): string | null;
    };

    process: {
      /**
       * Spawn a new process. The given `command` can either be the name of a binary in the `PATH`
       * or an absolute path to a binary file.
       *
       * If the process exits with a non-zero code, an error will be thrown, you can disable this check with `{ check_exit_code: false }`.
       *
       * ```ts
       * const proc = await glide.process.spawn('kitty', ['nvim', 'glide.ts'], { cwd: '~/.dotfiles/glide' });
       * console.log('opened kitty with pid', proc.pid);
       * ```
       *
       * **note**: on macOS, the `PATH` environment variable is likely not set to what you'd expect, as applications do not inherit your shell environment.
       *           you can update it with `glide.env.set("PATH", "/usr/bin:/usr/.local/bin")`.
       */
      spawn(command: string, args?: string[] | null | undefined, opts?: glide.SpawnOptions): Promise<glide.Process>;

      /**
       * Spawn a new process and wait for it to exit.
       *
       * See {@link glide.process.spawn} for more information.
       */
      execute(
        command: string,
        args?: string[] | null | undefined,
        opts?: glide.SpawnOptions,
      ): Promise<glide.CompletedProcess>;
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
       * Create an autocmd that will be invoked whenever the focused tab changes.
       */
      create<const Event extends "TabEnter">(
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
       * This will be fired under four circumstances:
       *
       * 1. A key is pressed that matches a key mapping.
       * 2. A key is pressed that is part of a key mapping.
       * 3. A key is pressed that cancels a previous partial key mapping sequence.
       * 4. A partial key mapping is cancelled (see {@link glide.o.mapping_timeout})
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

      /**
       * Create an autocmd that will be invoked when the commandline is closed.
       */
      create<const Event extends "CommandLineExit">(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      create<const Event extends glide.AutocmdEvent>(
        event: Event,
        pattern: glide.AutocmdPatterns[Event] extends never ? (args: glide.AutocmdArgs[Event]) => void
          : glide.AutocmdPatterns[Event],
        callback?: (args: glide.AutocmdArgs[Event]) => void,
      ): void;

      /**
       * Remove a previously created autocmd.
       *
       * e.g. to create an autocmd that is only invoked once:
       * ```typescript
       * glide.autocmds.create("UrlEnter", /url/, function autocmd() {
       *   // ... do things
       *   glide.autocmds.remove("UrlEnter", autocmd);
       * });
       * ```
       *
       * If the given event/callback does not correspond to any previously created autocmds, then `false` is returned.
       */
      remove<const Event extends glide.AutocmdEvent>(
        event: Event,
        callback: (args: glide.AutocmdArgs[Event]) => void,
      ): boolean;
    };

    styles: {
      /**
       * Add custom CSS styles to the browser UI.
       *
       * ```typescript
       * glide.styles.add(css`
       *   #TabsToolbar {
       *     visibility: collapse !important;
       *   }
       * `);
       * ```
       *
       * If you want to remove the styles later on, you can pass an ID with `ts:glide.styles.add(..., { id: 'my-id'}`, and then
       * remove it with `ts:glide.styles.remove('my-id')`.
       */
      add(styles: string, opts?: { id: string; overwrite?: boolean }): void;

      /**
       * Remove custom CSS that has previously been added.
       *
       * ```typescript
       * glide.styles.add(css`
       *   #TabsToolbar {
       *     visibility: collapse !important;
       *   }
       * `, { id: 'disable-tab-bar' });
       * // ...
       * glide.styles.remove('disable-tab-bar');
       * ```
       *
       * If the given ID does not correspond to any previously registered styles, then `false` is returned.
       */
      remove(id: string): boolean;

      /**
       * Returns whether or not custom CSS has been registered with the given `id`.
       */
      has(id: string): boolean;

      /**
       * Returns the CSS string for the given `id`, or `undefined` if no styles have been registered with that ID.
       */
      get(id: string): string | undefined;
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

      /**
       * Helper for temporarily setting prefs.
       *
       * You **must** assign this with the `using` keyword, e.g. `using prefs = glide.prefs.scoped()`.
       *
       * *temporary* is determined by the lifetime of the return value, e.g.
       * ```typescript
       *  {
       *    using prefs = glide.prefs.scoped();
       *    prefs.set("foo", true);
       *    // .... for the rest of this block `foo` is set to `true`
       *  }
       *
       *  // ... now outside the block, `foo` is set to its previous value
       * ```
       */
      scoped(): glide.ScopedPrefs;
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
     * glide.g.my_prop = true;
     * ```
     */
    /// @docs-expand-type-reference
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

      /**
       * Gets all tabs that have the specified properties, or all tabs if no properties are specified.
       *
       * This is the same API as [browser.tabs.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query),
       */
      query(query: Browser.Tabs.QueryQueryInfoType): Promise<Browser.Tabs.Tab[]>;

      /**
       * Unload[0] the given tabs.
       *
       * Note that you *cannot* unload the currently active tab, if you try to do so, an error will be thrown.
       *
       * [0]: https://support.mozilla.org/kb/unload-tabs-reduce-memory-usage-firefox
       */
      unload(...tabs: Array<number | Browser.Tabs.Tab>): Promise<void>;
    };

    commandline: {
      /**
       * Show the commandline UI.
       *
       * By default this will list all excmds, but you can specify your own options, e.g.
       *
       * ```typescript
       * glide.commandline.show({
       *   title: "my options",
       *   options: ["option 1", "option 2", "option 3"].map((label) => ({
       *     label,
       *     execute() {
       *       console.log(`label ${label} was selected`);
       *     },
       *   })),
       * });
       * ```
       */
      show(opts?: glide.CommandLineShowOpts): Promise<void>;

      /**
       * Close the commandline UI.
       *
       * Returns `ts:true` if the commandline was previously open, `ts:false` if it was already closed.
       */
      close(): Promise<boolean>;

      /**
       * If the commandline is open and focused.
       */
      is_active(): boolean;
    };

    excmds: {
      /**
       * Execute an excmd, this is the same as typing `:cmd --args`.
       */
      execute(cmd: glide.ExcmdString): Promise<void>;

      /**
       * Create a new excmd.
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
      create<const Excmd extends glide.ExcmdCreateProps>(
        info: Excmd,
        fn: glide.ExcmdCallback | glide.ExcmdContentCallback,
      ): Excmd;
    };

    content: {
      /**
       * Mark a function so that it will be executed in the content process instead of the main proces.
       *
       * This is useful for APIs that are typically executed in the main process, for example:
       *
       * ```typescript
       * glide.excmds.create(
       *   { name: "focus_page" },
       *   glide.content.fn(() => {
       *     document.body!.focus();
       *   }),
       * );
       * ```
       */
      fn<F extends (...args: any[]) => any>(wrapped: F): glide.ContentFunction<F>;

      /**
       * Execute a function in the content process for the given tab.
       *
       * ```ts
       * await glide.content.execute(() => {
       *  document.body!.appendChild(DOM.create_element("p", ["this will show up at the bottom of the page!"]));
       * }, { tab_id: await glide.tabs.active() });
       * ```
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
      // NOTE: This has to be a separate overload from below because using
      // `Args extends` to allow `undefined` for `args` breaks tuple inference.
      execute<const Return extends any>(func: () => Return, opts: {
        /**
         * The ID of the tab into which to inject.
         *
         * Or the tab object as returned by {@link glide.tabs.active}.
         */
        tab_id: number | glide.TabWithID;
        /**
         * Note: the given function doesn't take any arguments but if
         *       it did, you could pass them here.
         */
        args?: undefined;
      }): Promise<Return>;
      execute<
        // NOTE: `any[] | []` encourages TypeScript to infer a proper tuple
        // type for the parameters.
        const Args extends readonly any[] | [],
        const Return extends any,
      >(func: (...args: Args) => Return, opts: {
        /**
         * The ID of the tab into which to inject.
         *
         * Or the tab object as returned by {@link glide.tabs.active}.
         */
        tab_id: number | glide.TabWithID;
        /**
         * Arguments to pass to the given function.
         *
         * **Must** be JSON serialisable
         */
        args: Args;
      }): Promise<Return>;
    };

    keymaps: {
      set<const LHS>(
        modes: GlideMode | GlideMode[],
        lhs: $keymapcompletions.T<LHS>,
        rhs: glide.ExcmdString | glide.KeymapCallback | glide.KeymapContentCallback,
        opts?: glide.KeymapOpts | undefined,
      ): void;

      /**
       * Remove the mapping of {lhs} for the {modes} where the map command applies.
       *
       * The mapping may remain defined for other modes where it applies.
       */
      del<const LHS>(
        modes: GlideMode | GlideMode[],
        lhs: $keymapcompletions.T<LHS>,
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
         * Include elements that have a `click` listener registered.
         *
         * @experimental
         * @default false
         */
        include_click_listeners?: boolean;

        /**
         * If only one hint is generated, automatically activate it.
         *
         * If `true`, the hint will be followed if there is exactly *one* matched hint.
         *
         * If `"always"`, the first hint that matches will be followed.
         *
         * @default false
         */
        auto_activate?: boolean | "always";

        /**
         * Callback invoked when the selected hint is chosen.
         *
         * This is executed in the content process.
         */
        action?: glide.HintAction;

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
         * A function to produce labels for the given hints. You can provide
         * your own function or use an included one:
         *
         *  - {@link glide.hints.label_generators.prefix_free}; this is the default.
         *  - {@link glide.hints.label_generators.numeric}
         *
         * For example:
         *
         * ```typescript
         * glide.hints.show({
         *   label_generator: ({ hints }) => Array.from({ length: hints.length }).map((_, i) => String(i))
         * });
         * ```
         *
         * Or using data from the hinted elements through `content.execute()`:
         *
         * ```typescript
         * glide.hints.show({
         *   async label_generator({ content }) {
         *     const texts = await content.execute((element) => element.textContent);
         *     return texts.map((text) => text.trim().toLowerCase().slice(0, 2));
         *   },
         * });
         * ```
         * note: the above example is a very naive implementation and will result in issues if there are multiple
         *       elements that start with the same text.
         */
        label_generator?: glide.HintLabelGenerator;

        /**
         * Define a callback to filter the resolved hints. It is called once with the resolved hints,
         * and must return an array of the hints you want to include.
         *
         * An empty array may be returned but will result in an error notification indicating that no
         * hints were found.
         */
        pick?: glide.HintPicker;
      }): void;

      label_generators: {
        /**
         * Use with {@link glide.o.hint_label_generator} to generate
         * prefix-free combinations of the characters in
         * {@link glide.o.hint_chars}.
         */
        prefix_free: glide.HintLabelGenerator;

        /**
         * Use with {@link glide.o.hint_label_generator} to generate
         * sequential numeric labels, starting at `1` and counting up.
         * Ignores {@link glide.o.hint_chars}.
         */
        numeric: glide.HintLabelGenerator;
      };
    };

    /**
     * APIs for interacting with the native [findbar](https://support.mozilla.org/kb/search-contents-current-page-text-or-links).
     */
    findbar: {
      /**
       * Open the findbar.
       *
       * This can also be used to update the findbar options if it is already open.
       */
      open(opts?: glide.FindbarOpenOpts): Promise<void>;

      /**
       * Select the next match for the findbar query.
       *
       * If the findbar is not currently open, then it is opened with the last searched query.
       */
      next_match(): Promise<void>;

      /**
       * Select the previous match for the findbar query.
       *
       * If the findbar is not currently open, then it is opened with the last searched query.
       */
      previous_match(): Promise<void>;

      /**
       * Close the findbar. Does nothing if the findbar is already closed.
       */
      close(): Promise<void>;

      /**
       * If the findbar UI is currently visible.
       */
      is_open(): boolean;

      /**
       * If the findbar UI is currently visible *and* focused.
       */
      is_focused(): boolean;
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
          rhs: glide.ExcmdString | glide.KeymapCallback | glide.KeymapContentCallback,
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

    addons: {
      /**
       * Installs an addon from the given XPI URL if that addon has *not* already been installed.
       *
       * If you want to ensure the addon is reinstalled, pass `{ force: true }`.
       *
       * You can obtain an XPI URL from [addons.mozilla.org](https://addons.mozilla.org) by finding
       * the extension you'd like to install, right clicking on "Add to Firefox" and selecting "Copy link".
       */
      install(xpi_url: string, opts?: glide.AddonInstallOptions): Promise<glide.AddonInstall>;

      /**
       * List all installed addons.
       *
       * The returned addons can be filtered by type, for example to only return extensions:
       *
       * ```typescript
       * await glide.addons.list('extension');
       * ```
       */
      list(types?: glide.AddonType | glide.AddonType[]): Promise<glide.Addon[]>;
    };

    search_engines: {
      /**
       * Adds or updates a custom search engine.
       *
       * The format matches `chrome_settings_overrides.search_provider`[0] from WebExtension manifests.
       *
       * The `search_url` must contain `{searchTerms}` as a placeholder for the search query.
       *
       * ```typescript
       * glide.search_engines.add({
       *   name: "Discogs",
       *   keyword: "disc",
       *   search_url: "https://www.discogs.com/search/?q={searchTerms}",
       *   favicon_url: "https://www.discogs.com/favicon.ico",
       * });
       * ```
       *
       * **note**: search engines you add are not removed when this call is removed, you will need to manually remove them
       *            using `about:preferences#search` for now.
       *
       * **note**: not all properties in the `chrome_settings_overrides.search_provider` manifest are supported, as they are not all
       *           supported by Firefox, e.g. `instant_url`, and `image_url`.
       *
       * [0]: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides#search_provider
       */
      add(props: Browser.Manifest.WebExtensionManifestChromeSettingsOverridesSearchProviderType): Promise<void>;
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

    /**
     * Include another file as part of your config. The given file is evluated as if it
     * was just another Glide config file.
     *
     * @example glide.include("shared.glide.ts")
     */
    include(path: string): Promise<void>;

    unstable: {
      /**
       * Manage tab split views.
       *
       * **note**: split views are experimental in Firefox, there *will* be bugs.
       */
      split_views: {
        /**
         * Start a split view with the given tabs.
         *
         * At least 2 tabs must be passed.
         *
         * **note**: this will not work if one of the given tabs is *pinned*.
         */
        create(tabs: Array<TabID | Browser.Tabs.Tab>, opts?: glide.SplitViewCreateOpts): glide.SplitView;

        /**
         * Given a tab, tab ID, or a splitview ID, return the corresponding split view.
         */
        get(tab: SplitViewID | TabID | Browser.Tabs.Tab): glide.SplitView | null;

        /**
         * Revert a tab in a split view to a normal tab.
         *
         * If the given tab is *not* in a split view, then an error is thrown.
         */
        separate(tab: SplitViewID | TabID | Browser.Tabs.Tab): void;

        /**
         * Whether or not the given tab is in a split view.
         */
        has_split_view(tab: TabID | Browser.Tabs.Tab): boolean;
      };

      /**
       * @deprecated Use {@link glide.include} instead.
       *
       * Include another file as part of your config. The given file is evluated as if it
       * was just another Glide config file.
       *
       * @example glide.include("shared.glide.ts")
       */
      /// @docs-skip
      include(path: string): Promise<void>;
    };

    path: {
      readonly cwd: string;
      readonly home_dir: string;
      readonly temp_dir: string;
      readonly profile_dir: string;

      /**
       * Join all arguments together and normalize the resulting path.
       *
       * Throws an error on non-relative paths.
       */
      join(...parts: string[]): string;
    };

    fs: {
      /**
       * Read the file at the given path.
       *
       * Relative paths are resolved relative to the config directory, if no config directory is defined then relative
       * paths are not allowed.
       *
       * The `encoding` must currently be set to `"utf8"` as that is the only supported encoding.
       *
       * @example await glide.fs.read("github.css", "utf8");
       */
      read(path: string, encoding: "utf8"): Promise<string>;

      /**
       * Write to the file at the given path.
       *
       * Relative paths are resolved relative to the config directory, if no config directory is defined then relative
       * paths are not allowed.
       *
       * If the path has parent directories that do not exist, they will be created.
       *
       * The `contents` are written in utf8.
       *
       * @example await glide.fs.write("github.css", ".copilot { display: none !important }");
       */
      write(path: string, contents: string): Promise<void>;

      /**
       * Determine if the given path exists.
       *
       * Relative paths are resolved relative to the config directory, if no config directory is defined then relative
       * paths are not allowed.
       *
       * @example await glide.fs.exists(`${glide.path.home_dir}/.config/foo`);
       */
      exists(path: string): Promise<boolean>;

      /**
       * Obtain information about a file, such as size, modification dates, etc.
       *
       * Relative paths are resolved relative to the config directory, if no config directory is defined then relative
       * paths are not allowed.
       *
       * ```ts
       * const stat = await glide.fs.stat('userChrome.css');
       * stat.last_modified // 1758835015092
       * stat.type // "file"
       * ```
       */
      stat(path: string): Promise<glide.FileInfo>;

      /**
       * Create a new directory at the given `path`.
       *
       * Parent directories are created by default, if desired you can turn this off with
       * `ts:glide.fs.mkdir('...', { parents: false })`.
       *
       * By default this will *not* error if the `path` already exists, if you would like it
       * to do so, pass `ts:glide.fs.mkdir('...', { exists_ok: false })`
       */
      mkdir(path: string, props?: {
        /**
         * If `false`, do not create missing parent directories.
         *
         * @default true
         */
        parents?: boolean;

        /**
         * Do not error if the directory already exists.
         *
         * @default true
         */
        exists_ok?: boolean;
      }): Promise<void>;
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
       * glide.modes.register('leap', { caret: 'block' })
       * ```
       */
      register<Mode extends keyof GlideModes>(
        mode: Mode,
        opts: { caret: "block" | "line" | "underline" },
      ): void;

      /**
       * List all registered modes.
       */
      list(): GlideMode[];
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
   * glide.modes.register('leap', { caret: 'block' })
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
    /**
     * The key notation that any `<leader>` mapping matches against.
     *
     * For example, a mapping defined with `<leader>r` would be matched when Space + r is pressed.
     *
     * @default "<Space>"
     */
    mapleader: string;
  }

  /**
   * Corresponds to {@link glide.o} or {@link glide.bo}.
   *
   * You can define your own options by declaration merging `GlideOptions`:
   *
   * ```typescript
   * declare global {
   *   interface GlideOptions {
   *     my_custom_option?: boolean;
   *   }
   * }
   * ```
   */
  // note: this is skipped in docs generation because we expand `glide.o`, so rendering
  //       the `Options` type as well would be redundant.
  /// @docs-skip
  interface GlideOptions {
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
     * @example "#ff6b35"        // Orange highlight
     * @example "rgb(255, 0, 0)" // Red highlight
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

    /**
     * The characters to include in hint labels.
     *
     * @default "hjklasdfgyuiopqwertnmzxcvb"
     */
    hint_chars: string;

    /**
     * A function to produce labels for the given hints. You can provide
     * your own function or use an included one:
     *
     *  - {@link glide.hints.label_generators.prefix_free}; this is the
     *    default.
     *
     *  - {@link glide.hints.label_generators.numeric}
     *
     * For example:
     * ```typescript
     * glide.o.hint_label_generator = ({ hints }) => Array.from({ length: hints.length }, (_, i) => String(i));
     * ```
     *
     * Or using data from the hinted elements through `content.execute()`:
     *
     * ```typescript
     * glide.hints.show({
     *   async label_generator({ content }) {
     *     const texts = await content.execute((element) => element.textContent);
     *     return texts.map((text) => text.trim().toLowerCase().slice(0, 2));
     *   },
     * });
     * ```
     * note: the above example is a very naive implementation and will result in issues if there are multiple
     *       elements that start with the same text.
     */
    hint_label_generator: glide.HintLabelGenerator;

    /**
     * Determines if the current mode will change when certain element types are focused.
     *
     * For example, if `true` then Glide will automatically switch to `insert` mode when an editable element is focused.
     *
     * This can be useful for staying in the same mode while switching tabs.
     *
     * @default true
     */
    switch_mode_on_focus: boolean;

    /**
     * Configure the strategy for implementing scrolling, this affects the
     * `h`, `j`, `k`, `l`,`<C-u>`, `<C-d>`, `G`, and `gg` mappings.
     *
     * This is exposed as the current `keys` implementation can result in non-ideal behaviour if a website overrides arrow key events.
     *
     * This will be removed in the future when the kinks with the `keys` implementation are ironed out.
     *
     * @default "keys"
     */
    scroll_implementation: "keys" | "legacy";

    /**
     * Configure the behavior of the native tab bar.
     *
     *  - `show`
     *  - `hide`
     *  - `autohide` (animated) shows the bar when the cursor is hovering over its default position
     *
     * This works for both horizontal and vertical tabs.
     *
     * For **vertical** tabs, the default collapsed width can be adjusted like this:
     * ```typescript
     * glide.o.native_tabs = "autohide";
     * // fully collapse vertical tabs
     * glide.styles.add(css`
     *   :root {
     *     --uc-tab-collapsed-width: 2px;
     *   }
     * `);
     * ```
     *
     * See [firefox-csshacks](https://mrotherguy.github.io/firefox-csshacks/?file=autohide_tabstoolbar_v2.css) for more information.
     *
     * **warning**: `autohide` does not work on MacOS at the moment.
     *
     * @default "show"
     */
    native_tabs: "show" | "hide" | "autohide";

    /**
     * The URL to load when a new tab is created.
     *
     * This may be a local file (e.g. `"file:///path/to/page.html"`) or
     * any other URL, e.g. `"https://example.com"`.
     *
     * @default "about:newtab"
     */
    newtab_url: string;

    /**
     * The element text patterns to search for in the `:go_next` excmd.
     *
     * For example, with the default patterns, `html:<a href="...">next page</a>` would be matched.
     *
     * @default ["next", "more", "newer", ">", ">", "›", "→", "»", "≫", ">>"]
     */
    go_next_patterns: string[];

    /**
     * The element text patterns to search for in the `:go_previous` excmd.
     *
     * For example, with the default patterns, `html:<a href="...">next page</a>` would be matched.
     *
     * @default ["prev", "previous", "back", "older", "<", "‹", "←", "«", "≪", "<<"]
     */
    go_previous_patterns: string[];

    /**
     * Determines whether keymappings should resolve from the key event `code`[0] or `key`[1].
     *
     * The `code` is the string for the *physical* key that you pressed, whereas the `key` is the string that your OS resolved to.
     *
     * For example, with a german layout pressing the key with the `BracketLeft` code, `[` on a US layout, would result in `key` being set to `ü`.
     *
     * - `ts:"never"` always use `event.key`
     * - `ts:"force"` always use `event.code`
     * - `ts:"for_macos_option_modifier"` use `event.code` on macOS when the Option modifier is held, `event.key` otherwise.
     *   this is useful, as macOS uses Option for diacritics support, e.g. Option + p => π, which can be surprising as you'd have to
     *   map `<A-π>` instead of `<A-p>`.
     *
     * Codes are translated to keys using {@link glide.o.keyboard_layout}, the default is `ts:"qwerty"` but you can add arbitrary layouts with {@link glide.o.keyboard_layouts}.
     *
     * Setting this to `ts:"force"` is recommended for everyone with multiple, or non-english keyboard layouts.
     *
     * [0]: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code
     * [1]: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key
     *
     * @default "for_macos_option_modifier"
     */
    keymaps_use_physical_layout: "never" | "for_macos_option_modifier" | "force";

    /**
     * The keyboard layout to use when {@link glide.o.keymaps_use_physical_layout} is set to `ts:"force"`.
     *
     * The only keyboard layout supported by default is `ts:"qwerty"`. See {@link glide.o.keyboard_layouts} for how to add your own.
     */
    keyboard_layout: keyof GlideKeyboardLayouts;

    /**
     * The supported keyboard layouts. Each entry in this object should map a key [`code`](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code) to the string, and shifted string, used in glide keymappings.
     *
     * If your layout is missing, you can create one with the help of [https://gistpreview.github.io/?348d752bfaec70b703cc809d34e0462b](https://gistpreview.github.io/?348d752bfaec70b703cc809d34e0462b), and then add it to glide with:
     *
     * ```typescript
     * declare global {
     *   interface GlideKeyboardLayouts {
     *     dvorak: GlideKeyboardLayout;
     *   }
     * }
     * glide.o.keyboard_layouts.dvorak = {
     *   // `[` by default, `{` when shift is held
     *   Minus: ["[", "{"],
     *   // ...
     * };
     * glide.o.keyboard_layout = "dvorak";
     * ```
     *
     * note: please contribute your layout into Glide so that others can benefit from it!
     *       you'll have to add it to `get_layouts()` in https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/browser-keyboard.mts
     *       and `GlideKeyboardLayouts` in https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/glide.d.ts
     */
    keyboard_layouts: GlideKeyboardLayouts;
  }

  /**
   * Builtin keyboard layouts.
   *
   * If your layout is missing, you can create one with the help of [https://gistpreview.github.io/?348d752bfaec70b703cc809d34e0462b](https://gistpreview.github.io/?348d752bfaec70b703cc809d34e0462b), and then add it to glide with:
   *
   * ```typescript
   * declare global {
   *   interface GlideKeyboardLayouts {
   *     dvorak: GlideKeyboardLayout;
   *   }
   * }
   * glide.o.keyboard_layouts.dvorak = {
   *   // `[` by default, `{` when shift is held
   *   Minus: ["[", "{"],
   *   // ...
   * };
   * glide.o.keyboard_layout = "dvorak";
   * glide.o.keymaps_use_physical_layout = "force";
   * ```
   *
   * note: please contribute your layout into glide so that others can benefit from it!
   *       you'll have to add it to `get_layouts()` in https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/browser-keyboard.mts
   *       and `GlideKeyboardLayouts` in https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/glide.d.ts
   */
  interface GlideKeyboardLayouts {
    "qwerty": GlideKeyboardLayout;
  }

  type GlideKeyboardLayout = Partial<Record<keyof GlideKeyCodes, [key: string, shifted: string]>>;

  /**
   * All key code values mentioned in https://developer.mozilla.org/docs/Web/API/UI_Events/Keyboard_event_code_values
   */
  interface GlideKeyCodes {
    // <most common keys>
    KeyA: {};
    KeyB: {};
    KeyC: {};
    KeyD: {};
    KeyE: {};
    KeyF: {};
    KeyG: {};
    KeyH: {};
    KeyI: {};
    KeyJ: {};
    KeyK: {};
    KeyL: {};
    KeyM: {};
    KeyN: {};
    KeyO: {};
    KeyP: {};
    KeyQ: {};
    KeyR: {};
    KeyS: {};
    KeyT: {};
    KeyU: {};
    KeyV: {};
    KeyW: {};
    KeyX: {};
    KeyY: {};
    KeyZ: {};
    Digit0: {};
    Digit1: {};
    Digit2: {};
    Digit3: {};
    Digit4: {};
    Digit5: {};
    Digit6: {};
    Digit7: {};
    Digit8: {};
    Digit9: {};
    Equal: {};
    Comma: {};
    Slash: {};
    Quote: {};
    Minus: {};
    Period: {};
    Backquote: {};
    Backslash: {};
    Semicolon: {};
    BracketLeft: {};
    BracketRight: {};
    // <most common keys />

    IntlBackslash: {};
    IntlRo: {};
    IntlYen: {};
    AltLeft: {};
    AltRight: {};
    Backspace: {};
    CapsLock: {};
    ContextMenu: {};
    ControlLeft: {};
    ControlRight: {};
    Enter: {};
    Escape: {};
    MetaLeft: {};
    MetaRight: {};
    ShiftLeft: {};
    ShiftRight: {};
    Space: {};
    Tab: {};
    F1: {};
    F2: {};
    F3: {};
    F4: {};
    F5: {};
    F6: {};
    F7: {};
    F8: {};
    F9: {};
    F10: {};
    F11: {};
    F12: {};
    F13: {};
    F14: {};
    F15: {};
    F16: {};
    F17: {};
    F18: {};
    F19: {};
    F20: {};
    F21: {};
    F22: {};
    F23: {};
    F24: {};
    Delete: {};
    End: {};
    Help: {};
    Home: {};
    Insert: {};
    PageDown: {};
    PageUp: {};
    ArrowDown: {};
    ArrowLeft: {};
    ArrowRight: {};
    ArrowUp: {};
    NumLock: {};
    Numpad0: {};
    Numpad1: {};
    Numpad2: {};
    Numpad3: {};
    Numpad4: {};
    Numpad5: {};
    Numpad6: {};
    Numpad7: {};
    Numpad8: {};
    Numpad9: {};
    NumpadAdd: {};
    NumpadComma: {};
    NumpadDecimal: {};
    NumpadDivide: {};
    NumpadEnter: {};
    NumpadEqual: {};
    NumpadMultiply: {};
    NumpadSubtract: {};
    ScrollLock: {};
    Pause: {};
    PrintScreen: {};
    AudioVolumeMute: {};
    Eject: {};
    MediaPlayPause: {};
    MediaSelect: {};
    MediaStop: {};
    MediaTrackNext: {};
    MediaTrackPrevious: {};
    VolumeDown: {};
    VolumeMute: {};
    VolumeUp: {};
    BrowserBack: {};
    BrowserFavorites: {};
    BrowserForward: {};
    BrowserHome: {};
    BrowserRefresh: {};
    BrowserSearch: {};
    BrowserStop: {};
    LaunchApp1: {};
    LaunchApp2: {};
    LaunchMail: {};
    Convert: {};
    KanaMode: {};
    Lang1: {};
    Lang2: {};
    NonConvert: {};
    Again: {};
    Copy: {};
    Cut: {};
    Find: {};
    Open: {};
    Paste: {};
    Props: {};
    Select: {};
    Undo: {};
    Power: {};
    WakeUp: {};
    Fn: {};
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

  class FileNotFoundError extends Error {
    path: string;

    constructor(message: string, props: { path: string });
  }

  class FileModificationNotAllowedError extends Error {
    path: string;

    constructor(message: string, props: { path: string });
  }

  class DataCloneError extends Error {}

  class GlideProcessError extends Error {
    process: glide.CompletedProcess;
    exit_code: number;
    constructor(message: string, process: glide.CompletedProcess);
  }

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
    // note: this is skipped in docs generation because we expand `glide.o`, so rendering
    //       the `Options` type as well would be redundant.
    /// @docs-skip
    export type Options = GlideOptions;

    /// @docs-skip
    export type TypedArray =
      | Int8Array
      | Uint8Array
      | Uint8ClampedArray
      | Int16Array
      | Uint16Array
      | Int32Array
      | Uint32Array
      | Float32Array
      | Float64Array
      | BigInt64Array
      | BigUint64Array;

    export type SpawnOptions = {
      cwd?: string;

      env?: Record<string, string | null>;
      extend_env?: boolean;

      success_codes?: number[];

      /**
       * If `false`, do not throw an error for non-zero exit codes.
       *
       * @default true
       */
      check_exit_code?: boolean;

      /**
       * Control where the stderr output is sent.
       *
       * If `"pipe"` then sterr is accessible through `process.stderr`.
       * If `"stdout"` then sterr is mixed with stdout and accessible through `process.stdout`.
       *
       * @default "pipe"
       */
      stderr?: "pipe" | "stdout";
    };

    export type Process = {
      pid: number;

      /**
       * The process exit code.
       *
       * `null` if it has not exited yet.
       */
      exit_code: number | null;

      /**
       * A `ReadableStream` of `string`s from the stdout pipe with helpers for processing the output.
       */
      stdout: glide.ProcessReadStream;

      /**
       * A `ReadableStream` of `string`s from the stderr pipe with helpers for processing the output.
       *
       * This is `null` if the `stderr: 'stdout'` option was set as the pipe will be forwarded
       * to `stdout` instead.
       */
      stderr: glide.ProcessReadStream | null;

      /**
       * Write to the process's stdin pipe.
       */
      stdin: glide.ProcessStdinPipe;

      /**
       * Wait for the process to exit.
       */
      wait(): Promise<glide.CompletedProcess>;

      /**
       * Kill the process.
       *
       * On platforms which support it, the process will be sent a `SIGTERM` signal immediately,
       * so that it has a chance to terminate gracefully, and a `SIGKILL` signal if it hasn't exited
       * within `timeout` milliseconds.
       *
       * @param {integer} [timeout=300]
       *        A timeout, in milliseconds, after which the process will be forcibly killed.
       */
      kill(timeout?: number): Promise<glide.CompletedProcess>;
    };

    export type ProcessReadStream = ReadableStream<string> & {
      /**
       * When `await`ed returns all of the text in the stream.
       *
       * When iterated, yields each text chunk in the stream as it comes in.
       */
      text(): Promise<string> & { [Symbol.asyncIterator](): AsyncIterator<string> };
      /**
       * When `await`ed returns an array of lines.
       *
       * When iterated, yields each line in the stream as it comes in.
       */
      lines(): Promise<string[]> & { [Symbol.asyncIterator](): AsyncIterator<string> };
    };

    /**
     * Represents a process that has exited.
     */
    export type CompletedProcess = glide.Process & { exit_code: number };

    export type ProcessStdinPipe = {
      /**
       * Write data to the process's stdin.
       *
       * Accepts either a string (which will be UTF-8 encoded) or
       * a binary array (e.g. ArrayBuffer, Uint8Array etc).
       *
       * **warning**: you *must* call `.close()` once you are done writing,
       *              otherwise the process will never exit.
       */
      write(data: string | ArrayBuffer | glide.TypedArray): Promise<void>;

      /**
       * Close the stdin pipe, signaling EOF to the process.
       *
       * By default, waits for any pending writes to complete before closing.
       * Pass `{ force: true }` to close immediately without waiting.
       */
      close(opts?: { force?: boolean }): Promise<void>;
    };

    export type RGBString = `#${string}` | `rgb(${string})`;

    /** A web extension tab that is guaranteed to have the `ts:id` property present. */
    export type TabWithID = Omit<Browser.Tabs.Tab, "id"> & { id: number };

    export type ScopedPrefs = Omit<(typeof glide.prefs), "scoped"> & { [Symbol.dispose](): void };

    export type AddonInstallOptions = {
      /**
       * If `true`, always install the given addon, even if it is already installed.
       *
       * @default false
       */
      force?: boolean;

      /**
       * If the addon will be enabled in private browsing mode.
       *
       * @default false
       */
      private_browsing_allowed?: boolean;
    };

    export type Addon = {
      readonly id: string;
      readonly name: string;
      readonly description: string;
      readonly version: string;
      readonly active: boolean;
      readonly source_uri: URL | null;
      readonly private_browsing_allowed: boolean;
      readonly type: "extension" | "plugin" | "theme" | "locale" | "dictionary" | "sitepermission" | "mlmodel";

      uninstall(): Promise<void>;

      /**
       * Reload the addon.
       *
       * This is similar to uninstalling / reinstalling, but less destructive.
       */
      reload(): Promise<void>;
    };

    export type AddonInstall = glide.Addon & { cached: boolean };

    // @docs-expand-type-body
    export type AddonType = "extension" | "theme" | "locale" | "dictionary" | "sitepermission";

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

    export type KeymapCallback = (props: glide.KeymapCallbackProps) => void;
    export type KeymapContentCallback = glide.ContentFunction<() => void>;

    export type KeymapCallbackProps = {
      /**
       * The tab that the callback is being executed in.
       */
      tab_id: number;
    };

    /**
     * Represents a function that will be executed in the content process.
     */
    export interface ContentFunction<F extends (...args: any[]) => any> {
      $brand: "$glide.content.fn";

      fn: F;
      name: string;
    }

    /// @docs-skip
    export type ExcmdCreateProps = {
      name: string;
      description?: string | undefined;
    };

    /// @docs-skip
    export type ExcmdValue =
      | glide.ExcmdString
      | glide.ExcmdCallback
      | glide.ExcmdContentCallback
      | glide.KeymapCallback
      | glide.KeymapContentCallback;

    /// @docs-skip
    export type ExcmdCallback = (props: glide.ExcmdCallbackProps) => void | Promise<void>;
    /// @docs-skip
    export type ExcmdContentCallback = glide.ContentFunction<(props: glide.ExcmdContentCallbackProps) => void>;

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
    export type ExcmdContentCallbackProps = {
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
    export type Hint = {
      id: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    /// @docs-skip
    export type ContentHint = glide.Hint & { element: HTMLElement };
    /// @docs-skip
    export type ResolvedHint = glide.Hint & { label: string };

    export type HintLabelGenerator = (ctx: HintLabelGeneratorProps) => string[] | Promise<string[]>;

    export type HintLabelGeneratorProps = {
      hints: glide.Hint[];

      content: {
        /**
         * Executes the given callback in the content process to extract properties
         * from the all elements that are being hinted.
         *
         * For example:
         * ```typescript
         * const texts = await content.map((target) => target.textContent);
         * ```
         */
        map<R>(
          cb: (target: HTMLElement, index: number) => R | Promise<R>,
        ): Promise<Awaited<R>[]>;
      };
    };

    export type HintPicker = (props: glide.HintPickerProps) => glide.Hint[] | Promise<glide.Hint[]>;

    export type HintPickerProps = {
      hints: glide.Hint[];

      content: {
        /**
         * Executes the given callback in the content process to extract properties
         * from the all elements that are being hinted.
         *
         * For example:
         * ```typescript
         * const areas = await content.map((element) => element.offsetWidth * element.offsetHeight);
         * ```
         */
        map<R>(
          cb: (target: HTMLElement, index: number) => R | Promise<R>,
        ): Promise<Awaited<R>[]>;
      };
    };

    export type HintLocation = "content" | "browser-ui";

    export type HintAction =
      | "click"
      | "newtab-click"
      | ((props: glide.HintActionProps) => Promise<void> | void);

    export type HintActionProps = {
      /**
       * The resolved hint that is being executed.
       */
      hint: glide.ResolvedHint;

      content: {
        /**
         * Execute the given callback in the content process to extract properties
         * from the hint element.
         *
         * For example:
         * ```typescript
         * const href = await content.execute((target) => target.href);
         * ```
         */
        execute<R>(cb: (target: HTMLElement) => R | Promise<R>): Promise<R extends Promise<infer U> ? U : R>;
      };
    };

    export type FindbarOpenOpts = {
      /**
       * Search for the given string.
       *
       * When not specified, the findbar opens with the most recently used search query. To open the findbar
       * with an empty query, pass an empty string `""`.
       */
      query?: string;

      /**
       * The findbar can be opened in 3 different "modes":
       *
       * - "links"    : the findbar will only show results for links, pressing enter will click the link
       * - "typeahead": the findbar will exit as soon as you press enter
       * - "normal"   : the classic experience
       *
       * @default "normal"
       */
      mode?: "normal" | "typeahead" | "links";

      /**
       * Highlight all terms that match the search you've entered
       *
       * When not specified, this retains whatever value was last set—either through the API or by manually
       * toggling the highlight button in the findbar.
       */
      highlight_all?: boolean | undefined;

      /**
       * Make searches case-sensitive.
       *
       * Normally if you search for "search phrase", instances of "Search Phrase" on the page will also be found.
       *
       * If this is set to `false`, only instances of the phrase exactly as you've typed it will be found.
       *
       * When not specified, this retains whatever value was last set—either through the API or by manually
       * toggling the casing button in the findbar.
       */
      match_casing?: boolean | undefined;

      /**
       * When this option is `true` the search will distinguish between accented letters and their base letters.
       *
       * For example, the search for "résumé" will not find a match for "resume".
       *
       * When not specified, this retains whatever value was last set—either through the API or by manually
       * toggling the diacritics button in the findbar.
       */
      match_diacritics?: boolean | undefined;

      /**
       * This highlights only entire words that match your search.
       *
       * When not specified, this retains whatever value was last set—either through the API or by manually
       * toggling the whole words button in the findbar.
       */
      whole_words?: boolean | undefined;
    };

    export type SplitViewCreateOpts = {
      id?: string;
    };

    export type SplitView = {
      id: string;
      tabs: Browser.Tabs.Tab[];
    };

    export type KeyNotation = {
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

    export type Keymap = {
      sequence: string[];
      lhs: string;
      rhs: glide.ExcmdValue;
      description: string | undefined;
      mode: GlideMode;
    };

    export type KeymapOpts = {
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

    export type KeymapDeleteOpts = Pick<glide.KeymapOpts, "buffer">;

    export type CommandLineShowOpts = {
      /**
       * Fill the commandline with this input by default.
       */
      input?: string;

      /**
       * Configure the text shown at the top of the commandline.
       *
       * This is *only* used when `options` are provided.
       *
       * If `options` are given and this is not, then it defaults to `"options"`.
       */
      title?: string;

      /**
       * Replace the default commandline options.
       *
       * For example:
       *
       * ```typescript
       * ["option 1", "option 2", "option 3"].map((label) => ({
       *   label,
       *   execute() {
       *     console.log(`label ${label} was selected`);
       *   },
       * })),
       * ```
       */
      options?: glide.CommandLineCustomOption[];
    };

    export type CommandLineCustomOption = {
      /** Primary text shown for this option. */
      label: string;

      /** Optional secondary text rendered next to the label. */
      description?: string;

      /**
       * Optional callback used to display this option in the UI.
       *
       * If provided, this _replaces_ the default rendering, which is placing `label` / `description` in two columns.
       *
       * @example
       * ```typescript
       * render() {
       *   return DOM.create_element("div", {
       *     style: { display: "flex", alignItems: "center", gap: "8px" },
       *     children: [bookmark.title],
       *   });
       * }
       * ```
       */
      render?(): HTMLElement;

      /**
       * Optional callback used to determine if this option matches the input entered in the commandline.
       *
       * This is called every time the input changes.
       *
       * `null` can be returned to defer to the default matcher.
       *
       * @example
       * ```typescript
       * matches({ input }) {
       *   return my_fuzzy_matcher(input, [bookmark.title]);
       * }
       * ```
       */
      matches?(props: { input: string }): boolean | null;

      /**
       * Callback that is invoked when `<enter>` is pressed while this option is focused.
       *
       * The `input` corresponds to the text entered in the commandline.
       */
      execute(props: { input: string }): void;
    };

    type AutocmdEvent =
      | "UrlEnter"
      | "TabEnter"
      | "ModeChanged"
      | "ConfigLoaded"
      | "WindowLoaded"
      | "CommandLineExit"
      | "KeyStateChanged";
    type AutocmdPatterns = {
      UrlEnter: RegExp | { hostname?: string };
      TabEnter: RegExp | { hostname?: string };
      ModeChanged: "*" | `${GlideMode | "*"}:${GlideMode | "*"}`;
      ConfigLoaded: null;
      WindowLoaded: null;
      CommandLineExit: null;
      KeyStateChanged: null;
    };
    type AutocmdArgs = {
      UrlEnter: { readonly url: string; readonly tab_id: number };
      TabEnter: { readonly url: string; readonly tab_id: number };
      ModeChanged: {
        /**
         * This may be `null` when first loading Glide or when reloading the config.
         */
        readonly old_mode: GlideMode | null;
        readonly new_mode: GlideMode;
      };
      ConfigLoaded: {};
      WindowLoaded: {};
      CommandLineExit: {};
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

    export type FileInfo = {
      type: "file" | "directory" | null;
      permissions: number | undefined;
      last_accessed: number | undefined;
      last_modified: number | undefined;
      creation_time: number | undefined;
      path: string | undefined;
      size: number | undefined;
    };
  }

  type TabID = number;
  type SplitViewID = string;

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
     * You can also pass a `children` array, or property, which will use `.replaceChildren()`:
     *
     * ```ts
     * DOM.create_element("div", ["text content", DOM.create_element("img", { alt: "hint" })]);
     * // or
     * DOM.create_element("div", {
     *   children: ["text content", DOM.create_element("img", { alt: "hint" })],
     * });
     * ```
     */
    create_element<TagName extends keyof HTMLElementTagNameMap | (string & {})>(
      tag_name: TagName,
      props_or_children?:
        // props
        | DOM.CreateElementProps<TagName extends keyof HTMLElementTagNameMap ? TagName : "div">
        // children
        | Array<(Node | string)>,
      props?: DOM.CreateElementProps<TagName extends keyof HTMLElementTagNameMap ? TagName : "div">,
    ): TagName extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TagName] : HTMLElement;

    listeners: {
      /**
       * Returns true if a event target has any listener for the given type.
       *
       * ```typescript
       * DOM.listeners.has(element, "click");
       * ```
       */
      has(target: EventTarget, type: string): boolean;
    };
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
         * Set arbitrary attributes on the element.
         */
        attributes?: Record<string, string>;

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
     * `<leader>-` -> `<leader>-a` | `<leader>-<CR>` ...
     * `g` -> `gg` | `gj` ...
     */
    type T<LHS> = LHS extends "" ? SingleKey
      : LHS extends "<" ? LHS | SpecialKey | `<${ModifierKey}-`
      : LHS extends `${infer S}<${infer M}-` ?
          | LHS
          | `${S}<${M}-${Exclude<StripAngles<SingleKey>, ModifierKey>}>`
          | `${S}<${M}-${ModifierKey}-`
      : LHS extends `${infer S}<` ? LHS | `${S}${SpecialKey}`
      : LHS extends `${infer S}-` ? LHS | `${S}-${SingleKey}`
      : LHS extends `${infer S}` ? LHS | `${S}${SingleKey}`
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
