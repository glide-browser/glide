/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const Strings = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");
const { LayoutUtils } = ChromeUtils.importESModule("resource://gre/modules/LayoutUtils.sys.mjs");
const { assert_never } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

class GlideHintsClass {
  show_hints(
    ipc_hints: GlideHintIPC[],
    location: glide.HintLocation,
    auto_activate: boolean,
  ) {
    this.#clear_hints();

    const container = this.#upsert_hints_container();
    container.style.removeProperty("display");

    if (!ipc_hints.length) {
      const notification_id = "glide-no-hints-found";

      // remove any existing notification to avoid spamming, there should still
      // be a visual indicator that the new notification was added
      GlideBrowser.remove_notification(notification_id);
      GlideBrowser.add_notification(notification_id, {
        label: `No hints found`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
      GlideBrowser._change_mode("normal");
      return;
    }

    // the hints return an x/y of the screen rect, so to position it correctly inside the browser UI
    // we need to figure out what the screen rect is for the browser itself and then subtract that
    // from the hint x/y
    const chrome_ui_box = LayoutUtils.getElementBoundingScreenRect(document!.body);
    const hints: GlideResolvedHint[] = ipc_hints.map((hint) => ({
      ...hint,
      label: "",
      x: hint.x - chrome_ui_box.x,
      y: hint.y - chrome_ui_box.y,
    }));

    if (auto_activate && hints.length === 1) {
      this.execute(hints[0]!.id);
      return;
    }

    const hint_chars = GlideBrowser.api.options.get("hint_chars");
    const hint_keys = GlideBrowser.api.keymaps.list("hint").map((k) => k.lhs);

    const alphabet = hint_keys.length
      ? hint_chars.split("").filter((k) => !hint_keys.includes(k))
      : hint_chars.split("");
    const labels = Strings.generate_prefix_free_codes(alphabet, hints.length, this.#make_alphabet_cost_map(hint_chars));

    for (let i = 0; i < hints.length; i++) {
      const hint = hints[i]!;
      hint.label = labels[i]!;

      const hint_div = DOM.create_element("div", {
        className: `glide-reset glide-internal-hint-marker`,
        style: { top: `${hint.y}px`, left: `${hint.x}px`, zIndex: "2147483647" },
        children: [DOM.create_element("span", { children: [hint.label] })],
      });
      container.appendChild(hint_div);
    }

    gBrowser.$hints = hints;
    gBrowser.$hints_location = location;

    document!.body!.insertAdjacentElement("afterend", container);
  }

  hide_hints() {
    const container = this.#upsert_hints_container();
    container.style.setProperty("display", "none", "important");
  }

  execute(id: number) {
    const location = gBrowser.$hints_location ?? "content";
    const actor = location === "browser-ui"
      ? GlideBrowser.get_chrome_actor()
      : location === "content"
      ? GlideBrowser.get_content_actor()
      : assert_never(location);
    actor.send_async_message("Glide::ExecuteHint", { id });
    this.remove_hints();
  }

  /**
   * Remove all hints from the DOM tree.
   */
  #clear_hints() {
    const container = this.#upsert_hints_container();
    container.innerHTML = "";

    gBrowser.$hints = [];
    gBrowser.$hints_location = undefined;
  }

  /**
   * Remove all hints from the DOM tree and switch back to `normal` mode.
   */
  remove_hints() {
    GlideBrowser._change_mode("normal");
    this.#clear_hints();
  }

  /**
   * Hide all hints that don't match the given prefix.
   */
  filter_hints(prefix: string) {
    const container = this.#upsert_hints_container();
    container.style.removeProperty("display");

    for (const child of container.children) {
      if (!child.textContent?.startsWith(prefix)) {
        (child as HTMLElement).style.setProperty("display", "none");
        continue;
      }

      const rest = child.textContent.slice(prefix.length);
      child.replaceChildren(
        DOM.create_element("span", { className: "glide-reset glide-matching-character", children: [prefix] }),
        DOM.create_element("span", { className: "glide-reset", children: [rest] }),
      );
    }
  }

  #upsert_hints_container(): HTMLElement {
    if (gBrowser.$hints_container) {
      return gBrowser.$hints_container;
    }

    const container = DOM.create_element("div", {
      id: "glide-hints-container",
      className: "glide-reset glide-hints-container",
      popover: "manual",
    });
    gBrowser.$hints_container = container;
    return container;
  }

  get_active_hints(): GlideResolvedHint[] {
    return gBrowser.$hints ?? [];
  }

  #alphabet_cost_maps = new Map<string, Record<string, number>>();

  #make_alphabet_cost_map(alphabet: string): Record<string, number> {
    const cached = this.#alphabet_cost_maps.get(alphabet);
    if (cached) {
      return cached;
    }

    // prioritise the chars in their order in the above string
    const cost_map: Record<string, number> = {};
    let cost = 0;
    for (const char of alphabet) {
      cost_map[char] = cost += 0.1;
    }

    this.#alphabet_cost_maps.set(alphabet, cost_map);
    return cost_map;
  }
}

export const GlideHints = new GlideHintsClass();
