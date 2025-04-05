const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

/**
 * Returns the last item in the array, throws an error if
 * the array is empty.
 */
export function lastx<T>(arr: T[]): T {
  return assert_present(arr.at(-1), "Expected non-empty array");
}

/**
 * Given an array, returns an iterable of `[index, item]`. Intended
 * for usage with a `for (const _ of)` loop, e.g.
 *
 * ```ts
 * for (const [i, arg] of enumerate(args)) {
 *   // ...
 * }
 * ```
 */
export function* enumerate<T>(arr: T[]): IterableIterator<[number, T]> {
  let i = 0;
  for (const item of arr) {
    yield [i, item];
    i++;
  }
}

/**
 * Join the given array with a `, ` separator and a final prefix work, e.g.
 *
 * `human_join(["a", "b", "c"], { final: 'and' })` -> `a, b and c`
 */
export function human_join(
  arr: ReadonlyArray<string | number>,
  { final, separator }: { final: string; separator?: string }
): string {
  if (!arr.length) {
    return "";
  }

  if (arr.length === 1) {
    return String(arr[0]!);
  }

  if (arr.length === 2) {
    return `${arr[0]} ${final} ${arr[1]}`;
  }

  return `${arr.slice(0, -1).join(separator ?? ", ")} ${final} ${arr.at(-1)}`;
}
