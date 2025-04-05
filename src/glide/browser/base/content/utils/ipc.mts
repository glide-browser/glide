/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Sandbox } from "../sandbox.mts";

export interface GlideFunctionIPC<Sig = any> {
  $SigT: Sig;
  $glidefunc: string;
}

export type ToDeserialisedIPCFunction<T> =
  | Exclude<T, GlideFunctionIPC>
  | Extract<T, GlideFunctionIPC>["$SigT"];

/**
 * Given an array, deeply serialise each entry so that it can be sent
 * across processes.
 */
export function serialise_args(args: unknown[]): unknown[] {
  function serialise(value: unknown): unknown {
    if (typeof value === "function") {
      return {
        $glidefunc: serialize_function_to_expression(value),
      } as GlideFunctionIPC;
    }

    if (Array.isArray(value)) {
      return value.map(item => serialise(item));
    }

    if (typeof value === "object" && value != null) {
      const new_obj: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(value)) {
        new_obj[key] = serialise(v);
      }
      return new_obj;
    }

    return value;
  }

  return serialise(args) as unknown[];
}

export function is_glidefunction(
  value: unknown
): value is GlideFunctionIPC<any> {
  return typeof (value as any)?.$glidefunc === "string";
}

export function maybe_serialise_glidefunction<T>(
  fn: T
): Exclude<T, Function> | GlideFunctionIPC<Extract<T, Function>> {
  if (typeof fn === "function") {
    return {
      // type-level only
      $SigT: null as any,
      $glidefunc: serialize_function_to_expression(fn),
    };
  }

  return fn as any;
}

export function maybe_deserialise_glidefunction<
  T,
  Sig = T extends GlideFunctionIPC<infer S> ? S : never,
>(sandbox: Sandbox, value: T): Exclude<T, GlideFunctionIPC<Sig>> | Sig {
  if (!is_glidefunction(value)) {
    return value as any;
  }

  return deserialise_glidefunction<Sig>(sandbox, value);
}

export function deserialise_glidefunction<S>(
  sandbox: Sandbox,
  fn: GlideFunctionIPC<S>
): S {
  // note: this shouldn't actually invoke any *real* code, instead
  //       it should just be parsing the function definition
  return Cu.evalInSandbox(
    fn.$glidefunc,
    sandbox,
    null,
    `chrome://glide/config/glide-ipc-function-${hashcode(fn.$glidefunc)}.ts`,
    1,
    false
  );
}

export function deserialise_args(sandbox: Sandbox, args: unknown[]): unknown[] {
  function deserialise(value: unknown): unknown {
    if (is_glidefunction(value)) {
      return deserialise_glidefunction(sandbox, value);
    }

    if (Array.isArray(value)) {
      return value.map(item => deserialise(item));
    }

    if (typeof value === "object" && value != null) {
      const new_obj: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(value)) {
        new_obj[key] = deserialise(v);
      }
      return new_obj;
    }

    return value;
  }

  return deserialise(args) as unknown[];
}

/**
 * Returns a string that when evaluated, will result in a reference to the given function.
 */
export function serialize_function_to_expression(func: Function): string {
  const str = func.toString();
  if (str.startsWith("function ") || str.startsWith("async function")) {
    return str + `; ${func.name}`;
  }

  if (is_obj_property_func(str)) {
    // for functions defined like
    // ```ts
    // {
    //   onclick(info) {
    //     console.log(info.id)
    //   }
    // }
    // ```
    // we need to turn it into syntax that can be evaluated
    // outside of the object
    return str.startsWith("async ") ?
        `async function ${str.slice(6)}; ${func.name}`
      : `function ${str}; ${func.name}`;
  }

  return str;
}

// This regex matches:
// - Starts with identifier (property name)
// - Followed by parameters in parentheses & an opening `{`
const OBJ_PROPERTY_FUNC = /^(async)?\s*[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{/;
function is_obj_property_func(str: string): boolean {
  return OBJ_PROPERTY_FUNC.test(str);
}

const HASHCODE_MAX = 4294967296;
function hashcode(str: string) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= HASHCODE_MAX;
  }
  return result;
}
