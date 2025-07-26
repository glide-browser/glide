// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * A type representing the result of a Promise that has been settled (either fulfilled or rejected)
 * using the {@link all_settled} function.
 */
export type PromiseResult<T, M = void> =
  | { status: "fulfilled"; value: T; metadata: M }
  | { status: "rejected"; reason: unknown; metadata: M };

/**
 * Takes an array of functions that return Promises along with metadata
 * and returns an array of their results, preserving both successful and failed outcomes
 * with their respective values/reasons and associated metadata.
 */
export async function all_settled<T, M>(
  promises: Array<{ callback: () => Promise<T> | T; metadata: M }>,
): Promise<Array<PromiseResult<T, M>>> {
  return Promise.all(promises.map(({ callback, metadata }) =>
    Promise.resolve()
      .then(() => callback())
      .then(value => ({ status: "fulfilled", value, metadata }) as const, reason =>
        ({ status: "rejected", reason, metadata }) as const)
  ));
}
