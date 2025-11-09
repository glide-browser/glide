/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { GlideExcmdsMap, ParsedArg } from "../base/content/browser-excmds-registry.mts";
import type { State } from "../base/content/browser.mjs";
import type { Sandbox } from "../base/content/sandbox.mts";
import type { ToDeserialisedIPCFunction } from "../base/content/utils/ipc.mts";
import type { ParentMessages, ParentQueries } from "./GlideHandlerParent.sys.mjs";

const hinting = ChromeUtils.importESModule("chrome://glide/content/hinting.mjs");
const motions = ChromeUtils.importESModule("chrome://glide/content/motions.mjs");
const MozUtils = ChromeUtils.importESModule("chrome://glide/content/utils/moz.mjs");
const { GLIDE_COMMANDLINE_INPUT_ANONID } = ChromeUtils.importESModule("chrome://glide/content/browser-constants.mjs");
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { assert_never, assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { parse_command_args } = ChromeUtils.importESModule("chrome://glide/content/browser-excmds.mjs");
const { redefine_getter } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");
const { create_sandbox } = ChromeUtils.importESModule("chrome://glide/content/sandbox.mjs");

export interface ChildMessages {
  "Glide::ResolvedHints": {
    hints: GlideHintIPC[];
    location: glide.HintLocation;
    auto_activate: boolean;
  };
  "Glide::HideHints": {};
  "Glide::ChangeMode": { mode: GlideMode; force?: boolean };
  "Glide::RecordRepeatableCommand": ParentMessages["Glide::ExecuteContentCommand"];
}

export interface ChildQueries {}

type HintAction = ToDeserialisedIPCFunction<
  ParentMessages["Glide::Hint"]["action"]
>;
type HintProps = Omit<ParentMessages["Glide::Hint"], "action" | "pick"> & {
  action?: HintAction;
  pick?: ToDeserialisedIPCFunction<
    ParentMessages["Glide::Hint"]["pick"]
  >;
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

  #last_focused_input_element: HTMLElement | null = null;

  #active_hints: glide.ContentHint[] = [];
  #hint_action: HintAction | null = null;
  #is_scrolling: boolean = false;
  #hint_scroll_listener: Function | null = null;
  #hint_scrollend_listener: Function | null = null;

  actorCreated() {
    this.state = null;

    // TODO(glide): separate logger instances for different things?
    // TODO(glide): different log prefs?
    this._log = console.createInstance({ prefix: "Glide[Child]", maxLogLevelPref: "glide.logging.loglevel" });
  }

  async receiveMessage(
    message: ActorReceiveMessage<ParentMessages, ParentQueries>,
  ) {
    this._log.debug("receiveMessage[child]", message.name);

    switch (message.name) {
      case "Glide::StateUpdate": {
        const previous_mode = this.state?.mode;
        this.state = message.data.state;

        // if we're leaving `hint` mode, we don't need to listen to the
        // scroll events anymore
        if (previous_mode === "hint" && message.data.state.mode !== "hint") {
          this.#active_hints = [];
          this.#hint_action = null;

          if (this.#hint_scroll_listener != null) {
            this.contentWindow?.removeEventListener("scroll", this.#hint_scroll_listener);
          }

          if (this.#hint_scrollend_listener != null) {
            this.contentWindow?.removeEventListener("scrollend", this.#hint_scrollend_listener);
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
        if (
          previous_mode === "visual"
          && this.state.mode === "normal"
          && !message.data.meta?.disable_auto_collapse
        ) {
          const editor = this.#get_editor(this.#get_active_element());

          if (editor && !editor.selection.isCollapsed) {
            const needs_forward_adjust = editor.selection.focusOffset < editor.selection.anchorOffset;

            editor.selection.collapse(editor.selection.focusNode, editor.selection.focusOffset);
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
        this.#handle_excmd(message.data);
        break;
      }
      case "Glide::ReplaceChar": {
        const editor = this.#expect_editor("replace char");
        motions.back_char(editor, false);
        editor.deleteSelection(/* action */ editor.eNext!, /* stripWrappers */ editor.eStrip!);
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
          editor.selectionController.characterMove(/* forward */ false, /* extend */ false);
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
          editor.selectionController.characterMove(/* forward */ true, /* extend */ false);
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
            editor.deleteSelection(/* action */ editor.eNext!, /* stripWrappers */ editor.eStrip!);
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
          pick: IPC.maybe_deserialise_glidefunction(this.sandbox, message.data.pick),
          action: IPC.maybe_deserialise_glidefunction(this.sandbox, message.data.action),
        });
        break;
      }
      case "Glide::ExecuteHint": {
        const hint = this.#active_hints.find(hint => hint.id === message.data.id);
        if (!hint) {
          throw new Error(`Could not find a hint with ID: ${message.data.id}`);
        }

        const action = this.#hint_action;
        this._log.debug("activating hint on", hint.element, "with", action);

        if (typeof action === "function") {
          await action(hint.element);
          return;
        }

        switch (action) {
          case null:
          case undefined:
          case "click": {
            hint.element.focus();

            hint.element.$glide_hack_click_from_hint = true;
            hint.element.click();
            DOM.in_frames(this.contentWindow!, 10, () => {
              delete hint.element.$glide_hack_click_from_hint;
            });

            break;
          }

          case "newtab-click": {
            const previous = hint.element.getAttribute("target");
            try {
              hint.element.setAttribute("target", "_blank");
              hint.element.focus();

              hint.element.$glide_hack_click_from_hint = true;
              hint.element.click();
              DOM.in_frames(this.contentWindow!, 10, () => {
                delete hint.element.$glide_hack_click_from_hint;
              });
            } finally {
              if (previous == null) {
                hint.element.removeAttribute("target");
              } else {
                hint.element.setAttribute("target", previous);
              }
            }
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

      case "Glide::Scroll": {
        switch (message.data.to) {
          case "page_up": {
            DOM.scroll(this.contentWindow!, { type: "page", y: -1 });
            break;
          }
          case "page_down": {
            DOM.scroll(this.contentWindow!, { type: "page", y: 1 });
            break;
          }
          case "top": {
            const window = assert_present(this.contentWindow, "no contentWindow");
            this._log.debug(`[scroll_top]: scrolling to x=${window.scrollX} y=0`);
            window.scroll(window.scrollX, 0);
            break;
          }
          case "bottom": {
            const window = assert_present(this.contentWindow, "no contentWindow");
            this._log.debug(`[scroll_bottom]: scrolling to x=${window.scrollX} y=${window.scrollMaxY}`);
            window.scroll(window.scrollX, window.scrollMaxY);
            break;
          }
        }

        break;
      }

      case "Glide::Move": {
        const doc_shell = assert_present(this.docShell);

        const editor = this.#get_editor(this.#get_active_element());
        if (editor) {
          this._log.debug(`[Glide::Move]: editor available, using commands directly`);
          // if we have an editor, sending the following commands should always work
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

        // if we don't have an editor, the above commands seem to not always
        // work. so we need to use an alternative method for scrolling, sending
        // a wheel event directly.
        this._log.debug(`[Glide::Move]: no editor available, manually scrolling`);
        const delta = 200;
        const window = assert_present(this.contentWindow, "no content window");

        switch (message.data.direction) {
          case "left":
            return DOM.scroll(window, { type: "pixel", x: -delta });
          case "right":
            return DOM.scroll(window, { type: "pixel", x: delta });
          case "up":
            return DOM.scroll(window, { type: "pixel", y: -delta });
          case "down":
            return DOM.scroll(window, { type: "pixel", y: delta });
          case "endline":
            return doc_shell.doCommand("cmd_endLine");
          default:
            throw assert_never(message.data.direction);
        }
      }

      case "Glide::SelectionCollapse": {
        const editor = this.#expect_editor("selection_collapse");
        editor.selection.collapseToEnd();
        break;
      }

      // ----------------- queries -----------------

      case "Glide::Query::CopySelection": {
        const selection = this.contentWindow?.getSelection()?.toString();
        if (!selection) {
          // fallback to an editor for `<textarea>` and `<input>`
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection#related_objects
          const editor = this.#get_editor(this.#get_active_element());
          if (!editor) {
            throw new Error("Could not resolve a selection to copy");
          }

          editor.copy();
          break;
        }

        MozUtils.copy_to_clipboard(this.contentWindow!, selection);
        break;
      }

      case "Glide::Query::IsEditing": {
        const element = this.#get_active_element();
        if (!element) {
          return false;
        }

        return DOM.is_text_editable(element);
      }

      default:
        throw assert_never(message);
    }
  }

  #get_key_event_target(): Element | null | undefined {
    return this.#last_key_event_element ?? this.#get_active_element();
  }

  get sandbox(): Sandbox {
    return redefine_getter(
      this,
      "sandbox",
      create_sandbox({
        // TODO: figure out a safer strategy for creating this content sandbox.
        document: this.document as MirroredDocument,
        window: this.contentWindow as HiddenWindow,
        original_window: null,
        console,
        browser: null,
        glide: null,
      }),
    );
  }

  #handle_excmd(props: ParentMessages["Glide::ExecuteContentCommand"]): void {
    switch (props.command.name) {
      case "blur": {
        const target = this.#get_active_element();
        if (target && "blur" in target) {
          (target as HTMLElement).blur();
        }
        break;
      }
      case "execute_motion": {
        const operator = props.operator ?? this.state?.operator;
        if (!operator) {
          throw new Error("cannot execute motion, no operator defined");
        }

        const sequence = props.sequence.join("");
        const editor = this.#expect_editor(`${operator}${sequence}`);

        switch (operator) {
          case "d": {
            const result = motions.select_motion(editor, sequence as any, this.state?.mode ?? "normal", operator);

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
            motions.select_motion(editor, sequence as any, this.state?.mode ?? "normal", operator);
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
      case "motion": {
        const {
          args: { keyseq },
        } = parse_command_args(props.command, props.args);

        if (this.#motion_is_repeatable(keyseq)) {
          this.#record_repeatable_command(props);
        }

        if (keyseq === "v") {
          this.#change_mode("visual");
          break;
        }

        const editor = this.#expect_editor(keyseq);
        switch (keyseq) {
          case "w": {
            motions.forward_word(editor, /* bigword */ false, this.state?.mode);
            break;
          }
          case "W": {
            motions.forward_word(editor, /* bigword */ true, this.state?.mode);
            break;
          }
          case "e": {
            motions.end_word(editor, this.state?.mode);
            break;
          }
          case "b": {
            motions.back_word(editor, false);
            break;
          }
          case "B": {
            motions.back_word(editor, true);
            break;
          }
          case "{": {
            motions.back_para(editor);
            break;
          }
          case "}": {
            motions.next_para(editor);
            break;
          }
          case "I": {
            motions.first_non_whitespace(editor, false);
            this.#change_mode("insert");
            break;
          }
          case "0": {
            motions.beginning_of_line(editor, false);
            break;
          }
          case "$": {
            motions.end_of_line(editor, false);
            break;
          }
          case "s": {
            // caret is on the first line and it's empty
            if (motions.is_bof(editor) && motions.next_char(editor) === "\n") {
              return;
            }

            // `foo █ar baz` -> `foo█ar baz`
            editor.deleteSelection(/* action */ editor.ePrevious!, /* stripWrappers */ editor.eStrip!);
            this.#change_mode("insert");
            break;
          }
          case "vh": {
            if (editor.selection.isCollapsed) {
              motions.back_char(editor, true);
            }
            motions.back_char(editor, true);
            break;
          }
          case "vl": {
            if (editor.selection.isCollapsed) {
              editor.selectionController.characterMove(false, false);
              editor.selectionController.characterMove(true, true);
            }

            motions.forward_char(editor, true);
            break;
          }
          case "vd": {
            // `foo ██r` -> `foo |r`
            editor.deleteSelection(editor.ePrevious!, editor.eStrip!);

            // `foo |r` -> `foo r|`
            motions.forward_char(editor, false);

            this.#change_mode("normal");
            break;
          }
          case "vc": {
            // `foo ██r` -> `foo |r`
            editor.deleteSelection(editor.ePrevious!, editor.eStrip!);

            this.#change_mode("insert");
            break;
          }
          case "x": {
            if (
              // caret is on the first line and it's empty
              (motions.is_bof(editor) && motions.next_char(editor) === "\n")
              // we don't want to delete newlines
              || motions.current_char(editor) === "\n"
            ) {
              return;
            }

            // `foo █ar baz` -> `foo█ar baz`
            editor.deleteSelection(/* action */ editor.ePrevious!, /* stripWrappers */ editor.eStrip!);

            if (motions.next_char(editor) !== "\n") {
              // `foo█ar baz` -> `foo █r baz`
              editor.selectionController.characterMove(/* forward */ true, /* extend */ false);
            }
            break;
          }
          case "X": {
            if (
              // caret is on the first line and it's empty
              (motions.is_bof(editor) && motions.next_char(editor) === "\n")
              // we don't want to delete newlines
              || motions.current_char(editor) === "\n"
            ) {
              return;
            }

            // `foo █ar baz` -> `foo█ar baz`
            editor.deleteSelection(/* action */ editor.ePrevious!, /* stripWrappers */ editor.eStrip!);
            break;
          }
          case "o": {
            editor.selectionController.intraLineMove(/* forward */ true, /* extend */ false);
            editor.insertLineBreak();

            this.#change_mode("insert");
            break;
          }
          default:
            throw assert_never(keyseq);
        }
        break;
      }
      case "focusinput": {
        const {
          args: { filter },
        } = parse_command_args(props.command, props.args);

        switch (filter) {
          case "last": {
            if (this.#last_focused_input_element) {
              this.#last_focused_input_element.focus();

              if (!DOM.is_visible(this.#last_focused_input_element)) {
                this.#last_focused_input_element.scrollIntoView();
              }
            } else {
              throw new Error("no input element");
            }

            break;
          }
          default:
            throw assert_never(filter);
        }

        break;
      }
      default:
        throw assert_never(props.command);
    }
  }

  /**
   * Whether or not `.` should be updated to repeat this motion.
   */
  #motion_is_repeatable(
    keyseq: ParsedArg<GlideExcmdsMap["motion"]["args_schema"]["keyseq"]>,
  ): boolean {
    switch (keyseq) {
      case "0":
      case "w":
      case "W":
      case "e":
      case "b":
      case "B":
      case "$":
      case "{":
      case "}":
      case "s":
      case "v":
      case "vh":
      case "vl":
      case "vd":
      case "vc":
      case "I":
        return false;
      case "x":
      case "X":
      case "o":
        return true;
      default:
        throw assert_never(keyseq);
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

      const hints = hinting.content.resolve_hints(actor.document!, props);
      actor.#active_hints = hints;

      actor.send_async_message("Glide::ResolvedHints", {
        location: props.location,
        auto_activate: props.auto_activate,
        // strip out the `target` as we cannot / don't need to send it
        hints: hints.map(({ element, ...rest }): GlideHintIPC =>
          props.debug ? { ...rest, element_id: element.id || undefined } : rest
        ),
      });
    }

    const y = this.contentWindow!.scrollY;
    const x = this.contentWindow!.scrollX;

    this.contentWindow!.requestAnimationFrame(() => {
      this.#is_scrolling = this.contentWindow!.scrollX !== x || this.contentWindow!.scrollY !== y;

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
    return this.document?.activeElement
      ? this.#get_active_nested_shadow_root_elem(this.document.activeElement as HTMLElement)
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
    transferables?: any,
  ) => void = this.sendAsyncMessage;
  send_query: <QueryName extends keyof ChildQueries>(
    messageName: QueryName,
    obj?: ChildQueries[QueryName]["props"] | undefined,
  ) => Promise<ChildQueries[QueryName]["result"]> = this.sendQuery;

  #change_mode(mode: GlideMode): void {
    this.state ??= { mode, operator: null };
    this.state.mode = mode;
    this.state.operator = null;
    this.send_async_message("Glide::ChangeMode", { mode });
    this._log.debug("new mode", this.state?.mode ?? "unset");
  }

  #record_repeatable_command(
    props: ChildMessages["Glide::RecordRepeatableCommand"],
  ): void {
    this.send_async_message("Glide::RecordRepeatableCommand", props);
  }

  handleEvent(event: Event) {
    if (!event.isTrusted) {
      // note: I *think* this is redundant because AFAIK only trusted events
      // should be fired here but there's no downside in including this check
      return;
    }

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
        if (event.target) {
          this.#add_focus_listeners(event.target as HTMLElement);
        }
        break;
      }
      case "keydown": {
        this.#last_key_event_element = this.document?.activeElement
          ? this.#get_active_nested_shadow_root_elem(this.document?.activeElement as HTMLElement)
          : null;
        break;
      }
      case "focusin": {
        if (!event.target) {
          // no target for a focusin event? just ignore it
          return;
        }

        const target = this.#get_active_nested_shadow_root_elem(event.target as HTMLElement);
        if (DOM.is_text_editable(target)) {
          this.#last_focused_input_element = target;
        }

        const current_mode = this.state?.mode;
        if (current_mode === "ignore") {
          // automatic mode switching is disabled in `ignore` mode
          return;
        }

        this._log.debug("current mode", current_mode ?? "unset");

        function get_new_mode(): GlideMode {
          if (
            target.getAttribute("anonid") === GLIDE_COMMANDLINE_INPUT_ANONID
          ) {
            return "command";
          }

          if (DOM.is_text_editable(target)) {
            return "insert";
          }

          if (DOM.is_video_element(target)) {
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
