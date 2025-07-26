// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * Vendored version of https://github.com/tamino-martinius/node-ts-dedent
 *
 * MIT License
 *
 * Copyright (c) 2018 Tamino Martinius
 */

// @ts-nocheck
function _dedent(templ) {
  var values = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    values[_i - 1] = arguments[_i];
  }
  var strings = Array.from(typeof templ === "string" ? [templ] : templ);
  strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var indentLengths = strings.reduce(function(arr, str) {
    var matches = str.match(/\n([\t ]+|(?!\s).)/g);
    if (matches) {
      return arr.concat(matches.map(function(match) {
        var _a, _b;
        return (
            (_b = (_a = match.match(/[\t ]/g)) === null || _a === void 0
                ? void 0
                : _a.length) !== null && _b !== void 0
          )
          ? _b
          : 0;
      }));
    }
    return arr;
  }, []);
  if (indentLengths.length) {
    var pattern_1 = new RegExp("\n[\t ]{" + Math.min.apply(Math, indentLengths) + "}", "g");
    strings = strings.map(function(str) {
      return str.replace(pattern_1, "\n");
    });
  }
  strings[0] = strings[0].replace(/^\r?\n/, "");
  var string = strings[0];
  values.forEach(function(value, i) {
    var endentations = string.match(/(?:^|\n)( *)$/);
    var endentation = endentations ? endentations[1] : "";
    var indentedValue = value;
    if (typeof value === "string" && value.includes("\n")) {
      indentedValue = String(value)
        .split("\n")
        .map(function(str, i) {
          return i === 0 ? str : "" + endentation + str;
        })
        .join("\n");
    }
    string += indentedValue + strings[i + 1];
  });
  return string;
}

export function dedent(arg: string): string;
export function dedent(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string;
export function dedent(
  strings: TemplateStringsArray | string,
  ...values: unknown[]
): string {
  return (
    _dedent(strings, ...values)
      .trim()
      // Wrapping endent to remove lines that only contain spaces.
      // Here's the corresponding bug report: https://github.com/tamino-martinius/node-ts-dedent/issues/37
      .replaceAll(/\n\s*\n/gi, "\n\n")
  );
}

export function make_dedent_no_args(
  name: string,
): (str: string | TemplateStringsArray) => string {
  return function _(str) {
    if (arguments.length > 1) {
      throw new Error(
        `The ${name} template function does not support interpolating arguments as escaping is not implemented.`,
      );
    }

    return dedent(str);
  };
}

// aliases to indicate the embedded language for syntax highlighting
export const html = dedent;
export const markdown = dedent;
