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

/**
 * Wrap an async function in a promise that will only invoke the given function when the promise
 * is interacted with, instead of just randomly being invoked from the ether.
 */
export class LazyPromise<T> extends Promise<T> {
  #func: () => Promise<T>;

  constructor(func: () => Promise<T>) {
    super((resolve) => {
      // this is maybe a bit weird but this has to be a no-op to not implicitly do anything
      resolve(null as any);
    });

    this.#func = func;
  }

  // oxlint-disable-next-line no-thenable
  override then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.#func().then(onfulfilled, onrejected);
  }

  override catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<T | TResult> {
    return this.#func().catch(onrejected);
  }

  override finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this.#func().finally(onfinally);
  }
}
