// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ChildMessages, ChildQueries } from "./GlideDocsChild.sys.mjs";

const { assert_never } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

export interface ParentMessages {
  "Glide::SendMappings": { mappings: Map<GlideMode, KeyMappingIPC[]> };
}

export interface ParentQueries {}

export class GlideDocsParent extends JSWindowActorParent<
  ParentMessages,
  ParentQueries
> {
  #log: ConsoleInstance = null as any;

  actorCreated() {
    this.#log = console.createInstance({
      prefix: "GlideDocs[Parent]",
      maxLogLevelPref: "glide.logging.loglevel",
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ChildMessages, ChildQueries>
  ) {
    this.#log.debug("receiveMessage", message);

    switch (message.name) {
      case "Glide::RequestMappings": {
        const mappings = new Map<GlideMode, KeyMappingIPC[]>();

        for (const [mode, trie] of Object.entries(
          this.glide_browser.key_manager.global_mappings
        )) {
          const items: KeyMappingIPC[] = [];
          mappings.set(mode as GlideMode, items);

          for (const node of trie.recurse()) {
            if (node.value.deleted) {
              continue;
            }

            items.push({
              ...node.value,
              command:
                typeof node.value.command !== "string" ?
                  "<function>"
                : node.value.command,
            });
          }
        }

        this.send_async_message("Glide::SendMappings", { mappings });
        break;
      }
      default:
        throw assert_never(message.name);
    }
  }

  get glide_browser() {
    return this.browsingContext!.topChromeWindow!.GlideBrowser;
  }

  // typed alias to `.sendAsyncMessage` as we can't type `.sendAsyncMessage`
  // directly because TS declaration merging means that TS won't report type errors
  // as it'll fallback to the default firefox method signature which is untyped.
  send_async_message: <MessageName extends keyof ParentMessages>(
    messageName: MessageName,
    obj?: ParentMessages[MessageName] | undefined,
    transferables?: any
  ) => void = this.sendAsyncMessage;
  send_query: <QueryName extends keyof ParentQueries>(
    messageName: QueryName,
    obj?: ParentQueries[QueryName]["props"] | undefined
  ) => Promise<ParentQueries[QueryName]["result"]> = this.sendQuery;
}
