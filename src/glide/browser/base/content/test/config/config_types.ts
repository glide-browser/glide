import type {
  MODE_SCHEMA_TYPE,
  ParsedArg,
} from "../../browser-excmds-registry.mjs";

/**
 * If you get an error here then you need to update either the `MODE_SCHEMA_TYPE` constant
 * in the `src/glide/browser/base/content/browser-excmds-registry.mtS` file, or the `GlideMode`
 * type in `src/glide/browser/base/content/glide-api.d.ts`.
 */
export type _CheckTypesInSync = Assert<
  Equals<
    ParsedArg<{ type: typeof MODE_SCHEMA_TYPE; required: true }>,
    GlideMode
  >,
  true
>;
