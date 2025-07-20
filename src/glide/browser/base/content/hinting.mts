// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { LayoutUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/LayoutUtils.sys.mjs"
);

export const ALPHABET = "hjklasdfgyuiopqwertnmzxcvb".split("");

// prioritise the chars in their order in the above string
// as we want to try and stay on the home row as much as possible
export const ALPHABET_COST_MAP: Record<string, number> = {};
let cost = 0;
for (const char of ALPHABET) {
  ALPHABET_COST_MAP[char] = cost += 0.1;
}

export interface GlideHint {
  id: number;
  target: HTMLElement;
  screen_x: number;
  screen_y: number;
  width: number;
  height: number;
}

export type GlideHintIPC = Omit<GlideHint, "target" | "label"> & {
  /**
   * Only included if the `debug: true` prop is passed
   */
  element_id?: string | undefined;
};

interface ResolveProps {
  selector?: string;
  include?: string;
  editable_only?: boolean;
}

export const content = {
  resolve_hints(document: Document, opts?: ResolveProps): GlideHint[] {
    const hints: GlideHint[] = [];

    let i = 0;
    for (const target of this.hintable_targets(document, opts)) {
      // check if the element is in the viewport and not hidden due to `display` styling
      // or other similar states
      if (!DOM.is_visible(target)) {
        continue;
      }

      const dom_rect = target.getBoundingClientRect();
      if (dom_rect.width === 0 && dom_rect.height === 0) {
        // if the element has no size its not visible, so don't include it
        continue;
      }

      // check if the target is visibly hidden due to overlapping with another element by
      // querying for the element at the same coordinates as the target.
      //
      // if said element does not include the target as a child node or if the target doesn't
      // include the element as a child then we assume the target is hidden and shouldn't be hinted.
      const point_element = DOM.element_at_point(
        document,
        dom_rect.left + dom_rect.width * 0.5,
        dom_rect.top + dom_rect.height * 0.5
      );
      if (
        point_element &&
        point_element !== target &&
        !(point_element.contains(target) || target.contains(point_element))
      ) {
        continue;
      }

      const rect = LayoutUtils.getElementBoundingScreenRect(target);
      hints.push({
        id: i++,
        target,
        screen_x: rect.x,
        screen_y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }

    return hints;
  },

  HINTABLE_ELEMENT_TAGS: new Set(
    [
      "a",
      "input",
      "textarea",
      "button",
      "details",
      "option",
      "label",
      // firefox XUL elements
      "toolbarbutton",
      "richlistitem",
      "menulist",
      "checkbox",
      "radio",
    ].flatMap(str => [str, str.toUpperCase(), `html:${str}`, `xul:${str}`])
  ),

  HINTABLE_ROLES: new Set([
    "link",
    "button",
    "option",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "tab",
    "checkbox",
    "radio",
  ]),

  *hintable_targets(
    root: Document | ShadowRoot,
    opts: ResolveProps | undefined
  ): Generator<HTMLElement> {
    for (const el of all_elements(root)) {
      if (!el) {
        continue;
      }

      const target = el as HTMLElement;

      // filters use logical and, they must *all* return `true` for the target to be included.
      const filters = [
        opts?.selector ? target.matches(opts.selector) : null,
        typeof opts?.editable_only !== "undefined" ?
          DOM.is_text_editable(target)
        : null,
      ].filter(v => v != null);

      if (filters.length) {
        if (filters.every(b => b)) {
          yield target;
        }
      } else if (
        this.HINTABLE_ELEMENT_TAGS.has(target.tagName) ||
        (target.role && this.HINTABLE_ROLES.has(target.role)) ||
        (opts?.include && target.matches(opts?.include)) ||
        DOM.is_text_editable(target)
      ) {
        yield target;
      }

      if (target.shadowRoot) {
        yield* this.hintable_targets(target.shadowRoot, opts);
      }
    }
  },
};

function* all_elements(root: Document | ShadowRoot): Generator<HTMLElement> {
  for (const element of root.querySelectorAll("*")) {
    if (!element) {
      continue;
    }

    yield element as HTMLElement;
  }
}
