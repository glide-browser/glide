/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SetRequired, Split } from "type-fest";
import type { GlideHandlerParent } from "../../actors/GlideHandlerParent.sys.mjs";
import type { GlideDocsParent } from "../../actors/GlideDocsParent.sys.mjs";
import type {
  GlideOperator,
  GlideCommandString,
} from "./browser-excmds-registry.mts";
import type { Jumplist } from "./plugins/jumplist.mts";

const DefaultKeymaps = ChromeUtils.importESModule(
  "chrome://glide/content/plugins/keymaps.mjs",
  { global: "current" }
);
const { GlideBrowserDev } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-dev.mjs",
  { global: "current" }
);
const Keys = ChromeUtils.importESModule(
  "chrome://glide/content/utils/keys.mjs",
  { global: "current" }
);
const JumplistPlugin = ChromeUtils.importESModule(
  "chrome://glide/content/plugins/jumplist.mjs"
);
const Promises = ChromeUtils.importESModule(
  "chrome://glide/content/utils/promises.mjs"
);
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", {
  global: "current",
});
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const { assert_never, assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { default: ts_blank_space } = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/ts-blank-space.mjs"
);
const { human_join } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/arrays.mjs"
);
const { redefine_getter } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/objects.mjs"
);
const { create_sandbox } = ChromeUtils.importESModule(
  "chrome://glide/content/sandbox.mjs"
);
const { MODE_SCHEMA_TYPE } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-excmds-registry.mjs"
);

export interface State {
  mode: GlideMode;
  operator: GlideOperator | null;
}
export interface StateChangeMeta {
  /* By default, when exiting visual mode we collapse the selection but for certain cases, e.g.
   * yanking, we want to display a short animation first. */
  disable_auto_collapse?: boolean;
}

const _defaultState: State = {
  mode: "normal",
  operator: null,
};

export type StateChangeListener = (
  new_state: State,
  old_state: State,
  meta: StateChangeMeta | undefined
) => void;

const DEBOUNCE_MODE_ANIMATION_FRAMES = 3;

class GlideBrowserClass {
  state_listeners = new Set<StateChangeListener>();
  state = { ..._defaultState };
  key_manager = new Keys.KeyManager();
  config_path: string | null = null;

  #api: typeof glide | null = null;
  _log: ConsoleInstance =
    console.createInstance ?
      console.createInstance({
        prefix: "Glide",
        maxLogLevelPref: "glide.logging.loglevel",
      })
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
        args: glide.AutocmdArgs[K]
      ) => (() => void | Promise<void>) | void | Promise<void>;
    }[];
  } = {};

  init() {
    document!.addEventListener("blur", this.#on_blur.bind(this), true);
    document!.addEventListener("keydown", this.#on_keydown.bind(this), true);
    document!.addEventListener("keypress", this.#on_keypress.bind(this), true);
    document!.addEventListener("keyup", this.#on_keyup.bind(this), true);

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
        GlideBrowser.#startup_finished = true;

        const listeners = [...GlideBrowser.#startup_listeners];
        GlideBrowser.#startup_listeners.clear();

        for (const listener of listeners) {
          listener();
        }

        GlideBrowser.add_state_change_listener(
          GlideBrowser.#state_change_autocmd
        );

        GlideBrowserDev.init();

        gBrowser.addProgressListener(GlideBrowser.progress_listener);

        Services.obs.removeObserver(
          startup_observer,
          "browser-idle-startup-tasks-finished"
        );
      },
    };
    Services.obs.addObserver(
      startup_observer,
      "browser-idle-startup-tasks-finished"
    );

    // copy the glide-api.d.ts file to the profile dir so it's easy to
    // refer to it in the config file
    this.on_startup(async () => {
      const { fetch_resource } = ChromeUtils.importESModule(
        "chrome://glide/content/utils/resources.mjs"
      );

      await IOUtils.writeUTF8(
        PathUtils.join(PathUtils.profileDir, "glide-api.d.ts"),
        await fetch_resource("chrome://glide/content/glide-api.d.ts", {
          loadUsingSystemPrincipal: true,
        })
      );
    });

    this.on_startup(() => {
      // check for extension errors every 500ms as there are no listeners we can register
      // and the extension code is running with different privileges which makes setting
      // up listeners a bit dubious / difficult
      setInterval(this.flush_pending_error_notifications.bind(this), 500);
    });

    const config_promise = this.reload_config();

    this.on_startup(async () => {
      await config_promise;

      const results = await Promise.allSettled(
        (GlideBrowser.autocmds.Startup ?? []).map(cmd =>
          (async () => {
            const cleanup = await cmd.callback({});
            if (typeof cleanup === "function") {
              throw new Error(
                "Startup autocmds cannot define cleanup functions"
              );
            }
          })()
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          continue;
        }

        GlideBrowser._log.error(result.reason);
        const loc =
          GlideBrowser.#clean_stack(result.reason, "init/") ?? "<unknown>";
        GlideBrowser.add_notification("glide-autocmd-error", {
          label: `Error occurred in Startup autocmd \`${loc}\` - ${result.reason}`,
          priority:
            MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
          buttons: [GlideBrowser.remove_all_notifications_button],
        });
      }
    });
  }

  async reload_config() {
    await this.#reload_config();

    this.on_startup(() => {
      const Please = ChromeUtils.importESModule(
        "chrome://glide/content/please.mjs"
      );
      Please.pretty(this.api, this.browser_proxy_api);
    });

    this.on_startup(async () => {
      if (this.#config_watcher_id) {
        clearInterval(this.#config_watcher_id);
        this.#config_watcher_id = undefined;
      }

      const path = this.config_path;
      if (!path) return;

      this.#config_watcher_id = setInterval(async () => {
        if (this.#config_pending_notification) {
          // no need to do anything if we've already notified
          return;
        }

        const stat = await IOUtils.stat(path);
        if (!stat.lastModified) {
          throw new Error(
            `[config watcher]: stat of \`${path}\` does not include a \`lastModified\` value`
          );
        }

        if (this.#config_modified_timestamp === undefined) {
          // ignore first stat
          this.#config_modified_timestamp = stat.lastModified;
          return;
        }

        if (stat.lastModified > this.#config_modified_timestamp) {
          this.#config_modified_timestamp = stat.lastModified;
          this.#config_pending_notification = true;

          this.add_notification(this.#config_pending_notification_id, {
            label: "The config has been modified!",
            priority: MozElements.NotificationBox.prototype.PRIORITY_INFO_HIGH,
            buttons: [
              {
                "l10n-id": "glide-error-notification-reload-config-button",
                callback: () => {
                  this.#config_pending_notification = false;
                  GlideBrowser.reload_config();
                },
              },
            ],
          });
        }
      }, 500) as any as number;
    });
  }

  #config_watcher_id: number | undefined;
  readonly #config_pending_notification_id: string =
    "glide-config-reload-notification";
  #config_pending_notification: boolean = false;
  #config_modified_timestamp: number | undefined;

  async #reload_config() {
    this.#api = null;
    this.config_path = null;
    this._modes = {} as any;
    this.#clear_config_error_notification();

    this.autocmds = {};

    this.key_manager = new Keys.KeyManager();

    // builtin modes
    this.api.modes.register("hint");
    this.api.modes.register("normal");
    this.api.modes.register("insert");
    this.api.modes.register("visual");
    this.api.modes.register("ignore");
    this.api.modes.register("command");
    this.api.modes.register("op-pending");

    // default plugins
    DefaultKeymaps.init(this.api);

    this.jumplist = new JumplistPlugin.Jumplist(
      this.api,
      this.browser_proxy_api
    );

    if (this.#startup_finished) {
      // clear all registered event listeners and any custom state on the `browser` object
      const addon = await AddonManager.getAddonByID(
        "glide-internal@mozilla.org"
      );
      await addon.reload();

      // TODO(glide): only do this if we need to
      redefine_getter(
        this,
        "browser_parent_api",
        this.#create_browser_parent_api()
      );
      redefine_getter(
        this,
        "browser_proxy_api",
        this.#create_browser_proxy_api()
      );
    }

    const config_path = await this.resolve_config_path();
    this.config_path = config_path;

    if (!config_path) {
      this._log.info("No `glide.ts` config found");
      return;
    }

    this._log.info(`Executing config file at \`${config_path}\``);
    const config_str = await IOUtils.readUTF8(config_path);

    const sandbox = create_sandbox({
      document,
      console,
      get glide() {
        return GlideBrowser.api;
      },
      get browser() {
        return GlideBrowser.browser_proxy_api;
      },
    });

    try {
      const config_js = ts_blank_space(config_str);
      Cu.evalInSandbox(config_js, sandbox, null, this.#config_uri, 1, false);
    } catch (err) {
      this._log.error(err);

      const loc =
        this.#clean_stack(err, this.#reload_config.name) ?? "glide.ts";
      this.add_notification(this.#config_error_id, {
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

  async #state_change_autocmd(new_state: State, old_state: State) {
    const cmds = GlideBrowser.autocmds.ModeChanged ?? [];
    if (!cmds.length) {
      return;
    }

    const args: glide.AutocmdArgs["ModeChanged"] = {
      new_mode: new_state.mode,
      old_mode: old_state.mode,
    };

    // TODO: display errors as they come in
    const results = await Promise.allSettled(
      cmds.map(cmd =>
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
            throw new Error(
              "ModeChanged autocmds cannot define cleanup functions"
            );
          }
        })()
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      GlideBrowser._log.error(result.reason);

      // TODO: if there are many errors this would be overwhelming...
      //       maybe limit the number of errors we display at once?

      const loc =
        GlideBrowser.#clean_stack(result.reason, "#state_change_autocmd") ??
        "<unknown>";
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
      this.add_notification(this.#config_error_id, {
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
        parameter: "removed" | "dismissed" | "disconnected"
      ) => void;
      buttons?: GlobalBrowser.NotificationBox.Button[];
    }
  ) {
    this.on_startup(() => {
      const { buttons, ...data } = props;
      gNotificationBox.appendNotification(type, data, buttons);
    });
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
        flags?: u32
      ) {
        GlideBrowser._log.debug(
          "onLocationChange",
          location.spec,
          flags,
          `topLevel=${web_progress.isTopLevel}`
        );
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
          flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT! &&
          this.$last_location === location.spec
        ) {
          return;
        }

        this.$last_location = location.spec;

        if (flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_HASHCHANGE!) {
          // ignore changes that are just to the `#` part of the url
          return;
        }

        if (!web_progress.isTopLevel) {
          return; // ignore iframes etc.
        }

        GlideBrowser._log.debug("onLocationChange clearing buffer");
        await GlideBrowser.clear_buffer();

        const cmds = GlideBrowser.autocmds.UrlEnter ?? [];
        if (!cmds.length) {
          return;
        }

        const args: glide.AutocmdArgs["UrlEnter"] = { url: location.spec };

        const results = await Promise.allSettled(
          cmds.map(cmd =>
            (async () => {
              if (
                !GlideBrowser.#test_url_autocmd_pattern(cmd.pattern, location)
              ) {
                return;
              }

              const cleanup = await cmd.callback(args);
              if (typeof cleanup === "function") {
                GlideBrowser.#buffer_cleanups.push({
                  callback: cleanup,
                  source: "UrlEnter cleanup",
                });
              }
            })()
          )
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            continue;
          }

          GlideBrowser._log.error(result.reason);

          // TODO: if there are many errors this would be overwhelming...
          //       maybe limit the number of errors we display at once?

          const loc =
            GlideBrowser.#clean_stack(result.reason, "get progress_listener") ??
            "<unknown>";
          GlideBrowser.add_notification("glide-autocmd-error", {
            label: `Error occurred in UrlEnter autocmd \`${loc}\` - ${result.reason}`,
            priority:
              MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
            buttons: [GlideBrowser.remove_all_notifications_button],
          });
        }
      },
    });
  }

  #test_url_autocmd_pattern(
    pattern: glide.AutocmdPatterns["UrlEnter"],
    location: nsIURI
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

  #buffer_cleanups: { callback: () => void | Promise<void>; source: string }[] =
    [];

  async clear_buffer() {
    this.api.bo = {};
    this.key_manager.clear_buffer();

    const cleanups = this.#buffer_cleanups;
    this.#buffer_cleanups = [];

    const results = await Promises.all_settled(
      cleanups.map(({ callback, source }) => ({
        callback,
        metadata: { source },
      }))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        continue;
      }

      this._log.error(result.reason);

      // TODO: if there are many errors this would be overwhelming...
      //       maybe limit the number of errors we display at once?
      const loc =
        this.#clean_stack(result.reason, "all_settled") ?? "<unknown>";
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
        typeof err === "object" &&
          err != null &&
          "stack" in err &&
          typeof err.stack === "string"
      ) ?
        err.stack
          .slice(0, err.stack.indexOf(`\n${up_to_func_name}`))
          .replace(this.#config_uri, "glide.ts")
      : null;
  }

  #config_error_id = "glide-config-error";

  #clear_config_error_notification() {
    try {
      for (const notification of gNotificationBox.allNotifications) {
        const value = notification.getAttribute("value");
        if (
          value === this.#config_error_id ||
          value === this.#config_pending_notification_id
        ) {
          gNotificationBox.removeNotification(notification);
        }
      }
    } catch (_) {
      // just ignore any errors here as we may try to call this too early in
      // startup where it also isn't even applicable yet
    }
  }

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
      throw new Error(
        `Expected to find a web extension with ID: \`${this.#extension_id}\``
      );
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
    return redefine_getter(
      this,
      "browser_parent_api",
      this.#create_browser_parent_api()
    );
  }

  #create_browser_parent_api(): typeof browser {
    const extension = this.extension;
    const browser = extension.backgroundContext?.apiObj;
    if (!browser) {
      // TODO(glide): define an easy way to register a listener for when
      //              this would be possible and recommend it here.
      throw new Error("Tried to access `browser` too early in startup");
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
            .getAPI(extension.backgroundContext)
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
    return redefine_getter(
      this,
      "browser_proxy_api",
      GlideBrowser.#create_browser_proxy_api()
    );
  }

  #create_browser_proxy_api(): typeof browser {
    function create_browser_proxy_chain(
      previous_chain: (string | symbol)[] = []
    ) {
      return new Proxy(function () {}, {
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
            listener_namespace &&
            String(listener_namespace).startsWith("on")
          ) {
            GlideBrowser._log.debug(
              `Handling request for \`${previous_chain}\` in the main thread`
            );

            // we can't necessarily access the necessary extension context depending on how
            // early on in startup we are, so register a startup listener instead if we haven't
            // finished startup yet.
            GlideBrowser.on_startup(() => {
              let method = GlideBrowser.browser_parent_api;
              for (const prop of previous_chain) {
                method = method[prop];
                if (method == null) {
                  throw new Error(
                    `Could not resolve \`browser\` property at path \`${previous_chain.join(".")}\` - \`${String(prop)}\` was not defined`
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
              return Promise.reject(
                new Error(`\`browser.${method_path}()\` is not supported`)
              );
            }
          }

          return GlideBrowser.send_extension_query({ method_path, args });
        },
      });
    }

    return create_browser_proxy_chain() as typeof browser;
  }

  async send_extension_query(props: { method_path: string; args: any[] }) {
    const { ExtensionParent } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionParent.sys.mjs"
    );

    const child_id = GlideBrowser.extension.backgroundContext?.childId;
    if (!child_id) {
      // TODO(glide): define an easy way to register a listener for when
      //              this would be possible and recommend it here.
      throw new Error("Tried to access `browser` too early in startup");
    }

    // This hits `toolkit/components/extensions/ExtensionChild.sys.mjs::ChildAPIManager::recvRunListener`
    GlideBrowser._log.debug(
      `Sending request for \`${props.method_path}\` to extension process`
    );
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
            [props.method_path, ...IPC.serialise_args(props.args)]
          );
        },
      })
      .then(result => {
        return result != null ? result.deserialize(globalThis) : result;
      });
  }

  add_state_change_listener(cb: StateChangeListener) {
    this.state_listeners.add(cb);
  }

  remove_state_change_listener(cb: StateChangeListener) {
    return this.state_listeners.delete(cb);
  }

  _modes: { [k in GlideMode]: {} } = {} as any;

  get mode_names(): GlideMode[] {
    return Object.keys(this._modes) as GlideMode[];
  }

  // must correspond exactly with `glide/cpp/Glide.h::GlideMode`
  #mode_to_int_enum(mode: GlideMode): number {
    switch (mode) {
      case "normal":
        return 0;
      case "insert":
        return 1;
      case "visual":
        return 2;
      case "op-pending":
        return 3;
      case "ignore":
        return 4;
      case "hint":
        return 5;
      case "command":
        return 6;
      case "test_custom_mode":
        // only for testing purposes, tests have to "mutate" global types
        return 7;
      default:
        // note: explicitly not using `assert_never()` because custom modes will
        //       hit this branch, but for our purposes we want to ensure any new
        //       modes we add are covered in this switch
        ((_x: never) => {})(mode);
        return 7;
    }
  }

  _change_mode(
    new_mode: GlideMode,
    props?: { operator?: GlideOperator | null; meta?: StateChangeMeta }
  ) {
    const old_state = { ...this.state };
    this.state.mode = new_mode;
    this.state.operator = props?.operator ?? null;

    Services.prefs.setIntPref("glide.mode", this.#mode_to_int_enum(new_mode));

    for (const listener of this.state_listeners) {
      listener(this.state, old_state, props?.meta);
    }

    if (
      old_state.mode === "hint" &&
      // browser dev toolbox pref to inspect hint styling
      // `...` at the top-right then `Disable Popup Auto-Hide`
      !Services.prefs.getBoolPref("ui.popup.disable_autohide")
    ) {
      GlideCommands.remove_hints();
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
      element.appendChild(
        DOM.create_element("span", { id, textContent: keyseq.join("") })
      );
    }
  }

  async #on_keydown(event: KeyboardEvent) {
    const keyn = Keys.event_to_key_notation(event);

    // remove any previous results for this key combination
    this.keydown_event_results.delete(keyn);

    // Certain builting key mappings, such as `<Esc>` to exit fullscreen mode,
    // are handled internally in C++ code that dispatches an event *only* to chrome
    // JS to determine if the default behaviour should be prevented.
    //
    // We don't want to interfere with these builtin mappings so we just ignore them.
    //
    // Note: currently this only applies in `normal` mode because the only case I've
    //       looked into is the `<Esc>` to exit full screen mode case and that only
    //       really makes sense to apply in `normal` mode.
    //
    // TODO(glide): our own `.preventDefault()` implementation should be refactored to allow
    //              commands to explicitly allow the key event to passthrough.
    if (
      this.state.mode === "normal" &&
      event.defaultPrevented &&
      !event.defaultPreventedByChrome &&
      !event.defaultPreventedByContent
    ) {
      this.#display_keyseq([]);
      this._log.debug(
        `Ignoring \`${keyn}\` key event as it was dispatched from privileged non-JS code`
      );
      return;
    }

    if (this.#modifier_keys.has(event.key)) {
      // we don't support mapping these keys by themselves, so just ignore them
      return;
    }

    if (this.next_key_waiter !== null) {
      this.#prevent_keydown(keyn, event);

      const glide_event = event as glide.KeyEvent;
      glide_event.glide_key = keyn;

      this.next_key_waiter.resolve(glide_event);
      this.next_key_waiter = null;

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
      const label = [...current_sequence].join("");
      const hints = GlideCommands.get_active_hints().filter(hint =>
        hint.label.startsWith(label)
      );
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
        const actor =
          location === "browser-ui" ? GlideBrowser.get_chrome_actor()
          : location === "content" ? GlideBrowser.get_content_actor()
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
      this.get_focused_actor().send_async_message("Glide::KeyMappingCancel", {
        mode,
      });
      this.key_manager.reset_sequence();
      await this.#on_keydown(event);
      return;
    }

    if (!mapping) {
      this.key_manager.reset_sequence();

      if (this.state.mode === "op-pending") {
        this._change_mode("normal");
        return;
      }

      // if a key mapping didn't match, just let it through.
      return;
    }

    this.#prevent_keydown(keyn, event);

    if (mapping.has_children) {
      this.get_focused_actor().send_async_message("Glide::KeyMappingPartial", {
        mode,
        key: event.key,
      });
    } else if (mapping.value) {
      this.key_manager.reset_sequence();
      this.get_focused_actor().send_async_message(
        "Glide::KeyMappingExecution",
        {
          sequence: mapping.value.sequence,
          mode,
        }
      );
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

  /**
   * Returns the Glide JSActor for the currently focused frame.
   *
   * This determines if the browser content is focused or if the browser UI
   * is focused and returns the corresponding `GlideHandler` actor.
   *
   * https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html
   */
  get_focused_actor(): GlideHandlerParent {
    const browser_element = assert_present(
      customElements.get("browser"),
      "Could not find a custom `browser` element"
    );
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
        .currentWindowGlobal as typeof windowGlobalChild
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
        .currentWindowGlobal as typeof windowGlobalChild
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
    const xdg_dir = Services.env.get("XDG_CONFIG_HOME");

    const config_dirs: ({ path: string; description: string } | null)[] = [
      {
        path: Services.dirsvc.get("CurWorkD", Ci.nsIFile).path,
        description: "cwd",
      },

      {
        path: PathUtils.profileDir,
        description: "profile",
      },

      xdg_dir ?
        { path: PathUtils.join(xdg_dir, "glide"), description: "XDG config" }
      : null,

      {
        path: PathUtils.join(
          Services.dirsvc.get("Home", Ci.nsIFile).path,
          ".config",
          "glide"
        ),
        description: "home",
      },
    ];
    return redefine_getter(this, "config_dirs", config_dirs.filter(Boolean));
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
   * Returns either a buffer-specific option, or the global version. In that order
   */
  get_option<Name extends keyof glide.Options>(
    name: Name
  ): glide.Options[Name] {
    return this.api.bo[name] || this.api.o[name];
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

function make_glide_api(): typeof glide {
  return {
    g: new GlideGlobals(),
    o: {
      yank_highlight: "#edc73b",
      yank_highlight_time: 150,
    },
    bo: {},
    ctx: {
      get url() {
        const url = gBrowser?.selectedBrowser?.currentURI?.spec;
        if (!url) {
          throw new Error("Could not resolve the current URL.");
        }
        return url;
      },

      async is_editing() {
        return await GlideBrowser.get_focused_actor().send_query(
          "Glide::Query::IsEditing"
        );
      },
    },
    autocmds: {
      create<Event extends glide.AutocmdEvent>(
        event: Event,
        pattern_or_callback: glide.AutocmdPatterns[Event] extends never ?
          (args: glide.AutocmdArgs[Event]) => void
        : glide.AutocmdPatterns[Event],
        callback?: (args: glide.AutocmdArgs[Event]) => void
      ) {
        if (typeof pattern_or_callback === "function" && callback) {
          throw new Error(
            "provided a function as a pattern and a callback. only one should be provided"
          );
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
    },
    buf: {
      keymaps: {
        set(modes, lhs, rhs, opts) {
          GlideBrowser.key_manager.set(modes, lhs as string, rhs, {
            ...opts,
            buffer: true,
          });
        },
        del(modes, lhs, opts) {
          GlideBrowser.key_manager.del(modes, lhs as string, {
            ...opts,
            buffer: true,
          });
        },
      },
    },
    tabs: {
      async active() {
        const tabs = await GlideBrowser.browser_proxy_api.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs.length > 1) {
          throw new Error(
            "`glide.tabs.active()`: received multiple active tabs, expected only 1"
          );
        }
        const tab = tabs[0];
        if (!tab) {
          throw new Error("`glide.tabs.active()`: did not receive any tabs");
        }
        if (!tab.id) {
          throw new Error(
            "`glide.tabs.active()`: expected `tab.id` to be defined"
          );
        }
        return tab as SetRequired<typeof tab, "id">;
      },
    },
    excmds: {
      async execute(cmd: GlideCommandString): Promise<void> {
        await GlideExcmds.execute(cmd);
      },
      create<const Excmd extends glide.ExcmdCreateProps>(
        info: Excmd,
        fn: () => void | Promise<void>
      ): Excmd {
        GlideExcmds.add_user_cmd(info, fn);
        return info;
      },
    },
    content: {
      async execute(func, opts) {
        const results =
          await GlideBrowser.browser_proxy_api.scripting.executeScript({
            target: {
              tabId:
                typeof opts.tab_id === "number" ? opts.tab_id : opts.tab_id.id,
            },
            func,
            args: opts.args,
          });
        if (results.length > 1) {
          throw new Error(
            `unexpected - \`browser.scripting.executeScript\` returned multiple (${results.length}) results`
          );
        }

        const result = results[0]!;
        if (result.error) {
          if (
            Object.prototype.toString.call(result.error) === "[object Error]"
          ) {
            throw result.error;
          }

          throw new Error(result.error as any);
        }

        return result.result as any;
      },
    },
    hints: {
      show(opts) {
        GlideBrowser.get_focused_actor().send_async_message("Glide::Hint", {
          action: IPC.maybe_serialise_glidefunction(opts?.action),
          selector: opts?.selector,
          location: opts?.location ?? "content",
          editable_only: opts?.editable ?? undefined,
          auto_activate: opts?.auto_activate ?? false,
        });
      },
    },
    keys: {
      async send(input) {
        const EventUtils = ChromeUtils.importESModule(
          "chrome://glide/content/event-utils.mjs",
          { global: "current" }
        );
        await EventUtils.synthesize_keyseq(
          typeof input === "object" && input && "glide_key" in input ?
            input.glide_key
          : (input as string)
        );
      },
      async next() {
        if (GlideBrowser.next_key_waiter) {
          throw new Error(
            "`glide.keys.next()` can only be registered one at a time"
          );
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
    },
    modes: {
      register(mode) {
        if (GlideBrowser._modes[mode]) {
          throw new Error(
            `The \`${mode}\` mode has already been registered. Modes can only be registered once`
          );
        }

        GlideBrowser._modes[mode] = {};
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
                throw new Error(
                  `Invalid pref type, expected string, number or boolean but got ${typeof value}`
                );
            }
          default:
            throw new Error(
              `Unexpected internal \`.getPrefType()\` value - ${type}. Expected ${human_join(
                [
                  Services.prefs.PREF_INT!,
                  Services.prefs.PREF_BOOL!,
                  Services.prefs.PREF_STRING!,
                  Services.prefs.PREF_INVALID!,
                ],
                { final: "or" }
              )}`
            );
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
            throw new Error(
              `Unexpected internal \`.getPrefType()\` value - ${type}. Expected ${human_join(
                [
                  Services.prefs.PREF_INT!,
                  Services.prefs.PREF_BOOL!,
                  Services.prefs.PREF_STRING!,
                  Services.prefs.PREF_INVALID!,
                ],
                { final: "or" }
              )}`
            );
        }
      },
      clear(name) {
        Services.prefs.clearUserPref(name);
      },
    },
  };
}

// only call `.init()` here so that we can ensure `GlideBrowser` is accessible inside `make_glide_api()`
GlideBrowser.init();
