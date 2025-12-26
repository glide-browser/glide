/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SetRequired } from "type-fest";
import type { GlideCommandString } from "./browser-excmds-registry.mts";

const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs", { global: "current" });
const CommandLine = ChromeUtils.importESModule("chrome://glide/content/browser-commandline.mjs", { global: "current" });
const Strings = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");
const DOM = ChromeUtils.importESModule("chrome://glide/content/utils/dom.mjs", { global: "current" });
const IPC = ChromeUtils.importESModule("chrome://glide/content/utils/ipc.mjs");
const CSS = ChromeUtils.importESModule("chrome://glide/content/utils/browser-ui.mjs");
const { ensure, assert_never, assert_present, is_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs",
);
const TSBlank = ChromeUtils.importESModule("chrome://glide/content/bundled/ts-blank-space.mjs");
const { human_join } = ChromeUtils.importESModule("chrome://glide/content/utils/arrays.mjs");
const { object_assign } = ChromeUtils.importESModule("chrome://glide/content/utils/objects.mjs");
const { create_sandbox, FileNotFoundError, GlideProcessError } = ChromeUtils.importESModule(
  "chrome://glide/content/sandbox.mjs",
);
const { MODE_SCHEMA_TYPE } = ChromeUtils.importESModule("chrome://glide/content/browser-excmds-registry.mjs");
const { LayoutUtils } = ChromeUtils.importESModule("resource://gre/modules/LayoutUtils.sys.mjs");

declare var document: Document & { documentElement: HTMLElement };

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

/**
 * Defines setter functions for every `glide.o` option that must mutate outer state, e.g. setting a CSS variable.
 *
 * This is used so that we can easily share this logic between both `glide.o`, and `glide.bo`, e.g.
 * ```typescript
 * glide.o.hint_size = "30px";
 * glide.bo.hint_size = "30px";
 * ```
 * Both of the above lines should set the `--glide-hint-font-size` CSS variable.
 *
 * Note that this object is itself stateless.
 */
const options = {
  hint_size(value) {
    GlideBrowser.set_css_property("--glide-hint-font-size", value);
  },

  native_tabs(value) {
    const id = "$glide.o.native_tabs";
    GlideBrowser.api.styles.remove(id);

    switch (value) {
      case "hide":
        GlideBrowser.api.styles.add(CSS.hide_tabs_toolbar_v2, { id });
        break;
      case "autohide":
        GlideBrowser.api.styles.add(CSS.autohide_tabstoolbar_v2, { id });
        break;
      case "show":
        break;
      default:
        throw assert_never(value);
    }
  },
} as const satisfies { [K in keyof typeof glide["o"]]?: (value: typeof glide["o"][K]) => void };

type GlideO = (typeof glide)["o"];
class GlideOptions implements GlideO {
  mapping_timeout = 200;

  switch_mode_on_focus = true as const;

  scroll_implementation = "keys" as const;

  yank_highlight: glide.RGBString = `#edc73b`;
  yank_highlight_time = 150;

  jumplist_max_entries = 100;

  which_key_delay = 300;

  hint_chars = "hjklasdfgyuiopqwertnmzxcvb";

  #hint_size = "11px";
  get hint_size() {
    return this.#hint_size;
  }
  set hint_size(value: string) {
    this.#hint_size = value;
    options.hint_size(value);
  }

  #hint_label_generator: glide.Options["hint_label_generator"] | null = null;
  get hint_label_generator() {
    return this.#hint_label_generator ?? GlideBrowser.api.hints.label_generators.prefix_free;
  }
  set hint_label_generator(value: glide.Options["hint_label_generator"]) {
    this.#hint_label_generator = value;
  }

  #native_tabs: (typeof glide)["o"]["native_tabs"] = "show";
  get native_tabs() {
    return this.#native_tabs;
  }
  set native_tabs(value: (typeof glide)["o"]["native_tabs"]) {
    this.#native_tabs = value;
    options.native_tabs(value);
  }
}

// above properties that are defined with a `set $prop()` so that we can dynamically construct `glide.bo` and have
// the setters apply outer mutations properly, e.g. setting a CSS variable.
const GLIDE_O_SETTERS = Object.entries(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(new GlideOptions())))
  .filter(([_, descriptor]) => typeof descriptor.set !== "undefined").map(([name]) => name as keyof typeof glide["o"]);

export function make_buffer_options(): typeof glide["bo"] {
  const bo = {} as typeof glide["bo"];

  for (const name of GLIDE_O_SETTERS) {
    let value = undefined as any;
    Object.defineProperty(bo, name, {
      get() {
        return value;
      },
      set(v) {
        value = v;
        // @ts-expect-error TS doesn't like the index as our key type is broader, but it doesn't matter
        options[name]?.(v);
      },
    });
  }

  return bo;
}

export function make_glide_api(
  { get_config_path, shared_api }: { get_config_path: () => string | null; shared_api?: typeof glide },
): typeof glide {
  return {
    g: shared_api?.g ?? new GlideGlobals(),
    o: shared_api?.o ?? new GlideOptions(),
    bo: shared_api?.bo ?? make_buffer_options(),
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
      get version() {
        return Services.appinfo.version;
      },
      get firefox_version() {
        const { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
        return AppConstants.GLIDE_FIREFOX_VERSION;
      },
      get url() {
        const url = (gBrowser?.selectedBrowser?.currentURI as nsIURI)?.spec;
        if (!url) {
          throw new Error("Could not resolve the current URL.");
        }
        return new GlideBrowser.sandbox_window.URL(url);
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
      remove<Event extends glide.AutocmdEvent>(event: Event, cb?: (args: glide.AutocmdArgs[Event]) => void) {
        const events = GlideBrowser.autocmds[event];
        if (events == null) {
          return false;
        }

        const filtered = events.filter(({ callback }) => callback !== cb);
        GlideBrowser.autocmds[event] = filtered as (typeof GlideBrowser.autocmds)[Event];

        return filtered.length !== events.length;
      },
    },
    keymaps: {
      set(modes, lhs, rhs, opts) {
        GlideBrowser.key_manager.set(modes, lhs as string, rhs, opts);
      },
      del(modes, lhs, opts) {
        GlideBrowser.key_manager.del(modes, lhs as string, opts);
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
      async query(query) {
        const tabs = await GlideBrowser.browser_proxy_api.tabs.query(query);
        return tabs;
      },
    },
    commandline: {
      async show(opts) {
        const sources = (() => {
          if (!opts?.options) {
            return;
          }

          const source = new CommandLine.CustomCompletionSource({
            title: opts.title,
            options: opts.options,
          });
          GlideBrowser.api.autocmds.create("CommandLineExit", function autocmd() {
            GlideBrowser.api.autocmds.remove("CommandLineExit", autocmd);

            // remove all custom options from the UI to avoid memory leaks and so that they definitely
            // will not appear in the UI again.
            source.container.remove();
          });

          return [source, ...GlideBrowser.commandline_sources];
        })();

        await GlideBrowser.upsert_commandline({ prefill: opts?.input, sources });
      },
      is_active() {
        return GlideBrowser.is_commandline_focused();
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
      fn(wrapped) {
        return IPC.content_fn(wrapped);
      },
      async execute(
        func: (...args: any[]) => any,
        opts: { tab_id: number | glide.TabWithID; args?: any[] | undefined },
      ) {
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

        gBrowser.$hints_pick = opts?.pick;
        gBrowser.$hints_action = opts?.action;
        gBrowser.$hints_label_generator = opts?.label_generator;

        actor.send_async_message("Glide::Hint", {
          action: typeof opts?.action !== "function" ? opts?.action : undefined,
          selector: opts?.selector,
          location: opts?.location ?? "content",
          include: opts?.include,
          editable_only: opts?.editable ?? undefined,
          include_click_listeners: opts?.include_click_listeners,
          auto_activate: opts?.auto_activate ?? false,
          browser_ui_rect: LayoutUtils.getElementBoundingScreenRect(document!.body),
          debug: Services.prefs.getBoolPref("devtools.testing", false),
        });
      },

      label_generators: {
        prefix_free({ hints }) {
          const hint_chars = GlideBrowser.api.options.get("hint_chars");
          const hint_keys = GlideBrowser.api.keymaps.list("hint").map((k) => k.lhs);
          const alphabet = hint_keys.length
            ? hint_chars.split("").filter((k) => !hint_keys.includes(k))
            : hint_chars.split("");
          return Strings.generate_prefix_free_codes(
            alphabet,
            hints.length,
            GlideHints.make_alphabet_cost_map(hint_chars),
          );
        },

        numeric({ hints }) {
          var ret = [];
          for (var i = 1; i <= hints.length; i++) {
            ret.push(i.toString());
          }
          return ret;
        },
      },
    },

    addons: {
      async install(xpi_url, opts): Promise<glide.AddonInstall> {
        const cache = GlideBrowser.resolved_addons_cache_file;
        await cache.load(); // memoized

        if (!opts?.force) {
          const resolved_addon_info = cache.data.addons[xpi_url];
          const addons = await AddonManager.getAllAddons() as Addon[];

          // we could have an entry in the cache even if the addon has been uninstalled, so verify it actually is installed.
          //
          // the cache is primarily to handle the case where an XPI url has been given but the addon has since been updated, meaning
          // that a naive `sourceURI` check would fail, and the addon would be reverted to the previous version, which is not what we want.
          //
          // this also handles the case where we don't have a cache entry for an addon that has been installed, which
          // could happen in theory if one window installs an addon independently.
          const existing = addons.find((addon) =>
            addon.id === resolved_addon_info?.id || addon.sourceURI?.spec === xpi_url
          );
          if (existing) {
            GlideBrowser._log.debug(`Addon install with url='${xpi_url}' is cached; id='${existing.id}'`);
            return object_assign(firefox_addon_to_glide(existing), { cached: true });
          }
        }

        GlideBrowser._log.debug(`Addon install with url='${xpi_url}' is *not* cached`);

        const installer = await AddonManager.getInstallForURL(xpi_url);
        const ff_addon = await installer.install() as unknown as Addon;

        cache.data.addons[xpi_url] = { id: ff_addon.id };
        cache.saveSoon();

        return object_assign(firefox_addon_to_glide(ff_addon), { cached: false });
      },

      async list(types: glide.AddonType | glide.AddonType[]): Promise<glide.Addon[]> {
        const addons = await (typeof types === "string"
          ? AddonManager.getAddonsByTypes([types])
          : Array.isArray(types)
          ? AddonManager.getAddonsByTypes(types)
          : AddonManager.getAllAddons());
        return addons.map(firefox_addon_to_glide);
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
      async stat(path) {
        const absolute = resolve_path(path);

        const stat = await IOUtils.stat(absolute).catch((err) => {
          if (err instanceof DOMException && err.name === "NotFoundError") {
            throw new FileNotFoundError(`Could not find a file at path ${absolute}`, { path: absolute });
          }

          throw err;
        });

        return {
          type: stat.type === "directory" ? "directory" : stat.type === "regular" ? "file" : null,
          permissions: stat.permissions,
          last_accessed: stat.lastAccessed,
          last_modified: stat.lastModified,
          creation_time: stat.creationTime,
          path: stat.path,
          size: stat.size,
        };
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
      list() {
        return Object.keys(GlideBrowser._modes) as GlideMode[];
      },
    },
    styles: ((): typeof glide["styles"] => {
      const elements = new Map<string, HTMLStyleElement>();
      return {
        add(styles, opts) {
          if (opts?.id && elements.has(opts.id)) {
            throw Cu.cloneInto(
              new Error(`A style element has already been registered with ID '${opts.id}'`),
              GlideBrowser.sandbox_window,
            );
          }

          const element = DOM.create_element("style", { textContent: styles });
          document.head!.appendChild(element);
          GlideBrowser.reload_config_remove_elements.add(element);

          if (opts?.id) {
            elements.set(opts.id, element);
          }
        },
        remove(id) {
          const element = elements.get(id);
          if (!element) {
            return false;
          }

          element.remove();
          elements.delete(id);
          GlideBrowser.reload_config_remove_elements.delete(element);
          return true;
        },
        has(id) {
          return elements.has(id);
        },
      };
    })(),
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
    env: {
      get(name) {
        if (!Services.env.exists(name)) {
          return null;
        }
        return Services.env.get(name);
      },

      set(name, value) {
        Services.env.set(name, value);
      },

      delete(name) {
        const previous = this.get(name);
        Services.env.set(name, "");
        return previous;
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
      split_views: {
        create(tabs, opts) {
          if (tabs.length < 2) {
            throw Cu.cloneInto(new Error("2 or more tabs must be passed"), GlideBrowser.sandbox_window);
          }

          if (opts?.id) {
            const existing = this.get(opts.id);
            if (existing) {
              throw Cu.cloneInto(
                new Error(`Could not create a splitview; The '${opts.id}' ID is already in use`),
                GlideBrowser.sandbox_window,
              );
            }
          }

          const splitview = gBrowser.addTabSplitView(tabs.map(web_tab_to_firefox), { id: opts?.id });
          if (!splitview) {
            throw Cu.cloneInto(
              new Error("Could not create a splitview; Is one of the tabs pinned?"),
              GlideBrowser.sandbox_window,
            );
          }

          return {
            id: splitview.splitViewId,
            tabs: splitview.tabs.map(firefox_tab_to_web),
          };
        },

        separate(tab) {
          if (typeof tab === "string") {
            const splitview = get_firefox_splitview(tab);
            if (!splitview) {
              throw Cu.cloneInto(new Error(`No splitview with ID '${tab}'`), GlideBrowser.sandbox_window);
            }

            gBrowser.unsplitTabs(splitview);
            return;
          }

          const ff_tab = web_tab_to_firefox(tab);
          if (!ff_tab.splitview) {
            throw Cu.cloneInto(new Error("Tab is not in a split view"), GlideBrowser.sandbox_window);
          }

          gBrowser.unsplitTabs(ff_tab.splitview);
        },

        has_split_view(tab) {
          return is_present(this.get(tab));
        },

        get(tab) {
          const splitview = typeof tab === "number"
            ? tab_id_to_firefox(tab).splitview
            : typeof tab === "string"
            ? get_firefox_splitview(tab)
            : tab_id_to_firefox(assert_present(tab.id, "tab given with no id")).splitview;
          if (!splitview) {
            return null;
          }
          return {
            id: splitview.splitViewId,
            tabs: splitview.tabs.map(firefox_tab_to_web),
          };
        },
      },
      async include(path) {
        await load_config_at_path({ absolute: resolve_path(path), relative: path });
      },
    },
  };

  function resolve_path(path: string): string {
    if (PathUtils.isAbsolute(path)) {
      return path;
    }

    const config_path = get_config_path();
    if (!config_path) {
      throw new Error("Non absolute paths can only be used when there is a config file defined.");
    }

    return PathUtils.joinRelative(PathUtils.parent(config_path) ?? "/", path);
  }
}

async function load_config_at_path({ absolute, relative }: { absolute: string; relative: string }) {
  GlideBrowser._log.info(`Including \`${absolute}\``);
  const config_str = await IOUtils.readUTF8(absolute);

  const sandbox = create_sandbox({
    document: GlideBrowser._mirrored_document,
    window: GlideBrowser.sandbox_window,
    original_window: window,
    console,
    get glide(): Glide {
      return {
        ...make_glide_api({
          get_config_path: () => absolute,
          shared_api: GlideBrowser.api,
        }),
        unstable: {
          ...GlideBrowser.api.unstable,
          include: async (new_path) => {
            const resolved_path = PathUtils.isAbsolute(new_path)
              ? new_path
              : PathUtils.joinRelative(PathUtils.parent(absolute) ?? "/", new_path);
            return await load_config_at_path({ absolute: resolved_path, relative: new_path });
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
    Cu.evalInSandbox(config_js, sandbox, null, `chrome://glide/config/${relative}`, 1, false);
  } catch (err) {
    GlideBrowser._log.error(err);

    // TODO: better stack trace
    const loc = (err as Error).stack ?? relative;
    GlideBrowser.add_notification(GlideBrowser.config_error_id, {
      label: `An error occurred while evaluating \`${loc}\` - ${err}`,
      priority: MozElements.NotificationBox.prototype.PRIORITY_CRITICAL_HIGH,
      buttons: [
        {
          "l10n-id": "glide-error-notification-reload-config-button",
          callback: GlideBrowser.reload_config,
        },
      ],
    });
  }
}

function get_firefox_splitview(id: string): any {
  return gBrowser.tabContainer.querySelector(`tab-split-view-wrapper[splitViewId="${id}"]`);
}

function tab_id_to_firefox(id: TabID): BrowserTab {
  return assert_present(
    GlideBrowser.extension?.tabManager?.get?.(id),
    "could not resolve tab, did you call this too early in startup?",
  ).nativeTab;
}

function firefox_tab_to_web(tab: BrowserTab): Browser.Tabs.Tab {
  return assert_present(
    GlideBrowser.extension?.tabManager?.getWrapper?.(tab),
    "could not resolve tab, did you call this too early in startup?",
  ).convert() as Browser.Tabs.Tab;
}

function web_tab_to_firefox(tab: Browser.Tabs.Tab | number): BrowserTab {
  return GlideBrowser.extension.tabManager.get(
    typeof tab === "number" ? tab : ensure(tab.id, "Tab passed without an ID"),
  ).nativeTab;
}

function firefox_addon_to_glide(addon: Addon): glide.Addon {
  return {
    id: addon.id,
    name: addon.name,
    active: addon.isActive,
    version: addon.version,
    description: addon.description,
    source_uri: addon.sourceURI ? new GlideBrowser.sandbox_window.URL(addon.sourceURI.spec) : null,

    async uninstall() {
      await addon.uninstall();
    },
  };
}
