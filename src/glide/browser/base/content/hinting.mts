// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const { LayoutUtils } = ChromeUtils.importESModule("resource://gre/modules/LayoutUtils.sys.mjs");

export type GlideHintIPC = Omit<glide.ContentHint, "element" | "label"> & {
  /**
   * Only included if the `debug: true` prop is passed
   */
  element_id?: string | undefined;
};

interface ResolveProps {
  selector?: string;
  include?: string;
  editable_only?: boolean;
  browser_ui_rect: DOMRectReadOnly;
  pick?: (hints: glide.ContentHint[]) => glide.ContentHint[];
}

export const content = {
  resolve_hints(document: Document, opts: ResolveProps): glide.ContentHint[] {
    var hints: glide.ContentHint[] = [];

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
      const node_stack = new Set<Node>();
      const point_element = DOM.element_at_point(
        document,
        dom_rect.left + dom_rect.width * 0.5,
        dom_rect.top + dom_rect.height * 0.5,
        node_stack,
      );
      if (
        point_element
        && point_element !== target
        && !(point_element.contains(target) || target.contains(point_element)
          // ensure `.contains()` works across shadowroot boundaries
          || node_stack.values().some((n) => target.contains(n)))
      ) {
        continue;
      }

      const rect = LayoutUtils.getElementBoundingScreenRect(target);

      // check if the element would be outside the current browser window
      const y = rect.y - opts.browser_ui_rect.y;
      const x = rect.x - opts.browser_ui_rect.x;
      if (y < 0) {
        // TODO(glide): only do this if the hints come from the content frame
        continue;
      }

      if (y > opts.browser_ui_rect.height) {
        // below the viewport
        continue;
      }

      if (x > opts.browser_ui_rect.width) {
        // to the right of the viewport
        continue;
      }

      hints.push({
        id: i++,
        element: target,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }

    if (opts?.pick) {
      hints = opts.pick(hints);
    }

    return hints;
  },

  HINTABLE_ELEMENT_TAGS: new Set([
    "a",
    "input",
    "textarea",
    "button",
    "details",
    "summary",
    "option",
    "label",
    // firefox XUL elements
    "toolbarbutton",
    "richlistitem",
    "menulist",
    "checkbox",
    "radio",
  ].flatMap(str => [str, str.toUpperCase(), `html:${str}`, `xul:${str}`])),

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
    opts: ResolveProps | undefined,
  ): Generator<HTMLElement> {
    for (const el of all_elements(root)) {
      if (!el) {
        continue;
      }

      const target = el as HTMLElement;

      // filters use logical and, they must *all* return `true` for the target to be included.
      const filters = [
        opts?.selector ? target.matches(opts.selector) : null,
        typeof opts?.editable_only !== "undefined"
          ? DOM.is_text_editable(target)
          : null,
      ].filter(v => v != null);

      if (filters.length) {
        if (filters.every(b => b)) {
          yield target;
        }
      } else if (
        this.HINTABLE_ELEMENT_TAGS.has(target.tagName)
        || (target.role && this.HINTABLE_ROLES.has(target.role))
        || (opts?.include && target.matches(opts?.include))
        || DOM.is_text_editable(target)
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

export const pickers = {
  biggest_area: (hints) => {
    if (!hints.length) {
      return [];
    }

    let biggest_hint = hints[0]!;
    let biggest_area = hints[0]!.element.offsetWidth * hints[0]!.element.offsetHeight;

    for (let i = 1; i < hints.length; i++) {
      const hint = hints[i]!;
      const area = hint.element.offsetWidth * hint.element.offsetHeight;

      if (area > biggest_area) {
        biggest_hint = hint;
        biggest_area = area;
      }
    }

    return [biggest_hint];
  },
} satisfies Record<string, (hints: glide.ContentHint[]) => glide.ContentHint[]>;
