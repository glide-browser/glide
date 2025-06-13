/**
 * Contains utilities that are useful when working directly on Glide.
 */
class GlideBrowserDevClass {
  #docs_fs_modified_timestamps: Map<string, number> = new Map();
  #docs_watcher_id: number | null = null;
  #docs_pref = "glide.dev.reload_docs_files";

  init() {
    GlideBrowserDev.maybe_toggle_docs_watcher();

    Services.prefs.addObserver(this.#docs_pref, {
      observe() {
        GlideBrowserDev.maybe_toggle_docs_watcher();
      },
    });
  }

  maybe_toggle_docs_watcher() {
    if (Services.prefs.getBoolPref(this.#docs_pref)) {
      this.#docs_watcher_id = setInterval(() => {
        this.#check_docs_change();
        this.#check_tutor_change();
      }, 200) as any as number;
    } else if (this.#docs_watcher_id) {
      clearInterval(this.#docs_watcher_id);
    }
  }

  /**
   * Dirty method to live reload docs.
   *
   * This checks if the current URL is a Glide docs page and if it is,
   * stats the file to check if it has been modified and reloads the page if so.
   *
   * The stat calls here *should* be pretty cheap (at least on my system) as AFAIK
   * they should be cached and also shouldn't increase SSD wear as only writes should
   * contribute to drive wear.
   */
  async #check_docs_change() {
    const url = gBrowser?.selectedBrowser?.currentURI.spec as
      | string
      | undefined;
    if (
      !url ||
      !url.startsWith("file://") ||
      !url.match(/glide\/docs\/.*\.html(#.*)?$/)
    ) {
      return;
    }

    const file_path = new URL(url).pathname;
    const stat = await IOUtils.stat(file_path);
    if (!stat.lastModified) {
      throw new Error(`couldn't stat ${file_path}`);
    }

    const last_modified = this.#docs_fs_modified_timestamps.get(file_path);
    if (last_modified === undefined || stat.lastModified > last_modified) {
      this.#docs_fs_modified_timestamps.set(file_path, stat.lastModified);
      BrowserCommands.reload();
      return;
    }

    // also reload if some dependency files have changed
    const parts = file_path.split("/");
    const paths = [[...parts.slice(0, -1), "docs.css"].join("/")];
    await this.#check_files(paths);
  }

  async #check_files(paths: string[]) {
    for (const path of paths) {
      const stat = await IOUtils.stat(path);
      if (!stat.lastModified) {
        throw new Error(`couldn't stat ${path}`);
      }

      const last_modified = this.#docs_fs_modified_timestamps.get(path);
      if (last_modified === undefined || stat.lastModified > last_modified) {
        this.#docs_fs_modified_timestamps.set(path, stat.lastModified);
        BrowserCommands.reload();
        return;
      }
    }
  }

  async #check_tutor_change() {
    const url = gBrowser?.selectedBrowser?.currentURI.spec as
      | string
      | undefined;

    if (!url || !url.startsWith("resource://glide-tutor/")) {
      return;
    }

    const base_path = PathUtils.join(
      Services.dirsvc.get("GreD", Ci.nsIFile).path,
      "chrome",
      "glide",
      "res",
      "glide-tutor"
    );
    await this.#check_files([
      PathUtils.join(base_path, "index.html"),
      PathUtils.join(base_path, "tutor.css"),
      PathUtils.join(base_path, "tutor.js"),
    ]);
  }
}

export const GlideBrowserDev = new GlideBrowserDevClass();
