/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { get_all_properties } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/objects.mjs"
);

const { WINDOW_PROPERTIES } = ChromeUtils.importESModule(
  "chrome://glide/content/sandbox-properties.mjs"
);

/**
 * Represents an object returned by {@link create_sandbox}.
 */
export type Sandbox = {} & { readonly __brand: unique symbol };

interface SandboxProps {
  console: typeof console;
  document: Document | null;
  browser: typeof browser;
  // TODO(glide): support accessing the glide API from the content process
  glide: typeof glide | null;
}

/**
 * Create a sandbox that can be passed into `Cu.evalInSandBox()`.
 *
 * This is used to try and create an as consistent as possible environment
 * between the different processes where we eval functions.
 */
export function create_sandbox(props: SandboxProps): Sandbox {
  // options pass here correspond to:
  // https://github.com/mozilla-firefox/firefox/blob/0f7aa808c07a1644fb2b386113aa3a2b31befe24/js/xpconnect/idl/xpccomponents.idl#L151
  return Cu.Sandbox(Cu.getGlobalForObject({}), {
    // remove `Cu`, etc
    wantComponents: false,

    sandboxPrototype: Object.assign(
      {
        console: props.console,
        document: props.document,
        browser: props.browser,
        glide: props.glide,
      },
      props.document ?
        get_all_properties(props.document.defaultView, {
          include_getters: false,
          pick: WINDOW_PROPERTIES,
        })
      : {},
      {
        // helper function for asserting invariants
        assert(value: unknown, message?: string): asserts value {
          if (!value) {
            throw new AssertionError({ message, actual: value });
          }
        },
        todo_assert(value: unknown, message?: string): asserts value {
          if (value) {
            throw new AssertionError({
              message: message ?? `Expected \`${value}\` to be falsy`,
              actual: value,
            });
          }
        },
      }
    ),
  }) as any;
}

class AssertionError extends Error {
  actual: unknown;

  constructor(props: { message: string | undefined; actual: unknown }) {
    super(props.message ?? `Expected \`${props.actual}\` to be truthy`);
  }
}
