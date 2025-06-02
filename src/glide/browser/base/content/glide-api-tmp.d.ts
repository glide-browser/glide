declare global {
  /**
   * The main interface to Glide fuctions.
   */
  var glide: {
    ctx: {
      /**
       * The URL of the currently focused tab.
       */
      url: string;

      bar: boolean;

      o: number;

      a: object;
    };

    // prefs: {
    //   /**
    //    * Set a preference. This is an alternative to `prefs.js` / [`about:config`](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
    //    * that all customisation can be represented in a single `glide.ts` file.
    //    *
    //    * **warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling `glide.pref()` in callbacks
    //    *              will result in the pref being properly applied everywhere.
    //    *
    //    * **warning**: there is also no guarantee that these settings will be applied when first loaded, sometimes a restart is required.
    //    *
    //    * Note: these settings are intended for experienced users, changing them can have serious effects on your browser’s stability, security and performance.
    //    */
    //   set(name: string, value: string | number | boolean): void;
    //
    //   /**
    //    * Get the value of a pref.
    //    *
    //    * If the pref is not defined, then `undefined` is returned.
    //    */
    //   get(name: string): string | number | boolean | undefined;
    //
    //   /**
    //    * Reset the pref value back to its default.
    //    */
    //   clear(name: string): void;
    // };
  };

  type GlideMode =
    | "normal"
    | "insert"
    | "visual"
    | "op-pending"
    | "ignore"
    | "hint";
}

export {};
