declare global {
  type GlideMode =
    | "normal"
    | "insert"
    | "visual"
    | "op-pending"
    | "ignore"
    | "hint";

  type KeymapOpts = {
    description?: string | undefined;

    /**
     * If `true`, creates a buffer-local mapping for the current buffer.
     *
     * @default {false}
     */
    buffer?: boolean;
  };

  type KeymapDeleteOpts = Pick<KeymapOpts, "buffer">;

  interface GlideGlobals {
    mapleader: string;
  }

  type GlideAutocmdEvent = "UrlEnter";
  type GlideAutocmdPattern = RegExp | { hostname?: string };
  type GlideAutocmdArgs = {
    UrlEnter: { readonly url: string };
  };

  var glide: {
    ctx: {
      url: string;
    };
    autocmd: {
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
        pattern: GlideAutocmdPattern,
        callback: (args: GlideAutocmdArgs[Event]) => void
      ): void;

      create<const Event extends GlideAutocmdEvent>(
        event: Event,
        pattern: GlideAutocmdPattern,
        callback: (args: GlideAutocmdArgs[Event]) => void
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
       *
       * Note: these settings are intended for experienced users, changing them can have serious effects on your browser’s stability, security and performance.
       */
      set(name: string, value: string | number | boolean): void;

      /**
       * Get the value of a preference.
       */
      get(name: string): string | number | boolean;

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
        opts?: KeymapOpts | undefined
      ): void;

      /**
       * Remove the mapping of {lhs} for the {modes} where the map command applies.
       *
       * The mapping may remain defined for other modes where it applies.
       */
      del(
        modes: GlideMode | GlideMode[],
        lhs: string,
        opts?: KeymapDeleteOpts
      ): void;
    };

    hints: {
      /**
       * Active and show hints for "clickable" elements in the content frame.
       *
       * An optional `action()` function can be passed that will be invoked when
       * a hint is selected.
       */
      activate(opts?: {
        /**
         * Callback invoked when the selected hint is chosen.
         *
         * This is executed in the content process.
         */
        action?(target: HTMLElement): Promise<void>;
      }): void;
    };

    buf: {
      keymaps: {
        set<const LHS>(
          modes: GlideMode | GlideMode[],
          lhs: $keymapcompletions.T<LHS>,
          rhs: glide.ExcmdValue,
          opts?: Omit<KeymapOpts, "buffer"> | undefined
        ): void;

        /**
         * Remove the mapping of {lhs} for the {modes} where the map command applies.
         *
         * The mapping may remain defined for other modes where it applies.
         */
        del(
          modes: GlideMode | GlideMode[],
          lhs: string,
          opts?: Omit<KeymapDeleteOpts, "buffer"> | undefined
        ): void;
      };
    };

    keys: {
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
  };

  /**
   * Assert an invariant. An \`AssertionError\` will be thrown if `value` is falsy.
   */
  function assert(value: unknown, message?: string): asserts value;

  /**
   * The inverse of `{@link assert}`, useful for blowing up when the condition becomes `truthy`.
   */
  function todo_assert(value: unknown, message?: string): void;

  namespace glide {
    export type TabWithID = Omit<browser.tabs.Tab, "id"> & { id: number };

    export type KeyEvent = KeyboardEvent & {
      /**
       * The vim notation of the KeyEvent, e.g.
       *
       * `{ ctrlKey: true, key: 's' }` -> `'<C-s>'`
       */
      glide_key: string;
    };

    export type ExcmdValue =
      import("./browser-excmds-registry.mjs").GlideCommandValue;

    export type ExcmdString =
      import("./browser-excmds-registry.mjs").GlideCommandString;
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
