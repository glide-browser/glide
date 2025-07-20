// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { parse_command_args } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/args.mjs"
);

add_task(async function test_required_flag_parsing() {
  const parsed = parse_command_args({
    args: "--mode=normal --other=1 --int=34",
    schema: {
      "--mode": {
        type: "string",
        required: true,
      },
      "--other": {
        type: "boolean",
        required: true,
      },
      "--int": {
        type: "integer",
        required: true,
      },
    },
  });
  ok(parsed.valid, "args should be valid");
  is(parsed.args["--mode"], "normal");
  is(parsed.args["--other"], true);
  is(parsed.args["--int"], 34);
});

add_task(async function test_space_separated_args() {
  const parsed = parse_command_args({
    args: "--mode normal --int 42",
    schema: {
      "--mode": {
        type: "string",
        required: true,
      },
      "--int": {
        type: "integer",
        required: true,
      },
    },
  });
  ok(parsed.valid, "space-separated args should be valid");
  is(parsed.args["--mode"], "normal");
  is(parsed.args["--int"], 42);
});

add_task(async function test_boolean_flag_without_value() {
  const parsed = parse_command_args({
    args: "--verbose --quiet=false",
    schema: {
      "--verbose": {
        type: "boolean",
        required: false,
      },
      "--quiet": {
        type: "boolean",
        required: false,
      },
    },
  });
  ok(parsed.valid, "boolean flags should be valid");
  is(parsed.args["--verbose"], true, "flag-only boolean should be true");
  is(parsed.args["--quiet"], false, "explicit false boolean should be false");
});

add_task(async function test_positional_arguments() {
  const parsed = parse_command_args({
    args: "input.txt output.txt --verbose",
    schema: {
      input: {
        type: "string",
        required: true,
        position: 0,
      },
      output: {
        type: "string",
        required: true,
        position: 1,
      },
      "--verbose": {
        type: "boolean",
        required: false,
      },
    },
  });
  ok(parsed.valid, "positional args should be valid");
  is(parsed.args["input"], "input.txt");
  is(parsed.args["output"], "output.txt");
  is(parsed.args["--verbose"], true);
});

add_task(async function test_extra_arguments() {
  const parsed = parse_command_args({
    args: "--mode=normal extra1 extra2",
    schema: {
      "--mode": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with extra args");
  is(parsed.args["--mode"], "normal");
  is(
    JSON.stringify(parsed.remaining),
    JSON.stringify(["extra1", "extra2"]),
    "should capture remaining args"
  );
});

add_task(async function test_invalid_value_for_required_flag() {
  const parsed = parse_command_args({
    args: "--count=invalid --mode=normal",
    schema: {
      "--count": {
        type: "integer",
        required: true,
      },
      "--mode": {
        type: "string",
        required: true,
      },
    },
  });
  ok(!parsed.valid, "should be invalid with bad value");
  is(parsed.errors.length, 1);
  ok(
    parsed.errors.some(e => e.includes("not a valid integer")),
    "should have integer validation error"
  );
  ok(
    !parsed.errors.some(e => e.includes('Required flag "--count" is missing')),
    "should not have missing flag error when invalid value provided"
  );
});

add_task(async function test_invalid_value_for_required_positional_flag() {
  const parsed = parse_command_args({
    args: "invalid",
    schema: {
      count: {
        type: "integer",
        required: true,
        position: 0,
      },
    },
  });
  ok(!parsed.valid, "should be invalid with bad value");
  is(parsed.errors.length, 1);
  ok(
    parsed.errors.some(e => e.includes("not a valid integer")),
    "should have integer validation error"
  );
  ok(
    !parsed.errors.some(e =>
      e.includes('Required positional argument "count" is missing')
    ),
    "should not have missing flag error when invalid value provided"
  );
});

add_task(async function test_multiple_spaces_and_trimming() {
  const parsed = parse_command_args({
    args: "  --mode   normal    --verbose  ",
    schema: {
      "--mode": {
        type: "string",
        required: true,
      },
      "--verbose": {
        type: "boolean",
        required: false,
      },
    },
  });
  ok(parsed.valid, "should handle extra whitespace");
  is(parsed.args["--mode"], "normal");
  is(parsed.args["--verbose"], true);
});

add_task(async function test_boolean_values() {
  const test_cases = [
    { input: "yes", expected: true },
    { input: "y", expected: true },
    { input: "1", expected: true },
    { input: "true", expected: true },
    { input: "no", expected: false },
    { input: "n", expected: false },
    { input: "0", expected: false },
    { input: "false", expected: false },
  ];

  for (const { input, expected } of test_cases) {
    const parsed = parse_command_args({
      args: `--flag=${input}`,
      schema: {
        "--flag": {
          type: "boolean",
          required: true,
        },
      },
    });
    ok(parsed.valid, `boolean value ${input} should be valid`);
    is(parsed.args["--flag"], expected, `${input} should parse to ${expected}`);
  }
});

add_task(async function test_enum_values() {
  const valid_cases = [
    { input: "a", expected: "a" },
    { input: "b", expected: "b" },
    { input: "c", expected: "c" },
  ];

  for (const { input, expected } of valid_cases) {
    const parsed = parse_command_args({
      args: `--flag=${input}`,
      schema: {
        "--flag": {
          type: { enum: ["a", "b", "c"] },
          required: true,
        },
      },
    });
    ok(parsed.valid, `enum value ${input} should be valid`);
    is(parsed.args["--flag"], expected, `${input} should parse to ${expected}`);
  }

  const invalid_cases = ["d", "1", "foo", "A", "B"];
  for (const input of invalid_cases) {
    const parsed = parse_command_args({
      args: `--flag=${input}`,
      schema: {
        "--flag": {
          type: { enum: ["a", "b", "c"] },
          required: true,
        },
      },
    });
    notok(parsed.valid, `enum value ${input} should be invalid`);
    is(parsed.errors.length, 1, `enum value ${input} should result in 1 error`);
    ok(
      parsed.errors[0]?.includes("--flag is not one of a, b or c"),
      `"${parsed.errors[0]}" should include helpful error`
    );
  }
});

add_task(async function test_missing_value_for_flag() {
  const parsed = parse_command_args({
    args: "--mode",
    schema: {
      "--mode": {
        type: "string",
        required: true,
      },
    },
  });
  ok(!parsed.valid, "should be invalid with missing value");
  ok(
    parsed.errors.some(e => e.includes("No value provided")),
    "should have missing value error"
  );
});

add_task(async function test_missing_positional_argument() {
  const parsed = parse_command_args({
    args: "input.txt",
    schema: {
      input: {
        type: "string",
        required: true,
        position: 0,
      },
      output: {
        type: "string",
        required: true,
        position: 1,
      },
    },
  });
  ok(!parsed.valid, "should be invalid with missing positional");
  ok(
    parsed.errors.some(e =>
      e.includes('Required positional argument "output" is missing')
    ),
    "should have missing positional error"
  );
});

add_task(async function test_quoted_strings_with_spaces() {
  const parsed = parse_command_args({
    args: 'foo "bar baz"',
    schema: {},
  });
  ok(parsed.valid, "should be valid");
  is(parsed.remaining.length, 2, "should have 2 remaining args");
  is(parsed.remaining[0], "foo");
  is(parsed.remaining[1], "bar baz");
});

add_task(async function test_quoted_strings_in_flags() {
  const parsed = parse_command_args({
    args: '--message="hello world" --path="/some/path with spaces"',
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
      "--path": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with quoted flag values");
  is(parsed.args["--message"], "hello world");
  is(parsed.args["--path"], "/some/path with spaces");
});

add_task(async function test_quoted_strings_space_separated() {
  const parsed = parse_command_args({
    args: '--message "hello world" --path "/some/path with spaces"',
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
      "--path": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with space-separated quoted values");
  is(parsed.args["--message"], "hello world");
  is(parsed.args["--path"], "/some/path with spaces");
});

add_task(async function test_single_quotes() {
  const parsed = parse_command_args({
    args: "--message='hello world' --path='/some/path with spaces'",
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
      "--path": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with single quotes");
  is(parsed.args["--message"], "hello world");
  is(parsed.args["--path"], "/some/path with spaces");
});

add_task(async function test_mixed_quotes() {
  const parsed = parse_command_args({
    args: `--message="It's working" --other='She said "hello"'`,
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
      "--other": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with mixed quotes");
  is(parsed.args["--message"], "It's working");
  is(parsed.args["--other"], 'She said "hello"');
});

add_task(async function test_escaped_quotes() {
  const parsed = parse_command_args({
    args: '--message="hello ""world"""',
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should be valid with escaped quotes");
  is(parsed.args["--message"], 'hello "world"');
});

add_task(async function test_quoted_positional_args() {
  const parsed = parse_command_args({
    args: '"input file.txt" "output file.txt"',
    schema: {
      input: {
        type: "string",
        required: true,
        position: 0,
      },
      output: {
        type: "string",
        required: true,
        position: 1,
      },
    },
  });
  ok(parsed.valid, "should be valid with quoted positional args");
  is(parsed.args["input"], "input file.txt");
  is(parsed.args["output"], "output file.txt");
});

add_task(async function test_empty_quoted_strings() {
  const parsed = parse_command_args({
    args: '--message="" --path=""',
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
      "--path": {
        type: "string",
        required: false,
      },
    },
  });
  ok(parsed.valid, "should be valid with empty quoted strings");
  is(parsed.args["--message"], "");
  is(parsed.args["--path"], "");
});

add_task(async function test_unclosed_quotes() {
  const parsed = parse_command_args({
    args: '--message="hello world',
    schema: {
      "--message": {
        type: "string",
        required: true,
      },
    },
  });
  ok(parsed.valid, "should handle unclosed quotes gracefully");
  is(parsed.args["--message"], "hello world");
});
