// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

// @ts-check
/* oxlint-disable no-unused-vars */

"use strict";

const { serialize_function_to_expression } = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");

add_task(async function test_g_mapleader_normalizes_input() {
  is(
    serialize_function_to_expression(
      {
        // @ts-ignore
        a(b) {
          console.log(b);
        },
      }.a,
    ),
    "function a(b) {\n          console.log(b);\n        }; a",
  );
  is(
    serialize_function_to_expression(
      {
        // @ts-ignore
        async a(b) {
          console.log(b);
        },
      }.a,
    ),
    "async function a(b) {\n          console.log(b);\n        }; a",
  );
  is(
    serialize_function_to_expression(
      // @ts-ignore
      function foo(x) {},
    ),
    "function foo(x) {}; foo",
  );
  is(
    serialize_function_to_expression(
      // @ts-ignore
      async function foo(x) {},
    ),
    "async function foo(x) {}; foo",
  );
  is(serialize_function_to_expression(() => {}), "() => {}");
  is(
    // @ts-ignore
    serialize_function_to_expression(foo => {}),
    "foo => {}",
  );
  is(
    // @ts-ignore
    serialize_function_to_expression((foo, bar) => {}),
    "(foo, bar) => {}",
  );
  todo_is(
    serialize_function_to_expression(
      {
        // @ts-ignore
        "a.foo"(b) {
          console.log(b);
        },
      }["a.foo"],
    ),
    "({\"a.foo\"(b) {\n          console.log(b);\n        }})[\"a.foo\"]",
  );
});
