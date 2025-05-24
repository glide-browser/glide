/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", {
  global: "current",
});
const { LayoutUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/LayoutUtils.sys.mjs"
);

/**
 * Collection of internal helper functions.
 */
class GlideCommandsClass {
  copy_to_clipboard(data: string, props?: { content_type?: string }) {
    const content_type = props?.content_type ?? "text/plain";

    const transferable = Cc[
      "@mozilla.org/widget/transferable;1"
    ]!.createInstance(Ci.nsITransferable);
    transferable.init(window.docShell!.QueryInterface!(Ci.nsILoadContext));
    transferable.addDataFlavor(content_type);
    transferable.setTransferData(content_type, this.to_istring(data));
    Services.clipboard.setData(
      transferable,
      // @ts-expect-error the generated types aren't smart enough to include `null`
      // as an allowed type, but it is supported at runtime
      /* owner */ null,
      /* type */ Services.clipboard.kGlobalClipboard
    );
  }

  /**
   * Wrap a `string` with a `nsISupportsString` as some C++ interop
   * methods require it.
   */
  to_istring(data: string) {
    let s = Cc["@mozilla.org/supports-string;1"]!.createInstance(
      Ci.nsISupportsString
    );
    s.data = data;
    return s;
  }

  get_active_commandline_group(): GlideCommandlineGroup | null {
    const commandline = this.#get_active_commandline();
    if (!commandline) {
      return null;
    }

    return commandline.get_active_group();
  }

  /**
   * If the commandline is open and in the `tab` group, remove the selected tab.
   */
  remove_active_commandline_browser_tab() {
    const commandline = this.#get_active_commandline();
    if (!commandline) {
      return;
    }

    commandline.remove_focused_browser_tab();
  }

  /**
   * Get or create the `glide-commandline` element, showing it in the UI.
   */
  async upsert_commandline(opts: { prefill?: string } = {}) {
    // TODO(glide): instead of using prefill, just define a `feedkeys`-esque ex command

    const tab = gBrowser.selectedTab;
    const cached = this.#get_cached_commandline(tab);
    if (cached) {
      cached.show(opts);
      cached.refresh_data();
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

    const browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
    browser.$hints = [];
    browser.$hints_location = undefined;
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
        DOM.create_element("span", {
          className: "glide-reset glide-matching-character",
          children: [prefix],
        }),
        DOM.create_element("span", {
          className: "glide-reset",
          children: [rest],
        })
      );
    }
  }

  #upsert_hints_container(): HTMLElement {
    const tab = gBrowser.selectedTab;
    const browser = gBrowser.getBrowserForTab(tab);

    if (browser.$hints_container) {
      return browser.$hints_container;
    }

    const container = DOM.create_element("div", {
      id: "glide-hints-container",
      className: "glide-reset glide-hints-container",
      popover: "manual",
    });
    browser.$hints_container = container;
    return container;
  }

  get_active_hints(): GlideHintIPC[] {
    const browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
    return browser.$hints ?? [];
  }

  get_hints_location(): GlideHintLocation {
    const browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
    return browser.$hints_location ?? "content";
  }

  hide_hints() {
    const container = this.#upsert_hints_container();
    container.style.setProperty("display", "none", "important");
  }

  show_hints(hints: GlideHintIPC[], location: GlideHintLocation) {
    this.#clear_hints();

    const browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
    browser.$hints = hints;
    browser.$hints_location = location;

    const container = this.#upsert_hints_container();
    container.style.removeProperty("display");

    // the hints return an x/y of the screen rect, so to position it correctly inside the browser UI
    // we need to figure out what the screen rect is for the browser itself and then subtract that
    // from the hint x/y
    const chrome_ui_box = LayoutUtils.getElementBoundingScreenRect(
      document!.body
    );

    for (const hint of hints) {
      let y = hint.screen_y - chrome_ui_box.y;
      const x = hint.screen_x - chrome_ui_box.x;
      if (y < 0) {
        // TODO(glide): only do this if the hints come from the content frame
        // TODO(glide): do this filtering in the actor instead so we get better char strings
        continue;
      }

      const hint_div = DOM.create_element("div", {
        className: `glide-reset glide-internal-hint-marker`,
        style: {
          top: `${y}px`,
          left: `${x}px`,
          zIndex: "2140000008",
        },
        children: [DOM.create_element("span", { children: [hint.label] })],
      });
      container.appendChild(hint_div);
    }

    document!.body!.insertAdjacentElement("afterend", container);
  }

  async #create_commandline(tab: BrowserTab, opts: { prefill?: string } = {}) {
    let browser = gBrowser.getBrowserForTab(tab);

    let glide_commandline = document!.createXULElement(
      "glide-commandline"
    ) as GlideCommandLine;

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

  #get_cached_commandline(tab: BrowserTab): GlideCommandLine | null {
    return tab._glide_commandline;
  }

  #cache_commandline(tab: BrowserTab, excmdbar: Element): void {
    tab._glide_commandline = excmdbar;
  }
}

export const GlideCommands = new GlideCommandsClass();
