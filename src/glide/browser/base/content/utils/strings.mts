/**
 * Like `string.indexOf()` but works backwards from the end of the string.
 */
export function reverse_indexof(
  str: string,
  char: string,
  start: number = str.length - 1
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
  costMap?: { [char: string]: number }
): string[] {
  // TODO(glide): review this implementation
  if (n <= 0) return [];

  // Returns the cost for a given character (default is 1)
  const char_cost = (ch: string): number =>
    costMap && costMap[ch] !== undefined ? costMap[ch] : 1;

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
          if (a.code.length !== b.code.length)
            return a.code.length - b.code.length;
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

export function Words(strings: string[]): string {
  return strings.filter(Boolean).join(" ");
}
