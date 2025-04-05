/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { KeyMappingTrieNode } from "./utils/keys.mts";
import type {
  ArgumentSchema,
  ArgumentsSchema,
  ParseResult,
} from "./utils/args.mjs";
import type { ParentMessages } from "../../actors/GlideHandlerParent.sys.mjs";
import type { GlideOperator } from "./browser-mode.mts";

const { assert_never, assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { parse_command_args: base_parse_command_args } =
  ChromeUtils.importESModule("chrome://glide/content/utils/args.mjs");
const { MODE_SCHEMA_TYPE, OPERATOR_SCHEMA_TYPE } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-mode.mjs"
);

export interface GlideExcmdInfo<Args extends ArgumentsSchema = {}> {
  description: string;
  content: boolean;
  /** Whether or not this command can be `repeat`ed, e.g. with `.` */
  repeatable: boolean;
  name: string;
  args_schema?: Args;
}

export const GLIDE_EXCOMMANDS = [
  {
    name: "back",
    description: "Go back one page in history",
    content: false,
    repeatable: true,
  },
  {
    name: "forward",
    description: "Go forward one page in history",
    content: false,
    repeatable: true,
  },
  {
    name: "reload",
    description: "Reload the current page",
    content: false,
    repeatable: true,
  },
  {
    name: "reload_hard",
    description: "Reload the current page, bypassing the cache",
    content: false,
    repeatable: true,
  },

  {
    name: "config",
    description: "Show the config file path",
    content: false,
    repeatable: false,
  },
  {
    name: "config_reload",
    description: "Reload the config file",
    content: false,
    repeatable: true,
  },

  {
    name: "repeat",
    description:
      'Repeat the last invoked command. In general only applies to "mutative" commands',
    content: false,
    repeatable: false,
  },

  {
    // TODO(glide): this should also remove from `visual` and `operator-pending` modes when we have them
    name: "unmap",
    description: "Remove a mapping from normal mode",
    args_schema: {
      lhs: {
        type: "string",
        required: true,
        position: 0,
      },
    },
    content: false,
    repeatable: false,
  },
  {
    name: "nunmap",
    description: "Remove a mapping from normal mode",
    args_schema: {
      lhs: {
        type: "string",
        required: true,
        position: 0,
      },
    },
    content: false,
    repeatable: false,
  },
  {
    name: "iunmap",
    description: "Remove a mapping from insert mode",
    args_schema: {
      lhs: {
        type: "string",
        required: true,
        position: 0,
      },
    },
    content: false,
    repeatable: false,
  },

  {
    name: "tab",
    description: "Switch to the given tab index",
    args_schema: {
      tab_index: {
        type: "integer",
        required: true,
        position: 0,
      },
    },
    content: false,
    repeatable: false,
  },

  {
    name: "tab_close",
    description: "Close the current tab",
    content: false,
    repeatable: true,
  },
  {
    name: "tab_next",
    description: "Switch to the next tab, wrapping around if applicable",
    content: false,
    repeatable: true,
  },
  {
    name: "tab_prev",
    description: "Switch to the previous tab, wrapping around if applicable",
    content: false,
    repeatable: true,
  },

  {
    name: "commandline_show",
    description: "Show the commandline UI",
    content: false,
    args_schema: {},
    repeatable: false,
  },
  {
    name: "commandline_toggle",
    description: "Toggle the commandline UI",
    content: false,
    args_schema: {},
    repeatable: false,
  },

  {
    name: "url_yank",
    description: "Yank the URL of the current tab to the clipboard",
    content: false,
    repeatable: false,
  },

  {
    name: "echo",
    description: "Log the given arguments to the console",
    content: false,
    args_schema: {},
    repeatable: false,
  },

  {
    name: "mode_change",
    description: "Change the current mode",
    content: false,
    repeatable: false,
    args_schema: {
      mode: {
        type: MODE_SCHEMA_TYPE,
        required: true,
        position: 0,
      },
      "--automove": {
        type: { enum: ["left", "endline"] },
      },
      "--operator": {
        type: OPERATOR_SCHEMA_TYPE,
        description: "Only applicable for operator-pending mode",
      },
    },
  },

  {
    name: "caret_move",
    description: "Move the text caret",
    content: false,
    repeatable: false,
    args_schema: {
      direction: {
        type: { enum: ["left", "right", "up", "down"] },
        required: true,
        position: 0,
      },
    },
  },

  {
    name: "help",
    description: "Open the docs",
    content: false,
    repeatable: false,
  },

  // TODO
  // {
  //   name: "bookmark",
  //   description: "Bookmark the current page",
  //   content: false,
  // },

  // ------------ commands that require accessing the content frame ------------
  {
    name: "scroll_top",
    description: "Scroll to the top of the window",
    content: true,
    repeatable: false,
  },
  {
    name: "scroll_page_down",
    description: "Scroll down by 1 page (the size of the viewport)",
    content: true,
    repeatable: false,
  },
  {
    name: "scroll_page_up",
    description: "Scroll up by 1 page (the size of the viewport)",
    content: true,
    repeatable: false,
  },
  {
    name: "scroll_bottom",
    description: "Scroll to the bottom of the window",
    content: true,
    repeatable: false,
  },
  {
    name: "blur",
    description: "Blur the active element",
    content: true,
    repeatable: false,
  },

  {
    name: "hint",
    description: "Show hint labels for jumping to clickable elements",
    content: true,
    repeatable: false,
    args_schema: {
      "--action": {
        type: { enum: ["click"] },
        required: false,
      },
    },
  },

  // ------------ vim motions ------------
  {
    name: "execute_motion",
    description: "Used from op-pending mode to execute a motion.",
    content: true,
    // note: it's up to the handler in `GlideHandlerChild.sys.mts` to determine if the command
    //       can be repeated and register it in the history.
    repeatable: false,
  },
  {
    name: "w",
    description: "Move 1 word forwards",
    content: true,
    repeatable: false,
  },
  {
    name: "W",
    description:
      "Move 1 WORD forwards, unlike `w`, this only counts whitespace as a word boundary",
    content: true,
    repeatable: false,
  },
  {
    name: "b",
    description: "Move 1 word backwards",
    content: true,
    repeatable: false,
  },
  {
    name: "B",
    description:
      "Move 1 WORD backwards, unlike `b`, this only counts whitespace as a word boundary",
    content: true,
    repeatable: false,
  },
  {
    name: "x",
    description: "Delete the current character",
    content: true,
    repeatable: true,
  },
  {
    name: "0",
    description: "Move to the very beginning of the line",
    content: true,
    repeatable: false,
  },
  {
    name: "$",
    description: "Move to the very end of the line",
    content: true,
    repeatable: false,
  },
  {
    name: "o",
    description: "Begin a new line below the cursor and insert text",
    content: true,
    repeatable: true,
  },

  // visual
  {
    name: "v",
    description: "Enter visual mode",
    content: true,
    repeatable: false,
  },
  {
    name: "vh",
    description: "Extend the selection to the left",
    content: true,
    repeatable: false,
  },
  {
    name: "vl",
    description: "Extend the selection to the right",
    content: true,
    repeatable: false,
  },
  {
    name: "vd",
    description: "Delete the current selection",
    content: true,
    repeatable: false,
  },
] as const satisfies GlideExcmdInfo[];

type GlideExcmdsMap = {
  [K in (typeof GLIDE_EXCOMMANDS)[number]["name"]]: Extract<
    (typeof GLIDE_EXCOMMANDS)[number],
    { name: K }
  >;
};

const GLIDE_EXCOMMANDS_MAP = GLIDE_EXCOMMANDS.reduce((acc, cmd) => {
  // @ts-expect-error TS doesn't narrow types correctly
  acc[cmd.name] = cmd;
  return acc;
}, {} as GlideExcmdsMap);

export type GlideExcmdName = (typeof GLIDE_EXCOMMANDS)[number]["name"];

/**
 * Commands that can be executed directly in the browser chrome frame.
 */
export type BrowserExcmd = Exclude<
  (typeof GLIDE_EXCOMMANDS)[number],
  { content: true }
>;

/**
 * Commands that need to be executed in the content frame.
 */
export type ContentExcmd = Exclude<
  (typeof GLIDE_EXCOMMANDS)[number],
  { content: false }
>;

export type GlideCommandString = GlideExcmdName | `${GlideExcmdName} ${string}`;
export type GlideCommandCallback = () => void;
export type GlideCommandValue = GlideCommandString | GlideCommandCallback;

interface ExecuteProps {
  mapping: KeyMappingTrieNode | null;

  /**
   * Whether or not the executed command should be saved so that it can be repeated with `.`
   */
  save_to_history?: boolean | undefined;
}

type CommandHistoryEntry =
  | {
      type: "command";
      command: GlideCommandString;
    }
  | { type: "callback"; cb: GlideCommandCallback }
  | {
      type: "content-cmd";
      props: ParentMessages["Glide::ExecuteContentCommand"];
    };

class GlideExcmdsClass {
  #last_command: CommandHistoryEntry | null = null;

  add_to_command_history(entry: CommandHistoryEntry) {
    this.#last_command = entry;
  }

  back() {
    BrowserCommands.back(null);
  }

  forward() {
    BrowserCommands.forward(null);
  }

  #parse_command_args<Cmd extends GlideExcmdInfo>(
    meta: Cmd,
    command: string
  ): Cmd["args_schema"] extends Record<string, any> ?
    Extract<ParseResult<Cmd["args_schema"]>, { valid: true }>
  : null {
    return parse_command_args(meta, command);
  }

  async #execute_function_command(
    cb: GlideCommandCallback,
    props?: ExecuteProps
  ) {
    if (props?.save_to_history === undefined || props.save_to_history) {
      this.add_to_command_history({ type: "callback", cb });
    }

    // TODO(glide): sandbox in some way?
    await (cb() as any as Promise<void>);
  }

  /**
   * Given a command string like `config` or `mode_change normal`, returns
   * whether or not the corresponding command is defined.
   *
   * Note this does **not** validate any arguments.
   *
   * ```ts
   * is_known_command('config') -> true;
   * is_known_command('invalid') -> false;
   * is_known_command('mode_change invalid-mode-arg') -> true;
   * ```
   */
  is_known_command(command: string): command is GlideCommandString {
    const name = extract_command_name(command);
    return name in GLIDE_EXCOMMANDS_MAP;
  }

  async execute(
    command: GlideCommandString | GlideCommandCallback,
    props?: ExecuteProps
  ) {
    if (typeof command === "function") {
      return this.#execute_function_command(command, props);
    }

    const name = extract_command_name(command);
    const command_meta = GLIDE_EXCOMMANDS_MAP[name as GlideExcmdName];
    if (!command_meta) {
      throw new Error(`Unknown excmd: \`${name}\``);
    }

    if (
      command_meta.repeatable &&
      (props?.save_to_history === undefined || props.save_to_history)
    ) {
      this.add_to_command_history({ type: "command", command });
    }

    // for commands that need access to the content frame, just shortcut early
    // and send a message to execute it inside `GlideHandlerChild`.
    if (command_meta.content) {
      this.#execute_content_command({
        command: command_meta,
        args: command,
        sequence: props?.mapping?.value?.sequence ?? [],
      });
      return;
    }

    switch (command_meta.name) {
      case "repeat": {
        const last_command = this.#last_command;
        if (!last_command) {
          throw new Error("No command to repeat");
        }

        switch (last_command.type) {
          case "command": {
            console.info(`repeating \`${last_command.command}\` command`);
            await this.execute(last_command.command);
            break;
          }
          case "callback": {
            await this.execute(last_command.cb);
            break;
          }
          case "content-cmd": {
            this.#execute_content_command(last_command.props);
            break;
          }
        }

        break;
      }
      case "back": {
        this.back();
        break;
      }
      case "forward": {
        this.forward();
        break;
      }

      case "reload": {
        BrowserCommands.reload();
        break;
      }
      case "reload_hard": {
        BrowserCommands.reloadSkipCache();
        break;
      }

      case "tab": {
        const {
          args: { tab_index },
        } = this.#parse_command_args(command_meta, command);
        const tab = gBrowser.tabContainer.allTabs.at(tab_index);
        if (!tab) {
          throw new Error(`could not find a tab at index=${tab_index}`);
        }

        gBrowser.selectedTab = tab;
        break;
      }
      case "tab_close": {
        BrowserCommands.closeTabOrWindow(null);
        break;
      }

      case "tab_next": {
        const all_tabs = gBrowser.tabContainer.allTabs as unknown[];
        let next_index = gBrowser.tabContainer.selectedIndex + 1;
        if (next_index >= all_tabs.length) {
          next_index = 0;
        }

        gBrowser.selectedTab = all_tabs.at(next_index);
        break;
      }

      case "tab_prev": {
        gBrowser.selectedTab = gBrowser.tabContainer.allTabs.at(
          gBrowser.tabContainer.selectedIndex - 1
        );
        break;
      }

      case "commandline_show": {
        // extract the given args ourselves as `this.#parse_command_args` doesn't support
        // not trimming the args input and empty spaces have significant meaning here.
        //
        // TODO(glide): support this use case in `parse_command_args`
        const name_index = command.indexOf(" ");
        const args = name_index === -1 ? "" : command.slice(name_index + 1);

        await GlideCommands.upsert_commandline({ prefill: args });
        break;
      }

      case "commandline_toggle": {
        await GlideCommands.toggle_commandline();
        break;
      }

      case "mode_change": {
        const { args } = this.#parse_command_args(command_meta, command);
        const { mode, "--automove": automove, "--operator": operator } = args;
        const current_mode = GlideBrowser.state.mode;

        GlideBrowser._change_mode(mode, { operator });

        // TODO(glide): use command chaining to do this instead
        if (automove) {
          const doc_shell = assert_present(docShell, "No `docShell` present");
          if (automove === "left") {
            doc_shell.doCommand("cmd_moveLeft");
          } else if (automove === "endline") {
            doc_shell.doCommand("cmd_endLine");
          } else {
            throw assert_never(automove);
          }
        }

        if (current_mode === "normal" && mode === "normal") {
          console.log("sending blur");
          GlideBrowser.get_focused_actor().send_async_message(
            "Glide::BlurActiveElement"
          );
        }

        break;
      }

      case "caret_move": {
        const {
          args: { direction },
        } = this.#parse_command_args(command_meta, command);
        const doc_shell = assert_present(docShell, "No `docShell` present");

        if (direction === "left") {
          doc_shell.doCommand("cmd_moveLeft");
        } else if (direction === "right") {
          doc_shell.doCommand("cmd_moveRight");
        } else if (direction === "up") {
          doc_shell.doCommand("cmd_moveUp");
        } else if (direction === "down") {
          doc_shell.doCommand("cmd_moveDown");
        } else {
          throw assert_never(direction);
        }

        break;
      }

      case "echo": {
        // extract the given args ourselves as `this.#parse_command_args` doesn't support
        // not trimming the args input.
        //
        // TODO(glide): support this use case in `parse_command_args`
        const name_index = command.indexOf(" ");
        const args = name_index === -1 ? "" : command.slice(name_index + 1);
        console.log(args);
        break;
      }

      case "url_yank": {
        const url = gBrowser.selectedBrowser?.currentURI.spec;
        if (!url) {
          throw new Error("Could not find a URL to copy");
        }
        GlideCommands.copy_to_clipboard(url);
        break;
      }

      case "config": {
        console.log("config path: ", GlideBrowser.config_path);
        break;
      }

      case "config_reload": {
        GlideBrowser.reload_config();
        break;
      }

      case "unmap": {
        const {
          args: { lhs },
        } = this.#parse_command_args(command_meta, command);
        GlideBrowser.api.keymaps.del(["normal"], lhs);
        break;
      }

      case "nunmap": {
        const {
          args: { lhs },
        } = this.#parse_command_args(command_meta, command);
        GlideBrowser.api.keymaps.del("normal", lhs);
        break;
      }

      case "iunmap": {
        const {
          args: { lhs },
        } = this.#parse_command_args(command_meta, command);
        GlideBrowser.api.keymaps.del("insert", lhs);
        break;
      }

      case "help": {
        gBrowser.addTrustedTab("resource://glide-docs/index.html", {
          inBackground: false, // ensure active/selected
        });
        break;
      }

      default:
        throw assert_never(
          command_meta,
          `Unhandled excmd: \`${(command_meta as any).name}\``
        );
    }
  }

  #execute_content_command(props: {
    command: ContentExcmd;
    args: string;
    sequence: string[];
    operator?: GlideOperator | null;
  }) {
    const actor = GlideBrowser.get_focused_actor();
    const opts: ParentMessages["Glide::ExecuteContentCommand"] = {
      command: props.command,
      args: props.args,
      operator: props.operator ?? GlideBrowser.state.operator,
      sequence: props.sequence,
    };
    actor.send_async_message("Glide::ExecuteContentCommand", opts);
    console.log("sent execute command with", opts);
  }
}

export function extract_command_name(command: string): string {
  const name_index = command.indexOf(" ");
  return name_index !== -1 ? command.slice(0, name_index) : command;
}

/**
 * Return the given command string without the content preceding the first whitespace.
 *
 * e.g. `hint --action=foo` -> `--action=foo`
 */
export function extract_command_args(command: string): string {
  const name_index = command.indexOf(" ");
  if (name_index === -1) {
    return "";
  }

  return command.slice(name_index + 1);
}

/**
 * Parse a command and throws an error if the given args are not valid.
 */
export function parse_command_args<Cmd extends GlideExcmdInfo>(
  meta: Cmd,
  command: string
): Cmd["args_schema"] extends Record<string, any> ?
  Extract<ParseResult<Cmd["args_schema"]>, { valid: true }>
: null {
  if (!meta.args_schema) {
    return null as any;
  }

  const args = extract_command_args(command);
  const parse_result = base_parse_command_args({
    schema: meta.args_schema,
    args,
  });
  if (!parse_result.valid) {
    // TODO(glide-notify)
    throw new Error(
      `Couldn't parse command arguments due to ${JSON.stringify(
        parse_result.errors
      )}`
    );
  }
  return parse_result as any;
}

export function get_command_info(
  name: string
): GlideExcmdInfo<Record<string, ArgumentSchema>> | null {
  // @ts-ignore
  return GLIDE_EXCOMMANDS_MAP[name as GlideExcmdName] ?? null;
}

export const GlideExcmds = new GlideExcmdsClass();
