/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// these types override the ones in `glide/generated/@types/lib.gecko.dom.d.ts``
// with some helpful improvements

declare var gBrowser: GlobalBrowser.GlobalBrowser;

/**
 * See `browser/components/tabbrowser/content/tabbrowser.js`
 *
 * This is a very small representation of the available APIs.
 */
declare namespace GlobalBrowser {
  interface GlobalBrowser {
    // tabs
    selectedBrowser: BrowserTab | undefined;
    selectedTab: BrowserTab | undefined;
    tabContainer: TabContainer;
    removeTab(tab: BrowserTab): void;
    getBrowserForTab(tab: BrowserTab): Browser;
    addProgressListener(listener: Partial<nsIWebProgressListener>): void;
    // note: missing lots of opts
    // see `browser/components/tabbrowser/content/tabbrowser.js`
    addTrustedTab(
      uri: string,
      opts: {
        relatedToCurrent?: boolean;
        inBackground?: boolean;
      }
    ): BrowserTab;

    // notifications
    getNotificationBox(): NotificationBox;
  }

  /** Corresponds to the `<tabs>` element */
  interface TabContainer {
    allTabs: BrowserTab[];
    selectedIndex: number;
  }

  /** Corresponds to the `<browser>` element */
  interface Browser extends HTMLElement {
    parentNode: HTMLElement;

    /* used to cache the hint container element */
    $hints_container?: HTMLElement | null | undefined;
    // TODO(glide): just look at the elements in the container instead?
    $hints?: GlideHintIPC[];
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
        label: string;
        eventCallback?: (
          parameter: "removed" | "dismissed" | "disconnected"
        ) => void;
      },
      buttons?: {
        label?: string;
        accessKey?: string;
        "l10n-id"?: string;
        link?: string;
        supportPage?: string;
        popup?: string;
        is?: string;
        // TODO(glide-types): actually has arguments
        callback?: () => void;
      }[]
    ): Promise<Notification>;
    removeNotification(notification: Notification): void;

    getNotificationWithValue(value: string): Notification;
  }

  interface Notification extends HTMLElement {
    shadowRoot: HTMLElement;
  }
}

// TODO(glide-types)
declare type BrowserTab = any;

declare var GlideBrowser: typeof import("../src/glide/browser/base/content/browser.mts").GlideBrowser;

declare var Ci: nsIXPCComponents_Interfaces;
declare var Cc: nsXPCComponents_Classes;
declare var Cu: nsXPCComponents_Utils & nsIXPCComponents_Utils;
declare var Services: JSServices;
declare var PlacesUtils: typeof import("../engine/toolkit/components/places/PlacesUtils.sys.mjs").PlacesUtils;

declare type _BroadcastConduit =
  import("../engine/toolkit/components/extensions/ConduitsParent.sys.mjs").BroadcastConduit;
declare type _ExtensionCommon =
  typeof import("../engine/toolkit/components/extensions/ExtensionCommon.sys.mjs").ExtensionCommon;

declare type GlideHintIPC =
  import("../src/glide/browser/base/content/hinting.mts").GlideHintIPC;

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
    "chrome://glide/content/utils/ipc.mjs": typeof import("../src/glide/browser/base/content/utils/ipc.mts");
    "chrome://glide/content/utils/html.mjs": typeof import("../src/glide/browser/base/content/utils/html.mts");
    "chrome://glide/content/utils/keys.mjs": typeof import("../src/glide/browser/base/content/utils/keys.mts");
    "chrome://glide/content/utils/args.mjs": typeof import("../src/glide/browser/base/content/utils/args.mts");
    "chrome://glide/content/utils/arrays.mjs": typeof import("../src/glide/browser/base/content/utils/arrays.mts");
    "chrome://glide/content/utils/guards.mjs": typeof import("../src/glide/browser/base/content/utils/guards.mts");
    "chrome://glide/content/utils/dedent.mjs": typeof import("../src/glide/browser/base/content/utils/dedent.mts");
    "chrome://glide/content/utils/objects.mjs": typeof import("../src/glide/browser/base/content/utils/objects.mts");
    "chrome://glide/content/utils/strings.mjs": typeof import("../src/glide/browser/base/content/utils/strings.mts");
    "chrome://glide/content/browser.mjs": typeof import("../src/glide/browser/base/content/browser.mts");
    "chrome://glide/content/motions.mjs": typeof import("../src/glide/browser/base/content/motions.mts");
    "chrome://glide/content/sandbox.mjs": typeof import("../src/glide/browser/base/content/sandbox.mts");
    "chrome://glide/content/extensions.mjs": typeof import("../src/glide/browser/base/content/extensions.mts");
    "chrome://glide/content/browser-mode.mjs": typeof import("../src/glide/browser/base/content/browser-mode.mts");
    "chrome://glide/content/browser-excmds.mjs": typeof import("../src/glide/browser/base/content/browser-excmds.mts");
    "chrome://glide/content/browser-commands.mjs": typeof import("../src/glide/browser/base/content/browser-commands.mts");
    "chrome://glide/content/browser-dev.mjs": typeof import("../src/glide/browser/base/content/browser-dev.mts");
    "chrome://glide/content/text-objects.mjs": typeof import("../src/glide/browser/base/content/text-objects.mts");
    "chrome://glide/content/hinting.mjs": typeof import("../src/glide/browser/base/content/hinting.mts");
    "chrome://glide/content/jumplist.mjs": typeof import("../src/glide/browser/base/content/jumplist.mts");

    "chrome://glide/content/docs.mjs": typeof import("../src/glide/browser/base/content/docs.mts");

    // venodred / bundled
    "chrome://glide/content/bundled/shiki.mjs": typeof import("shiki");
    "chrome://glide/content/bundled/markdoc.mjs": {
      default: typeof import("@markdoc/markdoc");
    };
    "chrome://glide/content/bundled/ts-blank-space.mjs": {
      default: typeof import("ts-blank-space").default;
    };
    "chrome://glide/content/bundled/prettier.mjs": typeof import("prettier");
    "chrome://glide/content/bundled/prettier-html.mjs": typeof import("prettier/plugins/html.d.ts");

    "resource://testing-common/DOMFullscreenTestUtils.sys.mjs": typeof import("../engine/browser/base/content/test/fullscreen/DOMFullscreenTestUtils.sys.mjs");
    "resource://testing-common/GlideTestUtils.sys.mjs": typeof import("../src/glide/browser/base/content/GlideTestUtils.sys.mts");

    "resource://gre/modules/Extension.sys.mjs": typeof import("../engine/toolkit/components/extensions/Extension.sys.mjs");
    "resource://gre/modules/ExtensionCommon.sys.mjs": typeof import("../engine/toolkit/components/extensions/ExtensionCommon.sys.mjs");
    "resource://gre/modules/ExtensionParent.sys.mjs": typeof import("../engine/toolkit/components/extensions/ExtensionParent.sys.mjs") & {
      ExtensionParent: {
        ParentAPIManager: {
          conduit: BroadcastConduit;
        };
      };
    };
    "resource://gre/modules/ConduitsParent.sys.mjs": typeof import("../engine/toolkit/components/extensions/ConduitsParent.sys.mjs");

    "resource://gre/modules/LayoutUtils.sys.mjs": typeof import("../engine/toolkit/modules/LayoutUtils.sys.mjs");
    "resource://gre/modules/Timer.sys.mjs": { setTimeout: typeof setTimeout };
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
      aOptions?: ImportESModuleOptionsDictionary
    ) => KnownModules[S];
    defineModuleGetter: (target: any, variable: string, path: string) => void;
    defineESModuleGetters: (target: any, mappings: any) => void;
    generateQI(interfaces: any[]): MozQueryInterface;
  }
}

interface Window {
  gBrowser: GlobalBrowser.GlobalBrowser;
  GlideBrowser: typeof import("../src/glide/browser/base/content/browser.mts").GlideBrowser;
  GlideCommands: typeof import("../src/glide/browser/base/content/browser-commands.mts").GlideCommands;
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
    }
  ): Promise<StructuredCloneHolder | undefined>;
}

/**
 * A very much not-exhaustive definition for `toolkit/components/extensions/Extension.sys.mjs::Extension`
 */
interface WebExtension {
  id: string;
  apiManager: InstanceType<_ExtensionCommon["LazyAPIManager"]>;
  backgroundContext: InstanceType<
    typeof import("../engine/toolkit/components/extensions/ExtensionParent.sys.mjs").ExtensionPageContextParent
  > &
    InstanceType<_ExtensionCommon["BaseContext"]>;
}

interface WebExtensionPolicy {
  extension: WebExtension;
}

declare var ChromeUtils: MockedExports.ChromeUtils;

// note extends types in `glide/generated/@types/lib.gecko.dom.d.ts`
interface Addon {
  reload(): Promise<void>;
}
declare var AddonManager: AddonManager;

declare class MozXULElement extends XULElement {}

declare interface NodeListOf<TNode extends Node> extends NodeList {
  item(index: number): TNode | null;
  /**
   * Performs the specified action for each node in an list.
   * @param callbackfn  A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the list.
   * @param thisArg  An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  forEach(
    callbackfn: (value: TNode, key: number, parent: NodeListOf<TNode>) => void,
    thisArg?: any
  ): void;
  [index: number]: TNode;
}

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
    transferables?: any
  ): void;
  sendQuery<QueryName extends keyof Queries>(
    messageName: QueryName,
    obj?: Queries[QueryName]["props"]
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
  new <
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
  new <
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
