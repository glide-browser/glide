/**
 * Handles turning keyboard events into Vim-style notation, setting mappings,
 * matching mappings and normalizing mappings.
 *
 * Interesting test cases can be found in `glide/browser/base/content/test/utils/browser_keys.js`.
 *
 * Terminology:
 *
 *   key notation (a.k.a keyn)
 *     Notation for an individual key, optionally including modifiers.
 *     e.g. `a`, `<C-a>`, `<lt>`, `<D-lt>`, `<D-C-a>`
 *
 *   key sequence (a.k.a keyseq)
 *     A sequence of key notations.
 *     e.g. `ab`, `<C-a>b`, `x<lt>`, `<leader>sf`
 */

import type {
  GlideCommandCallback,
  GlideCommandString,
  GlideCommandValue,
} from "../browser-excmds-registry.mts";

const { lastx } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/arrays.mjs"
);
const { is_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

export class KeyMappingTrieNode {
  value: KeyMapping | null = null;

  children: Map<string, KeyMappingTrieNode> = new Map();

  find(sequence: [string, ...string[]]): KeyMappingTrieNode | null {
    const [key, ...rest] = sequence;
    const next = this.get(key);
    if (!next) {
      return null;
    }

    if (rest.length) {
      return next.find(rest as [string, ...string[]]);
    }

    return next;
  }

  get(key: string): KeyMappingTrieNode | null {
    let next = this.children.get(key);
    if (next) {
      return next;
    }

    // TODO(glide): consider normalizing `<leader>` to the key its set to
    if (key === GlideBrowser?.api?.g?.mapleader) {
      next = this.children.get("<leader>");
      if (next) {
        return next;
      }
    }

    return null;
  }

  /**
   * Remove a child mapping node.
   *
   * Returns `true` if a mapping was deleted.
   */
  delete(key: string): boolean {
    if (this.children.delete(key)) {
      return true;
    }

    // TODO(glide): consider normalizing `<leader>` to the key its set to
    if (key === GlideBrowser?.api?.g?.mapleader) {
      if (this.children.delete("<leader>")) {
        return true;
      }
    }

    return false;
  }

  get has_children(): boolean {
    return this.children.size > 0;
  }

  /**
   * Delete redundant nodes that don't correspond to a mapping directly
   * or don't have any child mappings.
   *
   * This is needed so that listing the nodes in the trie actually corresponds
   * to the mappings that are defined.
   *
   * This is intended for internal usage only and is called after `glide.keymaps.del()`
   *
   * @internal
   */
  $clean() {
    for (const [key, node] of this.children) {
      node.$clean();

      if (!node.value && !node.has_children) {
        this.children.delete(key);
      }
    }
  }
}

class KeyMappingTrie {
  root: KeyMappingTrieNode = new KeyMappingTrieNode();

  add(sequence: string[], value: KeyMapping) {
    let node = this.root;

    for (const key of sequence) {
      var sub = node.get(key);
      if (!sub) {
        sub = new KeyMappingTrieNode();
        node.children.set(key, sub);
      }
      node = sub;
    }

    node.value = value;
  }

  /**
   * Remove a mapping sequence from the trie.
   *
   * Throws an error if the sequence did not match any defined mapping.
   */
  delete(sequence: string[]) {
    const parents = sequence.slice(0, -1);
    const key = lastx(sequence);

    let i = 0;
    let node = this.root;
    for (const key of parents) {
      const sub = node.get(key);
      if (!sub) {
        throw new Error(
          `No mapping found for sequence \`${sequence
            .slice(0, i + 1)
            .join("")}\``
        );
      }
      node = sub;
      i++;
    }

    if (!node.delete(key)) {
      throw new Error(`No mapping found for sequence \`${sequence.join("")}\``);
    }
    this.root.$clean();
  }

  find(sequence: [string, ...string[]]): KeyMappingTrieNode | null {
    return this.root.find(sequence);
  }
}

export interface KeyMapping {
  sequence: string[];
  command: GlideCommandString | GlideCommandCallback;
  description?: string | undefined;
  retain_key_display?: boolean;
}

export class KeyManager {
  #mappings: Record<GlideMode, KeyMappingTrie> = {
    insert: new KeyMappingTrie(),
    normal: new KeyMappingTrie(),
    visual: new KeyMappingTrie(),
    ignore: new KeyMappingTrie(),
    hint: new KeyMappingTrie(),
    "op-pending": new KeyMappingTrie(),
  };
  #buf_mappings: Record<GlideMode, KeyMappingTrie> | null = null;

  #current_sequence: string[] = [];
  #log: ConsoleInstance =
    console.createInstance ?
      console.createInstance({
        prefix: "Glide[Keys]",
        maxLogLevelPref: "glide.logging.loglevel",
      })
      // createInstance isn't defined in tests
    : (console as any);

  set(
    modes: GlideMode | GlideMode[],
    lhs: string,
    rhs: GlideCommandValue,
    opts?: KeymapOpts | undefined
  ): void {
    const mapping: KeyMapping = {
      sequence: split(lhs).map(normalize),
      command: rhs,
      description: opts?.description,
      retain_key_display: opts?.retain_key_display,
    };

    if (typeof modes === "string") {
      const trie = this.#mapping(modes, opts?.buffer ?? false);
      trie.add(mapping.sequence, mapping as KeyMapping);
    } else {
      for (const mode of modes) {
        const trie = this.#mapping(mode, opts?.buffer ?? false);
        trie.add(mapping.sequence, mapping as KeyMapping);
      }
    }
  }

  del(modes: GlideMode | GlideMode[], lhs: string, opts?: KeymapDeleteOpts) {
    const sequence = split(lhs).map(normalize);
    for (const mode of typeof modes === "string" ? [modes] : modes) {
      const trie = this.#mapping(mode, opts?.buffer ?? false);
      trie.delete(sequence);
    }
  }

  clear_buffer() {
    this.#buf_mappings = null;
  }

  #mapping(mode: GlideMode, buffer: boolean): KeyMappingTrie {
    if (buffer) {
      if (!this.#buf_mappings) {
        this.#buf_mappings = {
          insert: new KeyMappingTrie(),
          normal: new KeyMappingTrie(),
          visual: new KeyMappingTrie(),
          ignore: new KeyMappingTrie(),
          hint: new KeyMappingTrie(),
          "op-pending": new KeyMappingTrie(),
        };
      }

      return this.#buf_mappings[mode];
    }

    return this.#mappings[mode];
  }

  reset_sequence() {
    this.#current_sequence = [];
  }

  get current_sequence() {
    return this.#current_sequence;
  }

  get has_partial_mapping(): boolean {
    return this.#current_sequence.length !== 0;
  }

  handle_key_event(
    event: KeyboardEvent,
    current_mode: GlideMode
  ): KeyMappingTrieNode | undefined {
    const keyn = event_to_key_notation(event);
    this.#current_sequence.push(keyn);

    const sequence = this.#current_sequence as [string, ...string[]];

    // TODO(glide): this breaks for cases where a buffer mapping shadows a longer global mapping
    //              e.g. buffer: `<leader>a`, global: `<leader>ab`.
    const node =
      this.#buf_mappings?.[current_mode].find(sequence) ??
      this.#mappings[current_mode].find(sequence);
    if (!node) {
      this.#log.debug(`${event.key} -> ${keyn} did not match`);
      return;
    }

    this.#log.debug(`${event.key} -> ${keyn} did match`);
    return node;
  }
}

// TODO(glide): make sure this is exhaustive
/**
 * Mapping of key codes from `KeyEvent` to vim notation identifiers.
 *
 * https://github.com/neovim/neovim/blob/3a25995f304039517b99b8c7d79654adf65c7562/src/nvim/keycodes.c#L145
 */
const SPECIAL_KEY_MAP: Record<string, string> = {
  BS: "BS",
  Backspace: "BS",
  CR: "CR",
  Enter: "CR",
  Esc: "Esc",
  Escape: "Esc",
  " ": "Space",
  Space: "Space",
  Up: "Up",
  ArrowUp: "Up",
  Down: "Down",
  ArrowDown: "Down",
  Left: "Left",
  ArrowLeft: "Left",
  Right: "Right",
  ArrowRight: "Right",
  Tab: "Tab",
  Del: "Del",
  Delete: "Del",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  leader: "leader",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",

  // Note: see below `DOWNCAST_SPECIAL_KEY_MAP`, these characters are treated differently
  // from the rest of the ones defined above.
  "<": "lt",
  "|": "Bar",
  "\\": "Bslash",
};

/**
 * A mapping of special keys that should be downcast to non-special keys in certain scenarios.
 *
 * For example, if just `|` is pressed with *no modifiers*, then we need to keep it as `|` but if there
 * are modifiers then we need to keep it as a special char, e.g. `<D-Bar>`
 */
const DOWNCAST_SPECIAL_KEY_MAP: Record<string, string> = {
  lt: "<",
  Bar: "|",
  Bslash: "\\",
};

/**
 * A minimla version of `KeyboardEvent` that only defines the properties we rely on.
 */
export type GlideMappingEvent = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
>;

/**
 * Given a keyboard event, returns the corresponding Vim-notation for it.
 *
 * e.g.
 * ```ts
 * event_to_key_notation({ key: 'h' }) -> 'h'
 * event_to_key_notation({ metaKey: true, key: 'b' }) -> '<D-b>'
 * event_to_key_notation({ ctrlKey: true, key: '<' }) -> '<C-lt>'
 * ```
 */
export function event_to_key_notation(event: GlideMappingEvent): string {
  const modifiers: string[] = [];

  if (event.ctrlKey) {
    modifiers.push("C");
  }

  if (event.altKey) {
    modifiers.push("A");
  }

  if (event.metaKey) {
    modifiers.push("D");
  }

  const special_key = SPECIAL_KEY_MAP[event.key] ?? null;
  const key = special_key ?? event.key;

  // We assume that, if we are given a key with a single character length then it must have
  // already been shift-ed. e.g. `{ key: 'A', shiftKey: true }`
  //
  // TODO(glide): investigate key shifting logic more
  const is_single_char = key.length === 1;
  if (event.shiftKey && (!is_single_char || modifiers.length)) {
    // Note: I'm not confident in this logic, it *looks* like nvim only does this for ascii alphanumeric
    modifiers.push("S");
  }

  // To match vim behaviour, we need to map certain would-be-special-keys into
  // their non-special form, e.g. `<`, `|`, `\\`, but only if there are *no* modifiers
  // present. If there are modifiers then these must be kept as special chars, e.g. `<D-lt>`
  const downcast_key = DOWNCAST_SPECIAL_KEY_MAP[key];
  if (downcast_key && !modifiers.length) {
    return downcast_key;
  }

  if (modifiers.length) {
    // e.g. `<C-f>`, `<C-D-l>`
    return `<${modifiers.join("-")}-${key}>`;
  }

  if (is_present(special_key)) {
    // e.g. `<Space>`, `<CR>`
    return `<${key}>`;
  }

  return key;
}

/**
 * Given a key notation, normalise it including:
 * - transforming char aliases `<lt>` -> `<`
 * - wrap special keys with `<>`, e.g. `Space` -> `<Space>`
 * - transform shifted characters `<S-h>` -> `H`
 * - consistent ordering of modifiers `<D-C-A-h>` -> `<C-A-D-h>`
 *
 * Note: this function expects a single key notation, *not* a key sequence.
 */
export function normalize(keyn: string): string {
  const parsed = parse_modifiers(keyn);

  // case-insensitive normalizing of special keys, e.g.
  // `<space>` -> `<Space>`
  const lower_key = parsed.key.toLowerCase();
  for (const special_key of Object.values(SPECIAL_KEY_MAP)) {
    if (lower_key === special_key.toLowerCase()) {
      parsed.key = special_key;
      break;
    }
  }

  // simulates the event that Firefox will send, as shifted key events are received
  // with `{ shiftKey: true, key: 'UPPER_CHAR'}`
  if (parsed.shiftKey && parsed.key.length === 1) {
    parsed.key = parsed.key.toLocaleUpperCase();
  }

  return event_to_key_notation(parsed);
}

type GlideParsedMapping = Mutable<GlideMappingEvent>;

/**
 * Returns exactly the modifiers and the key string that were present in the
 * given notation.
 *
 * ```ts
 * `parse_modifiers('H') -> {shiftKey: false, key: 'H'}`
 * `parse_modifiers('<S-H>') -> {shiftKey: true, key: 'H'}`
 * ```
 */
export function parse_modifiers(keyn: string): GlideParsedMapping {
  const parsed: GlideParsedMapping = {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    key: keyn,
  };

  if (!keyn.startsWith("<") || !keyn.endsWith(">")) {
    // no modifiers, or not valid notation
    return parsed;
  }

  // <C-S-h> -> C-S-h
  const stripped = keyn.slice(1, -1);
  // C-S-h -> [C,S,h]
  const parts = stripped.split("-");
  // [C,S,h] -> [C,S]
  const modifier_parts = parts.slice(0, -1);
  parsed.key = parts.at(-1)!;

  for (const part of modifier_parts) {
    switch (part) {
      case "C": {
        parsed.ctrlKey = true;
        break;
      }
      case "A": {
        parsed.altKey = true;
        break;
      }
      case "D": {
        parsed.metaKey = true;
        break;
      }
      case "S": {
        parsed.shiftKey = true;
        break;
      }
      default: {
        // TODO(glide): more graceful error handling
        throw new Error(
          `Unexpected modifier character ${part}, expected one of C, A, D, or S`
        );
      }
    }
  }

  return parsed;
}

/**
 * Split a string key sequence into an array of individual key notation entries.
 *
 * ```ts
 * split('abc') === ['a', 'b', 'c'];
 * split('<D-a>bc') === ['<D-a>', 'b', 'c'];
 * split('<D-lt>bc') === ['<D-lt>', 'b', 'c'];
 * ```
 */
export function split(seq: string): string[] {
  if (!seq.length) {
    return [];
  }

  const parts = [];

  let i = 0;

  while (true) {
    const char = seq[i];
    if (char == undefined) {
      break;
    }

    if (char !== "<") {
      // not a special char / doesn't use any modifiers, we don't need to do anything special
      parts.push(char);
      i++;
      continue;
    }

    const right_angle_bracket_index = seq.indexOf(">", i);
    if (
      right_angle_bracket_index === -1 ||
      right_angle_bracket_index === i + 1
    ) {
      // if there is no corresponding `>` **or** if the very next char is a `>`, e.g. `<>`
      // then we need to treat the `<` as an `<lt>` directly, instead of as part of the syntax
      // for special characters / modifiers
      parts.push(char);
      i++;
      continue;
    }

    var next_index = right_angle_bracket_index + 1;
    parts.push(seq.slice(i, next_index));
    i = next_index;
  }

  return parts;
}

/**
 * Returns whether or not a given key notation should
 * be "printable", i.e. whether or not it should be inserted
 * into text when editing.
 *
 * All non-special keys are printable and certain special keys
 * are printable, e.g. `<Enter>`, `<Tab>`
 */
export function is_printable(keyn: string): boolean {
  if (!keyn.startsWith("<")) {
    // all non-special keys are treated as printable
    return true;
  }

  return !(
    keyn === "<Esc>" ||
    keyn === "<BS>" ||
    keyn === "<Up>" ||
    keyn === "<Down>" ||
    keyn === "<Left>" ||
    keyn === "<Right>" ||
    keyn === "<Del>" ||
    keyn === "<Home>" ||
    keyn === "<End>" ||
    keyn.startsWith("<F") // fn keys
  );
}
