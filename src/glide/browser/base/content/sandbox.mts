/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { WINDOW_PROPERTIES } = ChromeUtils.importESModule("chrome://glide/content/sandbox-properties.mjs");
const Dedent = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");
const DOMUtils = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");

/**
 * Represents an object returned by {@link create_sandbox}.
 */
export type Sandbox = { glide: Glide; browser: Browser.Browser; document: Document } & {
  readonly __brand: unique symbol;
};

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
  const document = props.document;
  const DOM: DOM.Utils = {
    create_element<K extends keyof HTMLElementTagNameMap>(
      tag_name: K,
      props?: DOM.CreateElementProps<K>,
    ): HTMLElementTagNameMap[K] {
      return DOMUtils.create_element(tag_name, props, document);
    },
  };

  // options pass here correspond to:
  // https://github.com/mozilla-firefox/firefox/blob/0f7aa808c07a1644fb2b386113aa3a2b31befe24/js/xpconnect/idl/xpccomponents.idl#L151
  let proto = {
    console: props.console,
    document: props.document,
    browser: props.browser,
    glide: props.glide,

    dedent: Dedent.dedent,
    css: Dedent.make_dedent_no_args("css"),
    html: Dedent.make_dedent_no_args("html"),

    DOM,

    // helper function for asserting invariants
    ensure(value: unknown, message?: string) {
      if (!value) {
        throw new AssertionError({ message: message ?? `Expected a truthy value, got \`${value}\``, actual: value });
      }
      return value;
    },
    assert(value: unknown, message?: string): asserts value {
      if (!value) {
        throw new AssertionError({ message, actual: value });
      }
    },
    todo_assert(value: unknown, message?: string): asserts value {
      if (value) {
        throw new AssertionError({ message: message ?? `Expected \`${value}\` to be falsy`, actual: value });
      }
    },
    assert_never(x: never, detail?: string | Error): never {
      if (detail instanceof Error) {
        throw detail;
      }
      throw new Error(detail ?? `assert_never: impossible to call: ${JSON.stringify(x)}`);
    },
  };

  if (props.document) {
    for (
      const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(props.document.defaultView))
    ) {
      if (!WINDOW_PROPERTIES.has(name)) {
        continue;
      }

      Object.defineProperty(proto, name, {
        ...descriptor,
        ...(descriptor.get
          ? {
            // rebind the getter to ensure it is called on the originating object
            get: descriptor.get.bind(props.document.defaultView),
          }
          : undefined),
        enumerable: true,
      });
    }
  }

  return Cu.Sandbox(Cu.getGlobalForObject({}), {
    // remove `Cu`, etc
    wantComponents: false,
    sandboxPrototype: proto,
  }) as any;
}

class AssertionError extends Error {
  actual: unknown;

  constructor(props: { message: string | undefined; actual: unknown }) {
    super(props.message ?? `Expected \`${props.actual}\` to be truthy`);
  }
}
