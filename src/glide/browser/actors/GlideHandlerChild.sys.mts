/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { State } from "../base/content/browser.mjs";
import type { GlideHint } from "../base/content/hinting.mts";
import type {
  ParentMessages,
  ParentQueries,
} from "./GlideHandlerParent.sys.mjs";
import type { SetNonNullable } from "type-fest";
import type { ToDeserialisedIPCFunction } from "../base/content/utils/ipc.mts";
import type { ExtensionsAPI as ExtensionsAPIType } from "../base/content/extensions.mts";
import type { Sandbox } from "../base/content/sandbox.mts";

const hinting = ChromeUtils.importESModule(
  "chrome://glide/content/hinting.mjs"
);
const motions = ChromeUtils.importESModule(
  "chrome://glide/content/motions.mjs"
);
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { assert_never, assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { ExtensionsAPI } = ChromeUtils.importESModule(
  "chrome://glide/content/extensions.mjs"
);
const { parse_command_args } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-excmds.mjs"
);
const { redefine_getter } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/objects.mjs"
);
const { create_sandbox } = ChromeUtils.importESModule(
  "chrome://glide/content/sandbox.mjs"
);

export interface ChildMessages {
  "Glide::ResolvedHints": { hints: GlideHintIPC[] };
  "Glide::HideHints": {};
  "Glide::ChangeMode": { mode: GlideMode };
  "Glide::RecordRepeatableCommand": SetNonNullable<
    ParentMessages["Glide::ExecuteContentCommand"],
    "operator"
  >;
}

export interface ChildQueries {
  "Glide::Query::Extension": {
    props: { method_path: string; args: any[] };
    result: unknown;
  };
}

type HintAction = ToDeserialisedIPCFunction<
  ParentMessages["Glide::Hint"]["action"]
>;
type HintProps = Omit<ParentMessages["Glide::Hint"], "action"> & {
  action?: HintAction;
};

export class GlideHandlerChild extends JSWindowActorChild<
  ChildMessages,
  ChildQueries
> {
  state: State | null = null;
  _log: ConsoleInstance = null as any;

  /**
   * Key events are handled directly in the browser chrome in
   * `browser.mts` but for some key mappings, we need to directly
   * manipulate the DOM.
   *
   * However because the DOM can only be accessed from this actor, in a separate
   * process, there may be a race condition where
   * - a key is pressed
   * - browser chrome sends a message to the actor to update the DOM
   * - focus is taken by another element
   * - actor receives the message, now `.activeElement` points to a different
   *   element than the one that was active when the key was originally pressed.
   *
   * In an attempt to prevent this race condition, this property tracks the element
   * that was active when the last key event was fired. I *suspect* that a race
   * condition here is still possible, however it should be exceedingly less
   * likely.
   */
  #last_key_event_element: Element | null | undefined = null;

  #active_hints: GlideHint[] = [];
  #hint_action: HintAction | null = null;
  #is_scrolling: boolean = false;
  #hint_scroll_listener: Function | null = null;
  #hint_scrollend_listener: Function | null = null;

  actorCreated() {
    this.state = null;

    // TODO(glide): separate logger instances for different things?
    // TODO(glide): different log prefs?
    this._log = console.createInstance({
      prefix: "Glide[Child]",
      maxLogLevelPref: "glide.logging.loglevel",
    });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ParentMessages, ParentQueries>
  ) {
    this._log.debug("receiveMessage[child]", message.name);

    switch (message.name) {
      case "Glide::StateUpdate": {
        const previous_mode = this.state?.mode;
        this.state = message.data;

        // if we're leaving `hint` mode, we don't need to listen to the
        // scroll events anymore
        if (previous_mode === "hint" && message.data.mode !== "hint") {
          this.#active_hints = [];
          this.#hint_action = null;

          if (this.#hint_scroll_listener != null) {
            this.contentWindow?.removeEventListener(
              "scroll",
              this.#hint_scroll_listener
            );
          }

          if (this.#hint_scrollend_listener != null) {
            this.contentWindow?.removeEventListener(
              "scrollend",
              this.#hint_scrollend_listener
            );
          }
        }

        // if we're transitioning from visual to normal mode then we need to
        // collapse the selection, if it isn't already, e.g.
        //
        // `hello w████` -> `hello worl█`
        //
        // the exact position we collapse to should be where the caret was last
        // moved to, the above example assumes that visual mode was entered on
        // the `o` and was extended to the `d`.
        if (previous_mode === "visual" && this.state.mode === "normal") {
          const editor = this.#get_editor(this.#get_active_element());

          if (editor && !editor.selection.isCollapsed) {
            const needs_forward_adjust =
              editor.selection.focusOffset < editor.selection.anchorOffset;

            editor.selection.collapse(
              editor.selection.focusNode,
              editor.selection.focusOffset
            );
            if (needs_forward_adjust) {
              motions.forward_char(editor, false);
            }
          }
        }

        break;
      }
      case "Glide::Debug": {
        // placeholder
        break;
      }
      case "Glide::ExecuteContentCommand": {
        this.handle_excmd(message.data);
        break;
      }
      case "Glide::ReplaceChar": {
        const editor = this.#expect_editor("replace char");
        motions.back_char(editor, false);
        editor.deleteSelection(
          /* action */ editor.eNext!,
          /* stripWrappers */ editor.eStrip!
        );
        editor.insertText(message.data.character);
        break;
      }
      case "Glide::KeyMappingPartial": {
        // for partial key mappings, we need to *only* rely on the active
        // element as our `#last_key_event_element` will be behind as the
        // keydown event does not get through to us in this context.
        const target = this.#get_active_element();
        this.#last_key_event_element = target;

        const editor = this.#get_editor(target);

        // for partial mapping matches in insert mode, temporarily add the key
        // to the input element as user-intent isn't yet clear, do they want to execute a
        // command or insert text?
        //
        // the temporary state here is indicated by *not* moving the cursor
        // forward after adding the text
        //
        // note: keep in sync with other conditions in `Glide::KeyMapping*`
        if (message.data.mode === "insert" && editor) {
          if (!editor.isSelectionEditable) {
            throw new Error("For some reason we cannot make edits");
          }

          editor.insertText(message.data.key);
          editor.selectionController.characterMove(
            /* forward */ false,
            /* extend */ false
          );
        }
        break;
      }
      case "Glide::KeyMappingCancel": {
        const target = this.#get_key_event_target();
        const editor = this.#get_editor(target);

        // note: keep in sync with other conditions in `Glide::KeyMapping*`
        if (message.data.mode === "insert" && editor) {
          // move cursor forward as any partial key presses that were previously
          // inserted are now "permanent" entries to the element, e.g. `j` -> `e`
          //
          // `foo|j` + `e` -> `fooje|`
          //
          // without this block, we'd get `foo|j` + `e` -> `fooe|j`
          editor.selectionController.characterMove(
            /* forward */ true,
            /* extend */ false
          );
        }
        break;
      }
      case "Glide::KeyMappingExecution": {
        const target = this.#get_key_event_target();
        const editor = this.#get_editor(target);

        // note: keep in sync with condition in `Glide::KeyMapping*`
        if (message.data.mode === "insert" && editor) {
          // If we're executing a command from insert mode, then we need to
          // delete any parts of the mapping that were previously inserted
          // into the text. For example:
          // `foj|o` + `j` -> `fo█
          //
          // note: -1 because the very last key in the mapping is never
          //       inserted.
          const delete_length = message.data.sequence.length - 1;
          for (let i = 0; i < delete_length; i++) {
            editor.deleteSelection(
              /* action */ editor.eNext!,
              /* stripWrappers */ editor.eStrip!
            );
          }
        }

        break;
      }
      case "Glide::BlurActiveElement": {
        const target = this.document?.activeElement;
        if (target && "blur" in target) {
          (target as HTMLElement).blur();
        }
        break;
      }
      case "Glide::Hint": {
        this.#start_hints({
          ...message.data,
          action: IPC.maybe_deserialise_glidefunction(
            this.sandbox,
            message.data.action
          ),
        });
        break;
      }
      case "Glide::ExecuteHint": {
        const hint = this.#active_hints.find(
          hint => hint.label === message.data.label
        );
        if (!hint) {
          throw new Error(
            `Could not find a hint with label: ${message.data.label}`
          );
        }

        const action = this.#hint_action;
        this._log.debug("activating hint on", hint.target, "with", action);

        if (typeof action === "function") {
          await action(hint.target);
          return;
        }

        switch (action) {
          case null:
          case undefined:
          case "click": {
            hint.target.focus();
            hint.target.click();
            break;
          }

          default:
            throw assert_never(action);
        }
        break;
      }
      case "Glide::RegisterUserActivation": {
        this.document?.notifyUserGestureActivation();
        break;
      }
      case "Glide::Move": {
        const doc_shell = assert_present(this.docShell);
        switch (message.data.direction) {
          case "left":
            return doc_shell.doCommand("cmd_moveLeft");
          case "right":
            return doc_shell.doCommand("cmd_moveRight");
          case "up":
            return doc_shell.doCommand("cmd_moveUp");
          case "down":
            return doc_shell.doCommand("cmd_moveDown");
          case "endline":
            return doc_shell.doCommand("cmd_endLine");
          default:
            throw assert_never(message.data.direction);
        }
      }
      default:
        throw assert_never(message);
    }
  }

  #get_key_event_target(): Element | null | undefined {
    return this.#last_key_event_element ?? this.#get_active_element();
  }

  get sandbox(): Sandbox {
    const actor = this;
    return redefine_getter(
      this,
      "sandbox",
      create_sandbox({
        document: this.document,
        window: this.contentWindow,
        console,
        get browser() {
          return actor.extension_api.browser_proxy_api;
        },
        glide: null,
      })
    );
  }

  get extension_api(): ExtensionsAPIType {
    return redefine_getter(
      this,
      "extension_api",
      new ExtensionsAPI(props => {
        return this.send_query("Glide::Query::Extension", props);
      })
    );
  }

  handle_excmd(props: ParentMessages["Glide::ExecuteContentCommand"]): void {
    switch (props.command.name) {
      case "blur": {
        const target = this.#get_active_element();
        if (target && "blur" in target) {
          (target as HTMLElement).blur();
        }
        break;
      }
      case "scroll_top": {
        const window = assert_present(this.contentWindow, "no contentWindow");
        this._log.debug(`[scroll_top]: scrolling to x=${window.scrollX} y=0`);
        assert_present(this.contentWindow, "no contentWindow").scroll(
          window.scrollX,
          0
        );
        break;
      }
      case "scroll_page_down": {
        const window = assert_present(this.contentWindow, "no contentWindow");
        window.scrollByPages(1);
        break;
      }
      case "scroll_page_up": {
        const window = assert_present(this.contentWindow, "no contentWindow");
        window.scrollByPages(-1);
        break;
      }
      case "scroll_bottom": {
        const window = assert_present(this.contentWindow, "no contentWindow");
        this._log.debug(
          `[scroll_bottom]: scrolling to x=${window.scrollX} y=${window.scrollMaxY}`
        );
        window.scroll(window.scrollX, window.scrollMaxY);
        break;
      }
      case "hint": {
        const { args } = parse_command_args(props.command, props.args);
        this.#start_hints({ action: args["--action"] });
        break;
      }
      case "execute_motion": {
        const operator = props.operator ?? this.state?.operator;
        const sequence = props.sequence.join("");
        const editor = this.#expect_editor(`${operator || ""}${sequence}`);
        if (!operator) {
          motions.select_motion(
            editor,
            sequence as any,
            this.state?.mode ?? "normal",
            null,
            this.state?.mode === "visual"
          );
          return;
          // throw new Error("cannot execute motion, no operator defined");
        }

        switch (operator) {
          case "d": {
            const result = motions.select_motion(
              editor,
              sequence as any,
              this.state?.mode ?? "normal",
              operator,
              true
            );

            // if the motion didn't actually select anything, then there's
            // nothing for us to delete
            if (!editor.selection.isCollapsed) {
              motions.delete_selection(editor, true);
            }

            if (result?.fixup_deletion) {
              result.fixup_deletion();
            }

            this.#record_repeatable_command({ ...props, operator });
            this.#change_mode("normal");
            break;
          }
          case "c": {
            motions.select_motion(
              editor,
              sequence as any,
              this.state?.mode ?? "normal",
              operator,
              true
            );
            motions.delete_selection(editor, false);

            this.#record_repeatable_command({ ...props, operator });
            this.#change_mode("insert");
            break;
          }
          case "r": {
            // implementation is in the main thread
            throw new Error("The `r` operator cannot be executed");
          }
          default:
            throw assert_never(operator);
        }
        break;
      }
      case "w": {
        const editor = this.#expect_editor(props.command.name);
        motions.forward_word(editor, /* bigword */ false, this.state?.mode);
        break;
      }
      case "W": {
        const editor = this.#expect_editor(props.command.name);
        motions.forward_word(editor, /* bigword */ true, this.state?.mode);
        break;
      }
      case "b": {
        const editor = this.#expect_editor(props.command.name);
        motions.back_word(editor, false);
        break;
      }
      case "B": {
        const editor = this.#expect_editor(props.command.name);
        motions.back_word(editor, true);
        break;
      }
      case "{": {
        const editor = this.#expect_editor(props.command.name);
        motions.back_para(editor, false);
        break;
      }
      case "}": {
        const editor = this.#expect_editor(props.command.name);
        motions.next_para(editor, false);
        break;
      }
      case "x": {
        const editor = this.#expect_editor(props.command.name);

        if (
          // caret is on the first line and it's empty
          (motions.is_bof(editor) && motions.next_char(editor) === "\n") ||
          // we don't want to delete newlines
          motions.current_char(editor) === "\n"
        ) {
          return;
        }

        // `foo █ar baz` -> `foo█ar baz`
        editor.deleteSelection(
          /* action */ editor.ePrevious!,
          /* stripWrappers */ editor.eStrip!
        );

        if (motions.next_char(editor) !== "\n") {
          // `foo█ar baz` -> `foo █r baz`
          editor.selectionController.characterMove(
            /* forward */ true,
            /* extend */ false
          );
        }
        break;
      }
      case "0": {
        const editor = this.#expect_editor(props.command.name);
        motions.beginning_of_line(editor, false);
        break;
      }
      case "$": {
        const editor = this.#expect_editor(props.command.name);
        motions.end_of_line(editor, false);
        break;
      }
      case "o": {
        const editor = this.#expect_editor(props.command.name);

        editor.selectionController.intraLineMove(
          /* forward */ true,
          /* extend */ false
        );
        editor.insertLineBreak();

        this.#change_mode("insert");
        break;
      }
      case "v": {
        this.#change_mode("visual");
        break;
      }
      case "vh": {
        const editor = this.#expect_editor(props.command.name);
        if (editor.selection.isCollapsed) {
          motions.back_char(editor, true);
        }
        motions.back_char(editor, true);
        break;
      }
      case "vl": {
        const editor = this.#expect_editor(props.command.name);
        if (editor.selection.isCollapsed) {
          editor.selectionController.characterMove(false, false);
          editor.selectionController.characterMove(true, true);
        }

        motions.forward_char(editor, true);
        break;
      }
      case "vd": {
        const editor = this.#expect_editor(props.command.name);

        // `foo ██r` -> `foo |r`
        editor.deleteSelection(editor.ePrevious!, editor.eStrip!);

        // `foo |r` -> `foo r|`
        motions.forward_char(editor, false);

        this.#change_mode("normal");
        break;
      }
      default:
        throw assert_never(props.command);
    }
  }

  #start_hints(props: HintProps) {
    this.#change_mode("hint");
    this.#hint_action = props.action;

    const actor = this;

    function show_hints() {
      if (actor.state?.mode !== "hint") {
        // TODO(glide): redundant? this should be cleaned up already
        actor.contentWindow?.removeEventListener("scrollend", show_hints);
        return;
      }

      actor.#is_scrolling = false;

      const hints = hinting.content.resolve_hints(actor.document!);
      actor.#active_hints = hints;

      actor.send_async_message("Glide::ResolvedHints", {
        // strip out the `target` as we cannot / don't need to send it
        hints: hints.map(({ target: _target, ...rest }) => rest),
      });
    }

    const y = this.contentWindow!.scrollY;
    const x = this.contentWindow!.scrollX;

    this.contentWindow!.requestAnimationFrame(() => {
      this.#is_scrolling =
        this.contentWindow!.scrollX !== x || this.contentWindow!.scrollY !== y;

      // immediately render the hints if we aren't scrolling
      if (!this.#is_scrolling) {
        show_hints();
      }

      function on_scroll() {
        if (!actor.#is_scrolling) {
          // if we're starting a scroll then we should hide the hints to
          // avoid a weird delay where the hints are temporarily in the
          // wrong place.
          //
          // we could also consider re-computing the hints on every frame
          // but I'd rather keep this low compute cost
          actor.send_async_message("Glide::HideHints");
          actor.#is_scrolling = true;
        }
      }

      this.contentWindow!.addEventListener("scroll", on_scroll);
      this.#hint_scroll_listener = on_scroll;

      this.contentWindow!.addEventListener("scrollend", show_hints);
      this.#hint_scrollend_listener = show_hints;
    });
  }

  #get_active_element(): HTMLElement | null {
    return this.document?.activeElement ?
        this.#get_active_nested_shadow_root_elem(
          this.document.activeElement as HTMLElement
        )
      : null;
  }

  #expect_editor(seq: string): nsIEditor {
    const editor = this.#get_editor(this.#get_active_element());
    if (!editor) {
      throw new Error(`Cannot execute \`${seq}\`, no editor available`);
    }

    return editor;
  }

  /**
   * Returns an `nsIEditor` instance for the given element, or
   * the editor instance for the current window.
   *
   * See `editor/nsIEditor.idl` for usage details.
   */
  #get_editor(element: Node | null | undefined): nsIEditor | null {
    if (element != null && (element as any as MozEditableElement).editor) {
      return (element as any as MozEditableElement).editor;
    }
    const window = this.contentWindow;
    const editing_session = window?.docShell?.editingSession;
    if (!editing_session) {
      this._log.debug("No editing session");
      return null;
    }

    return editing_session.getEditorForWindow(window as any);
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

  #change_mode(mode: GlideMode): void {
    this.state ??= { mode, operator: null };
    this.state.mode = mode;
    this.state.operator = null;
    this.send_async_message("Glide::ChangeMode", { mode });
    this._log.debug("new mode", this.state?.mode ?? "unset");
  }

  #record_repeatable_command(
    props: ChildMessages["Glide::RecordRepeatableCommand"]
  ): void {
    this.send_async_message("Glide::RecordRepeatableCommand", props);
  }

  handleEvent(event: Event) {
    const target = event.target as Element | null;

    this._log.debug("Event:", {
      type: event.type,
      target: {
        tagName: target?.tagName,
        id: target?.id,
        className: target?.className,
        nodeType: target?.nodeType,
        nodeName: target?.nodeName,
        isTextEditable: DOM.is_text_editable(target),
      },
      url: this.document?.location?.href,
      timestamp: new Date().toISOString(),
    });

    // TODO(glide): why was this in the original actor I copied?
    // if (aEvent.originalTarget.defaultView != this.contentWindow) {
    //   this._log.debug("different view");
    //   return;
    // }

    switch (event.type) {
      case "DOMContentLoaded": {
        this.#add_focus_listeners(event.target as any);
        break;
      }
      case "keydown": {
        this.#last_key_event_element =
          this.document?.activeElement ?
            this.#get_active_nested_shadow_root_elem(
              this.document?.activeElement as HTMLElement
            )
          : null;
        break;
      }
      case "focusin": {
        const target = this.#get_active_nested_shadow_root_elem(
          event.target as HTMLElement
        );

        const current_mode = this.state?.mode;
        if (current_mode === "ignore") {
          // automatic mode switching is disabled in `ignore` mode
          return;
        }

        this._log.debug("current mode", current_mode ?? "unset");

        function get_new_mode(): GlideMode {
          if (DOM.is_text_editable(target)) {
            return "insert";
          }

          if (current_mode === "visual") {
            return "visual";
          }

          return "normal";
        }

        const new_mode = get_new_mode();
        if (new_mode !== this.state?.mode) {
          this.#change_mode(new_mode);
        }

        break;
      }
      case "blur": {
        if (this.state?.mode !== "normal" && this.state?.mode !== "ignore") {
          this.#change_mode("normal");
        }
        break;
      }
    }
  }

  // cache seen shadow roots to avoid adding many event listeners
  #seen_root = new WeakMap<Node>();

  /**
   * Given an element, recursively looks through `activeElement`s in shadow
   * roots until there is no more shadow roots.
   *
   * Pre condition: the given `element` has been focused.
   */
  #get_active_nested_shadow_root_elem(element: HTMLElement): HTMLElement {
    const root = element.shadowRoot;
    if (!root) {
      return element;
    }

    while (element.shadowRoot) {
      if (!this.#seen_root.has(element.shadowRoot)) {
        this.#add_focus_listeners(element.shadowRoot);
      }

      element = element.shadowRoot.activeElement as HTMLElement;
      if (!element) break;
    }

    return element;
  }

  #add_focus_listeners(element: Pick<Element, "addEventListener">): void {
    element.addEventListener("blur", this, true);
    element.addEventListener("focusin", this, true);
  }
}
