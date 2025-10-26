/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

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
