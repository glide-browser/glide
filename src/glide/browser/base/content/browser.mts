/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Split } from "type-fest";
import type { GlideDocsParent } from "../../actors/GlideDocsParent.sys.mjs";
import type { GlideHandlerParent } from "../../actors/GlideHandlerParent.sys.mjs";
import type { GlideExcmdInfo, GlideOperator } from "./browser-excmds-registry.mts";
import type { Messenger as MessengerType } from "./browser-messenger.mts";
import type { Jumplist } from "./plugins/jumplist.mts";
import type { Sandbox } from "./sandbox.mts";
import type { ExtensionContentFunction } from "./utils/ipc.mts";

const { make_glide_api, make_buffer_options } = ChromeUtils.importESModule("chrome://glide/content/browser-api.mjs", {
  global: "current",
});
const DefaultKeymaps = ChromeUtils.importESModule("chrome://glide/content/plugins/keymaps.mjs", { global: "current" });
const { GlideBrowserDev } = ChromeUtils.importESModule("chrome://glide/content/browser-dev.mjs", { global: "current" });
const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs", { global: "current" });
const JumplistPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/jumplist.mjs");
const ShimsPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/shims.mjs");
const HintsPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/hints.mjs");
const WhichKeyPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/which-key.mjs", {
  global: "current",
});
const CommandLine = ChromeUtils.importESModule("chrome://glide/content/browser-commandline.mjs", { global: "current" });
const DocumentMirror = ChromeUtils.importESModule("chrome://glide/content/document-mirror.mjs", { global: "current" });
const Promises = ChromeUtils.importESModule("chrome://glide/content/utils/promises.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const { assert_never, assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const TSBlank = ChromeUtils.importESModule("chrome://glide/content/bundled/ts-blank-space.mjs");
const { redefine_getter } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");
const { create_sandbox } = ChromeUtils.importESModule("chrome://glide/content/sandbox.mjs");
const { Messenger } = ChromeUtils.importESModule("chrome://glide/content/browser-messenger.mjs", { global: "current" });
const { JSONFile } = ChromeUtils.importESModule("resource://gre/modules/JSONFile.sys.mjs");
const { ExtensionParent } = ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

declare var document: Document & { documentElement: HTMLElement };

export interface State {
  mode: GlideMode;
  operator: GlideOperator | null;
}
export interface StateChangeMeta {
  /* By default, when exiting visual mode we collapse the selection but for certain cases, e.g.
   * yanking, we want to display a short animation first. */
  disable_auto_collapse?: boolean;
}
type ResolvedAddonCache = {
  addons: Record<string, { id: string }>;
};

const _defaultState: State = { mode: "normal", operator: null };

export type StateChangeListener = (
  new_state: State,
  old_state: State,
  meta: StateChangeMeta | undefined,
) => void;

const DEBOUNCE_MODE_ANIMATION_FRAMES = 3;

class GlideBrowserClass {
  state_listeners = new Set<StateChangeListener>();
  state = { ..._defaultState };
  key_manager = new Keys.KeyManager();
  config_path: string | null = null;

  #api: typeof glide | null = null;
  _log: ConsoleInstance = console.createInstance
    ? console.createInstance({ prefix: "Glide", maxLogLevelPref: "glide.logging.loglevel" })
    // createInstance isn't defined in tests
    : (console as any);

  // added in `.reload_config()`
  jumplist: Jumplist = null as any;

  #startup_listeners = new Set<() => void>();
  #startup_finished: boolean = false;

  // note: this URI doesn't actually exist but defining it like this
  //       means that devtools can resolve stack traces and show the
  //       config contents
  #config_uri = "chrome://glide/config/glide.ts";

  autocmds: {
    [K in glide.AutocmdEvent]?: {
      pattern: glide.AutocmdPatterns[K];
      callback: (
        args: glide.AutocmdArgs[K],
      ) => (() => void | Promise<void>) | void | Promise<void>;
    }[];
  } = {};

  #messenger_id: number = 0;
  #messengers: Map<number, MessengerType<any>> = new Map();

  init() {
    document!.addEventListener("blur", this.#on_blur.bind(this), true);
    document!.addEventListener("keydown", this.#on_keydown.bind(this), true);
    document!.addEventListener("keypress", this.#on_keypress.bind(this), true);
    document!.addEventListener("keyup", this.#on_keyup.bind(this), true);
    window.addEventListener("MozDOMFullscreen:Entered", this.#on_fullscreen_enter.bind(this), true);
    window.addEventListener("MozDOMFullscreen:Exited", this.#on_fullscreen_exit.bind(this), true);

    // As this code is ran very early in the browser startup process, we can't rely on things like
    // `gNotificationBox` working immediately as there are a couple of error states
    // depending on how fast/slow our config loading is, it'll either cause an error or just silently
    // ignore the notification....
    //
    // So we workaround this by registering an observer that will be called later in the
    // browser startup process when everything we need is available. Note that I found the
    // `browser-idle-startup-tasks-finished` event through sheer trial and error, there may
    // be a more applicable event we should be waiting for.
    const startup_observer: nsIObserver = {
      observe() {
        GlideBrowser._log.debug("browser-idle-startup-tasks-finished observer called");

        GlideBrowser.#_check_mirrored_document_mutations();
        DocumentMirror.mirror_into_document(document, GlideBrowser._hidden_browser.browsingContext.window!.document!);

        GlideBrowser.#startup_finished = true;

        const listeners = [...GlideBrowser.#startup_listeners];
        GlideBrowser.#startup_listeners.clear();

        for (const listener of listeners) {
          listener();
        }

        GlideBrowser.add_state_change_listener(GlideBrowser.#state_change_autocmd);

        GlideBrowserDev.init();

        gBrowser.addProgressListener(GlideBrowser.progress_listener);

        Services.obs.removeObserver(startup_observer, "browser-idle-startup-tasks-finished");
      },
    };
    Services.obs.addObserver(startup_observer, "browser-idle-startup-tasks-finished");

    Services.els.addListenerChangeListener(DocumentMirror.make_listener_change_observer());

    this.on_startup(() => {
      // check for extension errors every 500ms as there are no listeners we can register
      // and the extension code is running with different privileges which makes setting
      // up listeners a bit dubious / difficult
      setInterval(this.flush_pending_error_notifications.bind(this), 500);
    });

    // set all_windows to false as this code is ran when new windows are created, which could otherwise
    // cause weird issues, e.g. setting an option in one window, and then creating a new window
    // would reset the previously set option; this behaviour only makes sense when explicitly reloading the config.
    const config_promise = this.reload_config(/* all_windows */ false);

    // copy the glide.d.ts file to the profile dir so it's easy to
    // refer to it in the config file
    this.on_startup(async () => {
      await config_promise;

      const { write_d_ts } = ChromeUtils.importESModule("chrome://glide/content/config-init.mjs");

      await write_d_ts(this.profile_config_dir);

      if (this.config_path) {
        await write_d_ts(PathUtils.parent(this.config_path)!);
      }
    });

    this.on_startup(async () => {
      await config_promise;

      const results = await Promise.allSettled((GlideBrowser.autocmds.WindowLoaded ?? []).map(cmd =>
        (async () => {
          const cleanup = await cmd.callback({});
          if (typeof cleanup === "function") {
            throw new Error("WindowLoaded autocmds cannot define cleanup functions");
          }
        })()
      ));

      for (const result of results) {
        if (result.status === "fulfilled") {
          continue;
        }

        GlideBrowser._log.error(result.reason);
        const loc = GlideBrowser.#clean_stack(result.reason, "init/") ?? "<unknown>";
        GlideBrowser.add_notification("glide-autocmd-error", {
          label: `Error occurred in WindowLoaded autocmd \`${loc}\` - ${result.reason}`,
          priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
          buttons: [GlideBrowser.remove_all_notifications_button],
        });
      }
    });

    // store a bit indicating all Glide versions the current profile has used so that
    // we can provide helpful notifications when defaults are changed in the future
    this.on_startup(async () => {
      const file = this.versions_file;
      await file.load();

      if (file.data[Services.appinfo.version]) {
        return;
      }

      file.data[Services.appinfo.version] = true;
      file.saveSoon();
    });

    this.on_startup(async () => {
      await this._setup_scroll_breaking_change_notification();
    });
  }

  async reload_config(all_windows = true) {
    // note: we have to initialise this promise as early as possible so that we don't
    //       register the listener *after* the extension has started up, therefore
    //       resulting in the listener never firing.
    const extension_startup = this._extension_startup_promise;

    await this.#reload_config(all_windows);

    this.on_startup(async () => {
      await extension_startup;
      await this.#invoke_urlenter_autocmd(gBrowser.currentURI);
    });

    this.on_startup(async () => {
      await extension_startup;
      await this.#state_change_autocmd(this.state, { mode: null, operator: null });
    });

    this.on_startup(async () => {
      await extension_startup;

      this._log.debug("[autocmds] emitting ConfigLoaded");
      const results = await Promise.allSettled((GlideBrowser.autocmds.ConfigLoaded ?? []).map(cmd =>
        (async () => {
          const cleanup = await cmd.callback({});
          if (typeof cleanup === "function") {
            throw new Error("ConfigLoaded autocmds cannot define cleanup functions");
          }
        })()
      ));

      for (const result of results) {
        if (result.status === "fulfilled") {
          continue;
        }

        GlideBrowser._log.error(result.reason);
        const loc = GlideBrowser.#clean_stack(result.reason, "init/") ?? "<unknown>";
        GlideBrowser.add_notification("glide-autocmd-error", {
          label: `Error occurred in ConfigLoaded autocmd \`${loc}\` - ${result.reason}`,
          priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
          buttons: [GlideBrowser.remove_all_notifications_button],
        });
      }
    });

    this.on_startup(() => {
      const Please = ChromeUtils.importESModule("chrome://glide/content/please.mjs");
      Please.pretty(this.api, this.browser_proxy_api);
    });

    this.on_startup(async () => {
      if (this.#config_watcher_id) {
        clearInterval(this.#config_watcher_id);
        this.#config_watcher_id = undefined;
        this.#config_modified_timestamp = undefined;
      }

      const path = this.config_path;
      if (!path) return;

      this.#config_watcher_id = setInterval(async () => {
        if (this.get_notification_by_id(this.config_pending_notification_id)) {
          // no need to do anything if we've already notified
          return;
        }

        const stat = await IOUtils.stat(path);
        if (!stat.lastModified) {
          throw new Error(`[config watcher]: stat of \`${path}\` does not include a \`lastModified\` value`);
        }

        if (this.#config_modified_timestamp === undefined) {
          // ignore first stat
          this.#config_modified_timestamp = stat.lastModified;
          return;
        }

        if (stat.lastModified > this.#config_modified_timestamp) {
          this.add_notification(this.config_pending_notification_id, {
            label: "The config has been modified!",
            priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
            buttons: [
              {
                "l10n-id": "glide-error-notification-reload-config-button",
                callback: () => {
                  GlideBrowser.reload_config();
                },
              },
            ],
          });

          // reset the timestamp so that we don't accidentally report config modifications
          // twice, e.g. if you edit the config, then edit it again & discard the notification,
          // then without this we'd report another notification immediately after the discard
          // as we'd check the stat again and see a new timestamp.
          this.#config_modified_timestamp = undefined;
        }
      }, 500);
    });

    if (all_windows) {
      // reload the config in other windows as well to avoid potential mismatches
      const promises: Array<Promise<void>> = [];
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        if (win === window) {
          continue;
        }
        promises.push(win.GlideBrowser.reload_config(/* all_windows */ false));
      }
      await Promise.allSettled(promises);
    }
  }

  #config_watcher_id: number | undefined;
  readonly config_pending_notification_id: string = "glide-config-reload-notification";
  #config_modified_timestamp: number | undefined;

  #sandbox: Sandbox | null = null;
  get config_sandbox() {
    this.#sandbox ??= create_sandbox({
      window: this.sandbox_window,
      original_window: window,
      document: this._mirrored_document,
      console,
      get glide() {
        return GlideBrowser.api;
      },
      get browser() {
        return GlideBrowser.browser_proxy_api;
      },
    });
    return this.#sandbox;
  }

  /**
   * Used for exposing DOM APIs that are unrelated to the top chrome window.
   */
  get _hidden_browser(): nsIWindowlessBrowser {
    // note: this needs to be defined as a standalone property so that it is never GC'd
    return redefine_getter(this, "_hidden_browser", Services.appShell.createWindowlessBrowser(/* isChrome */ false));
  }

  get sandbox_window(): HiddenWindow {
    return assert_present(this._hidden_browser.browsingContext.window) as HiddenWindow;
  }

  #_mirrored_document_observer?: MutationObserver;
  #_mirrored_document_observer_pending: MutationRecord[] = [];

  /**
   * A mirror of the chrome `Document` so it can be mutated / accessed without giving
   * full access to the underlying `ChromeWindow`.
   */
  get _mirrored_document(): MirroredDocument {
    const target = GlideBrowser._hidden_browser.browsingContext.window!.document!;

    this.#_mirrored_document_observer = new MutationObserver((mutations) => {
      this.#_mirrored_document_observer_pending.push(...mutations);
    });
    this.#_mirrored_document_observer.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    return redefine_getter(this, "_mirrored_document", target as MirroredDocument);
  }

  #_check_mirrored_document_mutations() {
    const pending = GlideBrowser.#_mirrored_document_observer_pending;
    const observer = GlideBrowser.#_mirrored_document_observer;
    if (observer) {
      pending.push(...observer.takeRecords());
      observer.disconnect();
      GlideBrowser.#_mirrored_document_observer = undefined;
    }

    if (pending.length) {
      console.error("pre load mutations", pending);
      this.add_notification("document-pre-load-mutations", {
        label: `Detected ${pending.length} mutation${
          pending.length !== 1 ? "s" : ""
        } to the document before it was fully loaded. Mutations should only be performed within the WindowLoaded autocmd.`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
      });
    }

    GlideBrowser.#_mirrored_document_observer_pending = [];
  }

  #reload_config_clear_properties: Set<string> = new Set();
  set_css_property(name: string, value: string, buf: boolean) {
    const style = document.documentElement.style;
    const previous = style.getPropertyValue(name);

    style.setProperty(name, value);
    this.#reload_config_clear_properties.add(name);

    if (buf) {
      this.buffer_cleanups.push({
        callback: () => {
          if (previous) {
            style.setProperty(name, previous);
          } else {
            style.removeProperty(name);
          }
        },
        source: `${name}: ${value}`,
      });
    }
  }

  reload_config_remove_elements: Set<HTMLElement> = new Set();
  #reload_config_callbacks: Array<() => void> = [];

  on_reload_config(callback: () => void) {
    this.#reload_config_callbacks.push(callback);
  }

  async #reload_config(all_windows: boolean) {
    this.#api = null;
    this.config_path = null;
    this._modes = {} as any;
    this.#messengers = new Map();
    this.#user_cmds = new Map();
    this.#sandbox = null;

    const callbacks = this.#reload_config_callbacks;
    this.#reload_config_callbacks = [];
    for (const callback of callbacks) {
      try {
        callback();
      } catch (err) {
        // if an error happens in these callbacks we don't actually want to throw
        // as that could result in some very weird state mismatches and make the
        // browser not very functional, so just log them instead.
        console.error(err);
      }
    }

    const css_properties = this.#reload_config_clear_properties;
    this.#reload_config_clear_properties = new Set();
    for (const property of css_properties) {
      document.documentElement.style.removeProperty(property);
    }

    const remove_elements = this.reload_config_remove_elements;
    this.reload_config_remove_elements = new Set();
    for (const element of remove_elements) {
      // the element may have been removed separately, so we just ignore any errors
      try {
        element.remove();
      } catch {}
    }

    try {
      this.remove_all_notifications();
    } catch {
      // just ignore any errors here as we may try to call this too early in
      // startup where it also isn't even applicable yet
    }

    this.autocmds = {};

    this.key_manager = new Keys.KeyManager();

    // builtin modes
    this.api.modes.register("normal", { caret: "block" });
    this.api.modes.register("visual", { caret: "block" });
    this.api.modes.register("ignore", { caret: "line" });
    this.api.modes.register("insert", { caret: "line" });
    this.api.modes.register("command", { caret: "line" });
    this.api.modes.register("op-pending", { caret: "underline" });

    const sandbox = this.config_sandbox;

    // default plugins
    ShimsPlugin.init(sandbox);
    HintsPlugin.init(sandbox);
    DefaultKeymaps.init(sandbox);
    WhichKeyPlugin.init(sandbox);
    this.jumplist = new JumplistPlugin.Jumplist(sandbox);

    if (this.#startup_finished) {
      // clear all registered event listeners and any custom state on the `browser` object.
      //
      // note: we only do this when `all_windows` is `true` because the addon state is global and shared
      //       across windows, so we should only reload it when we are mutating the global state.
      if (all_windows) {
        const addon = await AddonManager.getAddonByID("glide-internal@mozilla.org");
        await addon.reload();
      }

      // TODO(glide): only do this if we need to
      redefine_getter(this, "browser_parent_api", this.#create_browser_parent_api());
      redefine_getter(this, "browser_proxy_api", this.#create_browser_proxy_api());
    }

    const config_path = await this.resolve_config_path();
    this.config_path = config_path;

    if (!config_path) {
      this._log.info("No `glide.ts` config found");
      return;
    }

    this._log.info(`Executing config file at \`${config_path}\``);
    const config_str = await IOUtils.readUTF8(config_path);

    try {
      const config_js = TSBlank.default(config_str);
      Cu.evalInSandbox(config_js, sandbox, null, this.#config_uri, 1, false);
    } catch (err) {
      this._log.error(err);

      const loc = this.#clean_stack(err, this.#reload_config.name) ?? "glide.ts";
      this.add_notification(this.config_error_id, {
        label: `An error occurred while evaluating \`${loc}\` - ${err}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [
          {
            "l10n-id": "glide-error-notification-reload-config-button",
            callback: () => {
              GlideBrowser.reload_config();
            },
          },
        ],
      });
    }
  }

  get _extension_startup_promise(): Promise<void> {
    return redefine_getter(
      this,
      "_extension_startup_promise",
      new Promise<void>((resolve) => {
        const listener = (_: unknown, context: WebExtensionBackgroundContext) => {
          this._log.debug(`extension-proxy-context-load called with viewType = ${context.viewType}`);
          if (context.viewType === "background") {
            resolve();
            this.extension.off("extension-proxy-context-load", listener);
          }
        };

        this.extension.on("extension-proxy-context-load", listener);
      }),
    );
  }

  /**
   * Stores a `Record<XPI URL, AddonData>`, so that we can cache XPI URL -> id lookups, and avoid
   * fetching XPI URLs unless we really need to.
   */
  get resolved_addons_cache_file(): TypedJSONFile<ResolvedAddonCache> {
    // note: there is an invariant here that the profile directory cannot be changed in the window this code is running in
    const cache_path = GlideBrowser.api.path.join(GlideBrowser.api.path.profile_dir, ".glide", "addons.json");

    return redefine_getter(
      this,
      "resolved_addons_cache_file",
      new JSONFile({
        path: cache_path,
        dataPostProcessor: (data): ResolvedAddonCache => !data.addons ? { ...data, addons: {} } : data,
      }) as TypedJSONFile<ResolvedAddonCache>,
    );
  }

  get versions_file(): TypedJSONFile<Record<string, boolean>> {
    const file_path = GlideBrowser.api.path.join(GlideBrowser.api.path.profile_dir, ".glide", "versions.json");
    return redefine_getter(
      this,
      "versions_file",
      new JSONFile({
        path: file_path,
        dataPostProcessor: (data) => data ? data : {},
      }) as TypedJSONFile<Record<string, boolean>>,
    );
  }

  /** potentially notify the user of a breaking change to scroll defaults */
  notify_scroll_breaking_change: (() => void) | null = null;

  async _setup_scroll_breaking_change_notification() {
    const pref = "glide.notifications.scroll_instant_to_smooth";
    if (Services.prefs.getBoolPref(pref, false)) {
      // already notified
      return;
    }

    const oldest_version_file = GlideBrowser.api.path.join(
      GlideBrowser.api.path.profile_dir,
      "glide__compatibility_oldest_version.txt",
    );
    if (!(await GlideBrowser.api.fs.exists(oldest_version_file))) {
      // this can happen the *very first* time the browser is launched
      return;
    }
    const version_full = await GlideBrowser.api.fs.read(oldest_version_file, "utf8").then((version) =>
      version.trimEnd()
    ).catch((err) => {
      this._log.error("error while reading ", oldest_version_file, err);
      return null;
    });
    if (!version_full) {
      // something very weird happened if we couldn't read the version file, so just bail
      Services.prefs.setBoolPref(pref, true);
      return;
    }

    // strip out the build id, we only care about the actual version
    const oldest_version = version_full.slice(0, version_full.indexOf("_"));
    this._log.debug("oldest used version", oldest_version);

    if (Services.vc.compare(oldest_version, "0.1.53a") > 0) {
      Services.prefs.setBoolPref(pref, true);
      // oldest version is newer than 0.1.53a, nothing to do as the user never saw the previous instant scroll behaviour
      return;
    }

    this.notify_scroll_breaking_change = () => {
      this.notify_scroll_breaking_change = null;
      Services.prefs.setBoolPref(pref, true);

      // corresponds to the id in engine/browser/components/customizableui/content/panelUI.inc.xhtml
      const notification_id = "glide-smooth-scroll-default";

      AppMenuNotifications.showNotification(
        notification_id,
        // main action, the "learn more" button
        {
          // note: for some reason, using the `resource://glide-docs/changelog.html` version completely breaks the browser.
          docs_url: "https://glide-browser.app/changelog#0.1.54a",
          callback() {
            AppMenuNotifications.removeNotification(notification_id);
            gBrowser.addTrustedTab(this.docs_url, { inBackground: false });
          },
        },
        // :clear
        { callback: () => AppMenuNotifications.removeNotification(notification_id) },
      );
    };
  }

  async #state_change_autocmd(
    new_state: State,
    old_state: Omit<State, "mode"> & { mode: GlideMode | null },
  ) {
    const cmds = GlideBrowser.autocmds.ModeChanged ?? [];
    if (!cmds.length) {
      return;
    }

    const args: glide.AutocmdArgs["ModeChanged"] = { new_mode: new_state.mode, old_mode: old_state.mode };

    // TODO: display errors as they come in
    const results = await Promise.allSettled(cmds.map(cmd =>
      (async () => {
        if (cmd.pattern !== "*") {
          const [left, right] = cmd.pattern.split(":") as Split<
            typeof cmd.pattern,
            ":"
          >;

          if (left !== "*" && left !== old_state.mode) {
            // no match
            return;
          }

          if (right !== "*" && right !== new_state.mode) {
            // no match
            return;
          }
        }

        const cleanup = await cmd.callback(args);
        if (typeof cleanup === "function") {
          throw new Error("ModeChanged autocmds cannot define cleanup functions");
        }
      })()
    ));

    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      GlideBrowser._log.error(result.reason);

      // TODO: if there are many errors this would be overwhelming...
      //       maybe limit the number of errors we display at once?

      const loc = GlideBrowser.#clean_stack(result.reason, "#state_change_autocmd")
        ?? "<unknown>";
      GlideBrowser.add_notification("glide-autocmd-error", {
        label: `Error occurred in ModeChanged autocmd \`${loc}\` - ${result.reason}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    }
  }

  flush_pending_error_notifications() {
    const errors = this.extension.backgroundContext?.$glide_errors;
    if (!errors) {
      return;
    }

    this.extension.backgroundContext.$glide_errors = new Set();

    for (const { error, source } of errors) {
      const loc = this.#clean_stack(error, source) ?? "<unknown>";
      this.add_notification(this.config_error_id, {
        label: `An error occurred inside a Web Extension listener at ${loc} - ${error}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [this.remove_all_notifications_button],
      });
    }
  }

  add_notification(
    type: string,
    props: {
      priority: number;
      label: string | DocumentFragment;
      eventCallback?: (
        parameter: "removed" | "dismissed" | "disconnected",
      ) => void;
      buttons?: GlobalBrowser.NotificationBox.Button[];
    },
  ) {
    this.on_startup(() => {
      const { buttons, ...data } = props;
      gNotificationBox.appendNotification(
        type,
        data,
        buttons,
        // for the vast majority of our notifications, the click jacking delay just adds
        // visual noise and distraction as most of them will be triggered after say a keypress,
        // not when just browsing the web normally.
        //
        // of course this *could* stil happen, but I think the tradeoff is worth the risk of
        // some user potentially accidentally clicking a notification button.
        /* disable clickjacking */ true,
      );
    });
  }

  get_notification_by_id(id: string): GlobalBrowser.Notification | null {
    return gNotificationBox.getNotificationWithValue(id);
  }

  remove_notification(type: string): boolean {
    let found = false;

    for (const notification of gNotificationBox.allNotifications) {
      const value = notification.getAttribute("value");
      if (value !== type) {
        continue;
      }

      found = true;
      gNotificationBox.removeNotification(notification);
    }

    return found;
  }

  remove_all_notifications(): void {
    for (const notification of gNotificationBox.allNotifications) {
      gNotificationBox.removeNotification(notification);
    }
  }

  remove_all_appmenu_notifications(): void {
    for (const notification of AppMenuNotifications.notifications) {
      AppMenuNotifications.removeNotification(notification.id);
    }
  }

  create_messenger<Messages extends Record<string, any>>(receiver: (message: glide.Message<Messages>) => void) {
    const id = GlideBrowser.#messenger_id++;
    const messenger = new Messenger(id, receiver);
    GlideBrowser.#messengers.set(id, messenger);
    return messenger;
  }

  async call_messenger(id: number, message: { name: string; data: any }) {
    const messenger = this.#messengers.get(id);
    if (!messenger) {
      throw new Error(`no messenger with ID: ${id}`);
    }

    await Promise.resolve().then(() => messenger._recv(message)).catch((err) => {
      GlideBrowser._log.error(err);

      const loc = GlideBrowser.#clean_stack(err, "_recv")
        ?? "<unknown>";
      GlideBrowser.add_notification("glide-messenger-error", {
        label: `Error occurred in messenger receiver \`${loc}\` - ${err}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    });
  }

  /**
   * Listener that, once registered with `gBrowser.addProgressListener()`, will be invoked
   * for different state changes in the browser.
   */
  get progress_listener(): Partial<nsIWebProgressListener> {
    return redefine_getter(this, "progress_listener", {
      QueryInterface: ChromeUtils.generateQI([
        "nsIWebProgressListener",
        "nsISupportsWeakReference",
      ]),

      $last_location: null as string | null,

      /**
       * See https://github.com/mozilla-firefox/firefox/blob/199896bcd330d391eae8e0eff155f99d0881d59b/uriloader/base/nsIWebProgressListener.idl#L541
       */
      async onLocationChange(
        web_progress: nsIWebProgress,
        _request: nsIRequest,
        location: nsIURI,
        flags?: u32,
      ) {
        GlideBrowser._log.debug("onLocationChange", location.spec, flags, `topLevel=${web_progress.isTopLevel}`);
        if (!flags) {
          flags = 0;
        }

        // `onLocationChange` can be called multiple times during loads of the same location change,
        // for example `google.com` results in two calls at the time of writing, one with *no* flags set
        // and another with `STATE_START`, `STATE_BROKEN`, and `LOCATION_CHANGE_SAME_DOCUMENT`. I don't
        // quite understand *why* this happens yet.
        //
        // To avoid firing events twice for the same load, we explicitly check if the location string
        // is the same when `LOCATION_CHANGE_SAME_DOCUMENT` is set so that SPAs can still trigger new
        // events, as they are conceptually different pages.
        if (
          flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT
          && this.$last_location === location.spec
        ) {
          return;
        }

        this.$last_location = location.spec;

        if (flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_HASHCHANGE) {
          // ignore changes that are just to the `#` part of the url
          return;
        }

        if (!web_progress.isTopLevel) {
          return; // ignore iframes etc.
        }

        GlideBrowser._log.debug("onLocationChange - clearing buffer");
        await GlideBrowser.clear_buffer();

        await GlideBrowser.#invoke_urlenter_autocmd(location);
      },
    });
  }

  get active_tab_id(): number {
    const tab = gBrowser?.selectedTab;
    if (!tab) {
      throw new Error("could not resolve tab, did you call this too early in startup?");
    }

    return assert_present(
      GlideBrowser.extension?.tabManager?.getWrapper?.(tab),
      "could not resolve tab, did you call this too early in startup?",
    ).id;
  }

  async invoke_commandlineexit_autocmd() {
    const results = await Promise.allSettled((GlideBrowser.autocmds.CommandLineExit ?? []).map(cmd =>
      (async () => {
        const cleanup = await cmd.callback({});
        if (typeof cleanup === "function") {
          throw new Error("CommandLineExit autocmds cannot define cleanup functions");
        }
      })()
    ));

    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      GlideBrowser._log.error(result.reason);
      const loc = GlideBrowser.#clean_stack(result.reason, "init/") ?? "<unknown>";
      GlideBrowser.add_notification("glide-autocmd-error", {
        label: `Error occurred in CommandLineExit autocmd \`${loc}\` - ${result.reason}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    }
  }

  async #invoke_urlenter_autocmd(location: nsIURI) {
    const cmds = GlideBrowser.autocmds.UrlEnter ?? [];
    if (!cmds.length) {
      return;
    }

    const args: glide.AutocmdArgs["UrlEnter"] = {
      url: location.spec,
      get tab_id() {
        return assert_present(
          GlideBrowser.extension.tabManager.getWrapper(gBrowser.selectedTab),
          "could not resolve tab wrapper",
        ).id;
      },
    };

    const results = await Promise.allSettled(cmds.map(cmd =>
      (async () => {
        if (!GlideBrowser.#test_url_autocmd_pattern(cmd.pattern, location)) {
          return;
        }

        const cleanup = await cmd.callback(args);
        if (typeof cleanup === "function") {
          GlideBrowser.buffer_cleanups.push({ callback: cleanup, source: "UrlEnter cleanup" });
        }
      })()
    ));

    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      GlideBrowser._log.error(result.reason);

      // TODO: if there are many errors this would be overwhelming...
      //       maybe limit the number of errors we display at once?

      const loc = GlideBrowser.#clean_stack(result.reason, "#invoke_urlenter_autocmd")
        ?? "<unknown>";
      GlideBrowser.add_notification("glide-autocmd-error", {
        label: `Error occurred in UrlEnter autocmd \`${loc}\` - ${result.reason}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    }
  }

  #test_url_autocmd_pattern(
    pattern: glide.AutocmdPatterns["UrlEnter"],
    location: nsIURI,
  ): boolean {
    if ("test" in pattern) {
      // note: don't use `instanceof` to avoid cross-realm issues
      return pattern.test(location.spec);
    }

    if (typeof pattern.hostname === "string") {
      // checking displayHost may fail on certain special pages that don't have a hostname
      // for example `about:blank`
      try {
        if (location.displayHost !== pattern.hostname) {
          return false;
        }
      } catch {
        // if the host is invalid/not set it could never match
        return false;
      }
    }

    return true;
  }

  get remove_all_notifications_button(): GlobalBrowser.NotificationBox.Button {
    return {
      "l10n-id": "glide-error-notification-clear-all-button",
      callback: () => {
        this.remove_all_notifications();
      },
    };
  }

  buffer_cleanups: { callback: () => void | Promise<void>; source: string }[] = [];

  async clear_buffer() {
    this.api.bo = make_buffer_options();
    this.key_manager.clear_buffer();

    const cleanups = this.buffer_cleanups;
    this.buffer_cleanups = [];

    const results = await Promises.all_settled(
      cleanups.map(({ callback, source }) => ({ callback, metadata: { source } })),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      this._log.error(result.reason);

      // TODO: if there are many errors this would be overwhelming...
      //       maybe limit the number of errors we display at once?
      const loc = this.#clean_stack(result.reason, "all_settled") ?? "<unknown>";
      this.add_notification("glide-buffer-cleanup-error", {
        label: `Error occurred in ${result.metadata.source} \`${loc}\` - ${result.reason}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [this.remove_all_notifications_button],
      });
    }
  }

  /**
   * Remove internal stack frames from an error's stack trace, e.g.
   *
   * ```
   * @glide.ts:7:7\nreload_config/<@chrome://glide/content/browser.mjs:120:12\n
   * ```
   *
   * into just
   *
   * ```
   * @glide.ts:7:7\n
   * ```
   */
  #clean_stack(err: unknown, up_to_func_name: string): string | null {
    return (
        typeof err === "object"
        && err != null
        && "stack" in err
        && typeof err.stack === "string"
      )
      ? err.stack
        .slice(0, err.stack.indexOf(`\n${up_to_func_name}`))
        .replace(this.#config_uri, "glide.ts")
      : null;
  }

  config_error_id = "glide-config-error";

  get api(): typeof glide {
    if (this.#api == null) {
      this.#api = make_glide_api({ get_config_path: () => this.config_path });
    }
    return this.#api;
  }

  /**
   * Register a callback to be invoked on startup finish, or if
   * startup has already finished, invoke the callback immediately.
   */
  on_startup(cb: () => void): void {
    if (this.#startup_finished) {
      cb();
    } else {
      GlideBrowser.#startup_listeners.add(cb);
    }
  }

  #extension_id = "glide-internal@mozilla.org";

  get extension(): WebExtension {
    const policy = WebExtensionPolicy.getByID(this.#extension_id);
    if (!policy) {
      throw new Error(`Expected to find a web extension with ID: \`${this.#extension_id}\``);
    }
    return policy.extension;
  }

  /**
   * Returns a `browser`-like API object that can be called directly in the
   * main thread.
   *
   * Note this is very different from the `browser` variable exposed in
   * the config as that is a Proxy that sends the request to the web
   * extension process. Additionally the API exposed here is subtly
   * different.
   *
   * Attempting to use things like `.tabs.create()` will *NOT* work as expected.
   */
  get browser_parent_api() {
    return redefine_getter(this, "browser_parent_api", this.#create_browser_parent_api());
  }

  #create_browser_parent_api(): typeof browser {
    const extension = this.extension;
    const browser = extension.backgroundContext?.apiObj;
    if (!browser) {
      // TODO(glide): define an easy way to register a listener for when
      //              this would be possible and recommend it here.
      throw new Error(
        "Tried to access `browser` too early in startup. You should wrap this call in a resource://glide-docs/autocmds.html#configloaded autocmd",
      );
    }

    // TODO(glide): some APIs need special casing
    const known_bad = new Set([
      "action",
      "browserAction",
      "commands",
      "contextMenus",
      "pageAction",
      "urlOverrides",
      "trial",
    ]);

    // note: I'm not *exactly* sure why but the `.apiObj` object doesn't
    //       contain all of the extension APIs. I assume it's just because
    //       they should only be accessed from the extension process, so there's
    //       normally no need to define them in the main thread.

    const apis = (
      [...extension.apiManager.modulePaths.children.keys()] as string[]
    ).filter(api => !known_bad.has(api));

    for (const api of apis) {
      const api_name = api === "menus" ? "menusInternal" : api;
      try {
        Object.assign(
          browser,
          extension.apiManager
            .getAPI(api_name, extension)!
            .getAPI(extension.backgroundContext),
        );
      } catch (err) {
        console.error(`could not load '${api}' extension due to:`, err);
      }
    }

    return browser;
  }

  /**
   * Defines a Proxy that forwards `browser.` method calls to either:
   *
   * 1. The extension process
   * 2. The extension context in the main thread
   *
   * We use #2 for event listener calls so we can avoid serialising functions.
   *
   * TODO(glide): this approach sucks for dev tools auto-complete as it doesn't
   *              tell you which methods / properties are available. I think
   *              it'd be better to just hard-code the object with all expected props.
   */
  get browser_proxy_api(): typeof browser {
    return redefine_getter(this, "browser_proxy_api", GlideBrowser.#create_browser_proxy_api());
  }

  #create_browser_proxy_api(): typeof browser {
    function create_browser_proxy_chain(
      previous_chain: (string | symbol)[] = [],
    ) {
      return new Proxy(function() {}, {
        get(_: any, prop: string | symbol) {
          const path = [...previous_chain, prop].join(".");
          switch (path) {
            case "runtime.id": {
              return GlideBrowser.extension.id;
            }
          }

          return create_browser_proxy_chain([...previous_chain, prop]);
        },

        apply(_, __, args) {
          // For listeners, e.g. `browser.tabs.onMoved.addListener(() => ...)`
          // instead we just use the `browserObj` from the parent context directly
          // as we'd have to serialize the given function and the Web Extensions API
          // does not provide a way to pass arguments through in this case as it's not
          // needed under a typical setup.
          const listener_namespace = previous_chain[1];
          if (
            listener_namespace
            && String(listener_namespace).startsWith("on")
          ) {
            GlideBrowser._log.debug(`Handling request for \`${previous_chain}\` in the main thread`);

            // we can't necessarily access the necessary extension context depending on how
            // early on in startup we are, so register a startup listener instead if we haven't
            // finished startup yet.
            GlideBrowser.on_startup(() => {
              let method = GlideBrowser.browser_parent_api;
              for (const prop of previous_chain) {
                method = method[prop];
                if (method == null) {
                  throw new Error(
                    `Could not resolve \`browser\` property at path \`${previous_chain.join(".")}\` - \`${
                      String(prop)
                    }\` was not defined`,
                  );
                }
              }

              return method(...args);
            });

            return;
          }

          const method_path = previous_chain.join(".");
          switch (method_path) {
            // haven't tested this but it looks like it requires a `target` argument that would not be cloneable
            case "runtime.getFrameId":

            // this would require cloning a proxy of a `Window`...
            // it also looks like we can't even access it ourselves from the main thread
            // as it appears to only be set in the child context.
            case "runtime.getBackgroundPage": {
              return Promise.reject(new Error(`\`browser.${method_path}()\` is not supported`));
            }
          }

          return GlideBrowser.send_extension_query({ method_path, args });
        },
      });
    }

    return create_browser_proxy_chain() as typeof browser;
  }

  async send_extension_query(props: { method_path: string; args: any[] }) {
    const child_id = GlideBrowser.extension.backgroundContext?.childId;
    if (!child_id) {
      // TODO(glide): define an easy way to register a listener for when
      //              this would be possible and recommend it here.
      throw new Error(
        "Tried to access `browser` too early in startup. You should wrap this call in a resource://glide-docs/autocmds.html#configloaded autocmd",
      );
    }

    // This hits `toolkit/components/extensions/ExtensionChild.sys.mjs::ChildAPIManager::recvRunListener`
    GlideBrowser._log.debug(`Sending request for \`${props.method_path}\` to extension process`);
    return ExtensionParent.ParentAPIManager.conduit
      .queryRunListener(child_id, {
        childId: child_id,
        handlingUserInput: false,
        path: "glide.invoke_browser",
        urgentSend: false,
        get args() {
          return new StructuredCloneHolder(
            `GlideBrowser/${child_id}/proxy_chain/glide.invoke_browser`,
            null,
            // first arg corresponds to the `browser.namespace.method` method that
            // should be invoked, the rest are forwarded to said method.
            [props.method_path, ...IPC.serialise_args(props.args)],
          );
        },
      })
      .then(result => {
        return result != null ? result.deserialize(globalThis) : result;
      }).then(result => {
        if (!result) {
          return result;
        }

        /**
         * In some cases, the web extensions APIs will return an object that has a method() attached.
         * This is incompatible with our setup as functions cannot be cloned across processes.
         *
         * So we workaround this by identifying a returned function in the child process, omit it from the
         * return value, and add a temporary `$glide_content_functions` property that says where the function
         * would have been on the object, and a unique ID for that particular function.
         *
         * We can then "reconstruct" the function in the parent process with an implementation that just forwards
         * to the content process with the function ID, and any arguments. Of course this will only work for functions
         * that return `Promise`s.
         */

        const functions = result.$glide_content_functions as ExtensionContentFunction[] | undefined;
        if (!functions) {
          return result;
        }

        for (const fn_info of functions) {
          // the [fn_info.name] hack is to make the function name match the original one.
          const fn = {
            [fn_info.name]: (...args: any[]) =>
              GlideBrowser.send_extension_content_function_query({ id: fn_info.id, name: fn_info.name, args }),
          }[fn_info.name];

          Object.defineProperty(result, fn_info.name, { value: fn });
          GlideBrowser.#extension_content_fn_registry.register(result, fn_info.id);
        }

        delete result.$glide_content_functions;
        return result;
      });
  }

  async send_extension_content_function_query(props: { id: number; name: string; args: any[] }) {
    const child_id = GlideBrowser.extension.backgroundContext?.childId;
    if (!child_id) {
      throw new Error(
        "Tried to access `browser` too early in startup. You should wrap this call in a resource://glide-docs/autocmds.html#configloaded autocmd",
      );
    }

    // This hits `toolkit/components/extensions/ExtensionChild.sys.mjs::ChildAPIManager::recvRunListener`
    GlideBrowser._log.debug(
      `Sending extension content function request for \`${props.name}\` to the extension process`,
    );
    return ExtensionParent.ParentAPIManager.conduit
      .queryRunListener(child_id, {
        childId: child_id,
        handlingUserInput: false,
        path: "glide.invoke_content_function",
        urgentSend: false,
        get args() {
          return new StructuredCloneHolder(
            `GlideBrowser/${child_id}/proxy_chain/glide.invoke_content_function`,
            null,
            // first arg corresponds to the the ID of the function that
            // should be invoked, the rest are forwarded to said function.
            [props.id, ...IPC.serialise_args(props.args)],
          );
        },
      })
      .then(result => {
        return result != null ? result.deserialize(globalThis) : result;
      });
  }

  /**
   * Used to register callbacks for when objects that hold a reference to a function
   * in the content process are dropped, so that we can also drop the reference in the
   * content process and avoid a memory leak.
   */
  #extension_content_fn_registry = new FinalizationRegistry<number>((fn_id) => {
    this.#clear_extension_content_function({ id: fn_id });
  });

  /**
   * Tell the extension content child process that a function reference we were holding onto has
   * been GC'd so we don't accumulate memory in the extension process forever.
   *
   * See `glide_content_functions` in `engine/toolkit/components/extensions/ExtensionChild.sys.mjs`.
   */
  #clear_extension_content_function(props: { id: number }) {
    const child_id = GlideBrowser.extension.backgroundContext?.childId;
    if (!child_id) {
      throw new Error(
        "Tried to access `browser` too early in startup. You should wrap this call in a resource://glide-docs/autocmds.html#configloaded autocmd",
      );
    }

    // This hits `toolkit/components/extensions/ExtensionChild.sys.mjs::ChildAPIManager::recvRunListener`
    GlideBrowser._log.debug(`Clearing extension content function with ID \`${props.id}\` `);
    ExtensionParent.ParentAPIManager.conduit
      .queryRunListener(child_id, {
        childId: child_id,
        handlingUserInput: false,
        path: "glide.clear_content_function",
        urgentSend: false,
        get args() {
          return new StructuredCloneHolder(`GlideBrowser/${child_id}/proxy_chain/glide.clear_content_function`, null, [
            props.id,
          ]);
        },
      })
      // we may get an error if the extension child process has already exited
      // in which case we do not care about the error.
      .catch(() => null);
  }

  #user_cmds: Map<
    string,
    GlideExcmdInfo & {
      fn: (props: glide.ExcmdCallbackProps) => void | Promise<void>;
    }
  > = new Map();

  add_user_excmd(
    info: glide.ExcmdCreateProps,
    fn: (props: glide.ExcmdCallbackProps) => void | Promise<void>,
  ) {
    this.#user_cmds.set(info.name, {
      ...info,
      description: info.description ?? "",
      content: false,
      repeatable: false,
      fn,
    });
  }

  get user_excmds(): ReadonlyMap<
    string,
    GlideExcmdInfo & { fn: glide.ExcmdCallback | glide.ExcmdContentCallback }
  > {
    return this.#user_cmds;
  }

  get commandline_sources(): GlideCompletionSource[] {
    return redefine_getter(this, "commandline_sources", [
      new CommandLine.TabsCompletionSource(),
      new CommandLine.ExcmdsCompletionSource(),
    ]);
  }

  // used so that tests can override all the excmds
  _commandline_excmds: GlideExcmdInfo[] | null = null;
  get commandline_excmds(): GlideExcmdInfo[] {
    if (this._commandline_excmds != null) {
      return this._commandline_excmds;
    }
    return [...GLIDE_EXCOMMANDS, ...this.user_excmds.values()];
  }

  is_option(name: string): name is keyof glide.Options {
    return name in this.api.o;
  }

  add_state_change_listener(cb: StateChangeListener) {
    this.state_listeners.add(cb);
  }

  remove_state_change_listener(cb: StateChangeListener) {
    return this.state_listeners.delete(cb);
  }

  _modes: { [k in GlideMode]: { caret: "block" | "line" | "underline" } } = {} as any;

  get mode_names(): GlideMode[] {
    return Object.keys(this._modes) as GlideMode[];
  }

  // must correspond exactly with `src/glide/cpp/Glide.h::GlideCaretStyle`
  #mode_to_style_enum(mode: GlideMode): number {
    const cfg = this._modes[mode];
    if (!cfg) {
      throw new Error(`Attempting to use a mode \`${mode}\` that hasn't been set with \`glide.modes.register()\` `);
    }

    switch (cfg.caret) {
      case "block":
        return 0;
      case "underline":
        return 1;
      case "line":
        return 2;
      default:
        throw assert_never(cfg.caret);
    }
  }

  _change_mode(
    new_mode: GlideMode,
    props?: { operator?: GlideOperator | null; meta?: StateChangeMeta },
  ) {
    const old_state = { ...this.state };
    this.state.mode = new_mode;
    this.state.operator = props?.operator ?? null;

    Services.prefs.setIntPref("glide.caret.style", this.#mode_to_style_enum(new_mode));

    for (const listener of this.state_listeners) {
      listener(this.state, old_state, props?.meta);
    }

    // debounce the mode animation a couple frames to avoid
    // flashing mode changes when there are fast changes
    // TODO(glide): consider disabling this by default?
    // TODO(glide): make this configurable?

    if (DEBOUNCE_MODE_ANIMATION_FRAMES <= 0) {
      this.#update_mode_ui();
      return;
    }

    var frames = 0;
    const update_ui = this.#update_mode_ui.bind(this);

    function animate() {
      frames++;
      if (frames >= DEBOUNCE_MODE_ANIMATION_FRAMES) {
        update_ui();
        return;
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  #update_mode_ui() {
    GlideBrowser.api.styles.add(
      `
				:root {
					--glide-current-mode-color: var(--glide-mode-${this.state.mode})
				}
			`,
      { id: "$glide-current-mode-color", overwrite: true },
    );

    const element = document!.getElementById("glide-toolbar-mode-button");
    if (!element) {
      // user removed it from the toolbar
      return;
    }

    element.childNodes[0]!.textContent = this.state.mode;
  }

  #on_blur() {
    if (this.state.mode !== "normal" && !this.is_mode_switching_disabled()) {
      this._change_mode("normal");
    }
  }

  // TODO(glide): is this an exhaustive list?
  #modifier_keys = new Set<string>([
    "Meta",
    "Shift",
    "Alt",
    "Control",
    "AltGraph",
  ]);

  /**
   * Temporarily stores the result of our `keydown` event listener.
   *
   * This is needed as to properly prevent a key event from being bubbled down
   * further, we need to `.preventDefault()` the `keypress` & `keyup` events
   * in addition to `keydown`.
   *
   * The key here is the vim-notation version of a key event, e.g. `<C-d>`
   */
  keydown_event_results = new Map<string, { default_prevented: boolean }>();
  next_key_waiter: {
    resolve: (event: glide.KeyEvent) => void;
  } | null = null;
  next_key_passthrough_waiters: Array<{
    resolve: (event: glide.KeyEvent) => void;
  }> = [];

  /**
   * This uses a different state than the *actual* key mappings so that we can
   * display things like `di`, which wouldn't normally be displayed as it is not defined
   * as a single mapping, e.g. `diw`, but instead defined as `d` + `iw`.
   */
  #current_display_keyseq: string[] = [];
  #display_keyseq(keyseq: string[]) {
    this.#current_display_keyseq = keyseq;
    const element = document?.getElementById("glide-toolbar-keyseq-button");
    if (!element) {
      return;
    }

    const id = "glide-toolbar-keyseq-span";
    const text_element = document?.getElementById(id) as HTMLSpanElement | null;
    if (text_element) {
      text_element.textContent = keyseq.join("");
    } else {
      element.appendChild(DOM.create_element("span", { id, textContent: keyseq.join("") }));
    }
  }

  /**
   * When calling `glide.keys.send(..., { skip_mappings: true })`, we can't
   * reliably add any custom properties onto the `KeyboardEvent` that is fired
   * as the event we pass to the TIP is reconstructed somewhere down the line.
   *
   * So we need some way to uniquely identify a key event, it looks like the
   * `timeStamp` is the best bet we have as it will be the same for the key event
   * we construct and the one that is actually fired.
   *
   * I think it *should* also be impossible for two unrelated key events to have
   * the same `timeStamp`, as `[new KeyboardEvent("", {}), new KeyboardEvent("", {})]`
   * results in unique timestamps. So the only way it could be possible is for multiple
   * processes to construct and fire key events at the same *exact* time which seems
   * exceedingly unlikely for a variety of reasons. From experimenting with `Promise.race()`
   * I've only been able to get two timestamps to have a delta of ~0.07.
   */
  #passthrough_keyevents = new Set<number>();
  register_keyevent_passthrough(event: KeyboardEvent): void {
    this.#passthrough_keyevents.add(event.timeStamp);
  }

  /**
   * Some mappings require cleanup to run after a delay, if there
   * are no other key presses in that time.
   */
  #partial_mapping_waiter_id: number | null = null;

  async #invoke_keystatechanged_autocmd(props: glide.AutocmdArgs["KeyStateChanged"]) {
    const cmds = GlideBrowser.autocmds.KeyStateChanged ?? [];
    if (!cmds.length) {
      return;
    }

    const results = await Promise.allSettled(cmds.map(cmd =>
      (async () => {
        const cleanup = await cmd.callback({
          ...props,
          sequence: props.sequence.map(element => element === GlideBrowser.api.g.mapleader ? "<leader>" : element),
        });
        if (cleanup) {
          throw new Error("ModeChanged autocmds cannot define cleanup functions");
        }
      })()
    ));

    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      GlideBrowser._log.error(result.reason);

      const loc = GlideBrowser.#clean_stack(result.reason, "#invoke_keystatechanged_autocmd") ?? "<unknown>";
      GlideBrowser.add_notification("glide-autocmd-error", {
        label: `Error occurred in KeyStateChanged autocmd \`${loc}\` - ${result.reason}`,
        priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
        buttons: [GlideBrowser.remove_all_notifications_button],
      });
    }
  }

  async #on_keydown(event: KeyboardEvent) {
    if (this.#partial_mapping_waiter_id) {
      clearTimeout(this.#partial_mapping_waiter_id);
      this.#partial_mapping_waiter_id = null;
    }

    const keyn = Keys.event_to_key_notation(event);

    // remove any previous results for this key combination
    this.keydown_event_results.delete(keyn);

    const should_passthrough = this.#passthrough_keyevents.has(event.timeStamp);
    if (should_passthrough) {
      this.#passthrough_keyevents.delete(event.timeStamp);
      this.#display_keyseq([]);
      this._log.debug(`Ignoring \`${keyn}\` key event as it was marked with \`glide_skip_mappings\``);
      return;
    }

    // Certain builting key mappings, such as `<Esc>` to exit fullscreen mode,
    // are handled internally in C++ code that dispatches an event *only* to chrome
    // JS to determine if the default behaviour should be prevented.
    //
    // We don't want to interfere with these builtin mappings so we just ignore them.
    //
    // note: this can break expectations around `<Esc>` when an input element is focused
    //       *and* when the browser is in DOM fullscreen mode, as we would exit full screen
    //       instead of changing to normal mode. This is left as a future TODO.
    if (
      event.defaultPrevented
      && !event.defaultPreventedByChrome
      && !event.defaultPreventedByContent
    ) {
      this.#display_keyseq([]);
      this._log.debug(`Ignoring \`${keyn}\` key event as it was dispatched from privileged non-JS code`);
      return;
    }

    if (this.#modifier_keys.has(event.key)) {
      // we don't support mapping these keys by themselves, so just ignore them
      return;
    }

    if (this.next_key_waiter !== null) {
      this.#prevent_keydown(keyn, event);

      this.next_key_waiter.resolve(this.#keyboard_event_to_glide(event, keyn));
      this.next_key_waiter = null;
      return;
    }

    if (this.next_key_passthrough_waiters.length) {
      const waiters = this.next_key_passthrough_waiters;
      this.next_key_passthrough_waiters = [];

      const sandbox_event = this.#keyboard_event_to_glide(event, keyn);
      for (const waiter of waiters) {
        waiter.resolve(sandbox_event);
      }
    }

    // this will be true when a browser modal is open, e.g. cmd+q / ctrl+W to quit.
    //
    // to avoid surprising behaviour we ignore all mappings in this case, this might need to be
    // expanded in the future to allow registering keymappings even when the modal is open.
    if (document!.getElementById("main-window")!.getAttribute("window-modal-open") === "true") {
      return;
    }

    const mode = this.state.mode;
    const has_partial = this.key_manager.has_partial_mapping;
    const current_sequence = this.key_manager.current_sequence;
    const mapping = this.key_manager.handle_key_event(event, mode);
    if (mapping?.has_children || mapping?.value?.retain_key_display) {
      this.#display_keyseq([...this.#current_display_keyseq, keyn]);
    } else {
      this.#display_keyseq([]);
    }

    if (!mapping && this.state.mode === "hint") {
      var label: string;
      var hints: GlideResolvedHint[];
      if (current_sequence[current_sequence.length - 1] === "<CR>") {
        label = current_sequence.slice(0, -1).join("");
        hints = GlideHints.get_active_hints().filter(hint => hint.label === label);
      } else {
        label = [...current_sequence].join("");
        hints = GlideHints.get_active_hints().filter(hint => hint.label.startsWith(label));
      }
      this._log.debug({ hints, label });

      if (hints.length > 1) {
        this.#prevent_keydown(keyn, event);

        GlideHints.filter_hints(label);
        return;
      }

      if (hints.length === 1) {
        this.#prevent_keydown(keyn, event);

        GlideHints.execute(hints[0]!.id);
        this.key_manager.reset_sequence();
        return;
      }

      this.key_manager.reset_sequence();
      this._change_mode("normal");
      return;
    }

    // if we were in a partial mapping and the current key does not match
    // a mapping, then we need to clean up the partial mapping state and
    // then crucially, *rerun* the event handling.
    //
    // this is important because it allows you to do things like cancelling a
    // partial `jj` with an `Escape` and still have the `Escape` mapping applied.
    if (has_partial && !mapping) {
      this.get_focused_actor().send_async_message("Glide::KeyMappingCancel", { mode });
      this.key_manager.reset_sequence();
      await this.#on_keydown(event);
      return;
    }

    if (!mapping) {
      this.key_manager.reset_sequence();

      // This event only makes sense to fire if the previous state was not of length 0.
      if (current_sequence.length !== 0) {
        this.#invoke_keystatechanged_autocmd({ mode, sequence: [], partial: false });
      }

      if (this.state.mode === "op-pending") {
        this._change_mode("normal");
        return;
      }

      // if a key mapping didn't match, just let it through.
      return;
    }

    this.#invoke_keystatechanged_autocmd({
      mode,
      sequence: [...this.key_manager.current_sequence],
      partial: mapping.has_children,
    });

    this.#prevent_keydown(keyn, event);

    if (mapping.has_children) {
      this.get_focused_actor().send_async_message("Glide::KeyMappingPartial", { mode, key: event.key });

      if (mode === "insert") {
        // in insert mode, for any multi-sequence mappings, e.g. `jj` to `mode_change normal`,
        // we need to clean up the previous state after some period of time, otherwise it's
        // impossible to just type `jj`, you have to press another key in the middle.
        this.#partial_mapping_waiter_id = setTimeout(async () => {
          this.key_manager.reset_sequence();
          this.#display_keyseq([]);
          this.get_focused_actor().send_async_message("Glide::KeyMappingCancel", { mode });
          this.#invoke_keystatechanged_autocmd({ mode, sequence: [], partial: false });
        }, this.api.o.mapping_timeout);
      }
    } else if (mapping.value) {
      this.key_manager.reset_sequence();
      this.get_focused_actor().send_async_message("Glide::KeyMappingExecution", {
        sequence: mapping.value.sequence,
        mode,
      });
      await GlideExcmds.execute(mapping.value.command, { mapping });
    }

    return;
  }

  #prevent_keydown(keyn: string, event: KeyboardEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.keydown_event_results.set(keyn, { default_prevented: true });

    // We need to manually notify that a user gesture happened (in this case a keypress)
    // because our `.preventDefault()` causes this key event to not get registered automatically.
    document!.notifyUserGestureActivation();
    // we currently only send this to the focused actor as opposed to all actors to
    // reduce resource usage as I think a case where you need user gestures to be recorded
    // in another frame *should* be exceedingly rare.
    this.get_focused_actor().sendAsyncMessage("Glide::RegisterUserActivation");
  }

  async #on_keypress(event: KeyboardEvent) {
    const cache_key = Keys.event_to_key_notation(event);
    if (this.keydown_event_results.get(cache_key)?.default_prevented) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  async #on_keyup(event: KeyboardEvent) {
    const cache_key = Keys.event_to_key_notation(event);
    if (this.keydown_event_results.get(cache_key)?.default_prevented) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  #keyboard_event_to_glide(event: KeyboardEvent, keyn: string): glide.KeyEvent {
    const init = Cu.cloneInto(event.initDict, this.sandbox_window);
    const sandbox_event = (new this.sandbox_window.KeyboardEvent(event.type, init)) as glide.KeyEvent;
    sandbox_event.glide_key = keyn;
    return sandbox_event;
  }

  is_mode_switching_disabled(): boolean {
    return this.state.mode === "ignore" || !this.api.options.get("switch_mode_on_focus");
  }

  async #on_fullscreen_enter() {
    if (!this.is_mode_switching_disabled()) {
      this._log.debug("fullscreen entered, switching to insert mode");
      this._change_mode("insert");
    }
  }

  async #on_fullscreen_exit() {
    if (!this.is_mode_switching_disabled()) {
      this._log.debug("fullscreen exit, switching to normal mode");
      this._change_mode("normal");
    }
  }

  /**
   * Returns the Glide JSActor for the currently focused frame.
   *
   * This determines if the browser content is focused or if the browser UI
   * is focused and returns the corresponding `GlideHandler` actor.
   *
   * https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html
   */
  get_focused_actor(): GlideHandlerParent {
    const browser_element = assert_present(customElements.get("browser"), "Could not find a custom `browser` element");
    const active_element = document?.activeElement;
    if (!active_element) {
      this._log.debug("nothing is focused defaulting to chrome");
      return this.get_chrome_actor();
    }

    // the custom `<browser>` element appears to be the lowest part of the content frame
    // that chrome code can access
    const is_content_focused = active_element instanceof browser_element;
    if (is_content_focused) {
      this._log.debug("content is focused");
      return this.get_content_actor();
    }

    this._log.debug("chrome is focused");
    return this.get_chrome_actor();
  }

  get_content_actor(): GlideHandlerParent {
    let tab_browser = gBrowser.selectedBrowser;
    let content_wgp = assert_present(
      tab_browser.browsingContext
        .currentWindowGlobal as typeof windowGlobalChild,
    );

    // we can't use `.getExistingActor()` as the actor may not have been loaded
    // in certain cases, I'm not sure exactly *when* that can happen but `.getExistingActor()`
    // breaks our tests.
    return content_wgp.getActor("GlideHandler") as any as GlideHandlerParent;
  }

  get_docs_actor(): GlideDocsParent {
    let tab_browser = gBrowser.selectedBrowser;
    let content_wgp = assert_present(
      tab_browser.browsingContext
        .currentWindowGlobal as typeof windowGlobalChild,
    );
    return content_wgp.getActor("GlideDocs") as any as GlideDocsParent;
  }

  get_chrome_actor(): GlideHandlerParent {
    return (
      (browsingContext as any)?.currentWindowGlobal as typeof windowGlobalChild
    )?.getActor("GlideHandler") as any as GlideHandlerParent;
  }

  /**
   * The directories, in order, that we'll look for a `glide.ts` file in.
   */
  get config_dirs(): { path: string; description: string }[] {
    return redefine_getter(this, "config_dirs", [
      { path: this.cwd_config_dir, description: "cwd" },
      { path: this.profile_config_dir, description: "profile" },
      { path: this.home_config_dir, description: "home" },
    ]);
  }

  get cwd_config_dir(): string {
    return Services.dirsvc.get("CurWorkD", Ci.nsIFile).path;
  }

  get home_config_dir(): string {
    const xdg_dir = Services.env.get("XDG_CONFIG_HOME");
    if (xdg_dir) {
      return PathUtils.join(xdg_dir, "glide");
    }

    return PathUtils.join(Services.dirsvc.get("Home", Ci.nsIFile).path, ".config", "glide");
  }

  get profile_config_dir(): string {
    return PathUtils.join(PathUtils.profileDir, "glide");
  }

  async resolve_config_path(): Promise<string | null> {
    for (const { path: config_dir } of this.config_dirs) {
      const file = await this.#get_config_from_dir(config_dir);
      if (file) {
        return file;
      }
    }

    return null;
  }

  async #get_config_from_dir(dir: string): Promise<string | null> {
    const config_ts = PathUtils.join(dir, "glide.ts");
    if (await IOUtils.exists(config_ts)) {
      return config_ts;
    }

    return null;
  }

  /**
   * Get or create the `glide-commandline` element, showing it in the UI.
   */
  async upsert_commandline(opts: GlideCommandLineShowOptions = {}) {
    const tab = gBrowser.selectedTab;
    const cached = this.#get_cached_commandline(tab);
    if (cached) {
      cached.show(opts);
      return cached;
    }

    return await this.#create_commandline(tab, opts);
  }

  async #create_commandline(tab: BrowserTab, opts: GlideCommandLineShowOptions = {}) {
    let browser = gBrowser.getBrowserForTab(tab);

    let glide_commandline = document!.createXULElement("glide-commandline") as GlideCommandLine;

    browser.parentNode.insertAdjacentElement("afterend", glide_commandline);

    await new Promise(r => requestAnimationFrame(r));

    if (window.closed || tab.closing) {
      return null;
    }

    this.#cache_commandline(tab, glide_commandline);

    glide_commandline.show(opts);

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

export const GlideBrowser = new GlideBrowserClass();
globalThis.GlideBrowser = GlideBrowser;

// only call `.init()` here so that we can ensure `GlideBrowser` is accessible
GlideBrowser.init();
