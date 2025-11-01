/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SetOptional } from "type-fest";
import type { ParentMessages } from "../../actors/GlideHandlerParent.sys.mjs";
import type {
  ArgumentSchema,
  ContentExcmd,
  GlideCommandString,
  GlideExcmdInfo,
  GlideExcmdName,
  GlideOperator,
} from "./browser-excmds-registry.mts";
import type { ParseResult } from "./utils/args.mjs";
import type { KeyMappingTrieNode } from "./utils/keys.mts";

const MozUtils = ChromeUtils.importESModule("chrome://glide/content/utils/moz.mjs");
const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs");
const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { GLIDE_EXCOMMANDS_MAP } = ChromeUtils.importESModule("chrome://glide/content/browser-excmds-registry.mjs");
const Args = ChromeUtils.importESModule("chrome://glide/content/utils/args.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });

interface ExecuteProps {
  args: glide.ExcmdCallbackProps;

  mapping?: KeyMappingTrieNode | null;

  /**
   * Whether or not the executed command should be saved so that it can be repeated with `.`
   */
  save_to_history?: boolean | undefined;
}

type CommandHistoryEntry =
  | {
    type: "command";
    command: glide.ExcmdString;
  }
  | { type: "callback"; cb: glide.ExcmdCallback }
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
    command: string,
  ): Cmd["args_schema"] extends Record<string, any> ? Extract<ParseResult<Cmd["args_schema"]>, { valid: true }>
    : null
  {
    return parse_command_args(meta, command);
  }

  async #execute_function_command(
    cb: glide.ExcmdCallback,
    props: ExecuteProps,
  ) {
    if (props?.save_to_history === undefined || props.save_to_history) {
      this.add_to_command_history({ type: "callback", cb });
    }

    // TODO(glide): sandbox in some way?
    await (cb(props.args) as any as Promise<void>);
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
    return name in GLIDE_EXCOMMANDS_MAP || GlideBrowser.user_excmds.has(name);
  }

  async execute(
    command: glide.ExcmdValue,
    props?: SetOptional<ExecuteProps, "args">,
  ): Promise<void> {
    try {
      await this.#execute(command, {
        ...props,
        args: { ...this.#parse_args(command), tab_id: GlideBrowser.active_tab_id, ...props?.args },
      });
    } catch (err) {
      GlideBrowser._log.error(err);

      const message = `An error occurred executing ${
        typeof command === "string"
          ? `excmd \`${command}\``
          : "an excmd function" + command.name
          ? ` (${command.name})`
          : ""
      } - ${err}`;
      GlideBrowser.add_notification("glide-excmd-error", {
        label: message,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    }
  }

  #parse_args(command: glide.ExcmdValue): { args_arr: string[] } {
    if (typeof command !== "string") {
      return { args_arr: [] };
    }

    // TODO(someday): for predefined commands we end up doing this parsing logic
    //                twice when we should really only do it once.
    const args_str = extract_command_args(command);
    return { args_arr: Args.tokenize_args(args_str) };
  }

  async #execute(
    command: glide.ExcmdValue,
    props: ExecuteProps,
  ): Promise<void> {
    if (typeof command === "function") {
      return this.#execute_function_command(command, props);
    }

    const name = extract_command_name(command);

    const meta = GlideBrowser.user_excmds.get(name);
    if (meta) {
      return await meta.fn(props.args);
    }

    const command_meta = GLIDE_EXCOMMANDS_MAP[name as GlideExcmdName];
    if (!command_meta) {
      throw new Error(`Unknown excmd: \`${name}\``);
    }

    if (
      typeof props?.save_to_history === "boolean"
        ? props.save_to_history
        : command_meta.repeatable
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

      case "quit": {
        Services.startup.quit(Services.startup.eAttemptQuit!);
        break;
      }

      case "clear": {
        GlideBrowser.remove_all_notifications();
        break;
      }

      case "repl": {
        const { require } = ChromeUtils.importESModule("resource://devtools/shared/loader/Loader.sys.mjs");
        const { BrowserConsoleManager } = require("devtools/client/webconsole/browser-console-manager");

        // note: when the console loads and sets up the `webconsole` actor, we'll check if
        //       this pref is set, and if it is, update that instance to use our config sandbox
        //       and then delete the pref so that the next toolbox that is opened, will use
        //       the regular window sandbox.
        //
        //       see devtools/server/actors/webconsole.js::evalGlobal for the corresponding
        //       implementation.
        Services.prefs.setBoolPref("devtools.glide.open_next_webconsole_as_repl", true);

        await BrowserConsoleManager.openBrowserConsoleOrFocus();
        break;
      }

      case "keys": {
        const {
          args: { keyseq },
        } = this.#parse_command_args(command_meta, command);
        await GlideBrowser.api.keys.send(keyseq);
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

      case "tab_new": {
        const {
          args: { url },
        } = this.#parse_command_args(command_meta, command);
        BrowserCommands.openTab({ url });
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
        gBrowser.selectedTab = gBrowser.tabContainer.allTabs.at(gBrowser.tabContainer.selectedIndex - 1);
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

      case "commandline_focus_next": {
        const commandline = GlideCommands.expect_commandline();
        commandline.focus_next();
        break;
      }

      case "commandline_focus_back": {
        const commandline = GlideCommands.expect_commandline();
        commandline.focus_back();
        break;
      }

      case "commandline_delete": {
        const commandline = GlideCommands.expect_commandline();
        commandline.remove_focused_browser_tab();
        break;
      }

      case "commandline_accept": {
        const commandline = GlideCommands.expect_commandline();
        await commandline.accept_focused();
        break;
      }

      case "mode_change": {
        const { args } = this.#parse_command_args(command_meta, command);
        const { mode, "--automove": automove, "--operator": operator } = args;
        const current_mode = GlideBrowser.state.mode;

        GlideBrowser._change_mode(mode, { operator });

        // TODO(glide): use command chaining to do this instead
        if (automove) {
          GlideBrowser.get_focused_actor().send_async_message("Glide::Move", { direction: automove });
        }

        if (current_mode === "normal" && mode === "normal") {
          console.log("sending blur");
          GlideBrowser.get_focused_actor().send_async_message("Glide::BlurActiveElement");
        }

        break;
      }

      case "caret_move": {
        const {
          args: { direction },
        } = this.#parse_command_args(command_meta, command);

        return GlideBrowser.get_focused_actor().send_async_message("Glide::Move", { direction });
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
        MozUtils.copy_to_clipboard(window, url);
        break;
      }

      case "set": {
        const {
          args: { name, value },
        } = this.#parse_command_args(command_meta, command);

        if (!GlideBrowser.is_option(name)) {
          throw new Error(`:set ${name} is not a valid option`);
        }

        const existing = GlideBrowser.api.o[name];
        const parsed = (() => {
          const type = typeof existing;
          switch (type) {
            case "string": {
              return value;
            }
            case "number": {
              const float = Number.parseFloat(value);
              if (Number.isNaN(float)) {
                throw new Error(`[:set ${name}] ${value} is not a valid number`);
              }
              return float;
            }

            case "bigint":
            case "boolean":
            case "symbol":
            case "undefined":
            case "object":
            case "function":
              throw new Error(`[:set ${name}] Cannot set options of type ${type} yet`);
            default:
              throw assert_never(type);
          }
        })();

        // @ts-ignore TS doesn't like that we're assigning dynamically
        //            and it doesn't understand the relationship even in
        //            the switch above... so I don't think there's a safe
        //            way to structure this
        GlideBrowser.api.o[name] = parsed;
        break;
      }

      case "profile_dir": {
        const id = "glide-profile-dir";
        const profile_dir = PathUtils.profileDir;

        GlideBrowser.add_notification(id, {
          label: `Profile directory: ${profile_dir}`,
          priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
          buttons: [
            {
              "l10n-id": "glide-notification-copy-to-clipboard-button",
              callback: () => {
                MozUtils.copy_to_clipboard(window, profile_dir);
                GlideBrowser.remove_notification(id);
              },
            },
          ],
        });

        console.log("profile dir", profile_dir);
        break;
      }

      case "config_path": {
        const id = "glide-config-path";
        const config_path = GlideBrowser.config_path;
        if (config_path) {
          GlideBrowser.add_notification(id, {
            label: `Config path: ${config_path}`,
            priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
            buttons: [
              {
                "l10n-id": "glide-notification-copy-to-clipboard-button",
                callback: () => {
                  MozUtils.copy_to_clipboard(window, config_path);
                  GlideBrowser.remove_notification(id);
                },
              },
            ],
          });

          console.log("config path: ", config_path);
          return;
        }

        const fragment = document!.createDocumentFragment();
        fragment.appendChild(
          DOM.create_element("div", { textContent: "No config file found. Create a glide.ts file at one of:" }),
        );

        const max_description_length = Math.max(
          ...GlideBrowser.config_dirs.map(({ description }) => description.length),
        );

        const list = DOM.create_element("ul", {
          style: { margin: "8px 0", paddingLeft: "20px" },
          children: GlideBrowser.config_dirs.map(({ path, description }) => {
            return DOM.create_element("li", {
              style: { display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" },
              children: [
                DOM.create_element("span", {
                  textContent: `[${description}]`,
                  style: { color: "#C0CAF5", fontSize: "0.85em", minWidth: `${max_description_length + 2}ch` },
                }),

                DOM.create_element("span", {
                  textContent: PathUtils.join(path, "glide.ts"),
                  style: { fontFamily: "monospace" },
                }),
              ],
            });
          }),
        });
        fragment.appendChild(list);

        GlideBrowser.add_notification(id, {
          label: fragment,
          priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
          buttons: GlideBrowser.config_dirs.map(({ path, description }) => ({
            label: `Copy ${description}`,
            callback: () => {
              MozUtils.copy_to_clipboard(window, PathUtils.join(path, "glide.ts"));
              GlideBrowser.remove_notification(id);
            },
          })),
        });
        break;
      }

      case "config_reload": {
        GlideBrowser.reload_config();
        break;
      }

      case "config_edit": {
        if (!GlideBrowser.config_path) {
          throw new Error("There is no config file defined yet");
        }

        const file = Cc["@mozilla.org/file/local;1"]!.createInstance(Ci.nsIFile);
        file.initWithPath(GlideBrowser.config_path);
        file.launch();
        break;
      }

      case "config_init": {
        if (GlideBrowser.config_path) {
          throw new Error(`A config file already exists at ${GlideBrowser.config_path}`);
        }

        const { args } = this.#parse_command_args(command_meta, command);

        const cfg = ChromeUtils.importESModule("chrome://glide/content/config-init.mjs", { global: "current" });
        await cfg.init(args);
        break;
      }

      case "css_edit": {
        const chrome_dir = PathUtils.join(PathUtils.profileDir, "chrome");
        await IOUtils.makeDirectory(chrome_dir, { ignoreExisting: true });

        const file = Cc["@mozilla.org/file/local;1"]!.createInstance(Ci.nsIFile);
        file.initWithPath(PathUtils.join(chrome_dir, "userChrome.css"));

        if (!(await IOUtils.exists(file.path))) {
          file.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
        }

        file.launch();
        break;
      }

      case "map": {
        // this will render the mappings through `src/glide/browser/actors/GlideDocsChild.sys.mts`
        gBrowser.addTrustedTab("resource://glide-docs/dynamic/mappings.html", {
          inBackground: false, // ensure active/selected
        });
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

      case "r": {
        const {
          args: { character },
        } = this.#parse_command_args(command_meta, command);

        if (character) {
          GlideBrowser.get_focused_actor().send_async_message("Glide::ReplaceChar", {
            character: character === "<CR>"
              ? "\n"
              : character === "<Tab>"
              ? "\t"
              : character,
          });
          if (GlideBrowser.state.mode !== "normal") {
            await GlideBrowser.api.excmds.execute("mode_change normal");
          }

          return;
        }

        await GlideExcmds.execute("mode_change op-pending --operator=r");

        const event = await GlideBrowser.api.keys.next();
        if (!Keys.is_printable(event.glide_key)) {
          return;
        }

        return await GlideExcmds.execute(
          `r ${
            event.glide_key === "<CR>" || event.glide_key === "<Tab>"
              ? event.glide_key
              // note: intentionally using `.key` here as we don't care about modifiers
              : event.key
          }`,
          { save_to_history: true },
        );
      }

      case "help": {
        gBrowser.addTrustedTab("resource://glide-docs/index.html#default-keymappings", {
          inBackground: false, // ensure active/selected
        });
        break;
      }

      case "tutor": {
        gBrowser.addTrustedTab("resource://glide-tutor/index.html", {
          inBackground: false, // ensure active/selected
        });
        break;
      }

      case "hints_remove": {
        GlideHints.remove_hints();
        break;
      }

      case "hint": {
        const { args } = this.#parse_command_args(command_meta, command);
        GlideBrowser.api.hints.show({
          editable: args["-e"] ?? undefined,
          selector: args["-s"] ?? undefined,
          action: args["--action"] ?? undefined,
          include: args["--include"] ?? undefined,
          location: args["--location"] ?? undefined,
          auto_activate: args["--auto"] ?? false,
        });
        break;
      }

      case "copy": {
        const selector = `[data-l10n-id="glide-notification-copy-to-clipboard-button"]`;
        const buttons = document!.querySelectorAll<HTMLElement>(selector);

        if (!buttons.length) {
          throw new Error("There are no active notifications to copy text from");
        }

        if (buttons.length === 1) {
          buttons[0]!.click();
          break;
        }

        GlideBrowser.api.hints.show({ selector, action: "click", location: "browser-ui" });
        break;
      }

      case "visual_selection_copy": {
        const actor = GlideBrowser.get_focused_actor();
        await actor.send_query("Glide::Query::CopySelection");

        GlideBrowser._change_mode("normal", { meta: { disable_auto_collapse: true } });

        const glide = GlideBrowser.api;
        const previous = glide.prefs.get("ui.highlight");

        glide.prefs.set("ui.highlight", GlideBrowser.api.options.get("yank_highlight"));

        setTimeout(() => {
          if (typeof previous === "undefined") {
            glide.prefs.clear("ui.highlight");
          } else {
            glide.prefs.set("ui.highlight", previous);
          }

          actor.send_async_message("Glide::SelectionCollapse");
        }, GlideBrowser.api.options.get("yank_highlight_time"));

        break;
      }

      case "undo": {
        docShell?.doCommand("cmd_undo");
        break;
      }

      case "redo": {
        docShell!.doCommand("cmd_redo");
        break;
      }

      default:
        throw assert_never(command_meta, `Unhandled excmd: \`${(command_meta as any).name}\``);
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
  command: string,
): Cmd["args_schema"] extends Record<string, any> ? Extract<ParseResult<Cmd["args_schema"]>, { valid: true }>
  : null
{
  if (!meta.args_schema) {
    return null as any;
  }

  const args = extract_command_args(command);
  const parse_result = Args.parse_command_args({ schema: meta.args_schema, args });
  if (!parse_result.valid) {
    // TODO(glide-notify)
    throw new Error(`Couldn't parse command arguments due to ${JSON.stringify(parse_result.errors)}`);
  }
  return parse_result as any;
}

export function get_command_info(
  name: string,
): GlideExcmdInfo<Record<string, ArgumentSchema>> | null {
  // @ts-ignore
  return GLIDE_EXCOMMANDS_MAP[name as GlideExcmdName] ?? null;
}

export const GlideExcmds = new GlideExcmdsClass();
