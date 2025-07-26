// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { generate_prefix_free_codes } = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs", {
  global: "current",
});

add_task(async function test_generate_prefix_free_codes() {
  const alphabet = ["a", "b", "c"];

  // edge case inputs
  isjson(generate_prefix_free_codes(alphabet, 0), []);
  isjson(generate_prefix_free_codes(alphabet, -1), []);

  // single character codes
  isjson(generate_prefix_free_codes(alphabet, 1), ["a"]);
  isjson(generate_prefix_free_codes(alphabet, 2), ["a", "b"]);
  isjson(generate_prefix_free_codes(alphabet, 3), ["a", "b", "c"]);

  // expanding to two-character codes
  isjson(generate_prefix_free_codes(alphabet, 4), ["b", "c", "aa", "ab"]);
  isjson(generate_prefix_free_codes(alphabet, 5), ["b", "c", "aa", "ab", "ac"]);
  isjson(generate_prefix_free_codes(alphabet, 6), [
    "c",
    "aa",
    "ab",
    "ac",
    "ba",
    "bb",
  ]);

  const codes = generate_prefix_free_codes(alphabet, 12);
  is(codes.length, 12);

  // verify no code is a prefix of another
  for (let i = 0; i < codes.length; i++) {
    for (let j = 0; j < codes.length; j++) {
      if (i !== j) {
        ok(!codes[j]!.startsWith(codes[i]!), `Code "${codes[j]}" should not start with "${codes[i]}"`);
      }
    }
  }
});
