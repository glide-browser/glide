/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/**
 * Extract all window properties into a `sandbox-properties.mjs` file so that we can easily
 * include all of the standard window object properties into our sandbox *without* also including
 * properties that are specific to the browser internals. Those should be exposed only when needed.
 *
 * This script is copied from similar scripts in the same dir in the firefox codebase.
 */

import fs from "fs";
import * as webidl2 from "webidl2";

// Convert Mozilla-flavor webidl into idl parsable by @w3c/webidl2.js.
function preprocess(webidl: string): string {
  return webidl
    .replaceAll(/^#.+/gm, "")
    .replaceAll(/\binterface \w+;/gm, "")
    .replaceAll(/\bUTF8String\b/gm, "DOMString")
    .replaceAll(/^\s*legacycaller /gm, "getter ")
    .replaceAll(/^callback constructor /gm, "callback ")
    .replaceAll(/(ElementCreationOptions) or (DOMString)/gm, "$2 or $1")
    .replaceAll(/(attribute boolean aecDebug;)/gm, "readonly $1");
}

// Check if a member has Chrome-only extended attributes
function isChromeOnly(
  member: webidl2.IDLRootType | webidl2.IDLInterfaceMemberType
) {
  if (!member.extAttrs) return false;

  for (const attr of member.extAttrs) {
    // Check for ChromeOnly attribute
    if (attr.name === "ChromeOnly") return true;
    if (attr.name === "LegacyNoInterfaceObject") return true;

    // Check for Func attributes that indicate Chrome-only
    if (attr.name === "Func" && attr.rhs && attr.rhs.value) {
      const funcValue = attr.rhs.value;
      // Common Chrome-only function checks
      if (
        typeof funcValue === "string" &&
        (funcValue.includes("IsChromeOrUAWidget") ||
          funcValue.includes("IsInChromeDocument") ||
          funcValue.includes("IsCertifiedApp") ||
          funcValue.includes("IsPrivilegedChromeWindow") ||
          funcValue.includes("IsChromeWindow"))
      ) {
        return true;
      }
    }

    // Check for Pref attributes that might indicate Chrome features
    if (attr.name === "Pref" && attr.rhs && attr.rhs.value) {
      const prefValue = attr.rhs.value;
      if (
        typeof prefValue === "string" &&
        (prefValue.includes(
          "dom.webcomponents.shadowdom.declarative.enabled"
        ) ||
          prefValue.includes("dom.mozBrowserFramesEnabled"))
      ) {
        return true;
      }
    }
  }

  return false;
}

// Extract properties from a parsed interface
function extractInterfaceProperties(
  iface: webidl2.InterfaceType | webidl2.InterfaceMixinType
): Set<string> {
  const properties = new Set<string>();

  // Add regular attributes
  if (iface.members) {
    for (const member of iface.members) {
      // Skip Chrome-only members
      if (isChromeOnly(member)) continue;

      if (member.type === "attribute" && member.name) {
        properties.add(member.name);
      }
      // Add methods
      else if (member.type === "operation" && member.name) {
        properties.add(member.name);
      }
      // Add constants
      else if (member.type === "const" && member.name) {
        properties.add(member.name);
      }
    }
  }

  return properties;
}

// Extract all Window properties from WebIDL files
async function extractWindowProperties(webidls: string[]) {
  const windowProperties = new Set<string>();
  const mixinProperties = new Map<string, Set<string>>();
  const inheritedInterfaces = new Map();
  const includesStatements = [];

  // First pass: Parse all WebIDL files and collect interfaces/mixins
  for (const webidlPath of webidls) {
    const content = fs.readFileSync(webidlPath, "utf-8");
    const preprocessed = preprocess(content);

    const ast = webidl2.parse(preprocessed);

    for (const def of ast) {
      if (isChromeOnly(def)) {
        continue;
      }

      switch (def.type) {
        case "includes":
        case "callback":
        case "typedef":
        case "dictionary":
        case "namespace":
        case "callback interface":
        case "enum":
          break;

        case "interface mixin":
        case "interface": {
          windowProperties.add(def.name);
          break;
        }
      }

      if (def.type === "interface" || def.type === "interface mixin") {
        const props = extractInterfaceProperties(def);

        if (def.name === "Window") {
          // Direct Window properties
          props.forEach(p => windowProperties.add(p));
        } else if (def.type === "interface mixin") {
          // Store mixin properties (merge if already exists)
          if (mixinProperties.has(def.name)) {
            const existing = mixinProperties.get(def.name);
            props.forEach(p => existing!.add(p));
          } else {
            mixinProperties.set(def.name, props);
          }
        }

        // Track inheritance
        if (def.inheritance) {
          inheritedInterfaces.set(def.name, def.inheritance);
        }
      }

      // Store includes statements for second pass
      if (def.type === "includes") {
        includesStatements.push(def);
      }
    }
  }

  // Second pass: Process all includes statements now that we have all mixins
  for (const inc of includesStatements) {
    if (inc.target === "Window" && mixinProperties.has(inc.includes)) {
      const mixinProps = mixinProperties.get(inc.includes);
      mixinProps!.forEach(p => windowProperties.add(p));
    }
  }

  return Array.from(windowProperties).sort();
}

function generateModule(properties: string[]): string {
  return `/**
 * NOTE: Do not modify this file by hand.
 * Content was generated from WebIDL sources.
 * 
 * This file contains all global properties extracted from WebIDL definitions.
 *
 * **note**: many of the identifiers listed here may not actually be present at runtime.
 */

export const WINDOW_PROPERTIES = new Set(${JSON.stringify(properties, null, 2)});
`;
}

async function main(output_file: string) {
  const webidl_files = fs
    .readdirSync("engine/dom/webidl")
    .filter(p => p.endsWith(".webidl"));
  const webidlPaths = webidl_files.map(f => `engine/dom/webidl/${f}`);
  const properties = await extractWindowProperties(webidlPaths);
  const moduleContent = generateModule(properties);

  console.log(`[INFO] Found ${properties.length} Window properties`);
  console.log(
    `[INFO] ${output_file} (${moduleContent.length.toLocaleString()} bytes)`
  );

  fs.writeFileSync(output_file, moduleContent);
}

// @ts-ignore
main(...process.argv.slice(2));
