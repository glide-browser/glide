/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ValueOf } from "type-fest";

export const content = {
  /**
   * Find and click a "link" element that matches any of the given strings, or `rel` attribute.
   *
   * This is used or the `[[` and `]]` keymappings to go back / forth between pages.
   *
   * note: this is **heavily inspired** by Vimium, https://github.com/philc/vimium/blob/5707b6ffd9d54fbf4e28bc1c8c9c6fa0adba861d/content_scripts/mode_normal.js#L406.
   */
  activate_link({ patterns, rel }: { patterns: string[]; rel: string }) {
    const target = find_link_by_rel() ?? find_link_by_pattern();
    if (!target) {
      return;
    }

    if (target.nodeName.toLowerCase() === "link") {
      window.location.href = (target as HTMLLinkElement).href;
    } else {
      (target as HTMLElement).click();
    }

    return;

    function find_link_by_rel() {
      for (const tag of ["link", "a", "area"]) {
        const els = document!.getElementsByTagName(tag);
        for (const el of Array.from(els) as Element[]) {
          const attr = el.attributes.getNamedItem("rel");
          if (attr?.value && (attr.value.toLowerCase() === rel)) {
            return el;
          }
        }
      }
    }

    function find_link_by_pattern() {
      const links = evaluate_xpath(
        make_xpath(["a", "*[@onclick or @role='link' or contains(@class, 'button')]"]),
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      );
      let candidate_links: (HTMLElement & { word_count: number; original_index: number })[] = [];

      for (let i = links.snapshotLength - 1; i >= 0; i--) {
        const link = links.snapshotItem(i)! as HTMLElement;

        const style = window.getComputedStyle(link, null)!;
        const is_hidden = style.getPropertyValue("visibility") != "visible"
          || style.getPropertyValue("display") == "none";
        if (is_hidden) continue;

        for (const pattern of patterns) {
          if (
            link.innerText?.toLowerCase().includes(pattern)
            || (link as HTMLInputElement).value?.includes?.(pattern)
            || link.getAttribute("title")?.toLowerCase().includes(pattern)
            || link.getAttribute("aria-label")?.toLowerCase().includes(pattern)
          ) {
            candidate_links.push(object_assign(link, {
              word_count: link.innerText.trim().split(/\s+/).length,
              // store the original index to make sorting stable
              original_index: candidate_links.length - 1,
            }));
            break;
          }
        }
      }

      if (!candidate_links.length) {
        return;
      }

      // favour shorter links, and ignore those that are more than one word longer than the shortest link
      candidate_links = candidate_links
        .sort(function(a, b) {
          if (a.word_count === b.word_count) {
            return a.original_index - b.original_index;
          } else {
            return a.word_count - b.word_count;
          }
        })
        .filter((a) => a.word_count <= (candidate_links[0]!.word_count + 1));

      for (const link_string of patterns) {
        const exact_word_regex = /\b/.test(link_string[0]!) || /\b/.test(link_string[link_string.length - 1]!)
          ? new RegExp("\\b" + link_string + "\\b", "i")
          : new RegExp(link_string, "i");
        for (const candidate of candidate_links) {
          if (
            candidate.innerText.match(exact_word_regex)
            || (candidate as any as HTMLInputElement).value?.match(exact_word_regex)
            || candidate.getAttribute("title")?.match(exact_word_regex)
            || candidate.getAttribute("aria-label")?.match(exact_word_regex)
          ) {
            return candidate;
          }
        }
      }
    }

    function make_xpath(elements: string[]): string {
      return elements.flatMap((element) => [".//" + element, ".//xhtml:" + element]).join(" | ");
    }

    function evaluate_xpath(xpath: string, resultType: ValueOf<Constants<XPathResult>>) {
      return document!.evaluate(
        xpath,
        document!.documentElement!,
        (namespace) => namespace === "xhtml" ? "http://www.w3.org/1999/xhtml" : null,
        resultType,
        null,
      );
    }

    function object_assign<T, U>(target: T, source: U): T & U;
    function object_assign(target: any, ...sources: any[]): any {
      for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)!);
        }
      }
      return target;
    }
  },
};
