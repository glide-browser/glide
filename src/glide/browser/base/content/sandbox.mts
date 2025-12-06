/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * When invoked in the main thread, our sandbox is constructed from two primitives:
 *
 * 1. An `nsIWindowlessBrowser`[1] created through `nsIAppShellService.createWindowlessBrowser()`[2] so that we can expose the DOM APIs safely
 *    without allowing access to a window defined in a chrome context.
 * 2. A `Document` that mirrors[3] the chrome UI by constructing bi-directional `MutationObserver`s, so that the UI can be modified directly without
 *    exposing anything from the actual `Document` that renders the UI so that no chrome properties can be leaked, e.g. if we gave direct access
 *    to the chrome `Document` then `document.defaultView` could be used to directly access the `ChromeWindow` powering everything.
 *
 * These two properties should mean that breaking the sandbox through the DOM APIs is impossible.
 *
 * [1]: https://searchfox.org/firefox-main/rev/d0ff31da7cb418d2d86b0d83fecd7114395e5d46/xpfe/appshell/nsIWindowlessBrowser.idl
 * [2]: https://searchfox.org/firefox-main/rev/d0ff31da7cb418d2d86b0d83fecd7114395e5d46/xpfe/appshell/nsIAppShellService.idl#55
 * [3]: https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/document-mirror.mts
 */

const { WINDOW_PROPERTIES } = ChromeUtils.importESModule("chrome://glide/content/sandbox-properties.mjs");
const Dedent = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");
const DOMUtils = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { AssertionError } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

// note: do ***not*** add an entry to this Set without first checking if the API can be used to
//       access the bound window, if this is the case then you *cannot* add it here.
//
//       there is *theoretical* potential for the chrome window to leak through these bindings,
//       at the time of writing it appears to be impossible to access the value a function is bound
//       to if just given the function. if this ever changes, or if the mere potential for exploitation
//       is deemed bad then we can look into patching the internal c++ implementation to remove the constraints
//       for the sandbox window.
//
//       I actually did manage to patch the internals for the `setTimeout` case by setting a flag on
//       the browsing context to mark it as always active, but that touched too many files and the maintenance
//       burden of those patches seemed too high, so I went with this approach instead.
const BIND_TO_ORIGINAL_WINDOW = new Set([
  // by default, these functions are throttled to a minimum delay of 1s in background contexts.
  // the sandbox window counts as a background context, so we instead bind it to the original
  // chrome window, which is never treated as a background context.
  "setTimeout",
  "setInterval",
  "clearInterval",
  "requestIdleCallback",

  // requestAnimationFrame() appears to not work at all in our sandbox window, so we instead
  // bind it to the original window so that firefox calls it appropriately.
  "requestAnimationFrame",
]);

/**
 * Represents an object returned by {@link create_sandbox}.
 */
export type Sandbox = {
  glide: Glide;
  browser: Browser.Browser;
  document: Document;
  DOM: DOM.Utils;
  DataCloneError: typeof DataCloneError;
  FileNotFoundError: typeof FileNotFoundError;
  GlideProcessError: typeof GlideProcessError;
} & {
  readonly __brand: unique symbol;
};

interface SandboxProps {
  console: typeof console;
  document: MirroredDocument | null;
  window: HiddenWindow | null;
  original_window: Window | null;
  browser: typeof browser | null;
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
    create_element<K extends keyof HTMLElementTagNameMap | (string & {})>(
      tag_name: K,
      props_or_children?:
        // props
        | DOM.CreateElementProps<K extends keyof HTMLElementTagNameMap ? K : "div">
        // children
        | Array<(Node | string)>,
      props?: DOM.CreateElementProps<K extends keyof HTMLElementTagNameMap ? K : "div">,
    ): K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : HTMLElement {
      return DOMUtils.create_element(tag_name, props_or_children, props, document);
    },
  };

  // options pass here correspond to:
  // https://github.com/mozilla-firefox/firefox/blob/0f7aa808c07a1644fb2b386113aa3a2b31befe24/js/xpconnect/idl/xpccomponents.idl#L151
  let proto: any = {
    console: props.console,
    document: props.document,
    window: props.window,
    glide: props.glide,

    dedent: Dedent.dedent,
    css: Dedent.make_dedent_no_args("css"),
    html: Dedent.make_dedent_no_args("html"),

    DOM,

    DataCloneError,
    FileNotFoundError,
    GlideProcessError,

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

  if (props.browser) {
    proto.browser = props.browser;
  }

  if (props.window) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(props.window))) {
      if (!WINDOW_PROPERTIES.has(name)) {
        continue;
      }

      const binder = BIND_TO_ORIGINAL_WINDOW.has(name) ? props.original_window ?? props.window : props.window;

      Object.defineProperty(proto, name, {
        ...descriptor,
        ...(
          descriptor.value
            && typeof descriptor.value === "function"
            // we only `.bind()` if the function has no other static properties / methods on it as
            // `.bind()` will strip them which would mean code like `URL.canParse()` would not work.
            //
            // if it does have extra properties then it is likely a constructor, and I *think* we are okay
            // to not `.bind()` at all.
            && Object.keys(descriptor.value).length === 0
            ? { value: descriptor.value.bind(binder) }
            : undefined
        ),
        ...(descriptor.get
          ? {
            // rebind the getter to ensure it is called on the originating object
            get: descriptor.get.bind(binder),
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

export class FileNotFoundError extends Error {
  path: string;

  constructor(message: string, props: { path: string }) {
    super(message);
    this.path = props.path;
    this.name = "FileNotFoundError";
  }
}

export class DataCloneError extends Error {
  override name = "DataCloneError";
}

export class GlideProcessError extends Error {
  process: glide.CompletedProcess;

  exit_code: number;

  constructor(message: string, process: glide.CompletedProcess) {
    super(message);
    this.process = process;
    this.exit_code = process.exit_code;
    this.name = "GlideProcessError";
  }
}
