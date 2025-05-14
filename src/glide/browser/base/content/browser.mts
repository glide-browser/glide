/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SetRequired } from "type-fest";
import type { GlideHandlerParent } from "../../actors/GlideHandlerParent.sys.mjs";
import type { GlideOperator } from "./browser-mode.mts";

const { GlideBrowserDev } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-dev.mjs",
  { global: "current" }
);
const { MOTIONS } = ChromeUtils.importESModule(
  "chrome://glide/content/motions.mjs"
);
const Keys = ChromeUtils.importESModule(
  "chrome://glide/content/utils/keys.mjs",
  { global: "current" }
);
const Jumplist = ChromeUtils.importESModule(
  "chrome://glide/content/jumplist.mjs",
  { global: "current" }
);
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

export interface State {
  mode: GlideMode;
  operator: GlideOperator | null;
}

const _defaultState: State = {
  mode: "normal",
  operator: null,
};

export type StateChangeListener = (new_state: State) => void;

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
  jumplist = new Jumplist.Jumplist();

  #startup_listeners = new Set<() => void>();
  #startup_finished: boolean = false;

  // note: this URI doesn't actually exist but defining it like this
  //       means that devtools can resolve stack traces and show the
  //       config contents
  #config_uri = "chrome://glide/config/glide.ts";

  autocmds: {
    [K in GlideAutocmdEvent]?: {
      pattern: GlideAutocmdPattern;
      callback: (args: GlideAutocmdArgs[K]) => (() => void) | void;
    }[];
  } = {};

  init() {
    document!.addEventListener("blur", this.#on_blur.bind(this), true);
    document!.addEventListener("keydown", this.#on_keydown.bind(this), true);
    document!.addEventListener("keypress", this.#on_keypress.bind(this), true);
    document!.addEventListener("keyup", this.#on_keyup.bind(this), true);

    // As this code is ran very early in the browser startup process, we can't rely on things like
    // `gBrowser.getNotificationBox()` working immediately as there are a couple of error states
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

        for (const listener of GlideBrowser.#startup_listeners) {
          listener();
        }

        GlideBrowserDev.init();
        GlideBrowser.jumplist.init();

        gBrowser.addProgressListener(GlideBrowser.progress_listener);

        GlideBrowser.#startup_listeners.clear();
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

    this.reload_config();
  }

  async reload_config() {
    await this.#reload_config();

    this.on_startup(() => {
      const Please = ChromeUtils.importESModule(
        "chrome://glide/content/please.mjs"
      );
      Please.pretty(this.api, this.browser_proxy_api);
    });
  }

  async #reload_config() {
    this.#api = null;
    this.config_path = null;
    this.#clear_config_error_notification();

    this.autocmds = {};

    this.key_manager = new Keys.KeyManager();
    this.key_manager.set("normal", "<leader>r", "reload");
    this.key_manager.set("normal", "<leader>R", "reload_hard");
    this.key_manager.set("normal", "<leader>b", "commandline_show tab ");

    this.key_manager.set("normal", "gg", "scroll_top");
    this.key_manager.set("normal", "G", "scroll_bottom");

    this.key_manager.set(
      "normal",
      "<C-o>",
      this.jumplist.jump_backwards.bind(this.jumplist)
    );
    this.key_manager.set(
      "normal",
      "<C-i>",
      this.jumplist.jump_forwards.bind(this.jumplist)
    );

    // hint mode
    this.key_manager.set("normal", "<leader>f", "hint");
    this.key_manager.set("hint", "<Esc>", () => {
      GlideCommands.remove_hints();
    });

    // ignore mode
    this.key_manager.set(
      ["normal", "insert", "visual"],
      "<S-Esc>",
      "mode_change ignore"
    );
    this.key_manager.set("ignore", "<S-Esc>", "mode_change normal");

    // history
    this.key_manager.set(["normal", "insert"], "<C-h>", "back");
    this.key_manager.set(["normal", "insert"], "<C-l>", "forward");

    // tabs
    this.key_manager.set(["insert", "normal"], "<C-d>", async () => {
      if (GlideCommands.get_active_commandline_group() === "tab") {
        GlideCommands.remove_active_commandline_browser_tab();
      } else {
        await GlideExcmds.execute("scroll_page_down");
      }
    });
    this.key_manager.set(["normal", "insert"], "<C-u>", "scroll_page_up");
    this.key_manager.set("normal", "<leader>d", "tab_close");
    this.key_manager.set(["normal", "insert"], "<C-j>", "tab_next");
    this.key_manager.set(["normal", "insert"], "<C-k>", "tab_prev");

    this.key_manager.set("normal", ".", "repeat");
    this.key_manager.set("normal", ":", "commandline_show");

    this.key_manager.set(
      ["insert", "visual", "op-pending"],
      "<Esc>",
      "mode_change normal"
    );

    this.key_manager.set("normal", "i", "mode_change insert --automove=left");
    this.key_manager.set("normal", "a", "mode_change insert");
    this.key_manager.set(
      "normal",
      "A",
      "mode_change insert --automove=endline"
    );

    // vim motions
    this.key_manager.set("normal", "d", "mode_change op-pending --operator=d");
    this.key_manager.set("normal", "c", "mode_change op-pending --operator=c");
    for (const motion of MOTIONS) {
      this.key_manager.set("op-pending", motion, "execute_motion");
    }

    this.key_manager.set(["normal", "visual"], "w", "w");
    this.key_manager.set(["normal", "visual"], "W", "W");
    this.key_manager.set("normal", "b", "b");
    this.key_manager.set("normal", "B", "B");
    this.key_manager.set("normal", "x", "x");
    this.key_manager.set("normal", "o", "o");
    this.key_manager.set("normal", "{", "{");
    this.key_manager.set("normal", "}", "}");
    this.key_manager.set("normal", "r", "r");

    // TODO(glide-motions): more general support for numbers like this
    this.key_manager.set("normal", "0", "0");
    this.key_manager.set("normal", "$", "$");
    this.key_manager.set("normal", "h", "caret_move left");
    this.key_manager.set("normal", "l", "caret_move right");
    this.key_manager.set("normal", "j", "caret_move down");
    this.key_manager.set("normal", "k", "caret_move up");
    this.key_manager.set("normal", "yy", "url_yank");

    // visual motions
    this.key_manager.set("normal", "v", "v");
    this.key_manager.set("visual", "h", "vh");
    this.key_manager.set("visual", "l", "vl");
    this.key_manager.set("visual", "d", "vd");

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
      window,
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
      // extract the top level stack frame from a string like
      // @glide.ts:7:7\nreload_config/<@chrome://glide/content/browser.mjs:120:12\n
      const loc =
        (
          typeof err === "object" &&
          err != null &&
          "stack" in err &&
          typeof err.stack === "string"
        ) ?
          err.stack
            .slice(0, err.stack.indexOf("\nreload_config"))
            .replace(this.#config_uri, "glide.ts")
        : "glide.ts";

      const message = `An error occurred while evaluating \`${loc}\` - ${err}`;
      this._log.error(message);

      function add_notification() {
        GlideBrowser._log.debug("adding config error notification");

        const notificationBox = gBrowser.getNotificationBox();
        notificationBox.appendNotification(
          GlideBrowser.#config_error_id,
          {
            label: message,
            priority: notificationBox.PRIORITY_CRITICAL_HIGH,
          },
          [
            {
              "l10n-id": "glide-error-notification-reload-config-button",
              callback: () => {
                GlideBrowser.reload_config();
              },
            },
          ]
        );
      }

      this.on_startup(add_notification);
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
      onLocationChange(
        web_progress: nsIWebProgress,
        _request: nsIRequest,
        location: nsIURI,
        flags?: u32
      ) {
        GlideBrowser._log.debug("onLocationChange", location.spec, flags);
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

        GlideBrowser.clear_buffer();

        const cmds = GlideBrowser.autocmds.UrlEnter ?? [];
        if (!cmds.length) {
          return;
        }

        const args: GlideAutocmdArgs["UrlEnter"] = { url: location.spec };

        for (const cmd of cmds) {
          if (!cmd.pattern.test(location.spec)) {
            continue;
          }

          // TODO: proper error handling
          const cleanup = cmd.callback(args);
          if (typeof cleanup === "function") {
            GlideBrowser.#buffer_cleanups.push(cleanup);
          }
        }
      },
    });
  }

  #buffer_cleanups: (() => void)[] = [];

  clear_buffer() {
    this.key_manager.clear_buffer();

    const cleanups = this.#buffer_cleanups;
    this.#buffer_cleanups = [];

    for (const cleanup of cleanups) {
      cleanup();
    }
  }

  #config_error_id = "glide-config-error";

  #clear_config_error_notification() {
    try {
      const notificationBox = gBrowser.getNotificationBox();
      for (const notification of notificationBox.allNotifications) {
        const value = notification.getAttribute("value");
        if (value === this.#config_error_id) {
          notificationBox.removeNotification(notification);
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
      default:
        throw assert_never(mode);
    }
  }

  _change_mode(
    new_mode: GlideMode,
    props?: { operator?: GlideOperator | null }
  ) {
    const previous_mode = this.state.mode;
    this.state.mode = new_mode;
    this.state.operator = props?.operator ?? null;

    Services.prefs.setIntPref("glide.mode", this.#mode_to_int_enum(new_mode));

    for (const listener of this.state_listeners) {
      listener(this.state);
    }

    if (
      previous_mode === "hint" &&
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
    document!.getElementById(
      "glide-toolbar-mode-button"
    )!.childNodes[0]!.textContent = this.state.mode;
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

        this.get_focused_actor().send_async_message("Glide::ExecuteHint", {
          label,
        });

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
      this._log.debug("nothing is focused");
      return this.#get_chrome_actor();
    }

    // the custom `<browser>` element appears to be the lowest part of the content frame
    // that chrome code can access
    const is_content_focused = active_element instanceof browser_element;
    if (is_content_focused) {
      this._log.debug("content is focused");
      return this.#get_content_actor();
    }

    this._log.debug("chrome is focused");
    return this.#get_chrome_actor();
  }

  #get_content_actor(): GlideHandlerParent {
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

  #get_chrome_actor(): GlideHandlerParent {
    return (
      (browsingContext as any)?.currentWindowGlobal as typeof windowGlobalChild
    )?.getActor("GlideHandler") as any as GlideHandlerParent;
  }

  async resolve_config_path(): Promise<string | null> {
    const cwd_dir = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
    const from_cwd_dir = await this.#get_config_from_dir(cwd_dir.path);
    if (from_cwd_dir) {
      return from_cwd_dir;
    }

    const from_profile_dir = await this.#get_config_from_dir(
      PathUtils.profileDir
    );
    if (from_profile_dir) {
      return from_profile_dir;
    }

    const xdg_config = Services.env.get("XDG_CONFIG_HOME");
    if (xdg_config) {
      const from_xdg = await this.#get_config_from_dir(xdg_config);
      if (from_xdg) {
        return from_xdg;
      }
    }

    const home_dir = Services.dirsvc.get("Home", Ci.nsIFile);
    const from_home_config = await this.#get_config_from_dir(
      PathUtils.join(home_dir.path, ".config", "glide")
    );
    if (from_home_config) {
      return from_home_config;
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
  #mapleader = "\\";

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
    autocmd: {
      create<Event extends GlideAutocmdEvent>(
        event: Event,
        pattern: GlideAutocmdPattern,
        callback: (args: GlideAutocmdArgs[Event]) => void
      ) {
        const existing = GlideBrowser.autocmds[event];
        if (existing) {
          existing.push({ pattern, callback });
        } else {
          GlideBrowser.autocmds[event] = [{ pattern, callback }];
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

          throw new Error(result.error);
        }

        return result.result;
      },
    },
    hints: {
      activate(opts) {
        GlideBrowser.get_focused_actor().send_async_message("Glide::Hint", {
          action: IPC.maybe_serialise_glidefunction(opts?.action),
        });
      },
    },
    keys: {
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
            throw new Error(`Invalid pref name ${name}`);
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
    },
  };
}

// only call `.init()` here so that we can ensure `GlideBrowser` is accessible inside `make_glide_api()`
GlideBrowser.init();
