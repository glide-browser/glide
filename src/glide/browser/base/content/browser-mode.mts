import type { ArgumentSchema, ParsedArg } from "./utils/args.mjs";

export const MODE_SCHEMA_TYPE = {
  enum: ["normal", "insert", "visual", "op-pending", "ignore", "hint"],
} as const satisfies ArgumentSchema["type"];

/**
 * If you get an error here then you need to update either the `MODE_SCHEMA_TYPE` constant
 * in this file, or the `GlideMode` type in `glide/browser/base/content/glide-api.d.ts`.
 */
export type _CheckTypesInSync = Assert<
  Equals<
    ParsedArg<{ type: typeof MODE_SCHEMA_TYPE; required: true }>,
    GlideMode
  >,
  true
>;

export const OPERATOR_SCHEMA_TYPE = {
  enum: ["d", "c", "r"],
} as const satisfies ArgumentSchema["type"];

export type GlideOperator = ParsedArg<{
  type: typeof OPERATOR_SCHEMA_TYPE;
  required: true;
}>;
