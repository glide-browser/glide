const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs");
const Strings = ChromeUtils.importESModule(
  "chrome://glide/content/utils/strings.mjs"
);
const { LayoutUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/LayoutUtils.sys.mjs"
);

const ALPHABET = "hjklasdfgyuiopqwertnmzxcvb".split("");

// prioritise the chars in their order in the above string
// as we want to try and stay on the home row as much as possible
const ALPHABET_COST_MAP: Record<string, number> = {};
let cost = 0;
for (const char of ALPHABET) {
  ALPHABET_COST_MAP[char] = cost += 0.1;
}

export interface GlideHint {
  label: string;
  target: HTMLElement;
  screen_x: number;
  screen_y: number;
  width: number;
  height: number;
}

export type GlideHintIPC = Omit<GlideHint, "target">;

export const content = {
  resolve_hints(document: Document): GlideHint[] {
    const hints: GlideHint[] = [];

    for (const target of this.hintable_targets(document)) {
      // check if the element is in the viewport and not hidden due to `display` styling
      // or other similar states
      if (!DOM.is_visible(target)) {
        continue;
      }

      // check if the target is visibly hidden due to overlapping with another element by
      // querying for the element at the same coordinates as the target.
      //
      // if said element does not include the target as a child node or if the target doesn't
      // include the element as a child then we assume the target is hidden and shouldn't be hinted.
      const dom_rect = target.getBoundingClientRect();
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
        target,
        // set afterwards below
        label: "",
        screen_x: rect.x,
        screen_y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }

    const labels = Strings.generate_prefix_free_codes(
      ALPHABET,
      hints.length,
      ALPHABET_COST_MAP
    );

    for (let i = 0; i < hints.length; i++) {
      hints[i]!.label = labels[i]!;
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
      // firefox XUL elements
      "toolbarbutton",
      "richlistitem",
      "menulist",
      "checkbox",
      "radio",
    ].flatMap(str => [str, str.toUpperCase(), `html:${str}`, `xul:${str}`])
  ),

  // TODO(glide): add more `role`s
  HINTABLE_ROLES: new Set([
    "link",
    "button",
    "option",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
  ]),

  *hintable_targets(root: Document | ShadowRoot): Generator<HTMLElement> {
    for (const el of all_elements(root)) {
      if (!el) {
        continue;
      }

      const target = el as HTMLElement;
      if (
        this.HINTABLE_ELEMENT_TAGS.has(target.tagName) ||
        (target.role && this.HINTABLE_ROLES.has(target.role)) ||
        DOM.is_text_editable(target)
      ) {
        yield target;
      }

      if (target.shadowRoot) {
        yield* this.hintable_targets(target.shadowRoot);
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
