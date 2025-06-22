/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { WindowMessage } from "../../docs/dynamic/mappings.ts";
import type { ParentMessages, ParentQueries } from "./GlideDocsParent.sys.mjs";

const { assert_never } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

export interface ChildMessages {
  "Glide::RequestMappings": {};
}
export interface ChildQueries {}

export class GlideDocsChild extends JSWindowActorChild<
  ChildMessages,
  ChildQueries
> {
  #log: ConsoleInstance = null as any;
  #loaded = false;
  #pending_window_messages: WindowMessage[] = [];

  actorCreated() {
    this.#log = console.createInstance({
      prefix: "GlideDocs[Child]",
      maxLogLevelPref: "glide.logging.loglevel",
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ParentMessages, ParentQueries>
  ) {
    this.#log.debug("receiveMessage[child]", message.name);

    switch (message.name) {
      case "Glide::SendMappings": {
        this.#post_window_message({
          type: "set-mappings",
          mappings: message.data.mappings,
        });
        break;
      }

      default:
        throw assert_never(message.name);
    }
  }

  #post_window_message(message: WindowMessage) {
    if (this.#loaded) {
      this.contentWindow!.postMessage(message, "*");
    } else {
      this.#pending_window_messages.push(message);
    }
  }

  handleEvent(event: Event) {
    if (!event.isTrusted) {
      return;
    }

    switch (event.type) {
      case "DOMContentLoaded": {
        if (
          this.contentWindow?.location.toString() ===
          "resource://glide-docs/dynamic/mappings.html"
        ) {
          this.send_async_message("Glide::RequestMappings");
        }

        this.#loaded = true;

        const messages = this.#pending_window_messages;
        this.#pending_window_messages = [];

        for (const message of messages) {
          this.contentWindow!.postMessage(message, "*");
        }
        break;
      }
    }
  }

  // typed aliases to `.sendAsyncMessage` / `.sendQuery` as we can't type `.sendAsyncMessage`
  // directly because TS declaration merging means that TS won't report type errors
  // as it'll fallback to the default firefox method signature which is untyped.
  send_async_message: <MessageName extends keyof ChildMessages>(
    messageName: MessageName,
    obj?: ChildMessages[MessageName] | undefined,
    transferables?: any
  ) => void = this.sendAsyncMessage;
  send_query: <QueryName extends keyof ChildQueries>(
    messageName: QueryName,
    obj?: ChildQueries[QueryName]["props"] | undefined
  ) => Promise<ChildQueries[QueryName]["result"]> = this.sendQuery;
}
