// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * Helper function for asserting exhaustiveness checks.
 *
 * You can optionally pass a second argument which will be used as the error message,
 * if not given then the first argument will be stringified in the error message.
 */
export function assert_never(x: never, detail?: string | Error): never {
  if (detail instanceof Error) {
    throw detail;
  }

  throw new Error(detail ?? `assert_never: impossible to call: ${JSON.stringify(x)}`);
}

export function is_present<T>(x: T | null | undefined): x is T {
  return x != null;
}

export function assert_present<T>(
  value: T | null | undefined,
  detail?: string | Error,
): T {
  if (value != null) {
    return value;
  }

  if (detail instanceof Error) {
    throw detail;
  }

  throw new Error(detail ?? `assert_present: impossible to call: ${JSON.stringify(value)}`);
}

/**
 * Assert an invariant. An \`AssertionError\` will be thrown if `value` is falsy.
 */
export function assert(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new AssertionError({ message, actual: value });
  }
}

/**
 * Throws an error if the given value is not truthy.
 *
 * Returns the value if it is truthy.
 */
export function ensure<T>(value: T, message?: string): T extends false | "" | 0 | 0n | null | undefined ? never : T {
  if (!value) {
    throw new AssertionError({ message: message ?? `Expected a truthy value, got \`${value}\``, actual: value });
  }

  // @ts-ignore
  return value;
}

export class AssertionError extends Error {
  actual: unknown;

  constructor(props: { message: string | undefined; actual: unknown }) {
    super(props.message ?? `Expected \`${props.actual}\` to be truthy`);
  }
}
