// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * Defines all builtin excmd input shapes.
 *
 * This is a standalone file so that it can be easily referenced in our
 * API types.
 *
 * **warning**: do not attempt to add an import to this file that isnt also just
 *              types.
 */

export interface ArgumentSchema {
  type: "integer" | "string" | "boolean" | { enum: ReadonlyArray<string> };
  required: boolean;
  position?: number;
  description?: string;
}

export type ArgumentsSchema = Record<string, ArgumentSchema>;

type ArgType<Arg extends ArgumentSchema> = Arg["type"] extends "string" ? string
  : Arg["type"] extends "integer" ? number
  : Arg["type"] extends "boolean" ? boolean
  : Arg["type"] extends { enum: ReadonlyArray<string> } ? Arg["type"]["enum"][number]
  : never;

export type ParsedArg<Arg extends ArgumentSchema> = Arg["required"] extends true ? ArgType<Arg> : ArgType<Arg> | null;

export type ParsedArgs<Schema extends ArgumentsSchema> = {
  [K in keyof Schema]: ParsedArg<Schema[K]>;
};

// --------

export interface GlideExcmdInfo<Args extends ArgumentsSchema = {}> {
  description: string;
  content: boolean;
  /** Whether or not this command can be `repeat`ed, e.g. with `.` */
  repeatable: boolean;
  name: string;
  args_schema?: Args;
}

export const MODE_SCHEMA_TYPE = {
  enum: [
    "normal",
    "insert",
    "visual",
    "op-pending",
    "ignore",
    "command",
    "hint",
  ] as GlideMode[],
} as const satisfies ArgumentSchema["type"];

export const OPERATOR_SCHEMA_TYPE = { enum: ["d", "c", "r"] } as const satisfies ArgumentSchema["type"];

export type GlideOperator = ParsedArg<{
  type: typeof OPERATOR_SCHEMA_TYPE;
  required: true;
}>;

export const GLIDE_EXCOMMANDS = [
  { name: "back", description: "Go back one page in history", content: false, repeatable: true },
  { name: "forward", description: "Go forward one page in history", content: false, repeatable: true },
  { name: "reload", description: "Reload the current page", content: false, repeatable: true },
  {
    name: "reload_hard",
    description: "Reload the current page, bypassing the cache",
    content: false,
    repeatable: true,
  },

  { name: "quit", description: "Close all windows", content: false, repeatable: false },

  {
    name: "set",
    description: "Set an option",
    args_schema: {
      name: { type: "string", position: 0, required: true },
      value: {
        // note: this just means we allow anything and don't try to parse it
        type: "string",
        position: 1,
        required: true,
      },
    },
    content: false,
    repeatable: false,
  },

  { name: "profile_dir", description: "Show the current profile directory", content: false, repeatable: false },

  { name: "config_edit", description: "Open the config file in the default editor", content: false, repeatable: false },
  { name: "config_path", description: "Show the config file path", content: false, repeatable: false },
  { name: "config_reload", description: "Reload the config file", content: false, repeatable: false },
  {
    name: "config_init",
    description: "Initialise a config dir with all the necessary setup",
    args_schema: {
      location: {
        type: { enum: ["home", "xdg", "profile", "cwd"] },
        required: false,
        position: 0,
      },
    },
    content: false,
    repeatable: false,
  },

  {
    name: "repeat",
    description: "Repeat the last invoked command. In general only applies to \"mutative\" commands",
    content: false,
    repeatable: false,
  },

  { name: "map", description: "Show all mappings", content: false, repeatable: false },

  {
    // TODO(glide): this should also remove from `visual` and `operator-pending` modes when we have them
    name: "unmap",
    description: "Remove a mapping from normal mode",
    args_schema: { lhs: { type: "string", required: true, position: 0 } } as const satisfies ArgumentsSchema,
    content: false,
    repeatable: false,
  },
  {
    name: "nunmap",
    description: "Remove a mapping from normal mode",
    args_schema: { lhs: { type: "string", required: true, position: 0 } } as const satisfies ArgumentsSchema,
    content: false,
    repeatable: false,
  },
  {
    name: "iunmap",
    description: "Remove a mapping from insert mode",
    args_schema: { lhs: { type: "string", required: true, position: 0 } } as const satisfies ArgumentsSchema,
    content: false,
    repeatable: false,
  },

  {
    name: "tab",
    description: "Switch to the given tab index",
    args_schema: { tab_index: { type: "integer", required: true, position: 0 } } as const satisfies ArgumentsSchema,
    content: false,
    repeatable: false,
  },
  {
    name: "tab_new",
    description: "Create a new tab with the given URL or the default new tab page if not provided",
    args_schema: { url: { type: "string", required: false, position: 0 } } as const satisfies ArgumentsSchema,
    content: false,
    repeatable: false,
  },

  { name: "tab_close", description: "Close the current tab", content: false, repeatable: true },
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
    name: "commandline_focus_next",
    description: "Focus the next completion in the commandline",
    content: false,
    args_schema: {},
    repeatable: false,
  },
  {
    name: "commandline_focus_back",
    description: "Focus the previous completion in the commandline",
    content: false,
    args_schema: {},
    repeatable: false,
  },
  {
    name: "commandline_delete",
    description: "Delete the focused commandline completion",
    content: false,
    args_schema: {},
    repeatable: false,
  },
  {
    name: "commandline_accept",
    description: "Accept the focused commandline completion",
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
      mode: { type: MODE_SCHEMA_TYPE, required: true, position: 0 },
      "--automove": { type: { enum: ["left", "endline"] }, required: false },
      "--operator": {
        type: OPERATOR_SCHEMA_TYPE,
        required: false,
        description: "Only applicable for operator-pending mode",
      },
    } as const satisfies ArgumentsSchema,
  },

  {
    name: "caret_move",
    description: "Move the text caret",
    content: false,
    repeatable: false,
    args_schema: {
      direction: { type: { enum: ["left", "right", "up", "down"] }, required: true, position: 0 },
    } as const satisfies ArgumentsSchema,
  },

  {
    name: "r",
    description: "Replace the current character",
    content: false,
    repeatable: false,
    args_schema: { character: { type: "string", required: false, position: 0 } } as const satisfies ArgumentsSchema,
  },

  {
    name: "visual_selection_copy",
    description: "Copy the currently selected text to the clipboard & change to normal mode",
    content: false,
    repeatable: false,
  },

  { name: "help", description: "Open the docs", content: false, repeatable: false },

  { name: "tutor", description: "Open the Glide tutorial", content: false, repeatable: false },

  { name: "repl", description: "Start the config REPL", content: false, repeatable: false },

  {
    name: "keys",
    description: "Synthesize the given key sequence as if they were actually pressed",
    args_schema: {
      keyseq: { type: "string", required: true, position: 0 },
    },
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
  { name: "scroll_top", description: "Scroll to the top of the window", content: true, repeatable: false },
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
  { name: "scroll_bottom", description: "Scroll to the bottom of the window", content: true, repeatable: false },
  { name: "blur", description: "Blur the active element", content: true, repeatable: false },

  {
    name: "focusinput",
    description: "Focus an input element based on the given filter",
    content: true,
    repeatable: false,
    args_schema: {
      filter: { type: { enum: ["last"] }, required: true, position: 0 },
    } as const satisfies ArgumentsSchema,
  },

  {
    name: "hint",
    description: "Show hint labels for jumping to clickable elements",
    content: false,
    repeatable: false,
    args_schema: {
      "-s": {
        type: "string",
        required: false,
        description: "*Only* show hints for all elements matching this CSS selector",
      },
      "--include": {
        type: "string",
        required: false,
        description: "*Also* show hints for all elements matching this CSS selector",
      },
      "-e": { type: "boolean", required: false, description: "*Only* show hints for all elements that are editable" },
      "--auto": {
        type: "boolean",
        required: false,
        description: "If only one hint is generated, automatically activate it.",
      },
      "--action": { type: { enum: ["click", "newtab-click"] }, required: false },
      "--location": { type: { enum: ["content", "browser-ui"] }, required: false },
    } as const satisfies ArgumentsSchema,
  },
  { name: "hints_remove", description: "Remove all hint labels and exit hint mode", content: false, repeatable: false },

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
    name: "motion",
    description: "Execute a given motion (internal)",
    content: true,
    // repeatable is determined in `#motion_is_repeatable` in `GlideHandlerChild.sys.mts`
    repeatable: false,
    args_schema: {
      keyseq: {
        type: {
          enum: [
            "w",
            "W",
            "e",
            "b",
            "B",
            "0",
            "$",
            "{",
            "}",
            "s",
            "v",
            "vh",
            "vl",
            "vd",
            "x",
            "X",
            "o",
          ],
        },
        required: true,
        position: 0,
      },
    } as const satisfies ArgumentsSchema,
  },

  { name: "undo", description: "Undo the most recent edit", content: false, repeatable: false },
  { name: "redo", description: "Redo the most recent undo", content: false, repeatable: false },
] as const satisfies GlideExcmdInfo[];

export type GlideExcmdsMap = {
  [K in (typeof GLIDE_EXCOMMANDS)[number]["name"]]: Extract<
    (typeof GLIDE_EXCOMMANDS)[number],
    { name: K }
  >;
};

export type ExcmdArgs<Name extends keyof GlideExcmdsMap> = GlideExcmdsMap[Name] extends { args_schema: any }
  ? ParsedArgs<GlideExcmdsMap[Name]["args_schema"]>
  : never;

export const GLIDE_EXCOMMANDS_MAP = GLIDE_EXCOMMANDS.reduce((acc, cmd) => {
  // @ts-expect-error TS doesn't narrow types correctly
  acc[cmd.name] = cmd;
  return acc;
}, {} as GlideExcmdsMap);

export type GlideExcmdName = (typeof GLIDE_EXCOMMANDS)[number]["name"];
export type GlideCommandString = GlideExcmdName | `${GlideExcmdName} ${string}`;

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
