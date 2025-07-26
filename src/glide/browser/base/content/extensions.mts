/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const { redefine_getter } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");

/**
 * Provides wrapper objects for accessing the `browser.` web extensions API
 * from various contexts.
 */
export class ExtensionsAPI {
  /**
   * Send a query to the underlying extension.
   *
   * This is needed as we access the extension API from different contexts:
   *
   * 1. The main thread, in which case we can send the query directly to
   *    the extension process.
   *
   * 2. The content process, where we need to relay the query first back to
   *    the main thread before it can be sent to the extension process.
   */
  #send_query: (props: {
    method_path: string;
    args: any[];
  }) => Promise<unknown>;

  constructor(
    send_query: (props: {
      method_path: string;
      args: any[];
    }) => Promise<unknown>,
  ) {
    this.#send_query = send_query;
  }

  /**
   * Defines a Proxy that forwards `browser.` method calls to either:
   *
   * 1. The extension process
   * 2. The extension context in the main thread
   *
   * We use #2 for event listener calls so we can avoid serialising functions.
   *
   * TODO(glide): this approach sucks for dev tools auto-complete as it doesn't
   *              tell you which methods / properties are available. I think
   *              it'd be better to just hard-code the object with all expected props.
   */
  get browser_proxy_api(): typeof browser {
    return redefine_getter(this, "browser_proxy_api", this.#create_browser_proxy_api());
  }

  #extension_id = "glide-internal@mozilla.org";

  get extension(): WebExtension {
    const policy = WebExtensionPolicy.getByID(this.#extension_id);
    if (!policy) {
      throw new Error(`Expected to find a web extension with ID: \`${this.#extension_id}\``);
    }
    return policy.extension;
  }

  #create_browser_proxy_api(): typeof browser {
    const ext = this;

    function create_browser_proxy_chain(
      previous_chain: (string | symbol)[] = [],
    ) {
      return new Proxy(function() {}, {
        get(_: any, prop: string | symbol) {
          const path = [...previous_chain, prop].join(".");
          switch (path) {
            case "runtime.id": {
              return ext.extension.id;
            }
          }

          return create_browser_proxy_chain([...previous_chain, prop]);
        },

        apply(_, __, args) {
          const listener_namespace = previous_chain[1];
          if (
            listener_namespace
            && String(listener_namespace).startsWith("on")
          ) {
            throw new Error("Registering Web Extensions listeners are not supported in the content frame");
          }

          const method_path = previous_chain.join(".");
          switch (method_path) {
            // haven't tested this but it looks like it requires a `target` argument that would not be cloneable
            case "runtime.getFrameId":

            // this would require cloning a proxy of a `Window`...
            // it also looks like we can't even access it ourselves from the main thread
            // as it appears to only be set in the child context.
            case "runtime.getBackgroundPage": {
              return Promise.reject(new Error(`\`browser.${method_path}()\` is not supported`));
            }
          }

          return ext.#send_query({ args: IPC.serialise_args(args), method_path });
        },
      });
    }

    return create_browser_proxy_chain() as typeof browser;
  }
}
