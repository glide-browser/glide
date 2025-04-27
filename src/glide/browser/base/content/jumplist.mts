const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

export type JumplistEntry = {
  type: "tab";
  tab_id: number;
};

export class Jumplist {
  max_entries = 100;
  #entries: Array<JumplistEntry> = [];
  #index: number = -1;
  #is_jumping: boolean = false;

  init() {
    GlideBrowser.browser_proxy_api.tabs.onActivated.addListener(change_info => {
      if (this.#is_jumping) {
        this.#is_jumping = false;
        return;
      }

      // If we’re not at the tip, i.e. the user `<C-o>` and then activated a new
      // tab without using `<C-i>` then drop the forward slice as we're starting
      // a new "branch".
      if (this.#index < this.#entries.length - 1) {
        this.#entries.splice(this.#index + 1);
      }

      this.#entries.push({ type: "tab", tab_id: change_info.tabId });
      this.#index = this.#entries.length - 1;

      if (this.#entries.length > this.max_entries) {
        const overflow = this.#entries.length - this.max_entries;
        this.#entries.splice(0, overflow);
        this.#index -= overflow;
      }
    });
  }

  async #switch_tab(entry: JumplistEntry) {
    this.#is_jumping = true;
    await GlideBrowser.browser_proxy_api.tabs.update(entry.tab_id, {
      active: true,
    });
  }

  async jump_backwards() {
    if (this.#index <= 0) {
      return;
    }

    this.#index--;

    await this.#switch_tab(
      assert_present(
        this.#entries[this.#index],
        `no entry for jumplist index ${this.#index}`
      )
    );
  }

  async jump_forwards() {
    if (this.#index >= this.#entries.length - 1) {
      return;
    }

    this.#index++;

    await this.#switch_tab(
      assert_present(
        this.#entries[this.#index],
        `no entry for jumplist index ${this.#index}`
      )
    );
  }
}
