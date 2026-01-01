// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * Like `string.indexOf()` but works backwards from the end of the string.
 */
export function reverse_indexof(
  str: string,
  char: string,
  start: number = str.length - 1,
) {
  for (let i = start; i > 0; i--) {
    if (str[i] === char) {
      return i;
    }
  }

  return -1;
}

interface Candidate {
  code: string;
  branch: string; // the initial character that identifies the branch
  cost: number;
}

/**
 * Generates n prefix‑free codes from the given alphabet while balancing expansion across branches.
 * Each letter may have a cost (default 1) so that lower‑cost letters are preferred.
 *
 * The algorithm works by maintaining a candidate pool per initial character (“branch”):
 *   1. Start with each branch’s one‑letter code.
 *   2. While the total candidate count is less than n, loop through each branch (in the order
 *      of the alphabet) and expand the branch’s best candidate (i.e. remove its shortest/cheapest candidate
 *      and add all its children by appending each alphabet character).
 *   3. Finally, merge all candidates, sort them (by total cost, then length, then lexicographically),
 *      and return the first n codes.
 *
 * @param alphabet Array of characters.
 * @param n Number of codes to generate.
 * @param costMap Optional mapping from character to its cost.
 * @returns An array of n prefix‑free codes.
 */
export function generate_prefix_free_codes(
  alphabet: string[],
  n: number,
  costMap?: { [char: string]: number },
): string[] {
  // TODO(glide): review this implementation
  if (n <= 0) return [];

  // Returns the cost for a given character (default is 1)
  const char_cost = (ch: string): number => costMap && costMap[ch] !== undefined ? costMap[ch] : 1;

  // Initialize a candidate pool for each branch (each letter)
  const pools: { [branch: string]: Candidate[] } = {};
  for (const ch of alphabet) {
    pools[ch] = [{ code: ch, branch: ch, cost: char_cost(ch) }];
  }

  // Helper: get total number of candidates across all branches
  const total_candidates = (): number => {
    let total = 0;
    for (const ch of alphabet) {
      total += pools[ch]!.length;
    }
    return total;
  };

  // While the total number of candidates is less than n, expand one candidate from each branch in turn.
  while (total_candidates() < n) {
    // Loop over branches in the order given by the alphabet.
    for (const branch of alphabet) {
      if (total_candidates() >= n) break;
      // If there is at least one candidate in this branch, expand the best one.
      if (pools[branch]!.length > 0) {
        // Sort this branch's candidates: first by length (ascending), then cost, then lexicographically.
        pools[branch]!.sort((a, b) => {
          if (a.code.length !== b.code.length) {
            return a.code.length - b.code.length;
          }
          if (a.cost !== b.cost) return a.cost - b.cost;
          return a.code.localeCompare(b.code);
        });
        // Remove the best candidate from the branch.
        const cand = pools[branch]!.shift()!;
        // Expand it: append each letter from the alphabet.
        for (const ch of alphabet) {
          const newCode = cand.code + ch;
          const newCost = cand.cost + char_cost(ch);
          pools[branch]!.push({ code: newCode, branch, cost: newCost });
        }
      }
    }
  }

  // Merge candidates from all branches.
  let all_candidates: Candidate[] = [];
  for (const ch of alphabet) {
    all_candidates = all_candidates.concat(pools[ch]!);
  }

  // Sort all candidates by total cost (ascending), then by length, then lexicographically.
  all_candidates.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (a.code.length !== b.code.length) return a.code.length - b.code.length;
    return a.code.localeCompare(b.code);
  });

  // Return the first n codes.
  return all_candidates.slice(0, n).map(c => c.code);
}

export function Words(strings: (string | undefined)[]): string {
  return strings.filter(Boolean).join(" ");
}

export function replace_surrounding(
  str: string,
  char: string,
  replacement: string,
): string {
  let start_index = 0;
  let end_index = str.length;

  while (start_index < str.length && str[start_index] === char) {
    start_index++;
  }

  while (end_index > start_index && str[end_index - 1] === char) {
    end_index--;
  }

  return (
    replacement.repeat(start_index)
    + str.slice(start_index, end_index)
    + replacement.repeat(str.length - end_index)
  );
}

export type Bytes = string | ArrayBuffer | Uint8Array | null | undefined;

/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
export class LineDecoder {
  // prettier-ignore
  static NEWLINE_CHARS = new Set(["\n", "\r"]);
  static NEWLINE_REGEXP = /\r\n|[\n\r]/g;

  #buffer: Uint8Array;
  #carriageReturnIndex: number | null;

  constructor() {
    this.#buffer = new Uint8Array();
    this.#carriageReturnIndex = null;
  }

  decode(chunk: Bytes): string[] {
    if (chunk == null) {
      return [];
    }

    const binaryChunk = chunk instanceof ArrayBuffer
      ? new Uint8Array(chunk)
      : typeof chunk === "string"
      ? encode_utf8(chunk)
      : chunk;

    this.#buffer = concat_bytes([this.#buffer, binaryChunk]);

    const lines: string[] = [];
    let patternIndex;
    while ((patternIndex = find_newline_index(this.#buffer, this.#carriageReturnIndex)) != null) {
      if (patternIndex.carriage && this.#carriageReturnIndex == null) {
        // skip until we either get a corresponding `\n`, a new `\r` or nothing
        this.#carriageReturnIndex = patternIndex.index;
        continue;
      }

      // we got double \r or \rtext\n
      if (
        this.#carriageReturnIndex != null
        && (patternIndex.index !== this.#carriageReturnIndex + 1 || patternIndex.carriage)
      ) {
        lines.push(decode_utf8(this.#buffer.subarray(0, this.#carriageReturnIndex - 1)));
        this.#buffer = this.#buffer.subarray(this.#carriageReturnIndex);
        this.#carriageReturnIndex = null;
        continue;
      }

      const endIndex = this.#carriageReturnIndex !== null ? patternIndex.preceding - 1 : patternIndex.preceding;

      const line = decode_utf8(this.#buffer.subarray(0, endIndex));
      lines.push(line);

      this.#buffer = this.#buffer.subarray(patternIndex.index);
      this.#carriageReturnIndex = null;
    }

    return lines;
  }

  flush(): string[] {
    if (!this.#buffer.length) {
      return [];
    }
    return this.decode("\n");
  }
}

/**
 * This function searches the buffer for the end patterns, (\r or \n)
 * and returns an object with the index preceding the matched newline and the
 * index after the newline char. `null` is returned if no new line is found.
 *
 * ```ts
 * findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
 * ```
 */
function find_newline_index(
  buffer: Uint8Array,
  startIndex: number | null,
): { preceding: number; index: number; carriage: boolean } | null {
  const newline = 0x0a; // \n
  const carriage = 0x0d; // \r

  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }

    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }

  return null;
}

export function concat_bytes(buffers: Uint8Array[]): Uint8Array {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }

  return output;
}

let encode_utf8_: (str: string) => Uint8Array;
export function encode_utf8(str: string) {
  let encoder;
  return (
    encode_utf8_
      ?? ((encoder = new (globalThis as any).TextEncoder()), (encode_utf8_ = encoder.encode.bind(encoder)))
  )(str);
}

let decode_utf8_: (bytes: Uint8Array) => string;
export function decode_utf8(bytes: Uint8Array) {
  let decoder;
  return (
    decode_utf8_
      ?? ((decoder = new (globalThis as any).TextDecoder()), (decode_utf8_ = decoder.decode.bind(decoder)))
  )(bytes);
}
