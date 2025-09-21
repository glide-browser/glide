/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SetRequired, Split } from "type-fest";
import type { GlideDocsParent } from "../../actors/GlideDocsParent.sys.mjs";
import type { GlideHandlerParent } from "../../actors/GlideHandlerParent.sys.mjs";
import type { GlideCommandString, GlideExcmdInfo, GlideOperator } from "./browser-excmds-registry.mts";
import type { Messenger as MessengerType } from "./browser-messenger.mts";
import type { Jumplist } from "./plugins/jumplist.mts";
import type { Sandbox } from "./sandbox.mts";

const DefaultKeymaps = ChromeUtils.importESModule("chrome://glide/content/plugins/keymaps.mjs", { global: "current" });
const { GlideBrowserDev } = ChromeUtils.importESModule("chrome://glide/content/browser-dev.mjs", { global: "current" });
const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs", { global: "current" });
const JumplistPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/jumplist.mjs");
const ShimsPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/shims.mjs");
const HintsPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/hints.mjs");
const WhichKeyPlugin = ChromeUtils.importESModule("chrome://glide/content/plugins/which-key.mjs", {
  global: "current",
});
const DocumentMirror = ChromeUtils.importESModule("chrome://glide/content/document-mirror.mjs", { global: "current" });
const Promises = ChromeUtils.importESModule("chrome://glide/content/utils/promises.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const { assert_never, assert_present, is_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs",
);
const TSBlank = ChromeUtils.importESModule("chrome://glide/content/bundled/ts-blank-space.mjs");
const { human_join } = ChromeUtils.importESModule("chrome://glide/content/utils/arrays.mjs");
const { redefine_getter } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");
const { create_sandbox, FileNotFoundError, GlideProcessError } = ChromeUtils.importESModule(
  "chrome://glide/content/sandbox.mjs",
);
const { MODE_SCHEMA_TYPE } = ChromeUtils.importESModule("chrome://glide/content/browser-excmds-registry.mjs");
const { Messenger } = ChromeUtils.importESModule("chrome://glide/content/browser-messenger.mjs", { global: "current" });
const { LayoutUtils } = ChromeUtils.importESModule("resource://gre/modules/LayoutUtils.sys.mjs");

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

    this.on_startup(() => {
      // check for extension errors every 500ms as there are no listeners we can register
      // and the extension code is running with different privileges which makes setting
      // up listeners a bit dubious / difficult
      setInterval(this.flush_pending_error_notifications.bind(this), 500);
    });

    const config_promise = this.reload_config();

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
  }

  async reload_config() {
    // note: we hae to initialise this promise as early as possible so that we don't
    //       register the listener *after* the extension has started up, therefore
    //       resulting in the listener never firing.
    const extension_startup = this._extension_startup_promise;

    await this.#reload_config();

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
  }

  #config_watcher_id: number | undefined;
  readonly config_pending_notification_id: string = "glide-config-reload-notification";
  #config_modified_timestamp: number | undefined;

  #sandbox: Sandbox | null = null;
  get config_sandbox() {
    this.#sandbox ??= create_sandbox({
      window: this._sandbox_window,
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

  get _sandbox_window(): HiddenWindow {
    return assert_present(this._hidden_browser.browsingContext.window) as HiddenWindow;
  }

  /**
   * A mirror of the chrome `Document` so it can be mutated / accessed without giving
   * full access to the underlying `ChromeWindow`.
   */
  get _mirrored_document(): MirroredDocument {
    const target = GlideBrowser._hidden_browser.browsingContext.window!.document!;
    return redefine_getter(this, "_mirrored_document", DocumentMirror.mirror_into_document(document, target));
  }

  #reload_config_clear_properties: Set<string> = new Set();
  set_css_property(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
    this.#reload_config_clear_properties.add(name);
  }

  async #reload_config() {
    this.#api = null;
    this.config_path = null;
    this._modes = {} as any;
    this.#messengers = new Map();
    this.#user_cmds = new Map();
    this.#sandbox = null;

    const css_properties = this.#reload_config_clear_properties;
    this.#reload_config_clear_properties = new Set();

    for (const property of css_properties) {
      document.documentElement.style.removeProperty(property);
    }

    try {
      this.remove_all_notifications();
    } catch (_) {
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
      // clear all registered event listeners and any custom state on the `browser` object
      const addon = await AddonManager.getAddonByID("glide-internal@mozilla.org");
      await addon.reload();

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

    for (const { error, source } of [...errors]) {
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
      } catch (_) {
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
    this.api.bo = {};
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
      this.#api = make_glide_api();
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
    const { ExtensionParent } = ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

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
      });
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
    GlideExcmdInfo & {
      fn: (props: glide.ExcmdCallbackProps) => void | Promise<void>;
    }
  > {
    return this.#user_cmds;
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
    const element = document!.getElementById("glide-toolbar-mode-button");
    if (!element) {
      // user removed it from the toolbar
      return;
    }

    element.childNodes[0]!.textContent = this.state.mode;
    (element as HTMLElement).style.setProperty(
      "--toolbarbutton-icon-fill-attention",
      `var(--glide-mode-${this.state.mode})`,
    );
  }

  #on_blur() {
    if (this.state.mode !== "normal" && this.state.mode !== "ignore") {
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
      const label = [...current_sequence].join("");
      const hints = GlideCommands.get_active_hints().filter(hint => hint.label.startsWith(label));
      this._log.debug({ hints, label });

      if (hints.length > 1) {
        this.#prevent_keydown(keyn, event);

        GlideCommands.filter_hints(label);
        return;
      }

      if (hints.length === 1) {
        this.#prevent_keydown(keyn, event);

        const hint = hints[0]!;
        const location = GlideCommands.get_hints_location();
        const actor = location === "browser-ui"
          ? GlideBrowser.get_chrome_actor()
          : location === "content"
          ? GlideBrowser.get_content_actor()
          : assert_never(location);
        actor.send_async_message("Glide::ExecuteHint", { id: hint.id });

        this.key_manager.reset_sequence();
        GlideCommands.remove_hints();
        return;
      }

      this.key_manager.reset_sequence();
      this._change_mode("normal");
      return;
    }

    // if we were in a partial mapping and the current key does not match
    // a mapping, then we need to cleanup the partial mapping state and
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
        // we need to cleanup the previous state after some period of time, otherwise it's
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
    const init = Cu.cloneInto(event.initDict, this._sandbox_window);
    const sandbox_event = (new this._sandbox_window.KeyboardEvent(event.type, init)) as glide.KeyEvent;
    sandbox_event.glide_key = keyn;
    return sandbox_event;
  }

  async #on_fullscreen_enter() {
    if (this.state.mode !== "ignore") {
      this._log.debug("fullscreen entered, switching to insert mode");
      this._change_mode("insert");
    }
  }

  async #on_fullscreen_exit() {
    if (this.state.mode !== "ignore") {
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
}

export const GlideBrowser = new GlideBrowserClass();
globalThis.GlideBrowser = GlideBrowser;

type GlideG = (typeof glide)["g"];

/**
 * Implements the `glide.g` API.
 */
class GlideGlobals implements GlideG {
  #mapleader = "<Space>";

  get mapleader() {
    return this.#mapleader;
  }

  set mapleader(value: string) {
    this.#mapleader = Keys.normalize(value);
  }
}

type GlideO = (typeof glide)["o"];
class GlideOptions implements GlideO {
  mapping_timeout = 200;

  yank_highlight: glide.RGBString = `#edc73b`;
  yank_highlight_time = 150;

  jumplist_max_entries = 100;

  which_key_delay = 300;

  #hint_size = "11px";
  get hint_size() {
    return this.#hint_size;
  }
  set hint_size(value: string) {
    this.#hint_size = value;
    GlideBrowser.set_css_property("--glide-hint-font-size", value);
  }
}

function make_glide_api(): typeof glide {
  return {
    g: new GlideGlobals(),
    o: new GlideOptions(),
    bo: {},
    options: {
      get<Name extends keyof glide.Options>(name: Name): glide.Options[Name] {
        const option = GlideBrowser.api.bo[name];
        if (is_present(option)) {
          return option!;
        }

        return GlideBrowser.api.o[name];
      },
    },
    ctx: {
      get mode() {
        return GlideBrowser.state.mode;
      },
      get url() {
        const url = gBrowser?.selectedBrowser?.currentURI?.spec;
        if (!url) {
          throw new Error("Could not resolve the current URL.");
        }
        return url;
      },

      get os() {
        const { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
        return AppConstants.platform;
      },

      async is_editing() {
        return await GlideBrowser.get_focused_actor().send_query("Glide::Query::IsEditing");
      },
    },
    autocmds: {
      create<Event extends glide.AutocmdEvent>(
        event: Event,
        pattern_or_callback: glide.AutocmdPatterns[Event] extends never ? (args: glide.AutocmdArgs[Event]) => void
          : glide.AutocmdPatterns[Event],
        callback?: (args: glide.AutocmdArgs[Event]) => void,
      ) {
        if (typeof pattern_or_callback === "function" && callback) {
          throw new Error("provided a function as a pattern and a callback. only one should be provided");
        }

        let pattern: glide.AutocmdPatterns[Event] | null = null;
        if (typeof pattern_or_callback === "function") {
          callback = pattern_or_callback;
        } else {
          pattern = pattern_or_callback as glide.AutocmdPatterns[Event];
        }

        const existing = GlideBrowser.autocmds[event];
        if (existing) {
          // @ts-ignore
          existing.push({ pattern, callback });
        } else {
          GlideBrowser.autocmds[event] = [
            { pattern, callback },
          ] as (typeof GlideBrowser.autocmds)[Event];
        }
      },
    },
    keymaps: {
      set(modes, lhs, rhs, opts) {
        GlideBrowser.key_manager.set(modes, lhs as string, rhs, opts);
      },
      del(modes, lhs, opts) {
        GlideBrowser.key_manager.del(modes, lhs, opts);
      },
      list(modes) {
        return GlideBrowser.key_manager.list(modes);
      },
    },
    buf: {
      prefs: {
        set: (name, value) => {
          const glide = GlideBrowser.api;
          const previous = glide.prefs.get(name);

          glide.prefs.set(name, value);

          GlideBrowser.buffer_cleanups.push({
            source: "glide.buf.prefs.set",
            callback: () => {
              if (previous === undefined) {
                glide.prefs.clear(name);
              } else {
                glide.prefs.set(name, previous);
              }
            },
          });
        },
      },
      keymaps: {
        set(modes, lhs, rhs, opts) {
          GlideBrowser.key_manager.set(modes, lhs as string, rhs, { ...opts, buffer: true });
        },
        del(modes, lhs, opts) {
          GlideBrowser.key_manager.del(modes, lhs as string, { ...opts, buffer: true });
        },
      },
    },
    tabs: {
      async active() {
        const tabs = await GlideBrowser.browser_proxy_api.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 1) {
          throw new Error("`glide.tabs.active()`: received multiple active tabs, expected only 1");
        }
        const tab = tabs[0];
        if (!tab) {
          throw new Error("`glide.tabs.active()`: did not receive any tabs");
        }
        if (!tab.id) {
          throw new Error("`glide.tabs.active()`: expected `tab.id` to be defined");
        }
        return tab as SetRequired<typeof tab, "id">;
      },
      async get_first(query) {
        const tabs = await GlideBrowser.browser_proxy_api.tabs.query(query);
        return tabs[0];
      },
    },
    excmds: {
      async execute(cmd: GlideCommandString): Promise<void> {
        await GlideExcmds.execute(cmd);
      },
      create<const Excmd extends glide.ExcmdCreateProps>(
        info: Excmd,
        fn: (props: glide.ExcmdCallbackProps) => void | Promise<void>,
      ): Excmd {
        GlideBrowser.add_user_excmd(info, fn);
        return info;
      },
    },
    content: {
      async execute(func, opts) {
        const results = await GlideBrowser.browser_proxy_api.scripting.executeScript({
          target: { tabId: typeof opts.tab_id === "number" ? opts.tab_id : opts.tab_id.id },
          func,
          args: opts.args,
        });
        if (results.length > 1) {
          throw new Error(
            `unexpected - \`browser.scripting.executeScript\` returned multiple (${results.length}) results`,
          );
        }

        const result = results[0];
        if (result?.error) {
          if (
            Object.prototype.toString.call(result.error) === "[object Error]"
          ) {
            throw result.error;
          }

          throw new Error(result.error as any);
        }

        return result?.result as any;
      },
    },
    hints: {
      show(opts) {
        const location = opts?.location === "browser-ui" ? "browser-ui" : "content";

        const actor = location === "browser-ui"
          ? GlideBrowser.get_chrome_actor()
          : location === "content"
          ? GlideBrowser.get_content_actor()
          : assert_never(location);

        actor.send_async_message("Glide::Hint", {
          action: IPC.maybe_serialise_glidefunction(opts?.action),
          selector: opts?.selector,
          location: opts?.location ?? "content",
          include: opts?.include,
          editable_only: opts?.editable ?? undefined,
          auto_activate: opts?.auto_activate ?? false,
          pick: IPC.maybe_serialise_glidefunction(opts?.pick),
          browser_ui_rect: LayoutUtils.getElementBoundingScreenRect(document!.body),
          debug: Services.prefs.getBoolPref("devtools.testing", false),
        });
      },
    },
    keys: {
      async send(input, opts) {
        const EventUtils = ChromeUtils.importESModule("chrome://glide/content/event-utils.mjs", { global: "current" });
        await EventUtils.synthesize_keyseq(
          typeof input === "object" && input && "glide_key" in input
            ? input.glide_key
            : (input as string),
          opts,
        );
      },

      async next() {
        if (GlideBrowser.next_key_waiter) {
          throw new Error("`glide.keys.next()` can only be registered one at a time");
        }

        return new Promise<glide.KeyEvent>(resolve => {
          GlideBrowser.next_key_waiter = { resolve };
        }).finally(() => {
          GlideBrowser.next_key_waiter = null;
        });
      },
      async next_str() {
        return this.next().then(event => event.glide_key);
      },
      async next_passthrough() {
        return new Promise<glide.KeyEvent>(resolve => {
          GlideBrowser.next_key_passthrough_waiters.push({ resolve });
          // note: the array here is cleaned up inside the key input handler
        });
      },

      parse(key_notation) {
        const parsed = Keys.parse_modifiers(key_notation, { use_event_repr: false });
        return {
          key: parsed.key,
          alt: parsed.altKey,
          ctrl: parsed.ctrlKey,
          meta: parsed.metaKey,
          shift: parsed.shiftKey,
        };
      },
    },
    path: {
      get cwd() {
        return Services.dirsvc.get("CurWorkD", Ci.nsIFile).path;
      },
      get profile_dir() {
        return PathUtils.profileDir;
      },
      get home_dir() {
        return Services.dirsvc.get("Home", Ci.nsIFile).path;
      },
      get temp_dir() {
        return PathUtils.tempDir;
      },

      join(...parts) {
        return PathUtils.join(...parts);
      },
    },
    fs: {
      async read(path, encoding): Promise<string> {
        if (encoding !== "utf8") {
          throw new Error("Only utf8 is supported for now");
        }

        const absolute = resolve_path(path);
        return await IOUtils.readUTF8(absolute).catch((err) => {
          if (err instanceof DOMException && err.name === "NotFoundError") {
            throw new FileNotFoundError(`Could not find a file at path ${absolute}`, { path: absolute });
          }

          throw err;
        });
      },
      async write(path, contents): Promise<void> {
        const absolute = resolve_path(path);
        await IOUtils.writeUTF8(absolute, contents);
      },
      async exists(path) {
        const absolute = resolve_path(path);
        return await IOUtils.exists(absolute);
      },
    },
    modes: {
      register(mode, opts) {
        if (GlideBrowser._modes[mode]) {
          throw new Error(`The \`${mode}\` mode has already been registered. Modes can only be registered once`);
        }

        GlideBrowser._modes[mode] = { caret: opts.caret };
        MODE_SCHEMA_TYPE.enum.push(mode);
        GlideBrowser.key_manager.register_mode(mode);
      },
    },
    prefs: {
      set(name, value) {
        const type = Services.prefs.getPrefType(name);
        switch (type) {
          case Services.prefs.PREF_STRING:
            Services.prefs.setStringPref(name, value as string);
            break;
          case Services.prefs.PREF_INT:
            Services.prefs.setIntPref(name, value as number);
            break;
          case Services.prefs.PREF_BOOL:
            Services.prefs.setBoolPref(name, value as boolean);
            break;
          case Services.prefs.PREF_INVALID:
            switch (typeof value) {
              case "string":
                return Services.prefs.setStringPref(name, value);
              case "number":
                return Services.prefs.setIntPref(name, value);
              case "boolean":
                return Services.prefs.setBoolPref(name, value);
              default:
                throw new Error(`Invalid pref type, expected string, number or boolean but got ${typeof value}`);
            }
          default:
            throw new Error(`Unexpected internal \`.getPrefType()\` value - ${type}. Expected ${
              human_join([
                Services.prefs.PREF_INT!,
                Services.prefs.PREF_BOOL!,
                Services.prefs.PREF_STRING!,
                Services.prefs.PREF_INVALID!,
              ], { final: "or" })
            }`);
        }
      },
      get(name) {
        const type = Services.prefs.getPrefType(name);
        switch (type) {
          case Services.prefs.PREF_STRING:
            return Services.prefs.getStringPref(name);
          case Services.prefs.PREF_INT:
            return Services.prefs.getIntPref(name);
          case Services.prefs.PREF_BOOL:
            return Services.prefs.getBoolPref(name);
          case Services.prefs.PREF_INVALID:
            return undefined;
          default:
            throw new Error(`Unexpected internal \`.getPrefType()\` value - ${type}. Expected ${
              human_join([
                Services.prefs.PREF_INT!,
                Services.prefs.PREF_BOOL!,
                Services.prefs.PREF_STRING!,
                Services.prefs.PREF_INVALID!,
              ], { final: "or" })
            }`);
        }
      },
      clear(name) {
        Services.prefs.clearUserPref(name);
      },
    },
    messengers: {
      create(receiver) {
        return GlideBrowser.create_messenger(receiver);
      },
    },
    process: {
      async spawn(command, args, opts) {
        const { Subprocess } = ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs");

        const stderr = opts?.stderr ?? "pipe";
        const success_codes = opts?.success_codes ?? [0];
        const check_exit_code = opts?.check_exit_code ?? true;

        const subprocess = await Subprocess.call({
          command: await Subprocess.pathSearch(command),
          arguments: args ?? [],
          stderr,
          workdir: opts?.cwd,
          environment: opts?.env,
          environmentAppend: opts?.extend_env ?? true,
        }) as BaseProcess;

        const proc: glide.Process = {
          exit_code: null,
          pid: subprocess.pid,

          stdout: inputpipe_to_readablestream(assert_present(subprocess.stdout), "stdout"),
          stderr: stderr === "pipe" ? inputpipe_to_readablestream(assert_present(subprocess.stderr), "stderr") : null,

          async wait() {
            return await exit_promise;
          },

          async kill(timeout) {
            await subprocess.kill(timeout);
            return proc as glide.CompletedProcess;
          },
        };

        const exit_promise = subprocess.exitPromise.then(({ exitCode }): glide.CompletedProcess => {
          const exit_code = exitCode as number;

          proc.exit_code = exit_code;

          if (check_exit_code && !success_codes.includes(exit_code)) {
            throw new GlideProcessError(
              `Process exited with a non-zero code ${exit_code}`,
              proc as glide.CompletedProcess,
            );
          }

          return proc as glide.Process & { exit_code: number };
        });

        return proc;

        function inputpipe_to_readablestream(input_pipe: ProcessInputPipe, name: string): ReadableStream {
          const stream = new ReadableStream({
            async pull(controller: ReadableStreamDefaultController) {
              const text = await input_pipe.readString().catch((err) => {
                GlideBrowser._log.debug(`error encountered while reading ${name} pipe`, err);
                return "";
              });

              if (text === "") {
                GlideBrowser._log.debug(`closing ${name} pipe`);
                controller.close();
              } else {
                controller.enqueue(text);
              }
            },

            cancel() {
              GlideBrowser._log.debug(`cancelling ${name} pipe`);
              return input_pipe.close();
            },
          });

          return stream;
        }
      },
      async execute(command, args, opts) {
        const process = await this.spawn(command, args, opts);
        return await process.wait();
      },
    },
    unstable: {
      async include(rel_path) {
        const config_path = assert_present(
          GlideBrowser.config_path,
          "cannot call .include() without a config path set",
        );
        const config_dir = assert_present(
          PathUtils.parent(config_path),
          `Could not resolve parent dir for config path ${config_path}`,
        );

        const path = (() => {
          try {
            return PathUtils.join(config_dir, rel_path);
          } catch (err) {
            throw new Error(`Could not resolve file at path ${config_dir} + ${rel_path}`);
          }
        })();

        GlideBrowser._log.info(`Including \`${path}\``);
        const config_str = await IOUtils.readUTF8(path);

        const sandbox = create_sandbox({
          document: GlideBrowser._mirrored_document,
          window: GlideBrowser._sandbox_window,
          original_window: window,
          console,
          get glide(): Glide {
            return {
              ...GlideBrowser.api,
              unstable: {
                ...GlideBrowser.api.unstable,
                include: async () => {
                  throw new Error("Nested `.include()` calls are not supported yet");
                },
              },
            };
          },
          get browser() {
            return GlideBrowser.browser_proxy_api;
          },
        });

        try {
          const config_js = TSBlank.default(config_str);
          Cu.evalInSandbox(config_js, sandbox, null, `chrome://glide/config/${rel_path}`, 1, false);
        } catch (err) {
          GlideBrowser._log.error(err);

          // TODO: better stack trace
          const loc = (err as Error).stack ?? rel_path;
          GlideBrowser.add_notification(GlideBrowser.config_error_id, {
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
      },
    },
  };
}

function resolve_path(path: string): string {
  if (PathUtils.isAbsolute(path)) {
    return path;
  }

  if (!GlideBrowser.config_path) {
    throw new Error("Non absolute paths can only be used when there is a config file defined.");
  }

  return PathUtils.joinRelative(PathUtils.parent(GlideBrowser.config_path) ?? "/", path);
}

// only call `.init()` here so that we can ensure `GlideBrowser` is accessible inside `make_glide_api()`
GlideBrowser.init();
