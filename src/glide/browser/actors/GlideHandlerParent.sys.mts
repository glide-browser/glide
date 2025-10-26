// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ContentExcmd, GlideOperator } from "../base/content/browser-excmds-registry.mts";
import type { State, StateChangeListener, StateChangeMeta } from "../base/content/browser.mjs";
import type { GlideFunctionIPC } from "../base/content/utils/ipc.mts";
import type { ChildMessages, ChildQueries } from "./GlideHandlerChild.sys.mjs";

const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

export interface ParentMessages {
  "Glide::StateUpdate": { state: State; meta?: StateChangeMeta };

  /**
   * Trigger manual registration of user gesture activation.
   *
   * This is useful for our key mappings, as we `.preventDefault()`,
   * the normal Firefox code that would notify the document that a user
   * gesture happened is not invoked, so we have to do it ourselves.
   *
   * This affects methods like `navigator.clipboard.writeText()` which
   * can only be called shortly after some user input.
   */
  "Glide::RegisterUserActivation": null;

  "Glide::ExecuteContentCommand": {
    command: ContentExcmd;
    args: string;
    operator: GlideOperator | null;
    sequence: string[];
  };
  "Glide::KeyMappingExecution": {
    sequence: string[];
    mode: GlideMode;
  };
  "Glide::KeyMappingPartial": {
    mode: GlideMode;
    key: string;
  };
  "Glide::SelectionCollapse": {};
  "Glide::KeyMappingCancel": { mode: GlideMode };
  "Glide::ReplaceChar": { character: string };
  "Glide::BlurActiveElement": null;
  "Glide::ExecuteHint": { id: number };
  "Glide::Hint": {
    location: glide.HintLocation;
    auto_activate: boolean;
    browser_ui_rect: DOMRectReadOnly;
    selector?: string;
    include?: string;
    editable_only?: boolean;
    debug?: boolean;
    action?:
      | "click"
      | "newtab-click"
      | GlideFunctionIPC<(target: HTMLElement) => Promise<void>>
      | null;
    pick?: GlideFunctionIPC<(hints: glide.ContentHint[]) => glide.ContentHint[]>;
  };
  "Glide::Move": { direction: GlideDirection };
  "Glide::Debug": null;
}

export interface ParentQueries {
  "Glide::Query::CopySelection": {
    props: {};
    result: undefined;
  };
  "Glide::Query::IsEditing": {
    props: {};
    result: boolean;
  };
}

export class GlideHandlerParent extends JSWindowActorParent<
  ParentMessages,
  ParentQueries
> {
  #log: ConsoleInstance = null as any;
  #state_change_listener: StateChangeListener = null as any;

  actorCreated() {
    this.#log = console.createInstance({ prefix: "Glide[Parent]", maxLogLevelPref: "glide.logging.loglevel" });
    this.#state_change_listener = this.on_state_change.bind(this);

    const glide_browser = this.glide_browser;
    if (glide_browser) {
      glide_browser.add_state_change_listener(this.#state_change_listener);
    }
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

  didDestroy() {
    const glide_browser = this.glide_browser;
    if (glide_browser) {
      glide_browser.remove_state_change_listener(this.#state_change_listener);
    }
  }

  get glide_browser() {
    return this.browsingContext?.topChromeWindow?.GlideBrowser;
  }

  get glide_hints() {
    return this.browsingContext?.topChromeWindow?.GlideHints;
  }

  get glide_excmds() {
    return this.browsingContext?.topChromeWindow?.GlideExcmds;
  }

  on_state_change(state: State, _old_state: State, meta?: StateChangeMeta) {
    // sanity check in case this callback is invoked
    // when we no longer have a browser context as attempting
    // to send a message will result in an error.
    //
    // note that this *should* never happen, as we remove our callback
    // in the `didDestroy()` method above.
    if (!this.has_been_destroyed()) {
      this.send_async_message("Glide::StateUpdate", { state, meta });
    }
  }

  has_been_destroyed() {
    try {
      return !this.browsingContext;
    } catch {
      return true;
    }
  }

  async receiveMessage(
    message: ActorReceiveMessage<ChildMessages, ChildQueries>,
  ) {
    this.#log.debug("receiveMessage", message.name);

    switch (message.name) {
      case "Glide::ChangeMode": {
        this.#log.debug("changing mode", message.data);
        this.glide_browser?._change_mode(message.data.mode);
        break;
      }

      case "Glide::RecordRepeatableCommand": {
        this.glide_excmds!.add_to_command_history({ type: "content-cmd", props: message.data });
        break;
      }

      case "Glide::ResolvedHints": {
        if (this.glide_browser?.state.mode !== "hint") {
          // if we're no longer in hint mode, then we shouldn't
          // do anything with the hints we resolved.
          //
          // this can happen if you start and exit hint mode frequently.
          return;
        }

        this.glide_hints!.show_hints(message.data.hints, message.data.location, message.data.auto_activate);
        break;
      }

      case "Glide::HideHints": {
        this.glide_hints!.hide_hints();
        break;
      }

      default:
        throw assert_never(message);
    }

    return undefined;
  }
}
