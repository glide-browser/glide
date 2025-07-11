import type { Sandbox } from "../sandbox.mts";

const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);

type JumplistEntry = {
  type: "tab";
  tab_id: number;
};

export class Jumplist {
  #entries: Array<JumplistEntry> = [];
  #index: number = -1;
  #is_jumping: boolean = false;
  #sandbox: Sandbox;

  constructor(sandbox: Sandbox) {
    const { glide, browser } = sandbox;
    this.#sandbox = sandbox;

    glide.excmds.create(
      { name: "jumplist_back", description: "Jump back in the jumplist" },
      () => {
        this.jump_backwards();
      }
    );
    glide.excmds.create(
      {
        name: "jumplist_forward",
        description: "Jump forward in the jumplist",
      },
      () => {
        this.jump_forwards();
      }
    );

    glide.autocmds.create("ConfigLoaded", () => {
      browser.tabs.onActivated.addListener(change_info => {
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

        const max_entries = glide.options.get("jumplist_max_entries");
        if (this.#entries.length > max_entries) {
          const overflow = this.#entries.length - max_entries;
          this.#entries.splice(0, overflow);
          this.#index -= overflow;
        }
      });
    });
  }

  async #get_tab(id: number): Promise<Browser.Tabs.Tab | null> {
    return this.#sandbox.browser.tabs.get(id).catch(() => null);
  }

  async #switch_tab(entry: JumplistEntry) {
    this.#is_jumping = true;
    await this.#sandbox.browser.tabs.update(entry.tab_id, { active: true });
  }

  async jump_backwards() {
    while (true) {
      if (this.#index <= 0) {
        return;
      }

      this.#index--;

      const entry = assert_present(
        this.#entries[this.#index],
        `no entry for jumplist index ${this.#index}`
      );
      const tab = await this.#get_tab(entry.tab_id);
      if (!tab) {
        // go until we find a tab that hasn't been deleted
        continue;
      }

      await this.#switch_tab(entry);
      return;
    }
  }

  async jump_forwards() {
    while (true) {
      if (this.#index >= this.#entries.length - 1) {
        return;
      }

      this.#index++;

      const entry = assert_present(
        this.#entries[this.#index],
        `no entry for jumplist index ${this.#index}`
      );
      const tab = await this.#get_tab(entry.tab_id);
      if (!tab) {
        // go until we find a tab that hasn't been deleted
        continue;
      }

      await this.#switch_tab(entry);
      return;
    }
  }
}
