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

import type { SetNonNullable } from "type-fest";

const { lastx } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/arrays.mjs"
);
const { is_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { redefine_getter } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/objects.mjs"
);

type KeyMappingTrieNodeWithValue = SetNonNullable<KeyMappingTrieNode, "value">;

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

  *recurse(): IterableIterator<KeyMappingTrieNodeWithValue> {
    for (const child of this.children.values()) {
      if (child.value) {
        yield child as KeyMappingTrieNodeWithValue;
      }
      yield* child.recurse();
    }
  }

  /**
   * Returns true if this node and all its descendants only contain soft deleted mappings.
   */
  has_only_deleted_mappings(): boolean {
    if (this.value && !this.value.deleted) {
      return false;
    }

    for (const child of this.children.values()) {
      if (!child.has_only_deleted_mappings()) {
        return false;
      }
    }

    return true;
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

  /**
   * Soft-delete a mapping sequence by marking it as deleted rather than removing it.
   */
  soft_delete(sequence: string[]) {
    let node = this.root;

    for (const key of sequence) {
      var sub = node.get(key);
      if (!sub) {
        sub = new KeyMappingTrieNode();
        node.children.set(key, sub);
      }
      node = sub;
    }

    node.value ??= {
      sequence,
      command: () => {
        throw new Error("attempted to execute a deleted mapping");
      },
    };
    node.value.deleted = true;
  }

  find(sequence: [string, ...string[]]): KeyMappingTrieNode | null {
    return this.root.find(sequence);
  }

  *recurse(): IterableIterator<KeyMappingTrieNodeWithValue> {
    yield* this.root.recurse();
  }
}

export interface KeyMapping {
  sequence: string[];
  command: glide.ExcmdValue;
  description?: string | undefined;
  retain_key_display?: boolean;

  /**
   * Indicates if the mapping has been soft-deleted, used for buffer-local
   * mappings to override global mappings.
   */
  deleted?: boolean;
}

export class KeyManager {
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

  register_mode(mode: GlideMode): void {
    if (!this._mappings[mode]) {
      this._mappings[mode] = new KeyMappingTrie();
    }

    if (this.#buf_mappings && !this.#buf_mappings[mode]) {
      this.#buf_mappings[mode] = new KeyMappingTrie();
    }
  }

  get _mappings(): Record<GlideMode, KeyMappingTrie> {
    return redefine_getter(this, "_mappings", this.#make_modes_tries());
  }

  get global_mappings(): Readonly<Record<GlideMode, KeyMappingTrie>> {
    return this._mappings;
  }

  set(
    modes: GlideMode | GlideMode[],
    lhs: string,
    rhs: glide.ExcmdValue,
    opts?: glide.KeymapOpts | undefined
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

  del(
    modes: GlideMode | GlideMode[],
    lhs: string,
    opts?: glide.KeymapDeleteOpts
  ) {
    const sequence = split(lhs).map(normalize);
    const is_buffer = opts?.buffer ?? false;

    for (const mode of typeof modes === "string" ? [modes] : modes) {
      const trie = this.#mapping(mode, is_buffer);

      if (is_buffer) {
        // for buffer-local mappings we need to register the deletion in some way
        // so that it overrides the global mappings, so create a "soft deleted" entry
        // instead of actually deleting.
        trie.soft_delete(sequence);
      } else {
        trie.delete(sequence);
      }
    }
  }

  list(modes?: GlideMode | GlideMode[]) {
    const output: Array<glide.Keymap> = [];

    for (const [mode, trie] of Object.entries(this._mappings)) {
      if (typeof modes === "string" && mode !== modes) {
        continue;
      }

      if (Array.isArray(modes) && !modes.includes(mode)) {
        continue;
      }

      for (const node of trie.recurse()) {
        output.push({
          sequence: node.value.sequence,
          lhs: node.value.sequence.join(""),
          description: node.value.description,
          rhs: node.value.command,
          mode: mode as GlideMode,
        });
      }
    }

    return output;
  }

  clear_buffer() {
    this.#buf_mappings = null;
  }

  #mapping(mode: GlideMode, buffer: boolean): KeyMappingTrie {
    if (buffer) {
      if (!this.#buf_mappings) {
        this.#buf_mappings = this.#make_modes_tries();
      }

      return this.#buf_mappings[mode];
    }

    return this._mappings[mode];
  }

  #make_modes_tries(): Record<GlideMode, KeyMappingTrie> {
    return Object.fromEntries(
      GlideBrowser.mode_names.map(mode => [mode, new KeyMappingTrie()])
    ) as Record<GlideMode, KeyMappingTrie>;
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
      this._mappings[current_mode].find(sequence);
    if (!node) {
      this.#log.debug(`${event.key} -> ${keyn} did not match`);
      return;
    }

    // we shouldn't return deleted mappings
    if (node.value?.deleted) {
      this.#log.debug(`${event.key} -> ${keyn} matched a deleted mapping`);
      return;
    }
    if (node.has_only_deleted_mappings()) {
      this.#log.debug(
        `All continuations from ${this.#current_sequence.join("")} are deleted, skipping`
      );
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
const SPECIAL_KEY_MAP = new Map(Object.entries({
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
}));
const REVERSE_SPECIAL_KEY_MAP = new Map(
  Array.from(SPECIAL_KEY_MAP.entries()).map(([k, v]) => [v, k])
);

/**
 * A mapping of special keys that should be downcast to non-special keys in certain scenarios.
 *
 * For example, if just `|` is pressed with *no modifiers*, then we need to keep it as `|` but if there
 * are modifiers then we need to keep it as a special char, e.g. `<D-Bar>`
 */
const DOWNCAST_SPECIAL_KEY_MAP = new Map(Object.entries({
  lt: "<",
  Bar: "|",
  Bslash: "\\",
}));

/**
 * Characters that are inherently "shifted" on a US keyboard and should not
 * include the S modifier when they appear in key combinations as they
 * inherintly require the shift key to type.
 */
// prettier-ignore
const SHIFTED_CHARACTERS = new Set([
  "!", "@", "#", "$", "%", "^", "&", "*", "(", ")",
  "_", "+", "{", "}", "|", ":", '"', "<", ">", "?", "~"
]);

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

  const special_key = SPECIAL_KEY_MAP.get(event.key) ?? null;
  const key = special_key ?? event.key;

  // We assume that, if we are given a key with a single character length then it must have
  // already been shift-ed. e.g. `{ key: 'A', shiftKey: true }`
  //
  // For inherently shifted characters (like +, !, @, etc.), we don't add the S modifier
  // because the character itself already represents the shifted state
  const is_single_char = key.length === 1;
  const is_shifted_char = SHIFTED_CHARACTERS.has(event.key);
  if (
    event.shiftKey &&
    (!is_single_char || modifiers.length) &&
    !is_shifted_char
  ) {
    modifiers.push("S");
  }

  // To match vim behaviour, we need to map certain would-be-special-keys into
  // their non-special form, e.g. `<`, `|`, `\\`, but only if there are *no* modifiers
  // present. If there are modifiers then these must be kept as special chars, e.g. `<D-lt>`
  const downcast_key = DOWNCAST_SPECIAL_KEY_MAP.get(key);
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
  for (const special_key of SPECIAL_KEY_MAP.values()) {
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

  // For shifted characters, remove the S modifier if present so that we always normalise to
  // the same key notation, no matter if you provide `<C-S-+>` or `<C-+>`.
  if (
    parsed.shiftKey &&
    SHIFTED_CHARACTERS.has(REVERSE_SPECIAL_KEY_MAP.get(parsed.key) || parsed.key)
  ) {
    parsed.shiftKey = false;
  }

  return event_to_key_notation(parsed);
}

/**
 * Take a single key, without modifiers or <>, and return the string identifier
 * that Firefox would send if the given key had been physically pressed.
 *
 * @example "Space" -> " "
 */
function keyn_to_event_repr(key: string): string {
  switch (key) {
    case "Space":
      return " ";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case "BS":
      return "Backspace";
    case "CR":
      return "Enter";
    case "Del":
      return "Delete";
    default:
      return key;
  }
}

type GlideParsedMapping = Mutable<GlideMappingEvent>;

/**
 * Returns exactly the modifiers and the key string that were present in the
 * given notation.
 *
 * ```ts
 * `parse_modifiers('H') -> {shiftKey: false, key: 'H'}`
 * `parse_modifiers('<S-H>') -> {shiftKey: true, key: 'H'}`
 * `parse_modifiers('<Space>') -> {key: ' '}`
 * ```
 */
export function parse_modifiers(
  keyn: string,
  { use_event_repr = true }: { use_event_repr?: boolean } = {}
): GlideParsedMapping {
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

  const raw_key = parts.at(-1)!;
  if (!raw_key) {
    throw new Error(`Invalid key string: ${keyn}`);
  }
  if (use_event_repr) {
    parsed.key = keyn_to_event_repr(raw_key);
  } else {
    parsed.key = to_special_key(raw_key) ?? raw_key;
  }

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
 * Given a string like `space` or `<sPace>`, returns the special key normalized version,
 * `<Space>`.
 */
function to_special_key(key: string): string | null {
  if (key.startsWith("<") && key.endsWith(">")) {
    key = key.slice(1, -1);
  }

  const lower_key = key.toLowerCase();
  for (const special_key of SPECIAL_KEY_MAP.values()) {
    if (lower_key === special_key.toLowerCase()) {
      return "<" + special_key + ">";
    }
  }

  return null;
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
