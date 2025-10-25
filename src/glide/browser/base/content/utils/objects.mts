// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

type Obj<V = unknown, K extends string | number | symbol = string> = { [k in K]: V };

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
  writable = false,
) {
  Object.defineProperty(object, key, { enumerable: true, configurable: true, writable, value });
  return value;
}

/**
 * Provides the same functionality as `Object.assign` but also includes non-enumerable properties.
 */
export function object_assign<T extends Obj, U>(target: T, source: U): T & U;
export function object_assign<T extends Obj, U, V>(target: T, source1: U, source2: V): T & U & V;
export function object_assign<T extends Obj, U, V, W>(
  target: T,
  source1: U,
  source2: V,
  source3: W,
): T & U & V & W;
export function object_assign<T extends Obj, U, V, W, X>(
  target: T,
  source1: U,
  source2: V,
  source3: W,
  source4: X,
): T & U & V & W & X;
export function object_assign(target: Obj, ...sources: Obj[]): any {
  for (const source of sources) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(source))) {
      Object.defineProperty(target, name, descriptor);
    }
  }
  return target;
}
