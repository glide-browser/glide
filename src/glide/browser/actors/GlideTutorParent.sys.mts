// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ChildMessages, ChildQueries } from "./GlideTutorChild.sys.mjs";

export interface ParentMessages {}
export interface ParentQueries {}

export class GlideTutorParent extends JSWindowActorParent<
  ParentMessages,
  ParentQueries
> {
  #log: ConsoleInstance = null as any;

  actorCreated() {
    this.#log = console.createInstance({
      prefix: "GlideTutor[Parent]",
      maxLogLevelPref: "glide.logging.loglevel",
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ChildMessages, ChildQueries>
  ) {
    this.#log.debug("receiveMessage", message);
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
