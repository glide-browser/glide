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

type ArgType<Arg extends ArgumentSchema> =
  Arg["type"] extends "string" ? string
  : Arg["type"] extends "integer" ? number
  : Arg["type"] extends "boolean" ? boolean
  : Arg["type"] extends { enum: ReadonlyArray<string> } ?
    Arg["type"]["enum"][number]
  : never;

export type ParsedArg<Arg extends ArgumentSchema> =
  Arg["required"] extends true ? ArgType<Arg> : ArgType<Arg> | null;

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
  enum: ["normal", "insert", "visual", "op-pending", "ignore", "hint"],
} as const satisfies ArgumentSchema["type"];

export const OPERATOR_SCHEMA_TYPE = {
  enum: ["d", "c", "r"],
} as const satisfies ArgumentSchema["type"];

export type GlideOperator = ParsedArg<{
  type: typeof OPERATOR_SCHEMA_TYPE;
  required: true;
}>;

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
    name: "r",
    description: "Replace the current character",
    content: false,
    repeatable: false,
    args_schema: {
      character: {
        type: "string",
        required: false,
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
  {
    name: "}",
    description: "Move to the start of the next paragraph",
    content: true,
    repeatable: false,
  },
  {
    name: "{",
    description: "Move to the start of the previous paragraph",
    content: true,
    repeatable: false,
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

export const GLIDE_EXCOMMANDS_MAP = GLIDE_EXCOMMANDS.reduce((acc, cmd) => {
  // @ts-expect-error TS doesn't narrow types correctly
  acc[cmd.name] = cmd;
  return acc;
}, {} as GlideExcmdsMap);

export type GlideExcmdName = (typeof GLIDE_EXCOMMANDS)[number]["name"];
export type GlideCommandString = GlideExcmdName | `${GlideExcmdName} ${string}`;
export type GlideCommandCallback = () => void;
export type GlideCommandValue = GlideCommandString | GlideCommandCallback;

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
