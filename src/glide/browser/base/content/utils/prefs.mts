// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * Helper for temporarily setting prefs.
 *
 * You **must** assign this with the `using` keyword, e.g. `using prefs = temp_prefs()`.
 *
 * *temporary* is determined by the lifetime of the return value, e.g.
 * ```typescript
 *  {
 *    using prefs = temp_prefs();
 *    prefs.set("foo", true);
 *    // .... for the rest of this block `foo` is set to `true`
 *  }
 *
 *  // ... now outside the block, `foo` is set to its previous value
 * ```
 */
export function temp_prefs(): Pick<Glide["prefs"], "set"> & { [Symbol.dispose]: () => void } {
  const glide = GlideBrowser.api;
  const stack: { name: string; value: string | number | boolean | undefined }[] = [];

  return {
    set(name: string, value: string | number | boolean) {
      stack.push({ name, value: glide.prefs.get(name) });
      glide.prefs.set(name, value);
    },
    [Symbol.dispose]() {
      for (const { name, value } of stack.toReversed()) {
        if (typeof value === "undefined") {
          glide.prefs.clear(name);
        } else {
          glide.prefs.set(name, value);
        }
      }
    },
  };
}
