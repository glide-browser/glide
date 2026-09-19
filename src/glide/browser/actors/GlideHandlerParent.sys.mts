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
  "Glide::StateUpdate": {
    state: State;
    meta?: StateChangeMeta;

    /**
     * Whether automatic mode switching is disabled for `state.mode`.
     */
    switch_mode_disabled: boolean;
  };

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
    auto_activate: boolean | "always";
    browser_ui_rect: DOMRectReadOnly;
    selector?: string;
    include?: string;
    editable_only?: boolean;
    include_click_listeners?: boolean;
    debug?: boolean;
    action?:
      | "click"
      | "newtab-click"
      | GlideFunctionIPC<(target: HTMLElement) => Promise<void>>
      | null;
  };
  "Glide::Move": { direction: "left" | "right" | "up" | "down" | "endline" };
  "Glide::Scroll": { to: "half_page_up" | "half_page_down" | "page_up" | "page_down" | "top" | "bottom" };
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
  /**
   * Scroll the scroll container that keyboard scrolling would target from the focused element
   * (see `nsIDOMWindowUtils.scrollKeyboardTarget`). Resolves to `false` if there was nothing to
   * scroll in this document, in which case the caller should try the top-level document, which
   * is what keyboard scrolling does for out-of-process iframes.
   */
  "Glide::Query::ScrollKeyboardTarget": {
    props: { x: number; y: number; unit: "lines" | "pages" | "whole" };
    result: boolean;
  };
  /** How many (trusted) `keydown` events the document has received, see `GlideBrowser.wait_for_keys_processed()`. */
  "Glide::Query::KeydownCount": {
    props: {};
    result: number;
  };
  "Glide::Query::ExecuteHintAction": {
    props: {
      id: number;
      action: GlideFunctionIPC<(target: HTMLElement) => unknown | Promise<unknown>>;
    };
    result: unknown;
  };
  "Glide::Query::InvokeOnAllHints": {
    props: {
      callback: GlideFunctionIPC<(element: HTMLElement, index: number) => unknown | Promise<unknown>>;
    };
    result: unknown[];
  };
}

export class GlideHandlerParent extends JSWindowActorParent<
  ParentMessages,
  ParentQueries
> {
  #log: ConsoleInstance = null as any;
  #state_change_listener: StateChangeListener = null as any;

  /**
   * Whether a text editable element is currently focused in this actor's document.
   *
   * Kept up to date by the child on every `focusin` / `blur`, so that the parent process can
   * make synchronous decisions that depend on it. Notably, content commands that enter insert
   * mode (e.g. the `I` motion) only do so when an editor is focused, and the mode switch they
   * request arrives as an async message; keys typed before it lands would otherwise be handled
   * in normal mode (see `#execute_content_command` in `browser-excmds.mts`).
   */
  editable_focused: boolean = false;

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

  get gBrowser() {
    return this.browsingContext?.topChromeWindow?.gBrowser;
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
      this.send_async_message("Glide::StateUpdate", {
        state,
        meta,
        switch_mode_disabled: this.glide_browser?.is_mode_switching_disabled() ?? false,
      });
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
      case "Glide::EditableFocusChanged": {
        this.editable_focused = message.data.editable;
        break;
      }

      case "Glide::ChangeMode": {
        if (
          this.glide_browser
          && message.data.mode === this.glide_browser.state.mode
          && this.glide_browser.state.operator === null
        ) {
          // already in the requested mode, e.g. the parent switched to insert mode synchronously
          // before dispatching a content command and the child is now confirming it. applying it
          // again would fire a redundant `ModeChanged` autocmd.
          break;
        }

        if (!message.data.force && !this.browsingContext?.isContent) {
          // focus/blur driven mode switches for the chrome document are handled synchronously in
          // `GlideBrowser` (`#on_focusin` / `#on_blur`), so requests from the chrome actor are
          // redundant at best and, when delivered late, undo a more recent mode change.
          this.#log.debug("ignoring mode change request from the chrome actor", message.data);
          return;
        }

        if (
          !message.data.force
          && message.data.mode === "normal"
          && this.glide_browser?.is_chrome_editable_focused()
        ) {
          // a content `blur` requests normal mode, but if the focus already moved to an editable
          // chrome element (e.g. `<C-l>` while a content input was focused) then `#on_focusin` has
          // already switched to insert mode and applying this (late) request would undo that.
          this.#log.debug("ignoring normal mode request, an editable chrome element is focused", message.data);
          return;
        }

        if (this.glide_browser?.is_mode_switching_disabled() && !message.data.force) {
          // the content process can request to switch modes on focus/blur events, which we do not want
          // to *actually* apply if `glide.o.switch_mode_on_focus === false`, so to prevent having to make
          // sure that state in the child is correct, we just allow optional mode change requests.
          //
          // one known case where this can happen is when a tab is first created and some event happens that
          // causes the content process to try to change modes, e.g. focusing an <input>, *before* it's gotten
          // it's own `state` filled in, so it doesn't know that we're in `ignore` mode and thus that the mode
          // shouldn't actually be changed.
          //
          // we also send a state update message back to the content process to make sure its state is up to date.
          this.send_async_message("Glide::StateUpdate", {
            state: this.glide_browser.state,
            switch_mode_disabled: this.glide_browser.is_mode_switching_disabled(),
          });
          return;
        }

        if (message.data.mode === "command" && !message.data.force) {
          // `command` mode is owned by the commandline widget, which switches to it itself when
          // it is shown (and it closes itself on `focusout`, so its input can only ever gain focus
          // through `show()`). a non-forced request to enter it can therefore only come from the
          // chrome actor observing that `focusin`, which is redundant at best and harmful when the
          // message is delivered late: after `close()` reset the mode to `normal` (leaving us stuck in
          // `command` mode with no commandline) or after a `mode_change normal` mapping was executed
          // while the commandline was still open (undoing the user's explicit mode change).
          this.#log.debug("ignoring redundant request to enter command mode", message.data);
          return;
        }

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

        await this.glide_hints!.show_hints(
          message.data.hints,
          message.data.location,
          this.gBrowser?.$hints_action ?? "click",
          this.gBrowser?.$hints_pick,
          message.data.auto_activate,
        );
        break;
      }

      case "Glide::HideHints": {
        this.glide_hints?.hide_hints();
        break;
      }

      default:
        throw assert_never(message);
    }

    return undefined;
  }
}
