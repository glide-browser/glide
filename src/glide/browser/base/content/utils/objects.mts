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
