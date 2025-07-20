/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ParentMessages, ParentQueries } from "./GlideTutorParent.sys.mjs";

export interface ChildMessages {}
export interface ChildQueries {}

export class GlideTutorChild extends JSWindowActorChild<
  ChildMessages,
  ChildQueries
> {
  #log: ConsoleInstance = null as any;

  actorCreated() {
    this.#log = console.createInstance({
      prefix: "GlideTutor[Child]",
      maxLogLevelPref: "glide.logging.loglevel",
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ParentMessages, ParentQueries>
  ) {
    this.#log.debug("receiveMessage[child]", message);
  }

  handleEvent(event: Event) {
    if (!event.isTrusted) {
      return;
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
