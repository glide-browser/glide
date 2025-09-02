// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ChildMessages, ChildQueries } from "./GlideTutorChild.sys.mjs";

export interface ParentMessages {
  "Glide::Config::Loaded": {
    path: string | null;

    /**
     * The home path we would use, e.g. `~/.config/glide/glide.ts`.
     */
    home_path: string;
  };
}
export interface ParentQueries {}

export class GlideTutorParent extends JSWindowActorParent<
  ParentMessages,
  ParentQueries
> {
  #log: ConsoleInstance = null as any;

  actorCreated() {
    this.#log = console.createInstance({ prefix: "GlideTutor[Parent]", maxLogLevelPref: "glide.logging.loglevel" });

    const actor = this;
    this.glide_browser!.on_startup(() => {
      this.glide_browser!.api.autocmds.create("ConfigLoaded", () => {
        send_config_loaded();
      });

      send_config_loaded();

      function send_config_loaded() {
        actor.send_async_message("Glide::Config::Loaded", {
          path: actor.glide_browser!.config_path,
          home_path: actor.path_utils.join(actor.glide_browser!.home_config_dir, "glide.ts"),
        });
      }
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ChildMessages, ChildQueries>,
  ) {
    this.#log.debug("receiveMessage", message);
  }

  get glide_browser() {
    return this.browsingContext?.topChromeWindow?.GlideBrowser;
  }

  get path_utils(): typeof PathUtils {
    return (this.browsingContext?.topChromeWindow as any as typeof globalThis)?.PathUtils;
  }

  // typed alias to `.sendAsyncMessage` as we can't type `.sendAsyncMessage`
  // directly because TS declaration merging means that TS won't report type errors
  // as it'll fallback to the default firefox method signature which is untyped.
  send_async_message: <MessageName extends keyof ParentMessages>(
    messageName: MessageName,
    obj?: ParentMessages[MessageName] | undefined,
    transferables?: any,
  ) => void = this.sendAsyncMessage;
  send_query: <QueryName extends keyof ParentQueries>(
    messageName: QueryName,
    obj?: ParentQueries[QueryName]["props"] | undefined,
  ) => Promise<ParentQueries[QueryName]["result"]> = this.sendQuery;
}
