/**
 * A helper function to cache getters.
 *
 * Inspired by `toolkit/components/extensions/ExtensionCommon.sys.mjs::redefineGetter`
 * but with full type safety.
 *
 * ```typescript
 * get browser(): Browser {
 *   const value = my_expensive_operation();
 *   return redefine_getter(this, 'browser', value)
 * }
 * ```
 */
export function redefine_getter<O, Key extends keyof O, Value extends O[Key]>(
  object: O,
  key: Key,
  value: Value,
  writable = false
) {
  Object.defineProperty(object, key, {
    enumerable: true,
    configurable: true,
    writable,
    value,
  });
  return value;
}

export function get_all_properties<T>(
  object: T,
  opts: {
    /**
     * This is requires as we can't copy over getters in certain contexts,
     *
     * e.g. doing so on the `Window` object results in
     *      `TypeError: 'get window' called on an object that does not implement interface Window.`
     */
    include_getters?: boolean;
  } = { include_getters: true }
): T {
  const new_obj = {};
  for (const [name, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(object)
  )) {
    if (!opts.include_getters && !Object.hasOwn(descriptor, "value")) {
      continue;
    }

    Object.defineProperty(new_obj, name, { ...descriptor, enumerable: true });
  }
  return new_obj as T;
}
