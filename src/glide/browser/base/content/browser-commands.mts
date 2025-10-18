/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const Strings = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");
const { LayoutUtils } = ChromeUtils.importESModule("resource://gre/modules/LayoutUtils.sys.mjs");
const Hinting = ChromeUtils.importESModule("chrome://glide/content/hinting.mjs");
const { assert_never, assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

/**
 * Collection of internal helper functions.
 */
class GlideCommandsClass {
  get_active_commandline_group(): GlideCommandlineGroup | null {
    const commandline = this.#get_active_commandline();
    if (!commandline) {
      return null;
    }

    return commandline.get_active_group();
  }

  /**
   * Get or create the `glide-commandline` element, showing it in the UI.
   */
  async upsert_commandline(opts: { prefill?: string } = {}) {
    // TODO(glide): instead of using prefill, just define a `feedkeys`-esque ex command

    const tab = gBrowser.selectedTab;
    const cached = this.#get_cached_commandline(tab);
    if (cached) {
      cached.refresh_data();
      cached.show(opts);

      // workaround for https://github.com/glide-browser/glide/issues/33
      //
      // there's some weird interaction between setting the input value to `tab `
      // and determining what row to focus.
      //
      // this is a terrible solution to the above problem but I'm planning on completely
      // rewriting the commandline logic from the ground up, so there's no point trying to
      // figure out a more correct fix.
      if (cached.get_active_group() === "tab") {
        cached.focus_next();
      }

      return cached;
    }

    return await this.#create_commandline(tab, opts);
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

  get_hints_location(): glide.HintLocation {
    return gBrowser.$hints_location ?? "content";
  }

  hide_hints() {
    const container = this.#upsert_hints_container();
    container.style.setProperty("display", "none", "important");
  }

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
      const actor = location === "browser-ui"
        ? GlideBrowser.get_chrome_actor()
        : location === "content"
        ? GlideBrowser.get_content_actor()
        : assert_never(location);
      actor.send_async_message("Glide::ExecuteHint", { id: hints[0]!.id });
      this.remove_hints();
      return;
    }

    const hint_keys = GlideBrowser.api.keymaps.list("hint").map((k) => k.lhs);
    const hint_alphabet = hint_keys.length
      ? Hinting.ALPHABET
      : Hinting.ALPHABET.filter((k) => !hint_keys.includes(k));
    const labels = Strings.generate_prefix_free_codes(hint_alphabet, hints.length, Hinting.ALPHABET_COST_MAP);

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

  async #create_commandline(tab: BrowserTab, opts: { prefill?: string } = {}) {
    let browser = gBrowser.getBrowserForTab(tab);

    let glide_commandline = document!.createXULElement("glide-commandline") as GlideCommandLine;

    browser.parentNode.insertAdjacentElement("afterend", glide_commandline);

    await new Promise(r => requestAnimationFrame(r));

    if (window.closed || tab.closing) {
      return null;
    }

    this.#cache_commandline(tab, glide_commandline);

    if (opts.prefill) {
      glide_commandline.prefill = opts.prefill;
    }

    return glide_commandline;
  }

  async toggle_commandline() {
    const commandline = this.#get_cached_commandline(gBrowser.selectedTab);
    if (!commandline) {
      await this.upsert_commandline();
      return;
    }

    commandline.toggle();
  }

  is_commandline_focused(): boolean {
    return this.#get_active_commandline() != null;
  }

  /**
   * Returns the active `GlideCommandLine` element.
   *
   * This only returns anything **if** the commandline is open **and** it is focused.
   */
  #get_active_commandline(): GlideCommandLine | null {
    const commandline = this.#get_cached_commandline(gBrowser.selectedTab);
    if (!commandline) {
      return null;
    }
    if (commandline.hidden) {
      return null;
    }

    const active_element = document?.activeElement;
    if (!active_element) {
      return null;
    }

    if (commandline.contains(active_element)) {
      return commandline;
    }

    return null;
  }

  get_commandline(): GlideCommandLine | null {
    return this.#get_cached_commandline(gBrowser.selectedTab);
  }

  expect_commandline(): GlideCommandLine {
    return assert_present(this.get_commandline(), "No commandline present");
  }

  #get_cached_commandline(tab: BrowserTab): GlideCommandLine | null {
    return tab._glide_commandline;
  }

  #cache_commandline(tab: BrowserTab, excmdbar: Element): void {
    tab._glide_commandline = excmdbar;
  }
}

export const GlideCommands = new GlideCommandsClass();
