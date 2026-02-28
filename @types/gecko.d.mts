/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// these types override the ones in `glide/generated/@types/lib.gecko.dom.d.ts``
// with some helpful improvements

declare var gBrowser: GlobalBrowser.GlobalBrowser;
declare var gNotificationBox: GlobalBrowser.NotificationBox;

declare var FileUtils: MockedExports.KnownModules["resource://gre/modules/FileUtils.sys.mjs"]["FileUtils"];
declare var AppMenuNotifications:
  MockedExports.KnownModules["resource://gre/modules/AppMenuNotifications.sys.mjs"]["AppMenuNotifications"];

declare interface MirroredDocument extends Document {
  readonly $brand: "mirror";
}

declare type HiddenWindow =
  & Window
  & typeof globalThis
  & import("../src/glide/browser/base/content/sandbox.mts").Sandbox
  & {
    /* note: this is a type-level only property */
    readonly $brand: "hidden";
  };

declare type TestContent = {
  document: Omit<Document, "getElementById"> & {
    getElementById<E extends HTMLElement = HTMLElement>(id: string): E | null;
  };
  window: Window;
};

interface ChromeWindow extends Window {
  $glide_cached_hidden_browser: nsIWindowlessBrowser | undefined;
  $glide_cached_mirror_document: MirroredDocument | undefined;
}

declare type BaseProcess = import("../engine/toolkit/modules/subprocess/subprocess_common.sys.mjs").BaseProcess;
declare type ProcessInputPipe = import("../engine/toolkit/modules/subprocess/subprocess_common.sys.mjs").InputPipe;

// add all the actual types to the `AddonManager` variable, by default FF only includes the IDL types
declare type _AddonManager =
  (typeof import("../engine/toolkit/mozapps/extensions/AddonManager.sys.mjs"))["AddonManager"];
interface AddonManager extends _AddonManager {}

declare type TypedJSONFile<Data> =
  & Omit<InstanceType<typeof import("../engine/toolkit/modules/JSONFile.sys.mjs")["JSONFile"]>, "data">
  & { data: Data };

/**
 * See `browser/components/tabbrowser/content/tabbrowser.js`
 *
 * This is a very small representation of the available APIs.
 */
declare namespace GlobalBrowser {
  interface GlobalBrowser {
    // tabs
    tabs: BrowserTab[];
    selectedBrowser: BrowserTab | undefined;
    selectedTab: BrowserTab | undefined;
    tabContainer: TabContainer;
    removeTab(tab: BrowserTab): void;
    pinTab(tab: BrowserTab): void;
    unpinTab(tab: BrowserTab): void;
    duplicateTab(
      tab: BrowserTab,
      aRestoreTabImmediately?: boolean,
      aOptions?: { inBackground?: boolean; tabIndex?: number },
    ): void;
    getBrowserForTab(tab: BrowserTab): Browser;
    addProgressListener(listener: Partial<nsIWebProgressListener>): void;
    // note: missing lots of opts
    // see `browser/components/tabbrowser/content/tabbrowser.js`
    addTrustedTab(
      uri: string,
      opts: {
        relatedToCurrent?: boolean;
        inBackground?: boolean;
      },
    ): BrowserTab;

    currentURI: nsIURI;

    // split views
    unsplitTabs(splitview: any): void;
    addTabSplitView(tabs: BrowserTab[], opts?: { id?: string }): { splitViewId: string; tabs: BrowserTab[] } | null;

    // notifications
    getNotificationBox(): NotificationBox;

    /* used to cache the hint container element */
    $hints_container?: HTMLElement | null | undefined;
    $hints_action?: glide.HintAction;
    $hints_pick?: glide.HintPicker;
    $hints_label_generator?: glide.HintLabelGenerator;
    $hints_location?: glide.HintLocation;
    // TODO(glide): just look at the elements in the container instead?
    $hints?: GlideResolvedHint[];
  }

  /** Corresponds to the `<tabs>` element */
  interface TabContainer {
    allTabs: BrowserTab[];
    selectedIndex: number;
    querySelector(selectors: string): HTMLElement | null;
  }

  /** Corresponds to the `<browser>` element */
  interface Browser extends HTMLElement {
    parentNode: HTMLElement;
  }

  /**
   * See `toolkit/content/widgets/notificationbox.js`
   */
  interface NotificationBox {
    readonly PRIORITY_SYSTEM: 0;
    readonly PRIORITY_INFO_LOW: 1;
    readonly PRIORITY_INFO_MEDIUM: 2;
    readonly PRIORITY_INFO_HIGH: 3;
    readonly PRIORITY_WARNING_LOW: 4;
    readonly PRIORITY_WARNING_MEDIUM: 5;
    readonly PRIORITY_WARNING_HIGH: 6;
    readonly PRIORITY_CRITICAL_LOW: 7;
    readonly PRIORITY_CRITICAL_MEDIUM: 8;
    readonly PRIORITY_CRITICAL_HIGH: 9;

    readonly allNotifications: Notification[];
    readonly currentNotification: Notification | null;

    appendNotification(
      aType: string,
      props: {
        priority: number;
        label: string | DocumentFragment;
        eventCallback?: (
          parameter: "removed" | "dismissed" | "disconnected",
        ) => void;
      },
      buttons?: NotificationBox.Button[],
      aDisableClickJackingDelay?: boolean,
      dismissable?: boolean,
    ): Promise<Notification>;
    removeNotification(notification: Notification): void;

    getNotificationWithValue(value: string): Notification | null;
  }

  namespace NotificationBox {
    interface Button {
      label?: string;
      accessKey?: string;
      "l10n-id"?: string;
      link?: string;
      supportPage?: string;
      popup?: string;
      is?: string;
      // TODO(glide-types): actually has arguments
      callback?: () => void;
    }
  }

  interface Notification extends HTMLElement {
    shadowRoot: HTMLElement;
  }
}

interface MozElements {
  NotificationBox: {
    prototype: GlobalBrowser.NotificationBox;
  };
}

interface nsIWindowMediator {
  // avoid `Iterable<any>` for known cases
  getEnumerator(aWindowType: "navigator:browser"): Iterable<Window>;
}

declare var MozElements: MozElements;

// TODO(glide-types)
declare type BrowserTab = any;

declare var GlideBrowser: typeof import("../src/glide/browser/base/content/browser.mts").GlideBrowser;

declare var Ci: nsIXPCComponents_Interfaces;
declare var Cc: nsXPCComponents_Classes;
declare var Cu: nsXPCComponents_Utils & nsIXPCComponents_Utils;
declare var Services: JSServices;
declare var PlacesUtils: typeof import("../engine/toolkit/components/places/PlacesUtils.sys.mjs").PlacesUtils;
declare var SessionWindowUI:
  typeof import("../engine/browser/components/sessionstore/SessionWindowUI.sys.mjs").SessionWindowUI;

declare type _BroadcastConduit =
  import("../engine/toolkit/components/extensions/ConduitsParent.sys.mjs").BroadcastConduit;
declare type _ExtensionCommon =
  typeof import("../engine/toolkit/components/extensions/ExtensionCommon.sys.mjs").ExtensionCommon;
declare type UserSearchEngine = import("../engine/toolkit/components/search/UserSearchEngine.sys.mjs").UserSearchEngine;

declare type GlideHintIPC = import("../src/glide/browser/base/content/hinting.mts").GlideHintIPC;

declare type GlideResolvedHint = GlideHintIPC & {
  label: string;
};

/**
 * Namespace anything that has its types mocked out here. These definitions are
 * only "good enough" to get the type checking to pass in this directory.
 * Eventually some more structured solution should be found. This namespace is
 * global and makes sure that all the definitions inside do not clash with
 * naming.
 */
declare namespace MockedExports {
  /**
   * This interface teaches ChromeUtils.import how to find modules.
   */
  interface KnownModules {
    "chrome://glide/content/utils/dom.mjs": typeof import("../src/glide/browser/base/content/utils/dom.mts");
    "chrome://glide/content/utils/moz.mjs": typeof import("../src/glide/browser/base/content/utils/moz.mts");
    "chrome://glide/content/utils/ipc.mjs": typeof import("../src/glide/browser/base/content/utils/ipc.mts");
    "chrome://glide/content/utils/html.mjs": typeof import("../src/glide/browser/base/content/utils/html.mts");
    "chrome://glide/content/utils/keys.mjs": typeof import("../src/glide/browser/base/content/utils/keys.mts");
    "chrome://glide/content/utils/args.mjs": typeof import("../src/glide/browser/base/content/utils/args.mts");
    "chrome://glide/content/utils/prefs.mjs": typeof import("../src/glide/browser/base/content/utils/prefs.mts");
    "chrome://glide/content/utils/arrays.mjs": typeof import("../src/glide/browser/base/content/utils/arrays.mts");
    "chrome://glide/content/utils/guards.mjs": typeof import("../src/glide/browser/base/content/utils/guards.mts");
    "chrome://glide/content/utils/dedent.mjs": typeof import("../src/glide/browser/base/content/utils/dedent.mts");
    "chrome://glide/content/utils/objects.mjs": typeof import("../src/glide/browser/base/content/utils/objects.mts");
    "chrome://glide/content/utils/strings.mjs": typeof import("../src/glide/browser/base/content/utils/strings.mts");
    "chrome://glide/content/utils/promises.mjs": typeof import("../src/glide/browser/base/content/utils/promises.mts");
    "chrome://glide/content/utils/browser-ui.mjs":
      typeof import("../src/glide/browser/base/content/utils/browser-ui.mts");
    "chrome://glide/content/utils/resources.mjs":
      typeof import("../src/glide/browser/base/content/utils/resources.mts");
    "chrome://glide/content/browser.mjs": typeof import("../src/glide/browser/base/content/browser.mts");
    "chrome://glide/content/motions.mjs": typeof import("../src/glide/browser/base/content/motions.mts");
    "chrome://glide/content/sandbox.mjs": typeof import("../src/glide/browser/base/content/sandbox.mts");
    "chrome://glide/content/sandbox-properties.mjs":
      typeof import("../src/glide/browser/base/content/sandbox-properties.mjs");
    "chrome://glide/content/document-mirror.mjs":
      typeof import("../src/glide/browser/base/content/document-mirror.mts");
    "chrome://glide/content/extensions.mjs": typeof import("../src/glide/browser/base/content/extensions.mts");
    "chrome://glide/content/browser-hints.mjs": typeof import("../src/glide/browser/base/content/browser-hints.mts");
    "chrome://glide/content/browser-constants.mjs":
      typeof import("../src/glide/browser/base/content/browser-constants.mts");
    "chrome://glide/content/browser-excmds.mjs": typeof import("../src/glide/browser/base/content/browser-excmds.mts");
    "chrome://glide/content/browser-excmds-registry.mjs":
      typeof import("../src/glide/browser/base/content/browser-excmds-registry.mts");
    "chrome://glide/content/browser-commandline.mjs":
      typeof import("../src/glide/browser/base/content/browser-commandline.mts");
    "chrome://glide/content/browser-messenger.mjs":
      typeof import("../src/glide/browser/base/content/browser-messenger.mts");
    "chrome://glide/content/browser-navigation.mjs":
      typeof import("../src/glide/browser/base/content/browser-navigation.mts");
    "chrome://glide/content/browser-keyboard.mjs":
      typeof import("../src/glide/browser/base/content/browser-keyboard.mts");
    "chrome://glide/content/browser-api.mjs": typeof import("../src/glide/browser/base/content/browser-api.mts");
    "chrome://glide/content/browser-dev.mjs": typeof import("../src/glide/browser/base/content/browser-dev.mts");
    "chrome://glide/content/event-utils.mjs": typeof import("../src/glide/browser/base/content/event-utils.mts");
    "chrome://glide/content/config-init.mjs": typeof import("../src/glide/browser/base/content/config-init.mts");
    "chrome://glide/content/text-objects.mjs": typeof import("../src/glide/browser/base/content/text-objects.mts");
    "chrome://glide/content/hinting.mjs": typeof import("../src/glide/browser/base/content/hinting.mts");
    "chrome://glide/content/please.mjs": typeof import("../src/glide/browser/base/content/please.mts");

    // internal / default plugins
    "chrome://glide/content/plugins/shims.mjs": typeof import("../src/glide/browser/base/content/plugins/shims.mts");
    "chrome://glide/content/plugins/hints.mjs": typeof import("../src/glide/browser/base/content/plugins/hints.mts");
    "chrome://glide/content/plugins/keymaps.mjs":
      typeof import("../src/glide/browser/base/content/plugins/keymaps.mts");
    "chrome://glide/content/plugins/jumplist.mjs":
      typeof import("../src/glide/browser/base/content/plugins/jumplist.mts");
    "chrome://glide/content/plugins/which-key.mjs":
      typeof import("../src/glide/browser/base/content/plugins/which-key.mts");

    "chrome://glide/content/docs.mjs": typeof import("../src/glide/browser/base/content/docs.mts");

    // vendored / bundled
    "chrome://glide/content/bundled/shiki.mjs": typeof import("shiki");
    "chrome://glide/content/bundled/markdoc.mjs": {
      default: typeof import("@markdoc/markdoc");
    };
    "chrome://glide/content/bundled/ts-blank-space.mjs": {
      default: typeof import("ts-blank-space").default;
    };

    "resource://testing-common/DOMFullscreenTestUtils.sys.mjs":
      typeof import("../engine/browser/base/content/test/fullscreen/DOMFullscreenTestUtils.sys.mjs");
    "resource://testing-common/AddonTestUtils.sys.mjs":
      typeof import("../engine/toolkit/mozapps/extensions/internal/AddonTestUtils.sys.mjs");
    "resource://testing-common/GlideTestUtils.sys.mjs":
      typeof import("../src/glide/browser/base/content/GlideTestUtils.sys.mts");
    "resource://testing-common/fast-check.mjs": typeof import("fast-check");

    "resource://gre/modules/JSONFile.sys.mjs": typeof import("../engine/toolkit/modules/JSONFile.sys.mjs");
    "resource://gre/modules/FileUtils.sys.mjs": typeof import("../engine/toolkit/modules/FileUtils.sys.mjs");
    "resource://gre/modules/Extension.sys.mjs":
      typeof import("../engine/toolkit/components/extensions/Extension.sys.mjs");
    "resource://gre/modules/ExtensionCommon.sys.mjs":
      typeof import("../engine/toolkit/components/extensions/ExtensionCommon.sys.mjs");
    "resource://gre/modules/ExtensionParent.sys.mjs":
      & typeof import("../engine/toolkit/components/extensions/ExtensionParent.sys.mjs")
      & {
        ExtensionParent: {
          ParentAPIManager: {
            conduit: BroadcastConduit;
          };
        };
      };
    "resource://gre/modules/ExtensionPermissions.sys.mjs":
      typeof import("../engine/toolkit/components/extensions/ExtensionPermissions.sys.mjs");
    "resource://gre/modules/ConduitsParent.sys.mjs":
      typeof import("../engine/toolkit/components/extensions/ConduitsParent.sys.mjs");
    "resource://gre/modules/AppConstants.sys.mjs":
      typeof import("../src/glide/generated/@types/subs/AppConstants.sys.d.ts");
    "resource://gre/modules/AppMenuNotifications.sys.mjs":
      typeof import("../engine/toolkit/modules/AppMenuNotifications.sys.mjs");

    "resource://devtools/shared/loader/Loader.sys.mjs":
      typeof import("../engine/devtools/shared/loader/Loader.sys.mjs");
    "resource://devtools/client/framework/browser-toolbox/Launcher.sys.mjs":
      typeof import("../engine/devtools/client/framework/browser-toolbox/Launcher.sys.mjs");

    "resource://gre/modules/Subprocess.sys.mjs":
      typeof import("../engine/toolkit/modules/subprocess/Subprocess.sys.mjs");
    "resource://gre/modules/LayoutUtils.sys.mjs": typeof import("../engine/toolkit/modules/LayoutUtils.sys.mjs");
    "resource://gre/modules/Timer.sys.mjs": { setTimeout: typeof setTimeout };
    "resource://gre/modules/NetUtil.sys.mjs": typeof import("../engine/netwerk/base/NetUtil.sys.mjs");
    "resource:///modules/AboutNewTab.sys.mjs": typeof import("../engine/browser/modules/AboutNewTab.sys.mjs");
    "moz-src:///toolkit/components/search/SearchService.sys.mjs":
      typeof import("../engine/toolkit/components/search/SearchService.sys.mjs");
    "moz-src:///toolkit/components/search/SearchUtils.sys.mjs":
      typeof import("../engine/toolkit/components/search/SearchUtils.sys.mjs");
  }

  interface ChromeUtils {
    /**
     * This function reads the KnownModules and resolves which import to use.
     * If you are getting the TS2345 error:
     *
     *  Argument of type '"resource:///.../file.jsm"' is not assignable to parameter
     *  of type
     *
     * Then add the file path to the KnownModules above.
     */
    importESModule: <S extends keyof KnownModules>(
      module: S,
      aOptions?: ImportESModuleOptionsDictionary,
    ) => KnownModules[S];
    defineModuleGetter: (target: any, variable: string, path: string) => void;
    defineESModuleGetters: (target: any, mappings: any) => void;
    generateQI(interfaces: any[]): MozQueryInterface;
  }
}

interface Window {
  gBrowser: GlobalBrowser.GlobalBrowser;
  GlideBrowser: typeof import("../src/glide/browser/base/content/browser.mts").GlideBrowser;
  GlideHints: typeof import("../src/glide/browser/base/content/browser-hints.mts").GlideHints;
  GlideExcmds: typeof import("../src/glide/browser/base/content/browser-excmds.mts").GlideExcmds;
}

interface BroadcastConduit extends _BroadcastConduit {
  // note: I'm not sure exactly where this function is even defined but
  //       this structure is inferred from `toolkit/components/extensions/ExtensionParent.sys.mjs::recvAddListener`
  queryRunListener(
    childId: string,
    props: {
      childId: string;
      handlingUserInput: boolean;
      path: string;
      urgentSend: boolean;
      args: StructuredCloneHolder;
    },
  ): Promise<StructuredCloneHolder | undefined>;
}

type WebExtensionBackgroundContext =
  & InstanceType<
    typeof import("../engine/toolkit/components/extensions/ExtensionParent.sys.mjs").ExtensionPageContextParent
  >
  & InstanceType<_ExtensionCommon["BaseContext"]>;

/**
 * A very much not-exhaustive definition for `toolkit/components/extensions/Extension.sys.mjs::Extension`
 */
interface WebExtension {
  id: string;
  /** e.g. `moz-extension://1b6f6144-9bd9-4133-a645-79de92539951/` */
  baseURL: string;
  /** e.g. `1b6f6144-9bd9-4133-a645-79de92539951` */
  uuid: string;
  apiManager: InstanceType<_ExtensionCommon["LazyAPIManager"]>;
  tabManager: TabManagerBase;
  backgroundContext:
    & WebExtensionBackgroundContext
    & {
      /**
       * This is set in `toolkit/components/extensions/ExtensionCommon.sys.mjs` when any registered
       * web extension listener in our internal extension (used by the config) throws an error.
       *
       * These errors should then be picked up by the main privileged code to report the error.
       */
      $glide_errors?: Set<{ error: unknown; source: string }>;
    };
  // taken from toolkit/components/extensions/parent/ext-backgroundPage.js::BACKGROUND_STATE
  backgroundState: "starting" | "running" | "suspending" | "stopped";

  on(
    event: "extension-proxy-context-load",
    callback: (event: unknown, context: WebExtensionBackgroundContext) => void,
  ): void;
  off(
    event: "extension-proxy-context-load",
    callback: (event: unknown, context: WebExtensionBackgroundContext) => void,
  ): void;
}

interface WebExtensionPolicy {
  extension: WebExtension;
}

declare var ChromeUtils: MockedExports.ChromeUtils;

// note extends types in `glide/generated/@types/lib.gecko.dom.d.ts`
interface Addon {
  sourceURI: nsIURI | null;
  reload(): Promise<void>;
}
declare var AddonManager: AddonManager;

declare class MozXULElement extends XULElement {}

type FindMode = MozFindbarConstants[keyof MozFindbarConstants];

interface MozFindbarConstants {
  readonly FIND_NORMAL: 0;
  readonly FIND_TYPEAHEAD: 1;
  readonly FIND_LINKS: 2;
}

interface MozFindbar extends MozXULElement, MozFindbarConstants {
  findMode: FindMode;
  prefillWithSelection: boolean;
  readonly hasTransactions: boolean;
  browser: XULBrowserElement | null;
  hidden: boolean;
  quickFindTimeoutLength: number;
  _highlightAll?: boolean;
  _entireWord?: boolean;
  _typeAheadCaseSensitive?: 0 | 1 | 2;
  _findField: HTMLInputElement;
  _foundMatches: HTMLLabelElement;
  _findStatusDesc: HTMLElement;
  _findStatusIcon: HTMLElement;

  open(mode?: FindMode): boolean;
  close(noAnim?: boolean): void;
  clear(): void;
  startFind(mode?: FindMode, userWantsPrefill?: boolean, currentSelection?: string): Promise<void>;
  onFindCommand(): Promise<void>;
  onFindAgainCommand(findPrevious: boolean): Promise<void> | undefined;
  onFindSelectionCommand(): void;
  toggleHighlight(highlight: boolean, fromPrefObserver?: boolean): void;
  toggleEntireWord(entireWord: boolean, fromPrefObserver?: boolean): void;

  /**
   * Sets the findbar case-sensitivity mode.
   *
   * @param {number} caseSensitivity 0 - case insensitive,
   *                                 1 - case sensitive,
   *                                 2 - auto = case sensitive if the matching
   *                                     string contains upper case letters.
   * @see _shouldBeCaseSensitive
   */
  _setCaseSensitivity(caseSensitivity: 0 | 1 | 2): void;

  /**
   * Sets the findbar diacritic-matching mode
   *
   * @param {number} diacriticMatching 0 - ignore diacritics,
   *                                   1 - match diacritics,
   *                                   2 - auto = match diacritics if the
   *                                       matching string contains
   *                                       diacritics.
   * @see _shouldMatchDiacritics
   */
  _setDiacriticMatching(diacriticMatching): void;

  _find(): void;
}

/** may be `undefined` if the findbar has never been opened */
declare const gFindBar: MozFindbar | undefined;
declare const gFindBarPromise: Promise<MozFindbar>;

declare interface NodeListOf<TNode extends Node> extends NodeList {
  item(index: number): TNode | null;
  /**
   * Performs the specified action for each node in an list.
   * @param callbackfn  A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the list.
   * @param thisArg  An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  forEach(
    callbackfn: (value: TNode, key: number, parent: NodeListOf<TNode>) => void,
    thisArg?: any,
  ): void;
  [index: number]: TNode;
}

interface ReadableStream<R = any> {
  [Symbol.asyncIterator](options?: ReadableStreamIteratorOptions): ReadableStreamAsyncIterator<R>;
  values(options?: ReadableStreamIteratorOptions): ReadableStreamAsyncIterator<R>;
}

/**
 * The `ReadableStream` interface of the Streams API represents a readable stream of byte data.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream)
 */
interface ReadableStream<R = any> {
  /**
   * The **`locked`** read-only property of the ReadableStream interface returns whether or not the readable stream is locked to a reader.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/locked)
   */
  readonly locked: boolean;
  /**
   * The **`cancel()`** method of the ReadableStream interface returns a Promise that resolves when the stream is canceled.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/cancel)
   */
  cancel(reason?: any): Promise<void>;
  /**
   * The **`getReader()`** method of the ReadableStream interface creates a reader and locks the stream to it.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/getReader)
   */
  getReader(options: { mode: "byob" }): ReadableStreamBYOBReader;
  getReader(): ReadableStreamDefaultReader<R>;
  getReader(options?: ReadableStreamGetReaderOptions): ReadableStreamReader<R>;
  /**
   * The **`pipeThrough()`** method of the ReadableStream interface provides a chainable way of piping the current stream through a transform stream or any other writable/readable pair.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/pipeThrough)
   */
  pipeThrough<T>(transform: ReadableWritablePair<T, R>, options?: StreamPipeOptions): ReadableStream<T>;
  /**
   * The **`pipeTo()`** method of the ReadableStream interface pipes the current `ReadableStream` to a given WritableStream and returns a Promise that fulfills when the piping process completes successfully, or rejects if any errors were encountered.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/pipeTo)
   */
  pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
  /**
   * The **`tee()`** method of the two-element array containing the two resulting branches as new ReadableStream instances.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ReadableStream/tee)
   */
  tee(): [ReadableStream<R>, ReadableStream<R>];
}

interface ReadableStreamAsyncIterator<T> extends AsyncIteratorObject<T, BuiltinIteratorReturn, unknown> {
  [Symbol.asyncIterator](): ReadableStreamAsyncIterator<T>;
}

declare var ReadableStream: {
  prototype: ReadableStream;
  new(
    underlyingSource: UnderlyingByteSource,
    strategy?: { highWaterMark?: number },
  ): ReadableStream<Uint8Array<ArrayBuffer>>;
  new<R = any>(underlyingSource: UnderlyingDefaultSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
  new<R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
};

//////////////////////////////////////////
////////////// typed actors //////////////
//////////////////////////////////////////

/**
 * Type level data on the props tpe the query expects
 * and the type it'll return;
 */
interface GlideActorQuery {
  props: unknown;
  result: unknown;
}

interface JSActor<
  Messages = Record<string, any>,
  Queries = Record<string, GlideActorQuery>,
> {
  readonly name: string;
  sendAsyncMessage<MessageName extends keyof Messages>(
    messageName: MessageName,
    obj?: Messages[MessageName],
    transferables?: any,
  ): void;
  sendQuery<QueryName extends keyof Queries>(
    messageName: QueryName,
    obj?: Queries[QueryName]["props"],
  ): Promise<Queries[QueryName]["result"]>;
}

interface JSWindowActorChild<
  Messages = Record<string, any>,
  Queries = Record<string, GlideActorQuery>,
> extends JSActor<Messages, Queries> {
  readonly browsingContext: BrowsingContext | null;
  readonly contentWindow: WindowProxy | null;
  readonly docShell: nsIDocShell | null;
  readonly document: Document | null;
  readonly manager: WindowGlobalChild | null;
  readonly windowContext: WindowContext | null;
}

declare var JSWindowActorChild: {
  prototype: JSWindowActorChild;
  new<
    Messages = Record<string, any>,
    Queries = Record<string, GlideActorQuery>,
  >(): JSWindowActorChild<Messages, Queries>;
  isInstance: IsInstance<JSWindowActorChild>;
};

interface JSWindowActorParent<
  Messages = Record<string, any>,
  Queries = Record<string, GlideActorQuery>,
> extends JSActor<Messages, Queries> {
  readonly browsingContext: CanonicalBrowsingContext | null;
  readonly manager: WindowGlobalParent | null;
  readonly windowContext: WindowContext | null;
}

declare var JSWindowActorParent: {
  prototype: JSWindowActorParent;
  new<
    Messages = Record<string, any>,
    Queries = Record<string, GlideActorQuery>,
  >(): JSWindowActorParent<Messages, Queries>;
  isInstance: IsInstance<JSWindowActorParent>;
};

//////////////////////////////////////////
//////////////////////////////////////////

/// utility types

type SetNonNullable<BaseType, Keys extends keyof BaseType = keyof BaseType> = {
  [Key in keyof BaseType]: Key extends Keys ? NonNullable<BaseType[Key]>
    : BaseType[Key];
};
