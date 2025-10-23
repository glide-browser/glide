// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

const EDITABLE_NODE_NAMES = new Set(["SELECT", "TEXTAREA", "OBJECT"]);

/**
 * Given a DOM element, returns true if you can edit it with key presses or
 * if the element is of a type that should handle its own keypresses.
 *
 * @attribution: this function was originally copied from [Tridactyl](https://github.com/tridactyl/tridactyl)
 */
export function is_text_editable(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  if ((element as any).readOnly === true) return false;

  // this is just a type cast as we can't rely on `instanceof` for checking
  // the class chain, so this is a cheap way to get type safety without `instanceof`
  const html_element = element as Partial<HTMLElement>;

  // HTML is always upper case, but XHTML is not necessarily upper case
  const nodeName = element.nodeName?.toUpperCase();

  if (nodeName === "INPUT" || nodeName === "HTML:INPUT") {
    const result = is_editable_html_input(element as HTMLInputElement);
    if (typeof result === "boolean") {
      return result;
    }
  }

  if (EDITABLE_NODE_NAMES.has(nodeName)) {
    return true;
  }

  if (html_element.contentEditable?.toUpperCase() === "TRUE") {
    return true;
  }

  const role_attr = typeof element.getAttribute === "function"
    ? element.getAttribute("role")
    : null;
  if (role_attr === "application" || role_attr === "textbox") {
    return true;
  }

  // TODO(glide): this might never be hit in our case
  // this was originally needed in Tridactyl:
  // https://github.com/tridactyl/tridactyl/issues/1031
  if (element.hasOwnProperty("attributes")) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes.item(i)!;
      if (
        attr.name === "role"
        && (attr.value === "application" || attr.value === "textbox")
      ) {
        return true;
      }
    }
  }

  return false;
}

function is_editable_html_input(element: HTMLInputElement): boolean | null {
  if (element.disabled || element.readOnly) return false;
  switch (element.type) {
    case undefined:
    case "text":
    case "search":
    case "email":
    case "url":
    case "number":
    case "password":
    case "date":
    case "tel":
      return true;
  }
  return null;
}

export function is_video_element(element: HTMLElement): boolean {
  return element.tagName.toLowerCase() === "video";
}

/**
 * Whether or not the given element is an instance of the given element class.
 *
 * This is necessary as, in content actors, a naive `element instanceof ElementClass` check
 * doesn't work, likely because of Firefox's x-ray security protection.
 *
 * Note that this just compares the names of the element / element class, it should not be relied
 * on for any check that has more ambiguity than basic type narrowing.
 */
export function is_element<ElementType extends typeof Element>(
  element: Element | null | undefined,
  of: ElementType,
): element is ElementType["prototype"] {
  if (!element) {
    return false;
  }

  return element.constructor?.name === of.name;
}

/**
 * Wrapper over `document.createElement()` providing a more composable API.
 *
 * Element properties that can be assigned directly can be provided as props:
 *
 * ```ts
 * create_element('img', { src: '...' });
 * ```
 *
 * You can also pass a `children` property, which will use `.replaceChildren()`:
 *
 * ```ts
 * create_element("div", {
 *   children: ["text content", create_element("img", { alt: "hint" })],
 * });
 * ```
 */
export function create_element<K extends keyof HTMLElementTagNameMap | (string & {})>(
  tag_name: K,
  props?: DOM.CreateElementProps<K extends keyof HTMLElementTagNameMap ? K : "div">,
  a_document = document,
): K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : HTMLElement {
  if (!a_document) {
    throw new Error("dom utils must be imported with { global: \"current\" } or passed the document argument");
  }

  const element = a_document.createElement(tag_name);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (key === "children" || key === "style" || key === "attributes") {
      // custom properties that require custom handling and can't be directly assigned
      continue;
    }

    // @ts-ignore
    element[key] = value;
  }

  if (props?.children) {
    if (Array.isArray(props.children)) {
      element.replaceChildren(...props.children);
    } else {
      element.replaceChildren(props.children);
    }
  }

  for (const [prop, value] of Object.entries(props?.style ?? {})) {
    // @ts-ignore
    element.style[prop] = value;
  }

  if (props?.attributes) {
    for (const [name, value] of Object.entries(props.attributes)) {
      element.setAttribute(name, value);
    }
  }

  // @ts-ignore
  return element;
}

/**
 * Check if the given element is visible using options from
 * `Element.checkVisibility()`
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
 */
export function is_visible(element: HTMLElement): boolean {
  return element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true,
    checkOpacity: true,
    checkVisibilityCSS: true,
  });
}

/**
 * Get the topmost element at the given (x, y) coordinates.
 *
 * This is equivalent to `.elementFromPoint()` but traverses
 * shadow roots as well.
 */
export function element_at_point(
  root: Document | ShadowRoot,
  x: number,
  y: number,
  stack: Set<Node> = new Set(),
): HTMLElement | null {
  const element = root.elementFromPoint(x, y);
  if (!element) {
    return null;
  }

  stack.add(element);

  if (element.shadowRoot) {
    return element_at_point(element.shadowRoot, x, y, stack);
  }

  return element as HTMLElement;
}

export async function scroll(
  window: Window,
  delta: { type: "page" | "pixel"; x?: number; y?: number; z?: number },
): Promise<void> {
  const prev_x = window.scrollX;
  const prev_y = window.scrollY;
  const dx = (delta.x ?? 0) * (delta.type === "page" ? window.innerWidth : 1);
  const dy = (delta.y ?? 0) * (delta.type === "page" ? window.innerHeight : 1);
  window.scrollTo({ left: prev_x + dx, top: prev_y + dy, behavior: "smooth" });
  return;
}

/**
 * Call the given callback after `n` frames.
 */
export function in_frames(window: Window, n: number, func: () => void): void {
  var frames = 0;

  function wait() {
    frames++;
    if (frames >= n) {
      func();
      return;
    }

    window.requestAnimationFrame(wait);
  }

  window.requestAnimationFrame(wait);
}
