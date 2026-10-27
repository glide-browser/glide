/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { JSONFile } = ChromeUtils.importESModule("resource://gre/modules/JSONFile.sys.mjs");

interface CommandHistoryData {
  commands: string[];
}

const DEFAULT_MAX_ENTRIES = 100;

function normalize_max_entries(maxEntries: number): number {
  if (!Number.isFinite(maxEntries)) {
    return DEFAULT_MAX_ENTRIES;
  }
  return Math.max(0, Math.floor(maxEntries));
}

class CommandHistoryStore {
  #file: TypedJSONFile<CommandHistoryData> | null = null;
  #loaded: Promise<void> | null = null;

  get path(): string {
    return PathUtils.join(PathUtils.profileDir, ".glide", "command_history.json");
  }

  #get_file(): TypedJSONFile<CommandHistoryData> {
    if (this.#file) {
      return this.#file;
    }

    const path = this.path;
    this.#file = new JSONFile({
      path,
      dataPostProcessor: (data): CommandHistoryData => ({
        commands: Array.isArray(data?.commands)
          ? data.commands.filter((command: unknown) => typeof command === "string")
          : [],
      }),
      beforeSave: () => IOUtils.makeDirectory(PathUtils.parent(path)!, { ignoreExisting: true }),
    }) as TypedJSONFile<CommandHistoryData>;
    return this.#file;
  }

  async ensure_loaded() {
    this.#loaded ??= this.#get_file().load();
    return this.#loaded;
  }

  async list(maxEntries: number): Promise<string[]> {
    await this.ensure_loaded();
    this.#trim(normalize_max_entries(maxEntries));
    return [...this.#get_file().data.commands];
  }

  async add(command: string, maxEntries: number) {
    await this.ensure_loaded();

    const file = this.#get_file();
    const trimmed = command.trim();

    const limit = normalize_max_entries(maxEntries);
    if (trimmed && limit > 0) {
      file.data.commands = [trimmed, ...file.data.commands.filter((existing) => existing !== trimmed)];
    }

    this.#trim(limit);
    file.saveSoon();
  }

  #trim(limit: number) {
    const file = this.#get_file();
    if (file.data.commands.length > limit) {
      file.data.commands = file.data.commands.slice(0, limit);
      file.saveSoon();
    }
  }

  async flush() {
    if (!this.#file?.dataReady) return;
    await this.#file._save();
  }

  async reload(): Promise<void> {
    await this.#loaded;
    await this.#file?.finalize();
    this.#file = null;
    this.#loaded = null;
  }

  async reset(): Promise<void> {
    await this.ensure_loaded();
    this.#get_file().data.commands = [];
    await this.flush();
  }
}

export const CommandHistory = new CommandHistoryStore();
