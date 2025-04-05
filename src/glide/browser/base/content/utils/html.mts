const { is_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

type AttrValue = string | undefined | null;

export type Attrs = Record<string, AttrValue | Array<AttrValue> | undefined>;

/**
 * Generate a string representation of an HTML element.
 *
 * Any children passed are presumed to already be valid HTML.
 *
 * ```ts
 * element('li') -> '<li></li>'
 * element('li', {}, ['entry 1']) -> '<li>entry 1</li>'
 * element('li', {'class': 'my-styles'}, ['entry 1']) -> '<li class="my-styles">entry 1</li>'
 * ```
 */
export function element(
  name: string,
  attrs?: Attrs,
  children?: string[]
): string {
  return [
    "<",
    name,
    ...(attrs && Object.keys(attrs).length ?
      [
        " ",
        ...Object.entries(attrs)
          .map(([name, value]) =>
            is_present(value) ?
              `${name}=${Array.isArray(value) ? JSON.stringify(value.filter(is_present).join(" ")) : JSON.stringify(value)}`
            : null
          )
          .filter(is_present),
      ]
    : []),
    ">",
    ...(children ?? []),
    "</",
    name,
    ">",
  ]
    .filter(Boolean)
    .join("");
}

/** <a href="..."></a> */
export function a(attrs: Attrs, children?: string[]): string {
  return element("a", attrs, children);
}

/** <li></li> */
export function li(attrs?: Attrs, children?: string[]): string {
  return element("li", attrs, children);
}
