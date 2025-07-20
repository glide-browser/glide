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

  throw new Error(
    detail ?? `assert_never: impossible to call: ${JSON.stringify(x)}`
  );
}

export function is_present<T>(x: T | null | undefined): x is T {
  return x != null;
}

export function assert_present<T>(
  value: T | null | undefined,
  detail?: string | Error
): T {
  if (value != null) {
    return value;
  }

  if (detail instanceof Error) {
    throw detail;
  }

  throw new Error(
    detail ?? `assert_present: impossible to call: ${JSON.stringify(value)}`
  );
}
