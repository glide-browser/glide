/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ParentMessages, ParentQueries } from "./GlideTutorParent.sys.mjs";

export interface ChildMessages {
  "Glide::DOMContentLoaded": {};
}
export interface ChildQueries {}

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

export class GlideTutorChild extends JSWindowActorChild<
  ChildMessages,
  ChildQueries
> {
  #log: ConsoleInstance = null as any;

  actorCreated() {
    this.#log = console.createInstance({ prefix: "GlideTutor[Child]", maxLogLevelPref: "glide.logging.loglevel" });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ParentMessages, ParentQueries>,
  ) {
    this.#log.debug("receiveMessage[child]", message);

    switch (message.name) {
      case "Glide::Config::Loaded": {
        this.update_config_path_references(message.data.path, message.data.home_path);
        break;
      }

      default:
        throw assert_never(message.name);
    }
  }

  handleEvent(event: Event) {
    if (!event.isTrusted) {
      return;
    }

    const target = event.target as HTMLElement | null;
    this.#log.debug("Event:", {
      type: event.type,
      target: {
        tagName: target?.tagName,
        id: target?.id,
        className: target?.className,
        nodeType: target?.nodeType,
        nodeName: target?.nodeName,
      },
      url: this.document?.location?.href,
      timestamp: new Date().toISOString(),
    });

    switch (event.type) {
      case "DOMContentLoaded": {
        this.send_async_message("Glide::DOMContentLoaded");
        break;
      }

      case "click": {
        if (target?.id === "hint-next-section-button") {
          const error = this.document!.getElementById("hint-next-section-error") as HTMLElement;
          if (target.$glide_hack_click_from_hint) {
            error.hidden = true;
            this.document!.getElementById("lesson-2")!.scrollIntoView();
          } else {
            error.hidden = false;
          }
        }
        break;
      }
    }
  }

  update_config_path_references(path: string | null, home_path: string) {
    for (const element of this.document!.querySelectorAll("config-path")) {
      (element as HTMLElement).replaceChildren(
        DOM.create_element("highlight", { textContent: path ?? "<unset>" }, undefined, this.document),
      );
    }

    for (const element of this.document!.querySelectorAll("config-path-home")) {
      (element as HTMLElement).replaceChildren(
        DOM.create_element("highlight", { textContent: home_path }, undefined, this.document),
      );
    }

    this.document!.getElementById("config-detected")!.replaceChildren(
      "Config file detected?",
      " ",
      ...(path
        ? [
          DOM.create_element("span", { textContent: "✓" }, undefined, this.document),
          DOM.create_element(
            "p",
            { textContent: "Great! you can move on to the next section" },
            undefined,
            this.document,
          ),
        ]
        : [
          DOM.create_element("span", { textContent: "⨯" }, undefined, this.document),
          DOM.create_element("p", { textContent: "Setup the config file before moving on!" }, undefined, this.document),
        ]),
    );
  }

  // typed aliases to `.sendAsyncMessage` / `.sendQuery` as we can't type `.sendAsyncMessage`
  // directly because TS declaration merging means that TS won't report type errors
  // as it'll fallback to the default firefox method signature which is untyped.
  send_async_message: <MessageName extends keyof ChildMessages>(
    messageName: MessageName,
    obj?: ChildMessages[MessageName] | undefined,
    transferables?: any,
  ) => void = this.sendAsyncMessage;
  send_query: <QueryName extends keyof ChildQueries>(
    messageName: QueryName,
    obj?: ChildQueries[QueryName]["props"] | undefined,
  ) => Promise<ChildQueries[QueryName]["result"]> = this.sendQuery;
}
