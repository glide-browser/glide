/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type {
  ArgumentsSchema,
  ArgumentSchema,
  ParsedArgs,
} from "../browser-excmds-registry.mts";

const { is_present, assert_never } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { human_join } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/arrays.mjs"
);

export type ParseResult<Schema extends ArgumentsSchema> =
  | { valid: true; args: ParsedArgs<Schema>; remaining: string[] }
  | { valid: false; errors: string[] };

export function parse_command_args<Schema extends ArgumentsSchema>(props: {
  args: string;
  schema: Schema;
}): ParseResult<Schema> {
  const tokens: (string | null)[] = props.args
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const errors: string[] = [];
  const remaining: string[] = [];
  const parsed: Record<string, unknown> = {};
  const attempted_flags = new Set<string>();

  // initialize all flags to null
  for (const flag of Object.keys(props.schema)) {
    parsed[flag] = null;
  }

  // first pass: handle positional arguments
  for (const [flag, schema] of Object.entries(props.schema)) {
    if (!is_present(schema.position)) continue;

    const arg = tokens[schema.position];
    if (!arg) {
      if (schema.required) {
        errors.push(`Required positional argument "${flag}" is missing`);
      }
      continue;
    }

    attempted_flags.add(flag);
    const result = parse_arg_type(flag, schema, arg);
    if (result.valid) {
      parsed[flag] = result.value;
      tokens[schema.position] = null;
    } else {
      errors.push(result.error);
    }
  }

  // second pass: handle flag arguments
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token == null) {
      i++;
      continue;
    }

    // handle --flag=value syntax
    const equal_index = token.indexOf("=");
    if (equal_index !== -1) {
      const flag = token.slice(0, equal_index);
      const schema = props.schema[flag];

      if (!schema) {
        remaining.push(token);
        i++;
        continue;
      }

      attempted_flags.add(flag);
      const value = token.slice(equal_index + 1);
      const result = parse_arg_type(flag, schema, value);

      if (result.valid) {
        parsed[flag] = result.value;
      } else {
        errors.push(result.error);
      }

      i++;
      continue;
    }

    // Handle --flag value syntax
    const schema = props.schema[token];
    if (schema) {
      attempted_flags.add(token);

      if (schema.type === "boolean") {
        parsed[token] = true;
        i++;
        continue;
      }

      const value = tokens[i + 1];
      if (!value || value === null) {
        if (schema.required) {
          errors.push(`No value provided for required flag "${token}"`);
        }
        i++;
        continue;
      }

      const result = parse_arg_type(token, schema, value);
      if (result.valid) {
        parsed[token] = result.value;
        tokens[i + 1] = null;
        i += 2;
      } else {
        errors.push(result.error);
        i++;
      }
      continue;
    }

    remaining.push(token);
    i++;
  }

  // check for missing required flags
  for (const [flag, schema] of Object.entries(props.schema)) {
    if (
      schema.required &&
      parsed[flag] === null &&
      !attempted_flags.has(flag)
    ) {
      errors.push(`Required flag "${flag}" is missing`);
    }
  }

  // TODO: should error instead if there are `remaining` values

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    args: parsed as ParsedArgs<Schema>,
    remaining,
  };
}

const BOOLEAN_TRUE = new Set(["on", "1", "true", "t", "yes", "y"]);
const BOOLEAN_FALSE = new Set(["off", "0", "false", "f", "no", "n"]);

function parse_arg_type(
  flag: string,
  schema: ArgumentSchema,
  value: string
): { valid: true; value: unknown } | { valid: false; error: string } {
  value = value.trim();

  if (typeof schema.type === "object") {
    if ("enum" in schema.type) {
      return schema.type.enum.includes(value) ?
          { valid: true, value }
        : {
            valid: false,
            error: `${flag} is not one of ${human_join(schema.type.enum, {
              final: "or",
            })}, got \`${value}\``,
          };
    }

    throw assert_never(schema.type);
  }

  switch (schema.type) {
    case "boolean": {
      // flag-only case
      if (value === "") return { valid: true, value: true };

      const lower = value.toLowerCase();
      if (BOOLEAN_TRUE.has(lower)) return { valid: true, value: true };
      if (BOOLEAN_FALSE.has(lower)) return { valid: true, value: false };

      return {
        valid: false,
        error: `${flag} is not a valid boolean value; expected one of ${[
          ...BOOLEAN_TRUE,
          ...BOOLEAN_FALSE,
        ].join(", ")}`,
      };
    }

    case "string":
      return { valid: true, value };

    case "integer": {
      const n = Number.parseInt(value, 10);
      if (!Number.isNaN(n)) return { valid: true, value: n };

      return {
        valid: false,
        error: `${flag} is not a valid integer, got \`${value}\``,
      };
    }

    default:
      throw assert_never(schema.type);
  }
}
