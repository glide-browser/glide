//////////////////////////////////////////////////////
// BEWARE: DO NOT EDIT MANUALLY! Changes will be lost!
//////////////////////////////////////////////////////

declare global {
  const browser: Browser.Browser;

  namespace Browser {
    /**
     * Namespace: browser.activityLog
     */
    namespace ActivityLog {
      interface OnExtensionActivityDetailsType {
        /**
         * The date string when this call is triggered.
         */
        timeStamp: ExtensionTypes.DateType;

        /**
         * The type of log entry.  api_call is a function call made by the extension and api_event is an event callback to the
         * extension.  content_script is logged when a content script is injected.
         */
        type: OnExtensionActivityDetailsTypeTypeEnum;

        /**
         * The type of view where the activity occurred.  Content scripts will not have a viewType.
         * Optional.
         */
        viewType?: OnExtensionActivityDetailsTypeViewTypeEnum;

        /**
         * The name of the api call or event, or the script url if this is a content or user script event.
         */
        name: string;

        data: OnExtensionActivityDetailsTypeDataType;
      }

      /**
       * The type of log entry.  api_call is a function call made by the extension and api_event is an event callback to the
       * extension.  content_script is logged when a content script is injected.
       */
      type OnExtensionActivityDetailsTypeTypeEnum =
        | "api_call"
        | "api_event"
        | "content_script"
        | "user_script";

      /**
       * The type of view where the activity occurred.  Content scripts will not have a viewType.
       */
      type OnExtensionActivityDetailsTypeViewTypeEnum =
        | "background"
        | "popup"
        | "sidebar"
        | "tab"
        | "devtools_page"
        | "devtools_panel";

      /**
       * The result of the call.
       */
      interface OnExtensionActivityDetailsTypeDataResultType {
        [s: string]: unknown;
      }

      interface OnExtensionActivityDetailsTypeDataType {
        /**
         * A list of arguments passed to the call.
         * Optional.
         */
        args?: unknown[];

        /**
         * The result of the call.
         * Optional.
         */
        result?: OnExtensionActivityDetailsTypeDataResultType;

        /**
         * The tab associated with this event if it is a tab or content script.
         * Optional.
         */
        tabId?: number;

        /**
         * If the type is content_script, this is the url of the script that was injected.
         * Optional.
         */
        url?: string;
      }

      /**
       * Receives an activityItem for each logging event.
       */
      interface OnExtensionActivityEvent
        extends Events.Event<
          (details: OnExtensionActivityDetailsType) => void
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         */
        addListener(
          callback: (details: OnExtensionActivityDetailsType) => void,
          id: string
        ): void;
      }

      interface Static {
        /**
         * Receives an activityItem for each logging event.
         */
        onExtensionActivity: OnExtensionActivityEvent;
      }
    }

    /**
     * Namespace: browser.alarms
     */
    namespace Alarms {
      interface Alarm {
        /**
         * Name of this alarm.
         */
        name: string;

        /**
         * Time when the alarm is scheduled to fire, in milliseconds past the epoch.
         */
        scheduledTime: number;

        /**
         * When present, signals that the alarm triggers periodically after so many minutes.
         * Optional.
         */
        periodInMinutes?: number;
      }

      /**
       * Details about the alarm. The alarm first fires either at 'when' milliseconds past the epoch (if 'when' is provided),
       * after 'delayInMinutes' minutes from the current time (if 'delayInMinutes' is provided instead),
       * or after 'periodInMinutes' minutes from the current time (if only 'periodInMinutes' is provided).
       * Users should never provide both 'when' and 'delayInMinutes'. If 'periodInMinutes' is provided,
       * then the alarm recurs repeatedly after that many minutes.
       */
      interface CreateAlarmInfoType {
        /**
         * Time when the alarm is scheduled to first fire, in milliseconds past the epoch.
         * Optional.
         */
        when?: number;

        /**
         * Number of minutes from the current time after which the alarm should first fire.
         * Optional.
         */
        delayInMinutes?: number;

        /**
         * Number of minutes after which the alarm should recur repeatedly.
         * Optional.
         */
        periodInMinutes?: number;
      }

      interface Static {
        /**
         * Creates an alarm. After the delay is expired, the onAlarm event is fired. If there is another alarm with the same name
         * (or no name if none is specified), it will be cancelled and replaced by this alarm.
         *
         * @param name Optional. Optional name to identify this alarm. Defaults to the empty string.
         * @param alarmInfo Details about the alarm. The alarm first fires either at 'when' milliseconds past the epoch (if 'when'
         * is provided), after 'delayInMinutes' minutes from the current time (if 'delayInMinutes' is provided instead),
         * or after 'periodInMinutes' minutes from the current time (if only 'periodInMinutes' is provided).
         * Users should never provide both 'when' and 'delayInMinutes'. If 'periodInMinutes' is provided,
         * then the alarm recurs repeatedly after that many minutes.
         */
        create(
          name: string | undefined,
          alarmInfo: CreateAlarmInfoType
        ): Promise<void>;

        /**
         * Creates an alarm. After the delay is expired, the onAlarm event is fired. If there is another alarm with the same name
         * (or no name if none is specified), it will be cancelled and replaced by this alarm.
         *
         * @param alarmInfo Details about the alarm. The alarm first fires either at 'when' milliseconds past the epoch (if 'when'
         * is provided), after 'delayInMinutes' minutes from the current time (if 'delayInMinutes' is provided instead),
         * or after 'periodInMinutes' minutes from the current time (if only 'periodInMinutes' is provided).
         * Users should never provide both 'when' and 'delayInMinutes'. If 'periodInMinutes' is provided,
         * then the alarm recurs repeatedly after that many minutes.
         */
        create(alarmInfo: CreateAlarmInfoType): Promise<void>;

        /**
         * Retrieves details about the specified alarm.
         *
         * @param name Optional. The name of the alarm to get. Defaults to the empty string.
         */
        get(name?: string): Promise<Alarm | undefined>;

        /**
         * Gets an array of all the alarms.
         */
        getAll(): Promise<Alarm[]>;

        /**
         * Clears the alarm with the given name.
         *
         * @param name Optional. The name of the alarm to clear. Defaults to the empty string.
         */
        clear(name?: string): Promise<boolean>;

        /**
         * Clears all alarms.
         */
        clearAll(): Promise<boolean>;

        /**
         * Fired when an alarm has expired. Useful for transient background pages.
         *
         * @param name The alarm that has expired.
         */
        onAlarm: Events.Event<(name: Alarm) => void>;
      }
    }

    /**
     * Namespace: browser.bookmarks
     */
    namespace Bookmarks {
      /**
       * Indicates the reason why this node is unmodifiable. The <var>managed</var> value indicates that this node was configured
       * by the system administrator or by the custodian of a supervised user. Omitted if the node can be modified by the user
       * and the extension (default).
       */
      type BookmarkTreeNodeUnmodifiable = "managed";

      /**
       * Indicates the type of a BookmarkTreeNode, which can be one of bookmark, folder or separator.
       */
      type BookmarkTreeNodeType = "bookmark" | "folder" | "separator";

      /**
       * A node (either a bookmark or a folder) in the bookmark tree.  Child nodes are ordered within their parent folder.
       */
      interface BookmarkTreeNode {
        /**
         * The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the
         * browser is restarted.
         */
        id: string;

        /**
         * The <code>id</code> of the parent folder.  Omitted for the root node.
         * Optional.
         */
        parentId?: string;

        /**
         * The 0-based position of this node within its parent folder.
         * Optional.
         */
        index?: number;

        /**
         * The URL navigated to when a user clicks the bookmark. Omitted for folders.
         * Optional.
         */
        url?: string;

        /**
         * The text displayed for the node.
         */
        title: string;

        /**
         * When this node was created, in milliseconds since the epoch (<code>new Date(dateAdded)</code>).
         * Optional.
         */
        dateAdded?: number;

        /**
         * When the contents of this folder last changed, in milliseconds since the epoch.
         * Optional.
         */
        dateGroupModified?: number;

        /**
         * Indicates the reason why this node is unmodifiable. The <var>managed</var> value indicates that this node was configured
         * by the system administrator or by the custodian of a supervised user. Omitted if the node can be modified by the user
         * and the extension (default).
         * Optional.
         */
        unmodifiable?: BookmarkTreeNodeUnmodifiable;

        /**
         * Indicates the type of the BookmarkTreeNode, which can be one of bookmark, folder or separator.
         * Optional.
         */
        type?: BookmarkTreeNodeType;

        /**
         * An ordered list of children of this node.
         * Optional.
         */
        children?: BookmarkTreeNode[];
      }

      /**
       * Object passed to the create() function.
       */
      interface CreateDetails {
        /**
         * Defaults to the Other Bookmarks folder.
         * Optional.
         */
        parentId?: string;

        /**
         * Optional.
         */
        index?: number;

        /**
         * Optional.
         */
        title?: string;

        /**
         * Optional.
         */
        url?: string;

        /**
         * Indicates the type of BookmarkTreeNode to create, which can be one of bookmark, folder or separator.
         * Optional.
         */
        type?: BookmarkTreeNodeType;
      }

      /**
       * An object specifying properties and values to match when searching. Produces bookmarks matching all properties.
       */
      interface SearchQueryC2Type {
        /**
         * A string of words that are matched against bookmark URLs and titles.
         * Optional.
         */
        query?: string;

        /**
         * The URL of the bookmark; matches verbatim. Note that folders have no URL.
         * Optional.
         */
        url?: string;

        /**
         * The title of the bookmark; matches verbatim.
         * Optional.
         */
        title?: string;
      }

      interface MoveDestinationType {
        /**
         * Optional.
         */
        parentId?: string;

        /**
         * Optional.
         */
        index?: number;
      }

      interface UpdateChangesType {
        /**
         * Optional.
         */
        title?: string;

        /**
         * Optional.
         */
        url?: string;
      }

      interface OnRemovedRemoveInfoType {
        parentId: string;

        index: number;

        node: BookmarkTreeNode;
      }

      interface OnChangedChangeInfoType {
        title: string;

        /**
         * Optional.
         */
        url?: string;
      }

      interface OnMovedMoveInfoType {
        parentId: string;

        index: number;

        oldParentId: string;

        oldIndex: number;
      }

      interface Static {
        /**
         * Retrieves the specified BookmarkTreeNode(s).
         *
         * @param idOrIdList A single string-valued id, or an array of string-valued ids
         */
        get(idOrIdList: string | string[]): Promise<BookmarkTreeNode[]>;

        /**
         * Retrieves the children of the specified BookmarkTreeNode id.
         */
        getChildren(id: string): Promise<BookmarkTreeNode[]>;

        /**
         * Retrieves the recently added bookmarks.
         *
         * @param numberOfItems The maximum number of items to return.
         */
        getRecent(numberOfItems: number): Promise<BookmarkTreeNode[]>;

        /**
         * Retrieves the entire Bookmarks hierarchy.
         */
        getTree(): Promise<BookmarkTreeNode[]>;

        /**
         * Retrieves part of the Bookmarks hierarchy, starting at the specified node.
         *
         * @param id The ID of the root of the subtree to retrieve.
         */
        getSubTree(id: string): Promise<BookmarkTreeNode[]>;

        /**
         * Searches for BookmarkTreeNodes matching the given query. Queries specified with an object produce BookmarkTreeNodes
         * matching all specified properties.
         *
         * @param query Either a string of words that are matched against bookmark URLs and titles, or an object. If an object,
         * the properties <code>query</code>, <code>url</code>, and <code>title</code> may be specified and bookmarks matching all
         * specified properties will be produced.
         */
        search(query: string | SearchQueryC2Type): Promise<BookmarkTreeNode[]>;

        /**
         * Creates a bookmark or folder under the specified parentId.  If url is NULL or missing, it will be a folder.
         */
        create(bookmark: CreateDetails): Promise<BookmarkTreeNode>;

        /**
         * Moves the specified BookmarkTreeNode to the provided location.
         */
        move(
          id: string,
          destination: MoveDestinationType
        ): Promise<BookmarkTreeNode>;

        /**
         * Updates the properties of a bookmark or folder. Specify only the properties that you want to change; unspecified
         * properties will be left unchanged.  <b>Note:</b> Currently, only 'title' and 'url' are supported.
         */
        update(
          id: string,
          changes: UpdateChangesType
        ): Promise<BookmarkTreeNode>;

        /**
         * Removes a bookmark or an empty bookmark folder.
         */
        remove(id: string): Promise<void>;

        /**
         * Recursively removes a bookmark folder.
         */
        removeTree(id: string): Promise<void>;

        /**
         * Fired when a bookmark or folder is created.
         */
        onCreated: Events.Event<
          (id: string, bookmark: BookmarkTreeNode) => void
        >;

        /**
         * Fired when a bookmark or folder is removed.  When a folder is removed recursively,
         * a single notification is fired for the folder, and none for its contents.
         */
        onRemoved: Events.Event<
          (id: string, removeInfo: OnRemovedRemoveInfoType) => void
        >;

        /**
         * Fired when a bookmark or folder changes.  <b>Note:</b> Currently, only title and url changes trigger this.
         */
        onChanged: Events.Event<
          (id: string, changeInfo: OnChangedChangeInfoType) => void
        >;

        /**
         * Fired when a bookmark or folder is moved to a different parent folder.
         */
        onMoved: Events.Event<
          (id: string, moveInfo: OnMovedMoveInfoType) => void
        >;
      }
    }

    /**
     * Namespace: browser.action
     */
    namespace Action {
      /**
       * Specifies to which tab or window the value should be set, or from which one it should be retrieved.
       * If no tab nor window is specified, the global value is set or retrieved.
       */
      interface Details {
        /**
         * When setting a value, it will be specific to the specified tab, and will automatically reset when the tab navigates.
         * When getting, specifies the tab to get the value from; if there is no tab-specific value,
         * the window one will be inherited.
         * Optional.
         */
        tabId?: number;

        /**
         * When setting a value, it will be specific to the specified window. When getting, specifies the window to get the value
         * from; if there is no window-specific value, the global one will be inherited.
         * Optional.
         */
        windowId?: number;
      }

      type ColorArray = [number, number, number, number];

      /**
       * Pixel data for an image. Must be an ImageData object (for example, from a <code>canvas</code> element).
       */
      interface ImageDataType extends ImageData {
        [s: string]: unknown;
      }

      /**
       * An array of four integers in the range [0,255] that make up the RGBA color of the badge. For example,
       * opaque red is <code>[255, 0, 0, 255]</code>. Can also be a string with a CSS value, with opaque red being <code>
       * #FF0000</code> or <code>#F00</code>.
       */
      type ColorValue = string | ColorArray | null;

      /**
       * Information sent when a browser action is clicked.
       */
      interface OnClickData {
        /**
         * An array of keyboard modifiers that were held while the menu item was clicked.
         */
        modifiers: OnClickDataModifiersItemEnum[];

        /**
         * An integer value of button by which menu item was clicked.
         * Optional.
         */
        button?: number;
      }

      interface SetTitleDetailsType extends Details {
        /**
         * The string the browser action should display when moused over.
         */
        title: string | null;
      }

      /**
       * The collection of user-specified settings relating to an extension's action.
       */
      interface GetUserSettingsCallbackUserSettingsType {
        /**
         * Whether the extension's action icon is visible on browser windows' top-level toolbar (i.e.,
         * whether the extension has been 'pinned' by the user).
         * Optional.
         */
        isOnToolbar?: boolean;
      }

      interface SetIconDetailsType extends Details {
        /**
         * Either an ImageData object or a dictionary {size -> ImageData} representing icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.imageData = foo' is equivalent to 'details.
         * imageData = {'19': foo}'
         * Optional.
         */
        imageData?: ImageDataType | Record<string, ImageDataType>;

        /**
         * Either a relative image path or a dictionary {size -> relative image path} pointing to icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.path = foo' is equivalent to 'details.imageData = {'19': foo}'
         * Optional.
         */
        path?: string | Record<string, string>;
      }

      interface SetPopupDetailsType extends Details {
        /**
         * The html file to show in a popup.  If set to the empty string (''), no popup is shown.
         */
        popup: string | null;
      }

      interface SetBadgeTextDetailsType extends Details {
        /**
         * Any number of characters can be passed, but only about four can fit in the space.
         */
        text: string | null;
      }

      interface SetBadgeBackgroundColorDetailsType extends Details {
        color: ColorValue;
      }

      interface SetBadgeTextColorDetailsType extends Details {
        color: ColorValue;
      }

      /**
       * An object with information about the popup to open.
       */
      interface OpenPopupOptionsType {
        /**
         * Defaults to the $(topic:current-window)[current window].
         * Optional.
         */
        windowId?: number;
      }

      type OnClickDataModifiersItemEnum =
        | "Shift"
        | "Alt"
        | "Command"
        | "Ctrl"
        | "MacCtrl";

      interface Static {
        /**
         * Sets the title of the browser action. This shows up in the tooltip.
         */
        setTitle(details: SetTitleDetailsType): Promise<void>;

        /**
         * Gets the title of the browser action.
         */
        getTitle(details: Details): Promise<string>;

        /**
         * Returns the user-specified settings relating to an extension's action.
         */
        getUserSettings(): Promise<GetUserSettingsCallbackUserSettingsType>;

        /**
         * Sets the icon for the browser action. The icon can be specified either as the path to an image file or as the pixel data
         * from a canvas element, or as dictionary of either one of those. Either the <b>path</b> or the <b>imageData</b>
         * property must be specified.
         */
        setIcon(details: SetIconDetailsType): Promise<void>;

        /**
         * Sets the html document to be opened as a popup when the user clicks on the browser action's icon.
         */
        setPopup(details: SetPopupDetailsType): Promise<void>;

        /**
         * Gets the html document set as the popup for this browser action.
         */
        getPopup(details: Details): Promise<string>;

        /**
         * Sets the badge text for the browser action. The badge is displayed on top of the icon.
         */
        setBadgeText(details: SetBadgeTextDetailsType): Promise<void>;

        /**
         * Gets the badge text of the browser action. If no tab nor window is specified is specified,
         * the global badge text is returned.
         */
        getBadgeText(details: Details): Promise<string>;

        /**
         * Sets the background color for the badge.
         */
        setBadgeBackgroundColor(
          details: SetBadgeBackgroundColorDetailsType
        ): Promise<void>;

        /**
         * Gets the background color of the browser action badge.
         */
        getBadgeBackgroundColor(details: Details): Promise<ColorArray>;

        /**
         * Sets the text color for the badge.
         */
        setBadgeTextColor(details: SetBadgeTextColorDetailsType): Promise<void>;

        /**
         * Gets the text color of the browser action badge.
         */
        getBadgeTextColor(details: Details): Promise<ColorArray>;

        /**
         * Enables the browser action for a tab. By default, browser actions are enabled.
         *
         * @param tabId Optional. The id of the tab for which you want to modify the browser action.
         */
        enable(tabId?: number): Promise<void>;

        /**
         * Disables the browser action for a tab.
         *
         * @param tabId Optional. The id of the tab for which you want to modify the browser action.
         */
        disable(tabId?: number): Promise<void>;

        /**
         * Checks whether the browser action is enabled.
         */
        isEnabled(details: Details): Promise<boolean>;

        /**
         * Opens the extension popup window in the specified window.
         *
         * @param options Optional. An object with information about the popup to open.
         */
        openPopup(options?: OpenPopupOptionsType): Promise<void>;

        /**
         * Fired when a browser action icon is clicked.  This event will not fire if the browser action has a popup.
         *
         * @param info Optional.
         */
        onClicked: Events.Event<
          (tab: Browser.Tabs.Tab, info: OnClickData | undefined) => void
        >;
      }
    }

    /**
     * Namespace: browser.browserAction
     */
    namespace BrowserAction {
      interface Static extends Action.Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.browserSettings
     */
    namespace BrowserSettings {
      /**
       * How images should be animated in the browser.
       */
      type ImageAnimationBehavior = "normal" | "none" | "once";

      /**
       * After which mouse event context menus should popup.
       */
      type ContextMenuMouseEvent = "mouseup" | "mousedown";

      /**
       * Color management mode.
       */
      type ColorManagementMode = "off" | "full" | "tagged_only";

      interface Static {
        /**
         * Allows or disallows pop-up windows from opening in response to user events.
         */
        allowPopupsForUserEvents: Browser.Types.Setting;

        /**
         * Enables or disables the browser cache.
         */
        cacheEnabled: Browser.Types.Setting;

        /**
         * This boolean setting controls whether the selected tab can be closed with a double click.
         */
        closeTabsByDoubleClick: Browser.Types.Setting;

        /**
         * Controls after which mouse event context menus popup. This setting's value is of type ContextMenuMouseEvent,
         * which has possible values of <code>mouseup</code> and <code>mousedown</code>.
         */
        contextMenuShowEvent: Browser.Types.Setting;

        /**
         * Returns the value of the overridden home page. Read-only.
         */
        homepageOverride: Browser.Types.Setting;

        /**
         * Controls the behaviour of image animation in the browser. This setting's value is of type ImageAnimationBehavior,
         * defaulting to <code>normal</code>.
         */
        imageAnimationBehavior: Browser.Types.Setting;

        /**
         * Returns the value of the overridden new tab page. Read-only.
         */
        newTabPageOverride: Browser.Types.Setting;

        /**
         * Controls where new tabs are opened. `afterCurrent` will open all new tabs next to the current tab,
         * `relatedAfterCurrent` will open only related tabs next to the current tab, and `atEnd` will open all tabs at the end of
         * the tab strip. The default is `relatedAfterCurrent`.
         */
        newTabPosition: Browser.Types.Setting;

        /**
         * This boolean setting controls whether bookmarks are opened in the current tab or in a new tab.
         */
        openBookmarksInNewTabs: Browser.Types.Setting;

        /**
         * This boolean setting controls whether search results are opened in the current tab or in a new tab.
         */
        openSearchResultsInNewTabs: Browser.Types.Setting;

        /**
         * This boolean setting controls whether urlbar results are opened in the current tab or in a new tab.
         */
        openUrlbarResultsInNewTabs: Browser.Types.Setting;

        /**
         * Disables webAPI notifications.
         */
        webNotificationsDisabled: Browser.Types.Setting;

        /**
         * This setting controls whether the user-chosen colors override the page's colors.
         */
        overrideDocumentColors: Browser.Types.Setting;

        /**
         * This setting controls whether a light or dark color scheme overrides the page's preferred color scheme.
         */
        overrideContentColorScheme: Browser.Types.Setting;

        /**
         * This setting controls whether the document's fonts are used.
         */
        useDocumentFonts: Browser.Types.Setting;

        /**
         * This boolean setting controls whether zoom is applied to the full page or to text only.
         */
        zoomFullPage: Browser.Types.Setting;

        /**
         * This boolean setting controls whether zoom is applied on a per-site basis or to the current tab only. If privacy.
         * resistFingerprinting is true, this setting has no effect and zoom is applied to the current tab only.
         */
        zoomSiteSpecific: Browser.Types.Setting;

        colorManagement: ColorManagement.Static;
      }
    }

    /**
     * Namespace: browser.browsingData
     */
    namespace BrowsingData {
      /**
       * Options that determine exactly what data will be removed.
       */
      interface RemovalOptions {
        /**
         * Remove data accumulated on or after this date, represented in milliseconds since the epoch (accessible via the <code>
         * getTime</code> method of the JavaScript <code>Date</code> object). If absent, defaults to 0 (which would remove all
         * browsing data).
         * Optional.
         */
        since?: ExtensionTypes.DateType;

        /**
         * Only remove data associated with these hostnames (only applies to cookies and localStorage).
         * Optional.
         */
        hostnames?: string[];

        /**
         * Only remove data associated with this specific cookieStoreId.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * An object whose properties specify which origin types ought to be cleared. If this object isn't specified,
         * it defaults to clearing only "unprotected" origins. Please ensure that you <em>really</em>
         * want to remove application data before adding 'protectedWeb' or 'extensions'.
         * Optional.
         */
        originTypes?: RemovalOptionsOriginTypesType;
      }

      /**
       * A set of data types. Missing data types are interpreted as <code>false</code>.
       */
      interface DataTypeSet {
        /**
         * The browser's cache. Note: when removing data, this clears the <em>entire</em> cache: it is not limited to the range you
         * specify.
         * Optional.
         */
        cache?: boolean;

        /**
         * The browser's cookies.
         * Optional.
         */
        cookies?: boolean;

        /**
         * The browser's download list.
         * Optional.
         */
        downloads?: boolean;

        /**
         * The browser's stored form data.
         * Optional.
         */
        formData?: boolean;

        /**
         * The browser's history.
         * Optional.
         */
        history?: boolean;

        /**
         * Websites' IndexedDB data.
         * Optional.
         */
        indexedDB?: boolean;

        /**
         * Websites' local storage data.
         * Optional.
         */
        localStorage?: boolean;

        /**
         * Server-bound certificates.
         * Optional.
         */
        serverBoundCertificates?: boolean;

        /**
         * Stored passwords.
         * Optional.
         */
        passwords?: boolean;

        /**
         * Plugins' data.
         * Optional.
         */
        pluginData?: boolean;

        /**
         * Service Workers.
         * Optional.
         */
        serviceWorkers?: boolean;
      }

      interface SettingsCallbackResultType {
        options: RemovalOptions;

        /**
         * All of the types will be present in the result, with values of <code>true</code> if they are both selected to be removed
         * and permitted to be removed, otherwise <code>false</code>.
         */
        dataToRemove: DataTypeSet;

        /**
         * All of the types will be present in the result, with values of <code>true</code> if they are permitted to be removed (e.
         * g., by enterprise policy) and <code>false</code> if not.
         */
        dataRemovalPermitted: DataTypeSet;
      }

      /**
       * An object whose properties specify which origin types ought to be cleared. If this object isn't specified,
       * it defaults to clearing only "unprotected" origins. Please ensure that you <em>really</em>
       * want to remove application data before adding 'protectedWeb' or 'extensions'.
       */
      interface RemovalOptionsOriginTypesType {
        /**
         * Normal websites.
         * Optional.
         */
        unprotectedWeb?: boolean;

        /**
         * Websites that have been installed as hosted applications (be careful!).
         * Optional.
         */
        protectedWeb?: boolean;

        /**
         * Extensions and packaged applications a user has installed (be _really_ careful!).
         * Optional.
         */
        extension?: boolean;
      }

      interface Static {
        /**
         * Reports which types of data are currently selected in the 'Clear browsing data' settings UI.
         * Note: some of the data types included in this API are not available in the settings UI,
         * and some UI settings control more than one data type listed here.
         */
        settings(): Promise<SettingsCallbackResultType>;

        /**
         * Clears various types of browsing data stored in a user's profile.
         *
         * @param dataToRemove The set of data types to remove.
         * @returns Called when deletion has completed.
         */
        remove(
          options: RemovalOptions,
          dataToRemove: DataTypeSet
        ): Promise<void>;

        /**
         * Clears the browser's cache.
         *
         * @returns Called when the browser's cache has been cleared.
         */
        removeCache(options: RemovalOptions): Promise<void>;

        /**
         * Clears the browser's cookies and server-bound certificates modified within a particular timeframe.
         *
         * @returns Called when the browser's cookies and server-bound certificates have been cleared.
         */
        removeCookies(options: RemovalOptions): Promise<void>;

        /**
         * Clears the browser's list of downloaded files (<em>not</em> the downloaded files themselves).
         *
         * @returns Called when the browser's list of downloaded files has been cleared.
         */
        removeDownloads(options: RemovalOptions): Promise<void>;

        /**
         * Clears the browser's stored form data (autofill).
         *
         * @returns Called when the browser's form data has been cleared.
         */
        removeFormData(options: RemovalOptions): Promise<void>;

        /**
         * Clears the browser's history.
         *
         * @returns Called when the browser's history has cleared.
         */
        removeHistory(options: RemovalOptions): Promise<void>;

        /**
         * Clears websites' local storage data.
         *
         * @returns Called when websites' local storage has been cleared.
         */
        removeLocalStorage(options: RemovalOptions): Promise<void>;

        /**
         * Clears plugins' data.
         *
         * @returns Called when plugins' data has been cleared.
         */
        removePluginData(options: RemovalOptions): Promise<void>;

        /**
         * Clears the browser's stored passwords.
         *
         * @returns Called when the browser's passwords have been cleared.
         */
        removePasswords(options: RemovalOptions): Promise<void>;
      }
    }

    /**
     * Namespace: browser.captivePortal
     */
    namespace CaptivePortal {
      interface OnStateChangedDetailsType {
        /**
         * The current captive portal state.
         */
        state: OnStateChangedDetailsTypeStateEnum;
      }

      type OnConnectivityAvailableStatusEnum = "captive" | "clear";

      /**
       * The current captive portal state.
       */
      type OnStateChangedDetailsTypeStateEnum =
        | "unknown"
        | "not_captive"
        | "unlocked_portal"
        | "locked_portal";

      interface Static {
        /**
         * Returns the current portal state, one of `unknown`, `not_captive`, `unlocked_portal`, `locked_portal`.
         */
        getState(): Promise<
          "unknown" | "not_captive" | "unlocked_portal" | "locked_portal"
        >;

        /**
         * Returns the time difference between NOW and the last time a request was completed in milliseconds.
         */
        getLastChecked(): Promise<number>;

        /**
         * Fired when the captive portal state changes.
         */
        onStateChanged: Events.Event<
          (details: OnStateChangedDetailsType) => void
        >;

        /**
         * This notification will be emitted when the captive portal service has determined that we can connect to the internet.
         * The service will pass either `captive` if there is an unlocked captive portal present,
         * or `clear` if no captive portal was detected.
         */
        onConnectivityAvailable: Events.Event<
          (status: OnConnectivityAvailableStatusEnum) => void
        >;

        /**
         * Return the canonical captive-portal detection URL. Read-only.
         */
        canonicalURL: Browser.Types.Setting;
      }
    }

    /**
     * Namespace: browser.clipboard
     */
    namespace Clipboard {
      /**
       * The type of imageData.
       */
      type SetImageDataImageTypeEnum = "jpeg" | "png";

      interface Static {
        /**
         * Copy an image to the clipboard. The image is re-encoded before it is written to the clipboard. If the image is invalid,
         * the clipboard is not modified.
         *
         * @param imageData The image data to be copied.
         * @param imageType The type of imageData.
         */
        setImageData(
          imageData: ArrayBuffer,
          imageType: SetImageDataImageTypeEnum
        ): Promise<void>;
      }
    }

    /**
     * Namespace: browser.commands
     */
    namespace Commands {
      interface Command {
        /**
         * The name of the Extension Command
         * Optional.
         */
        name?: string;

        /**
         * The Extension Command description
         * Optional.
         */
        description?: string;

        /**
         * The shortcut active for this command, or blank if not active.
         * Optional.
         */
        shortcut?: string;
      }

      /**
       * The new description for the command.
       */
      interface UpdateDetailType {
        /**
         * The name of the command.
         */
        name: string;

        /**
         * The new description for the command.
         * Optional.
         */
        description?: string;

        /**
         * Optional.
         */
        shortcut?: string;
      }

      interface OnChangedChangeInfoType {
        /**
         * The name of the shortcut.
         */
        name: string;

        /**
         * The new shortcut active for this command, or blank if not active.
         */
        newShortcut: string;

        /**
         * The old shortcut which is no longer active for this command, or blank if the shortcut was previously inactive.
         */
        oldShortcut: string;
      }

      interface Static {
        /**
         * Update the details of an already defined command.
         *
         * @param detail The new description for the command.
         */
        update(detail: UpdateDetailType): Promise<void>;

        /**
         * Reset a command's details to what is specified in the manifest.
         *
         * @param name The name of the command.
         */
        reset(name: string): Promise<void>;

        /**
         * Returns all the registered extension commands for this extension and their shortcut (if active).
         *
         * @returns Called to return the registered commands.
         */
        getAll(): Promise<Command[]>;

        /**
         * Open extension shortcuts configuration page.
         */
        openShortcutSettings(): void;

        /**
         * Fired when a registered command is activated using a keyboard shortcut.
         *
         * @param tab Optional. Details of the $(ref:tabs.Tab) where the command was activated.
         */
        onCommand: Events.Event<
          (command: string, tab: Browser.Tabs.Tab | undefined) => void
        >;

        /**
         * Fired when a registered command's shortcut is changed.
         */
        onChanged: Events.Event<(changeInfo: OnChangedChangeInfoType) => void>;
      }
    }

    /**
     * Namespace: browser.contentScripts
     */
    namespace ContentScripts {
      /**
       * Details of a content script registered programmatically
       */
      interface RegisteredContentScriptOptions {
        matches: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        excludeMatches?: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        includeGlobs?: string[];

        /**
         * Optional.
         */
        excludeGlobs?: string[];

        /**
         * The list of CSS files to inject
         * Optional.
         */
        css?: Browser.ExtensionTypes.ExtensionFileOrCode[];

        /**
         * The list of JS files to inject
         * Optional.
         */
        js?: Browser.ExtensionTypes.ExtensionFileOrCode[];

        /**
         * If allFrames is <code>true</code>, implies that the JavaScript or CSS should be injected into all frames of current page.
         * By default, it's <code>false</code> and is only injected into the top frame.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * If matchAboutBlank is true, then the code is also injected in about:blank and about:srcdoc frames if your extension has
         * access to its parent document. Ignored if matchOriginAsFallback is specified. By default it is <code>false</code>.
         * Optional.
         */
        matchAboutBlank?: boolean;

        /**
         * If matchOriginAsFallback is true, then the code is also injected in about:, data:,
         * blob: when their origin matches the pattern in 'matches', even if the actual document origin is opaque (due to the use
         * of CSP sandbox or iframe sandbox). Match patterns in 'matches' must specify a wildcard path glob. By default it is <code>
         * false</code>.
         * Optional.
         */
        matchOriginAsFallback?: boolean;

        /**
         * The soonest that the JavaScript or CSS will be injected into the tab. Defaults to "document_idle".
         * Optional.
         */
        runAt?: Browser.ExtensionTypes.RunAt;

        /**
         * The JavaScript world for a script to execute within. Defaults to "ISOLATED".
         * Optional.
         */
        world?: Browser.ExtensionTypes.ExecutionWorld;

        /**
         * limit the set of matched tabs to those that belong to the given cookie store id
         * Optional.
         */
        cookieStoreId?: string[] | string;
      }

      /**
       * An object that represents a content script registered programmatically
       */
      interface RegisteredContentScript {
        /**
         * Unregister a content script registered programmatically
         */
        unregister(): Promise<void>;
      }

      interface Static {
        /**
         * Register a content script programmatically
         */
        register(
          contentScriptOptions: RegisteredContentScriptOptions
        ): Promise<RegisteredContentScript>;
      }
    }

    /**
     * Namespace: browser.contextualIdentities
     */
    namespace ContextualIdentities {
      /**
       * Represents information about a contextual identity.
       */
      interface ContextualIdentity {
        /**
         * The name of the contextual identity.
         */
        name: string;

        /**
         * The icon name of the contextual identity.
         */
        icon: string;

        /**
         * The icon url of the contextual identity.
         */
        iconUrl: string;

        /**
         * The color name of the contextual identity.
         */
        color: string;

        /**
         * The color hash of the contextual identity.
         */
        colorCode: string;

        /**
         * The cookie store ID of the contextual identity.
         */
        cookieStoreId: string;
      }

      /**
       * Information to filter the contextual identities being retrieved.
       */
      interface QueryDetailsType {
        /**
         * Filters the contextual identity by name.
         * Optional.
         */
        name?: string;
      }

      /**
       * Details about the contextual identity being created.
       */
      interface CreateDetailsType {
        /**
         * The name of the contextual identity.
         */
        name: string;

        /**
         * The color of the contextual identity.
         */
        color: string;

        /**
         * The icon of the contextual identity.
         */
        icon: string;
      }

      /**
       * Details about the contextual identity being created.
       */
      interface UpdateDetailsType {
        /**
         * The name of the contextual identity.
         * Optional.
         */
        name?: string;

        /**
         * The color of the contextual identity.
         * Optional.
         */
        color?: string;

        /**
         * The icon of the contextual identity.
         * Optional.
         */
        icon?: string;
      }

      interface OnUpdatedChangeInfoType {
        /**
         * Contextual identity that has been updated
         */
        contextualIdentity: ContextualIdentity;
      }

      interface OnCreatedChangeInfoType {
        /**
         * Contextual identity that has been created
         */
        contextualIdentity: ContextualIdentity;
      }

      interface OnRemovedChangeInfoType {
        /**
         * Contextual identity that has been removed
         */
        contextualIdentity: ContextualIdentity;
      }

      interface Static {
        /**
         * Retrieves information about a single contextual identity.
         *
         * @param cookieStoreId The ID of the contextual identity cookie store.
         */
        get(cookieStoreId: string): Promise<ContextualIdentity>;

        /**
         * Retrieves all contextual identities
         *
         * @param details Information to filter the contextual identities being retrieved.
         */
        query(details: QueryDetailsType): Promise<ContextualIdentity[]>;

        /**
         * Creates a contextual identity with the given data.
         *
         * @param details Details about the contextual identity being created.
         */
        create(details: CreateDetailsType): Promise<ContextualIdentity>;

        /**
         * Updates a contextual identity with the given data.
         *
         * @param cookieStoreId The ID of the contextual identity cookie store.
         * @param details Details about the contextual identity being created.
         */
        update(
          cookieStoreId: string,
          details: UpdateDetailsType
        ): Promise<ContextualIdentity>;

        /**
         * Reorder one or more contextual identities by their cookieStoreIDs to a given position.
         *
         * @param cookieStoreIds The ID or list of IDs of the contextual identity cookie stores.
         * @param position The position the contextual identity should move to.
         */
        move(
          cookieStoreIds: string | string[],
          position: number
        ): Promise<void>;

        /**
         * Deletes a contextual identity by its cookie Store ID.
         *
         * @param cookieStoreId The ID of the contextual identity cookie store.
         */
        remove(cookieStoreId: string): Promise<ContextualIdentity>;

        /**
         * Fired when a container is updated.
         */
        onUpdated: Events.Event<(changeInfo: OnUpdatedChangeInfoType) => void>;

        /**
         * Fired when a new container is created.
         */
        onCreated: Events.Event<(changeInfo: OnCreatedChangeInfoType) => void>;

        /**
         * Fired when a container is removed.
         */
        onRemoved: Events.Event<(changeInfo: OnRemovedChangeInfoType) => void>;
      }
    }

    /**
     * Namespace: browser.cookies
     */
    namespace Cookies {
      /**
       * A cookie's 'SameSite' state (https://tools.ietf.org/html/draft-west-first-party-cookies).
       * 'no_restriction' corresponds to a cookie set without a 'SameSite' attribute, 'lax' to 'SameSite=Lax',
       * and 'strict' to 'SameSite=Strict'.
       */
      type SameSiteStatus = "unspecified" | "no_restriction" | "lax" | "strict";

      /**
       * The description of the storage partition of a cookie. This object may be omitted (null) if a cookie is not partitioned.
       */
      interface PartitionKey {
        /**
         * The first-party URL of the cookie, if the cookie is in storage partitioned by the top-level site.
         * Optional.
         */
        topLevelSite?: string;

        /**
         * Whether or not the cookie is in a third-party context, respecting ancestor chains.
         * Optional.
         */
        hasCrossSiteAncestor?: boolean;
      }

      /**
       * Represents information about an HTTP cookie.
       */
      interface Cookie {
        /**
         * The name of the cookie.
         */
        name: string;

        /**
         * The value of the cookie.
         */
        value: string;

        /**
         * The domain of the cookie (e.g. "www.google.com", "example.com").
         */
        domain: string;

        /**
         * True if the cookie is a host-only cookie (i.e. a request's host must exactly match the domain of the cookie).
         */
        hostOnly: boolean;

        /**
         * The path of the cookie.
         */
        path: string;

        /**
         * True if the cookie is marked as Secure (i.e. its scope is limited to secure channels, typically HTTPS).
         */
        secure: boolean;

        /**
         * True if the cookie is marked as HttpOnly (i.e. the cookie is inaccessible to client-side scripts).
         */
        httpOnly: boolean;

        /**
         * The cookie's same-site status (i.e. whether the cookie is sent with cross-site requests).
         */
        sameSite: SameSiteStatus;

        /**
         * True if the cookie is a session cookie, as opposed to a persistent cookie with an expiration date.
         */
        session: boolean;

        /**
         * The expiration date of the cookie as the number of seconds since the UNIX epoch. Not provided for session cookies.
         * Optional.
         */
        expirationDate?: number;

        /**
         * The ID of the cookie store containing this cookie, as provided in getAllCookieStores().
         */
        storeId: string;

        /**
         * The first-party domain of the cookie.
         */
        firstPartyDomain: string;

        /**
         * The cookie's storage partition, if any. null if not partitioned.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      /**
       * Represents a cookie store in the browser. An incognito mode window, for instance, uses a separate cookie store from a
       * non-incognito window.
       */
      interface CookieStore {
        /**
         * The unique identifier for the cookie store.
         */
        id: string;

        /**
         * Identifiers of all the browser tabs that share this cookie store.
         */
        tabIds: number[];

        /**
         * Indicates if this is an incognito cookie store
         */
        incognito: boolean;
      }

      /**
       * The underlying reason behind the cookie's change. If a cookie was inserted, or removed via an explicit call to
       * $(ref:cookies.remove), "cause" will be "explicit". If a cookie was automatically removed due to expiry,
       * "cause" will be "expired". If a cookie was removed due to being overwritten with an already-expired expiration date,
       * "cause" will be set to "expired_overwrite".  If a cookie was automatically removed due to garbage collection,
       * "cause" will be "evicted".  If a cookie was automatically removed due to a "set" call that overwrote it,
       * "cause" will be "overwrite". Plan your response accordingly.
       */
      type OnChangedCause =
        | "evicted"
        | "expired"
        | "explicit"
        | "expired_overwrite"
        | "overwrite";

      /**
       * Details to identify the cookie being retrieved.
       */
      interface GetDetailsType {
        /**
         * The URL with which the cookie to retrieve is associated. This argument may be a full URL,
         * in which case any data following the URL path (e.g. the query string) is simply ignored.
         * If host permissions for this URL are not specified in the manifest file, the API call will fail.
         */
        url: string;

        /**
         * The name of the cookie to retrieve.
         */
        name: string;

        /**
         * The ID of the cookie store in which to look for the cookie. By default, the current execution context's cookie store
         * will be used.
         * Optional.
         */
        storeId?: string;

        /**
         * The first-party domain which the cookie to retrieve is associated. This attribute is required if First-Party Isolation
         * is enabled.
         * Optional.
         */
        firstPartyDomain?: string;

        /**
         * The storage partition, if the cookie is part of partitioned storage. By default, only non-partitioned cookies are
         * returned.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      /**
       * Information to filter the cookies being retrieved.
       */
      interface GetAllDetailsType {
        /**
         * Restricts the retrieved cookies to those that would match the given URL.
         * Optional.
         */
        url?: string;

        /**
         * Filters the cookies by name.
         * Optional.
         */
        name?: string;

        /**
         * Restricts the retrieved cookies to those whose domains match or are subdomains of this one.
         * Optional.
         */
        domain?: string;

        /**
         * Restricts the retrieved cookies to those whose path exactly matches this string.
         * Optional.
         */
        path?: string;

        /**
         * Filters the cookies by their Secure property.
         * Optional.
         */
        secure?: boolean;

        /**
         * Filters out session vs. persistent cookies.
         * Optional.
         */
        session?: boolean;

        /**
         * The cookie store to retrieve cookies from. If omitted, the current execution context's cookie store will be used.
         * Optional.
         */
        storeId?: string;

        /**
         * Restricts the retrieved cookies to those whose first-party domains match this one.
         * This attribute is required if First-Party Isolation is enabled. To not filter by a specific first-party domain,
         * use `null` or `undefined`.
         * Optional.
         */
        firstPartyDomain?: string | null;

        /**
         * Selects a specific storage partition to look up cookies. Defaults to null, in which case only non-partitioned cookies
         * are retrieved. If an object iis passed, partitioned cookies are also included, and filtered based on the keys present in
         * the given PartitionKey description. An empty object ({}) returns all cookies (partitioned + unpartitioned),
         * a non-empty object (e.g. {topLevelSite: '...'}) only returns cookies whose partition match all given attributes.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      /**
       * Details about the cookie being set.
       */
      interface SetDetailsType {
        /**
         * The request-URI to associate with the setting of the cookie. This value can affect the default domain and path values of
         * the created cookie. If host permissions for this URL are not specified in the manifest file, the API call will fail.
         */
        url: string;

        /**
         * The name of the cookie. Empty by default if omitted.
         * Optional.
         */
        name?: string;

        /**
         * The value of the cookie. Empty by default if omitted.
         * Optional.
         */
        value?: string;

        /**
         * The domain of the cookie. If omitted, the cookie becomes a host-only cookie.
         * Optional.
         */
        domain?: string;

        /**
         * The path of the cookie. Defaults to the path portion of the url parameter.
         * Optional.
         */
        path?: string;

        /**
         * Whether the cookie should be marked as Secure. Defaults to false.
         * Optional.
         */
        secure?: boolean;

        /**
         * Whether the cookie should be marked as HttpOnly. Defaults to false.
         * Optional.
         */
        httpOnly?: boolean;

        /**
         * The cookie's same-site status.
         * Optional.
         */
        sameSite?: SameSiteStatus;

        /**
         * The expiration date of the cookie as the number of seconds since the UNIX epoch. If omitted,
         * the cookie becomes a session cookie.
         * Optional.
         */
        expirationDate?: number;

        /**
         * The ID of the cookie store in which to set the cookie. By default, the cookie is set in the current execution context's
         * cookie store.
         * Optional.
         */
        storeId?: string;

        /**
         * The first-party domain of the cookie. This attribute is required if First-Party Isolation is enabled.
         * Optional.
         */
        firstPartyDomain?: string;

        /**
         * The storage partition, if the cookie is part of partitioned storage. By default, non-partitioned storage is used.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      /**
       * Information to identify the cookie to remove.
       */
      interface RemoveDetailsType {
        /**
         * The URL associated with the cookie. If host permissions for this URL are not specified in the manifest file,
         * the API call will fail.
         */
        url: string;

        /**
         * The name of the cookie to remove.
         */
        name: string;

        /**
         * The ID of the cookie store to look in for the cookie. If unspecified, the cookie is looked for by default in the current
         * execution context's cookie store.
         * Optional.
         */
        storeId?: string;

        /**
         * The first-party domain associated with the cookie. This attribute is required if First-Party Isolation is enabled.
         * Optional.
         */
        firstPartyDomain?: string;

        /**
         * The storage partition, if the cookie is part of partitioned storage. By default, non-partitioned storage is used.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      /**
       * Contains details about the cookie that's been removed.  If removal failed for any reason, this will be "null",
       * and $(ref:runtime.lastError) will be set.
       */
      interface RemoveCallbackDetailsType {
        /**
         * The URL associated with the cookie that's been removed.
         */
        url: string;

        /**
         * The name of the cookie that's been removed.
         */
        name: string;

        /**
         * The ID of the cookie store from which the cookie was removed.
         */
        storeId: string;

        /**
         * The first-party domain associated with the cookie that's been removed.
         */
        firstPartyDomain: string;

        /**
         * The storage partition, if the cookie is part of partitioned storage. null if not partitioned.
         * Optional.
         */
        partitionKey?: PartitionKey;
      }

      interface OnChangedChangeInfoType {
        /**
         * True if a cookie was removed.
         */
        removed: boolean;

        /**
         * Information about the cookie that was set or removed.
         */
        cookie: Cookie;

        /**
         * The underlying reason behind the cookie's change.
         */
        cause: OnChangedCause;
      }

      interface Static {
        /**
         * Retrieves information about a single cookie. If more than one cookie of the same name exists for the given URL,
         * the one with the longest path will be returned. For cookies with the same path length,
         * the cookie with the earliest creation time will be returned.
         *
         * @param details Details to identify the cookie being retrieved.
         */
        get(details: GetDetailsType): Promise<Cookie | null>;

        /**
         * Retrieves all cookies from a single cookie store that match the given information.  The cookies returned will be sorted,
         * with those with the longest path first.  If multiple cookies have the same path length,
         * those with the earliest creation time will be first.
         *
         * @param details Information to filter the cookies being retrieved.
         */
        getAll(details: GetAllDetailsType): Promise<Cookie[]>;

        /**
         * Sets a cookie with the given cookie data; may overwrite equivalent cookies if they exist.
         *
         * @param details Details about the cookie being set.
         */
        set(details: SetDetailsType): Promise<Cookie>;

        /**
         * Deletes a cookie by name.
         *
         * @param details Information to identify the cookie to remove.
         */
        remove(
          details: RemoveDetailsType
        ): Promise<RemoveCallbackDetailsType | null>;

        /**
         * Lists all existing cookie stores.
         */
        getAllCookieStores(): Promise<CookieStore[]>;

        /**
         * Fired when a cookie is set or removed. As a special case, note that updating a cookie's properties is implemented as a
         * two step process: the cookie to be updated is first removed entirely, generating a notification with "cause" of
         * "overwrite" .  Afterwards, a new cookie is written with the updated values, generating a second notification with
         * "cause" "explicit".
         */
        onChanged: Events.Event<(changeInfo: OnChangedChangeInfoType) => void>;
      }
    }

    /**
     * Namespace: browser.declarativeContent
     */
    namespace DeclarativeContent {
      /**
       * See <a href="https://developer.mozilla.org/en-US/docs/Web/API/ImageData">https://developer.mozilla.
       * org/en-US/docs/Web/API/ImageData</a>.
       */
      interface ImageDataType extends ImageData {
        [s: string]: unknown;
      }

      /**
       * Matches the state of a web page based on various criteria.
       */
      interface PageStateMatcher {
        /**
         * Matches if the conditions of the <code>UrlFilter</code> are fulfilled for the top-level URL of the page.
         * Optional.
         */
        pageUrl?: Browser.Events.UrlFilter;

        /**
         * Matches if all of the CSS selectors in the array match displayed elements in a frame with the same origin as the page's
         * main frame. All selectors in this array must be <a href="http://www.w3.org/TR/selectors4/#compound">
         * compound selectors</a> to speed up matching. Note: Listing hundreds of CSS selectors or listing CSS selectors that match
         * hundreds of times per page can slow down web sites.
         * Optional.
         */
        css?: string[];

        /**
         * Matches if the bookmarked state of the page is equal to the specified value. Requres the <a
         * href='/docs/extensions/develop/concepts/declare-permissions'>bookmarks permission</a>.
         * Optional.
         */
        isBookmarked?: boolean;
      }

      /**
       * Please use ShowAction.
       */
      type ShowPageAction = never;

      /**
       * A declarative event action that sets the extension's toolbar $(ref:action action) to an enabled state while the
       * corresponding conditions are met. This action can be used without <a
       * href="/docs/extensions/develop/concepts/declare-permissions#host-permissions">host permissions</a>.
       * If the extension has the <a href="/docs/extensions/develop/concepts/activeTab">activeTab</a> permission,
       * clicking the page action grants access to the active tab.<p>On pages where the conditions are not met the extension's
       * toolbar action will be grey-scale, and clicking it will open the context menu, instead of triggering the action.</p>
       */
      interface ShowAction {
        [s: string]: unknown;
      }

      /**
       * Declarative event action that sets the n-<abbr title="device-independent pixel">dip</abbr>
       * square icon for the extension's $(ref:pageAction page action) or $(ref:browserAction browser action)
       * while the corresponding conditions are met. This action can be used without <a
       * href="/docs/extensions/develop/concepts/declare-permissions#host-permissions">host permissions</a>,
       * but the extension must have a page or browser action.<p>Exactly one of <code>imageData</code> or <code>path</code>
       * must be specified. Both are dictionaries mapping a number of pixels to an image representation.
       * The image representation in <code>imageData</code> is an <a href="https://developer.mozilla.
       * org/en-US/docs/Web/API/ImageData">ImageData</a> object; for example, from a <code>canvas</code> element,
       * while the image representation in <code>path</code> is the path to an image file relative to the extension's manifest.
       * If <code>scale</code> screen pixels fit into a device-independent pixel, the <code>scale * n</code> icon is used.
       * If that scale is missing, another image is resized to the required size.</p>
       */
      interface SetIcon {
        /**
         * Either an <code>ImageData</code> object or a dictionary {size -> ImageData} representing an icon to be set.
         * If the icon is specified as a dictionary, the image used is chosen depending on the screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>,
         * then an image with size <code>scale * n</code> is selected, where <i>n</i> is the size of the icon in the UI.
         * At least one image must be specified. Note that <code>details.imageData = foo</code> is equivalent to <code>details.
         * imageData = {'16': foo}</code>.
         * Optional.
         */
        imageData?: ImageDataType | SetIconImageDataC2Type;
      }

      /**
       * Declarative event action that injects a content script. <p><b>WARNING:</b> This action is still experimental and is not
       * supported on stable builds of Chrome.</p>
       */
      interface RequestContentScript {
        /**
         * Names of CSS files to be injected as a part of the content script.
         * Optional.
         */
        css?: string[];

        /**
         * Names of JavaScript files to be injected as a part of the content script.
         * Optional.
         */
        js?: string[];

        /**
         * Whether the content script runs in all frames of the matching page, or in only the top frame. Default is <code>
         * false</code>.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * Whether to insert the content script on <code>about:blank</code> and <code>about:srcdoc</code>. Default is <code>
         * false</code>.
         * Optional.
         */
        matchAboutBlank?: boolean;
      }

      interface Rule<TCondition, TAction> {
        /**
         * List of conditions that can trigger the actions.
         */
        conditions: TCondition[];

        /**
         * List of actions that are triggered if one of the conditions is fulfilled.
         */
        actions: TAction[];
      }

      /**
       * An object which allows the addition and removal of rules for declarative content.
       */
      interface RuleEvent<TCondition, TAction> {
        /**
         * Registers rules to handle events.
         *
         * @param rules Rules to be registered. These do not replace previously registered rules.
         */
        addRules(rules: Array<Rule<TCondition, TAction>>): void;

        /**
         * Fetches currently registered rules.
         *
         * @param rules Optional. Rule ids to fetch.
         * @param callback Optional. Called when rules have been fetched.
         */
        getRules(
          rules?: string[],
          callback?: (rules: Array<Rule<TCondition, TAction>>) => void
        ): void;

        /**
         * Unregisters currently registered rules.
         *
         * @param rules Optional. Rule ids to be unregistered.
         * @param callback Optional. Called when rules were unregistered.
         */
        removeRules(rules?: string[], callback?: () => void): void;
      }

      interface SetIconImageDataC2Type {
        [s: string]: unknown;
      }

      interface Static {
        PageStateMatcher: {
          new (options?: PageStateMatcher): PageStateMatcher;
        };

        ShowAction: { new (options?: ShowAction): ShowAction };

        SetIcon: { new (options?: SetIcon): SetIcon };

        RequestContentScript: {
          new (options?: RequestContentScript): RequestContentScript;
        };

        onPageChanged: RuleEvent<
          PageStateMatcher,
          RequestContentScript | SetIcon | ShowPageAction | ShowAction
        >;
      }
    }

    /**
     * Namespace: browser.declarativeNetRequest
     */
    namespace DeclarativeNetRequest {
      /**
       * How the requested resource will be used. Comparable to the webRequest.ResourceType type.
       * object_subrequest is unsupported.
       */
      type ResourceType =
        | "main_frame"
        | "sub_frame"
        | "stylesheet"
        | "script"
        | "image"
        | "object"
        | "object_subrequest"
        | "xmlhttprequest"
        | "xslt"
        | "ping"
        | "beacon"
        | "xml_dtd"
        | "font"
        | "media"
        | "websocket"
        | "csp_report"
        | "imageset"
        | "web_manifest"
        | "speculative"
        | "json"
        | "other";

      /**
       * Describes the reason why a given regular expression isn't supported.
       */
      type UnsupportedRegexReason = "syntaxError" | "memoryLimitExceeded";

      interface MatchedRule {
        /**
         * A matching rule's ID.
         */
        ruleId: number;

        /**
         * ID of the Ruleset this rule belongs to.
         */
        rulesetId: string;

        /**
         * ID of the extension, if this rule belongs to a different extension.
         * Optional.
         */
        extensionId?: string;
      }

      /**
       * Describes the type of the Rule.action.redirect.transform property.
       */
      interface URLTransform {
        /**
         * The new scheme for the request.
         * Optional.
         */
        scheme?: URLTransformSchemeEnum;

        /**
         * The new username for the request.
         * Optional.
         */
        username?: string;

        /**
         * The new password for the request.
         * Optional.
         */
        password?: string;

        /**
         * The new host name for the request.
         * Optional.
         */
        host?: string;

        /**
         * The new port for the request. If empty, the existing port is cleared.
         * Optional.
         */
        port?: string;

        /**
         * The new path for the request. If empty, the existing path is cleared.
         * Optional.
         */
        path?: string;

        /**
         * The new query for the request. Should be either empty, in which case the existing query is cleared; or should begin with
         * '?'. Cannot be specified if 'queryTransform' is specified.
         * Optional.
         */
        query?: string;

        /**
         * Add, remove or replace query key-value pairs. Cannot be specified if 'query' is specified.
         * Optional.
         */
        queryTransform?: URLTransformQueryTransformType;

        /**
         * The new fragment for the request. Should be either empty, in which case the existing fragment is cleared; or should
         * begin with '#'.
         * Optional.
         */
        fragment?: string;
      }

      interface Rule {
        /**
         * An id which uniquely identifies a rule. Mandatory and should be >= 1.
         */
        id: number;

        /**
         * Rule priority. Defaults to 1. When specified, should be >= 1
         * Optional.
         */
        priority?: number;

        /**
         * The condition under which this rule is triggered.
         */
        condition: RuleConditionType;

        /**
         * The action to take if this rule is matched.
         */
        action: RuleActionType;
      }

      interface GetRulesFilter {
        /**
         * If specified, only rules with matching IDs are included.
         * Optional.
         */
        ruleIds?: number[];
      }

      interface UpdateDynamicRulesOptionsType {
        /**
         * IDs of the rules to remove. Any invalid IDs will be ignored.
         * Optional.
         */
        removeRuleIds?: number[];

        /**
         * Rules to add.
         * Optional.
         */
        addRules?: Rule[];
      }

      interface UpdateSessionRulesOptionsType {
        /**
         * IDs of the rules to remove. Any invalid IDs will be ignored.
         * Optional.
         */
        removeRuleIds?: number[];

        /**
         * Rules to add.
         * Optional.
         */
        addRules?: Rule[];
      }

      interface UpdateEnabledRulesetsUpdateRulesetOptionsType {
        /**
         * Optional.
         */
        disableRulesetIds?: string[];

        /**
         * Optional.
         */
        enableRulesetIds?: string[];
      }

      interface UpdateStaticRulesOptionsType {
        rulesetId: string;

        /**
         * Optional.
         */
        disableRuleIds?: number[];

        /**
         * Optional.
         */
        enableRuleIds?: number[];
      }

      interface GetDisabledRuleIdsOptionsType {
        rulesetId: string;
      }

      interface IsRegexSupportedRegexOptionsType {
        /**
         * The regular expresson to check.
         */
        regex: string;

        /**
         * Whether the 'regex' specified is case sensitive.
         * Optional.
         */
        isCaseSensitive?: boolean;

        /**
         * Whether the 'regex' specified requires capturing. Capturing is only required for redirect rules which specify a
         * 'regexSubstition' action.
         * Optional.
         */
        requireCapturing?: boolean;
      }

      interface IsRegexSupportedCallbackResultType {
        /**
         * Whether the given regex is supported
         */
        isSupported: boolean;

        /**
         * Specifies the reason why the regular expression is not supported. Only provided if 'isSupported' is false.
         * Optional.
         */
        reason?: UnsupportedRegexReason;
      }

      /**
       * The details of the request to test.
       */
      interface TestMatchOutcomeRequestType {
        /**
         * The URL of the hypothetical request.
         */
        url: string;

        /**
         * The initiator URL (if any) for the hypothetical request.
         * Optional.
         */
        initiator?: string;

        /**
         * Standard HTTP method of the hypothetical request.
         * Optional.
         */
        method?: string;

        /**
         * The resource type of the hypothetical request.
         */
        type: ResourceType;

        /**
         * The ID of the tab in which the hypothetical request takes place. Does not need to correspond to a real tab ID.
         * Default is -1, meaning that the request isn't related to a tab.
         * Optional.
         */
        tabId?: number;
      }

      interface TestMatchOutcomeOptionsType {
        /**
         * Whether to account for rules from other installed extensions during rule evaluation.
         * Optional.
         */
        includeOtherExtensions?: boolean;
      }

      interface TestMatchOutcomeCallbackResultType {
        /**
         * The rules (if any) that match the hypothetical request.
         */
        matchedRules: MatchedRule[];
      }

      /**
       * The new scheme for the request.
       */
      type URLTransformSchemeEnum = "http" | "https" | "moz-extension";

      interface URLTransformQueryTransformAddOrReplaceParamsItemType {
        key: string;

        value: string;

        /**
         * If true, the query key is replaced only if it's already present. Otherwise, the key is also added if it's missing.
         * Optional.
         */
        replaceOnly?: boolean;
      }

      /**
       * Add, remove or replace query key-value pairs. Cannot be specified if 'query' is specified.
       */
      interface URLTransformQueryTransformType {
        /**
         * The list of query keys to be removed.
         * Optional.
         */
        removeParams?: string[];

        /**
         * The list of query key-value pairs to be added or replaced.
         * Optional.
         */
        addOrReplaceParams?: URLTransformQueryTransformAddOrReplaceParamsItemType[];
      }

      /**
       * Specifies whether the network request is first-party or third-party to the domain from which it originated. If omitted,
       * all requests are matched.
       */
      type RuleConditionDomainTypeEnum = "firstParty" | "thirdParty";

      /**
       * The condition under which this rule is triggered.
       */
      interface RuleConditionType {
        /**
         * TODO: link to doc explaining supported pattern. The pattern which is matched against the network request url.
         * Only one of 'urlFilter' or 'regexFilter' can be specified.
         * Optional.
         */
        urlFilter?: string;

        /**
         * Regular expression to match against the network request url. Only one of 'urlFilter' or 'regexFilter' can be specified.
         * Optional.
         */
        regexFilter?: string;

        /**
         * Whether 'urlFilter' or 'regexFilter' is case-sensitive.
         * Optional.
         */
        isUrlFilterCaseSensitive?: boolean;

        /**
         * The rule will only match network requests originating from the list of 'initiatorDomains'. If the list is omitted,
         * the rule is applied to requests from all domains.
         * Optional.
         */
        initiatorDomains?: string[];

        /**
         * The rule will not match network requests originating from the list of 'initiatorDomains'.
         * If the list is empty or omitted, no domains are excluded. This takes precedence over 'initiatorDomains'.
         * Optional.
         */
        excludedInitiatorDomains?: string[];

        /**
         * The rule will only match network requests when the domain matches one from the list of 'requestDomains'.
         * If the list is omitted, the rule is applied to requests from all domains.
         * Optional.
         */
        requestDomains?: string[];

        /**
         * The rule will not match network requests when the domains matches one from the list of 'excludedRequestDomains'.
         * If the list is empty or omitted, no domains are excluded. This takes precedence over 'requestDomains'.
         * Optional.
         */
        excludedRequestDomains?: string[];

        /**
         * List of resource types which the rule can match. When the rule action is 'allowAllRequests',
         * this must be specified and may only contain 'main_frame' or 'sub_frame'. Cannot be specified if 'excludedResourceTypes'
         * is specified. If neither of them is specified, all resource types except 'main_frame' are matched.
         * Optional.
         */
        resourceTypes?: ResourceType[];

        /**
         * List of resource types which the rule won't match. Cannot be specified if 'resourceTypes' is specified.
         * If neither of them is specified, all resource types except 'main_frame' are matched.
         * Optional.
         */
        excludedResourceTypes?: ResourceType[];

        /**
         * List of HTTP request methods which the rule can match. Should be a lower-case method such as 'connect', 'delete', 'get',
         * 'head', 'options', 'patch', 'post', 'put'.'
         * Optional.
         */
        requestMethods?: string[];

        /**
         * List of request methods which the rule won't match. Cannot be specified if 'requestMethods' is specified.
         * If neither of them is specified, all request methods are matched.
         * Optional.
         */
        excludedRequestMethods?: string[];

        /**
         * Specifies whether the network request is first-party or third-party to the domain from which it originated. If omitted,
         * all requests are matched.
         * Optional.
         */
        domainType?: RuleConditionDomainTypeEnum;

        /**
         * List of tabIds which the rule should match. An ID of -1 matches requests which don't originate from a tab.
         * Only supported for session-scoped rules.
         * Optional.
         */
        tabIds?: number[];

        /**
         * List of tabIds which the rule should not match. An ID of -1 excludes requests which don't originate from a tab.
         * Only supported for session-scoped rules.
         * Optional.
         */
        excludedTabIds?: number[];
      }

      type RuleActionTypeEnum =
        | "block"
        | "redirect"
        | "allow"
        | "upgradeScheme"
        | "modifyHeaders"
        | "allowAllRequests";

      /**
       * Describes how the redirect should be performed. Only valid when type is 'redirect'.
       */
      interface RuleActionRedirectType {
        /**
         * Path relative to the extension directory. Should start with '/'.
         * Optional.
         */
        extensionPath?: string;

        /**
         * Url transformations to perform.
         * Optional.
         */
        transform?: URLTransform;

        /**
         * The redirect url. Redirects to JavaScript urls are not allowed.
         * Optional.
         */
        url?: string;

        /**
         * Substitution pattern for rules which specify a 'regexFilter'. The first match of regexFilter within the url will be
         * replaced with this pattern. Within regexSubstitution, backslash-escaped digits (\1 to \9)
         * can be used to insert the corresponding capture groups. \0 refers to the entire matching text.
         * Optional.
         */
        regexSubstitution?: string;
      }

      interface RuleActionRequestHeadersItemType {
        /**
         * The name of the request header to be modified.
         */
        header: string;

        /**
         * The operation to be performed on a header.
         */
        operation: "append" | "set" | "remove";

        /**
         * The new value for the header. Must be specified for the 'append' and 'set' operations.
         * Optional.
         */
        value?: string;
      }

      interface RuleActionResponseHeadersItemType {
        /**
         * The name of the response header to be modified.
         */
        header: string;

        /**
         * The operation to be performed on a header.
         */
        operation: "append" | "set" | "remove";

        /**
         * The new value for the header. Must be specified for the 'append' and 'set' operations.
         * Optional.
         */
        value?: string;
      }

      /**
       * The action to take if this rule is matched.
       */
      interface RuleActionType {
        type: RuleActionTypeEnum;

        /**
         * Describes how the redirect should be performed. Only valid when type is 'redirect'.
         * Optional.
         */
        redirect?: RuleActionRedirectType;

        /**
         * The request headers to modify for the request. Only valid when type is 'modifyHeaders'.
         * Optional.
         */
        requestHeaders?: RuleActionRequestHeadersItemType[];

        /**
         * The response headers to modify for the request. Only valid when type is 'modifyHeaders'.
         * Optional.
         */
        responseHeaders?: RuleActionResponseHeadersItemType[];
      }

      interface Static {
        /**
         * Modifies the current set of dynamic rules for the extension. The rules with IDs listed in options.
         * removeRuleIds are first removed, and then the rules given in options.addRules are added.
         * These rules are persisted across browser sessions and extension updates.
         *
         * @returns Called when the dynamic rules have been updated
         */
        updateDynamicRules(
          options: UpdateDynamicRulesOptionsType
        ): Promise<void>;

        /**
         * Modifies the current set of session scoped rules for the extension. The rules with IDs listed in options.
         * removeRuleIds are first removed, and then the rules given in options.addRules are added.
         * These rules are not persisted across sessions and are backed in memory.
         *
         * @returns Called when the session rules have been updated
         */
        updateSessionRules(
          options: UpdateSessionRulesOptionsType
        ): Promise<void>;

        /**
         * Returns the ids for the current set of enabled static rulesets.
         */
        getEnabledRulesets(): Promise<string[]>;

        /**
         * Modifies the static rulesets enabled/disabled state.
         */
        updateEnabledRulesets(
          updateRulesetOptions: UpdateEnabledRulesetsUpdateRulesetOptionsType
        ): Promise<void>;

        /**
         * Modified individual static rules enabled/disabled state. Changes to rules belonging to a disabled ruleset will take
         * effect when the ruleset becomes enabled.
         */
        updateStaticRules(options: UpdateStaticRulesOptionsType): Promise<void>;

        /**
         * Returns the remaining number of static rules an extension can enable
         */
        getAvailableStaticRuleCount(): Promise<number>;

        /**
         * Returns the list of individual disabled static rules from a given static ruleset id.
         */
        getDisabledRuleIds(
          options: GetDisabledRuleIdsOptionsType
        ): Promise<number[]>;

        /**
         * Returns the current set of dynamic rules for the extension.
         *
         * @param filter Optional. An object to filter the set of dynamic rules for the extension.
         */
        getDynamicRules(filter?: GetRulesFilter): Promise<Rule[]>;

        /**
         * Returns the current set of session scoped rules for the extension.
         *
         * @param filter Optional. An object to filter the set of session scoped rules for the extension.
         */
        getSessionRules(filter?: GetRulesFilter): Promise<Rule[]>;

        /**
         * Checks if the given regular expression will be supported as a 'regexFilter' rule condition.
         */
        isRegexSupported(
          regexOptions: IsRegexSupportedRegexOptionsType
        ): Promise<IsRegexSupportedCallbackResultType>;

        /**
         * Checks if any of the extension's declarativeNetRequest rules would match a hypothetical request.
         *
         * @param request The details of the request to test.
         * @param options Optional.
         * @returns Called with the details of matched rules.
         */
        testMatchOutcome(
          request: TestMatchOutcomeRequestType,
          options?: TestMatchOutcomeOptionsType
        ): Promise<TestMatchOutcomeCallbackResultType>;

        /**
         * Ruleset ID for the dynamic rules added by the extension.
         */
        DYNAMIC_RULESET_ID: "_dynamic";

        /**
         * The minimum number of static rules guaranteed to an extension across its enabled static rulesets.
         * Any rules above this limit will count towards the global static rule limit.
         */
        GUARANTEED_MINIMUM_STATIC_RULES: number;

        /**
         * The maximum number of static Rulesets an extension can specify as part of the rule_resources manifest key.
         */
        MAX_NUMBER_OF_STATIC_RULESETS: number;

        /**
         * The maximum number of static rules that can be disabled on each static ruleset.
         */
        MAX_NUMBER_OF_DISABLED_STATIC_RULES: number;

        /**
         * The maximum number of static Rulesets an extension can enable at any one time.
         */
        MAX_NUMBER_OF_ENABLED_STATIC_RULESETS: number;

        /**
         * Deprecated property returning the maximum number of dynamic and session rules an extension can add,
         * replaced by MAX_NUMBER_OF_DYNAMIC_RULES/MAX_NUMBER_OF_SESSION_RULES.
         */
        MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES: number;

        /**
         * The maximum number of dynamic session rules an extension can add.
         */
        MAX_NUMBER_OF_DYNAMIC_RULES: number;

        /**
         * The maximum number of dynamic session rules an extension can add.
         */
        MAX_NUMBER_OF_SESSION_RULES: number;

        /**
         * The maximum number of regular expression rules that an extension can add. This limit is evaluated separately for the set
         * of session rules, dynamic rules and those specified in the rule_resources file.
         */
        MAX_NUMBER_OF_REGEX_RULES: number;

        /**
         * Ruleset ID for the session-scoped rules added by the extension.
         */
        SESSION_RULESET_ID: "_session";
      }
    }

    /**
     * Namespace: browser.devtools
     */
    namespace Devtools {
      interface Static {
        inspectedWindow: InspectedWindow.Static;
        network: Network.Static;
        panels: Panels.Static;
      }
    }

    /**
     * Namespace: browser.dns
     */
    namespace Dns {
      /**
       * An object encapsulating a DNS Record.
       */
      interface DNSRecord {
        /**
         * The canonical hostname for this record.  this value is empty if the record was not fetched with the 'canonical_name'
         * flag.
         * Optional.
         */
        canonicalName?: string;

        /**
         * Record retreived with TRR.
         */
        isTRR: string;

        addresses: string[];
      }

      type ResolveFlags = ResolveFlagsItemEnum[];

      type ResolveFlagsItemEnum =
        | "allow_name_collisions"
        | "bypass_cache"
        | "canonical_name"
        | "disable_ipv4"
        | "disable_ipv6"
        | "disable_trr"
        | "offline"
        | "priority_low"
        | "priority_medium"
        | "speculate";

      interface Static {
        /**
         * Resolves a hostname to a DNS record.
         *
         * @param flags Optional.
         */
        resolve(hostname: string, flags?: ResolveFlags): Promise<DNSRecord>;
      }
    }

    /**
     * Namespace: browser.downloads
     */
    namespace Downloads {
      type FilenameConflictAction = "uniquify" | "overwrite" | "prompt";

      type InterruptReason =
        | "FILE_FAILED"
        | "FILE_ACCESS_DENIED"
        | "FILE_NO_SPACE"
        | "FILE_NAME_TOO_LONG"
        | "FILE_TOO_LARGE"
        | "FILE_VIRUS_INFECTED"
        | "FILE_TRANSIENT_ERROR"
        | "FILE_BLOCKED"
        | "FILE_SECURITY_CHECK_FAILED"
        | "FILE_TOO_SHORT"
        | "NETWORK_FAILED"
        | "NETWORK_TIMEOUT"
        | "NETWORK_DISCONNECTED"
        | "NETWORK_SERVER_DOWN"
        | "NETWORK_INVALID_REQUEST"
        | "SERVER_FAILED"
        | "SERVER_NO_RANGE"
        | "SERVER_BAD_CONTENT"
        | "SERVER_UNAUTHORIZED"
        | "SERVER_CERT_PROBLEM"
        | "SERVER_FORBIDDEN"
        | "USER_CANCELED"
        | "USER_SHUTDOWN"
        | "CRASH";

      /**
       * <dl><dt>file</dt><dd>The download's filename is suspicious.</dd><dt>url</dt><dd>The download's URL is known to be
       * malicious.</dd><dt>content</dt><dd>The downloaded file is known to be malicious.</dd><dt>uncommon</dt><dd>
       * The download's URL is not commonly downloaded and could be dangerous.</dd><dt>safe</dt><dd>
       * The download presents no known danger to the user's computer.</dd></dl>These string constants will never change,
       * however the set of DangerTypes may change.
       */
      type DangerType =
        | "file"
        | "url"
        | "content"
        | "uncommon"
        | "host"
        | "unwanted"
        | "safe"
        | "accepted";

      /**
       * <dl><dt>in_progress</dt><dd>The download is currently receiving data from the server.</dd><dt>interrupted</dt><dd>
       * An error broke the connection with the file host.</dd><dt>complete</dt><dd>The download completed successfully.</dd></dl>
       * These string constants will never change, however the set of States may change.
       */
      type State = "in_progress" | "interrupted" | "complete";

      interface DownloadItem {
        /**
         * An identifier that is persistent across browser sessions.
         */
        id: number;

        /**
         * Absolute URL.
         */
        url: string;

        /**
         * Optional.
         */
        referrer?: string;

        /**
         * Absolute local path.
         */
        filename: string;

        /**
         * False if this download is recorded in the history, true if it is not recorded.
         */
        incognito: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * Indication of whether this download is thought to be safe or known to be suspicious.
         */
        danger: DangerType;

        /**
         * The file's MIME type.
         * Optional.
         */
        mime?: string;

        /**
         * Number of milliseconds between the unix epoch and when this download began.
         */
        startTime: string;

        /**
         * Number of milliseconds between the unix epoch and when this download ended.
         * Optional.
         */
        endTime?: string;

        /**
         * Optional.
         */
        estimatedEndTime?: string;

        /**
         * Indicates whether the download is progressing, interrupted, or complete.
         */
        state: State;

        /**
         * True if the download has stopped reading data from the host, but kept the connection open.
         */
        paused: boolean;

        canResume: boolean;

        /**
         * Number indicating why a download was interrupted.
         * Optional.
         */
        error?: InterruptReason;

        /**
         * Number of bytes received so far from the host, without considering file compression.
         */
        bytesReceived: number;

        /**
         * Number of bytes in the whole file, without considering file compression, or -1 if unknown.
         */
        totalBytes: number;

        /**
         * Number of bytes in the whole file post-decompression, or -1 if unknown.
         */
        fileSize: number;

        exists: boolean;

        /**
         * Optional.
         */
        byExtensionId?: string;

        /**
         * Optional.
         */
        byExtensionName?: string;
      }

      interface StringDelta {
        /**
         * Optional.
         */
        current?: string;

        /**
         * Optional.
         */
        previous?: string;
      }

      interface DoubleDelta {
        /**
         * Optional.
         */
        current?: number;

        /**
         * Optional.
         */
        previous?: number;
      }

      interface BooleanDelta {
        /**
         * Optional.
         */
        current?: boolean;

        /**
         * Optional.
         */
        previous?: boolean;
      }

      /**
       * A time specified as a Date object, a number or string representing milliseconds since the epoch, or an ISO 8601 string
       */
      type DownloadTime = string | ExtensionTypes.DateType;

      /**
       * Parameters that combine to specify a predicate that can be used to select a set of downloads.
       * Used for example in search() and erase()
       */
      interface DownloadQuery {
        /**
         * This array of search terms limits results to <a href='#type-DownloadItem'>DownloadItems</a> whose <code>filename</code>
         * or <code>url</code> contain all of the search terms that do not begin with a dash '-' and none of the search terms that
         * do begin with a dash.
         * Optional.
         */
        query?: string[];

        /**
         * Limits results to downloads that started before the given ms since the epoch.
         * Optional.
         */
        startedBefore?: DownloadTime;

        /**
         * Limits results to downloads that started after the given ms since the epoch.
         * Optional.
         */
        startedAfter?: DownloadTime;

        /**
         * Limits results to downloads that ended before the given ms since the epoch.
         * Optional.
         */
        endedBefore?: DownloadTime;

        /**
         * Limits results to downloads that ended after the given ms since the epoch.
         * Optional.
         */
        endedAfter?: DownloadTime;

        /**
         * Limits results to downloads whose totalBytes is greater than the given integer.
         * Optional.
         */
        totalBytesGreater?: number;

        /**
         * Limits results to downloads whose totalBytes is less than the given integer.
         * Optional.
         */
        totalBytesLess?: number;

        /**
         * Limits results to <a href='#type-DownloadItem'>DownloadItems</a> whose <code>filename</code>
         * matches the given regular expression.
         * Optional.
         */
        filenameRegex?: string;

        /**
         * Limits results to <a href='#type-DownloadItem'>DownloadItems</a> whose <code>url</code>
         * matches the given regular expression.
         * Optional.
         */
        urlRegex?: string;

        /**
         * Setting this integer limits the number of results. Otherwise, all matching <a href='#type-DownloadItem'>DownloadItems</a>
         * will be returned.
         * Optional.
         */
        limit?: number;

        /**
         * Setting elements of this array to <a href='#type-DownloadItem'>DownloadItem</a> properties in order to sort the search
         * results. For example, setting <code>orderBy='startTime'</code> sorts the <a href='#type-DownloadItem'>DownloadItems</a>
         * by their start time in ascending order. To specify descending order, prefix <code>orderBy</code>
         * with a hyphen: '-startTime'.
         * Optional.
         */
        orderBy?: string[];

        /**
         * Optional.
         */
        id?: number;

        /**
         * Absolute URL.
         * Optional.
         */
        url?: string;

        /**
         * Absolute local path.
         * Optional.
         */
        filename?: string;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * Indication of whether this download is thought to be safe or known to be suspicious.
         * Optional.
         */
        danger?: DangerType;

        /**
         * The file's MIME type.
         * Optional.
         */
        mime?: string;

        /**
         * Optional.
         */
        startTime?: string;

        /**
         * Optional.
         */
        endTime?: string;

        /**
         * Indicates whether the download is progressing, interrupted, or complete.
         * Optional.
         */
        state?: State;

        /**
         * True if the download has stopped reading data from the host, but kept the connection open.
         * Optional.
         */
        paused?: boolean;

        /**
         * Why a download was interrupted.
         * Optional.
         */
        error?: InterruptReason;

        /**
         * Number of bytes received so far from the host, without considering file compression.
         * Optional.
         */
        bytesReceived?: number;

        /**
         * Number of bytes in the whole file, without considering file compression, or -1 if unknown.
         * Optional.
         */
        totalBytes?: number;

        /**
         * Number of bytes in the whole file post-decompression, or -1 if unknown.
         * Optional.
         */
        fileSize?: number;

        /**
         * Optional.
         */
        exists?: boolean;
      }

      /**
       * What to download and how.
       */
      interface DownloadOptionsType {
        /**
         * The URL to download.
         */
        url: string;

        /**
         * A file path relative to the Downloads directory to contain the downloaded file.
         * Optional.
         */
        filename?: string;

        /**
         * Whether to associate the download with a private browsing session.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity; requires "cookies" permission.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * Optional.
         */
        conflictAction?: FilenameConflictAction;

        /**
         * Use a file-chooser to allow the user to select a filename. If the option is not specified,
         * the file chooser will be shown only if the Firefox "Always ask you where to save files" option is enabled (i.e.
         * the pref <code>browser.download.useDownloadDir</code> is set to <code>false</code>).
         * Optional.
         */
        saveAs?: boolean;

        /**
         * The HTTP method to use if the URL uses the HTTP[S] protocol.
         * Optional.
         */
        method?: DownloadOptionsTypeMethodEnum;

        /**
         * Extra HTTP headers to send with the request if the URL uses the HTTP[s] protocol. Each header is represented as a
         * dictionary containing the keys <code>name</code> and either <code>value</code> or <code>binaryValue</code>,
         * restricted to those allowed by XMLHttpRequest.
         * Optional.
         */
        headers?: DownloadOptionsTypeHeadersItemType[];

        /**
         * Post body.
         * Optional.
         */
        body?: string;

        /**
         * When this flag is set to <code>true</code>, then the browser will allow downloads to proceed after encountering HTTP
         * errors such as <code>404 Not Found</code>.
         * Optional.
         */
        allowHttpErrors?: boolean;
      }

      interface GetFileIconOptionsType {
        /**
         * The size of the icon.  The returned icon will be square with dimensions size * size pixels.
         * The default size for the icon is 32x32 pixels.
         * Optional.
         */
        size?: number;
      }

      interface OnChangedDownloadDeltaType {
        /**
         * The <code>id</code> of the <a href='#type-DownloadItem'>DownloadItem</a> that changed.
         */
        id: number;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>url</code>.
         * Optional.
         */
        url?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>filename</code>.
         * Optional.
         */
        filename?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>danger</code>.
         * Optional.
         */
        danger?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>mime</code>.
         * Optional.
         */
        mime?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>startTime</code>.
         * Optional.
         */
        startTime?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>endTime</code>.
         * Optional.
         */
        endTime?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>state</code>.
         * Optional.
         */
        state?: StringDelta;

        /**
         * Optional.
         */
        canResume?: BooleanDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>paused</code>.
         * Optional.
         */
        paused?: BooleanDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>error</code>.
         * Optional.
         */
        error?: StringDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>totalBytes</code>.
         * Optional.
         */
        totalBytes?: DoubleDelta;

        /**
         * Describes a change in a <a href='#type-DownloadItem'>DownloadItem</a>'s <code>fileSize</code>.
         * Optional.
         */
        fileSize?: DoubleDelta;

        /**
         * Optional.
         */
        exists?: BooleanDelta;
      }

      /**
       * The HTTP method to use if the URL uses the HTTP[S] protocol.
       */
      type DownloadOptionsTypeMethodEnum = "GET" | "POST";

      interface DownloadOptionsTypeHeadersItemType {
        /**
         * Name of the HTTP header.
         */
        name: string;

        /**
         * Value of the HTTP header.
         */
        value: string;
      }

      interface Static {
        /**
         * Download a URL. If the URL uses the HTTP[S] protocol, then the request will include all cookies currently set for its
         * hostname. If both <code>filename</code> and <code>saveAs</code> are specified, then the Save As dialog will be displayed,
         * pre-populated with the specified <code>filename</code>. If the download started successfully, <code>callback</code>
         * will be called with the new <a href='#type-DownloadItem'>DownloadItem</a>'s <code>downloadId</code>.
         * If there was an error starting the download, then <code>callback</code> will be called with <code>
         * downloadId=undefined</code> and <a href='extension.html#property-lastError'>chrome.extension.lastError</a>
         * will contain a descriptive string. The error strings are not guaranteed to remain backwards compatible between releases.
         * You must not parse it.
         *
         * @param options What to download and how.
         */
        download(options: DownloadOptionsType): Promise<number>;

        /**
         * Find <a href='#type-DownloadItem'>DownloadItems</a>. Set <code>query</code> to the empty object to get all <a
         * href='#type-DownloadItem'>DownloadItems</a>. To get a specific <a href='#type-DownloadItem'>DownloadItem</a>,
         * set only the <code>id</code> field.
         */
        search(query: DownloadQuery): Promise<DownloadItem[]>;

        /**
         * Pause the download. If the request was successful the download is in a paused state. Otherwise <a href='extension.
         * html#property-lastError'>chrome.extension.lastError</a> contains an error message.
         * The request will fail if the download is not active.
         *
         * @param downloadId The id of the download to pause.
         */
        pause(downloadId: number): Promise<void>;

        /**
         * Resume a paused download. If the request was successful the download is in progress and unpaused.
         * Otherwise <a href='extension.html#property-lastError'>chrome.extension.lastError</a> contains an error message.
         * The request will fail if the download is not active.
         *
         * @param downloadId The id of the download to resume.
         */
        resume(downloadId: number): Promise<void>;

        /**
         * Cancel a download. When <code>callback</code> is run, the download is cancelled, completed,
         * interrupted or doesn't exist anymore.
         *
         * @param downloadId The id of the download to cancel.
         */
        cancel(downloadId: number): Promise<void>;

        /**
         * Retrieve an icon for the specified download. For new downloads, file icons are available after the <a
         * href='#event-onCreated'>onCreated</a> event has been received. The image returned by this function while a download is
         * in progress may be different from the image returned after the download is complete.
         * Icon retrieval is done by querying the underlying operating system or toolkit depending on the platform.
         * The icon that is returned will therefore depend on a number of factors including state of the download, platform,
         * registered file types and visual theme. If a file icon cannot be determined, <a href='extension.
         * html#property-lastError'>chrome.extension.lastError</a> will contain an error message.
         *
         * @param downloadId The identifier for the download.
         * @param options Optional.
         */
        getFileIcon(
          downloadId: number,
          options?: GetFileIconOptionsType
        ): Promise<string>;

        /**
         * Open the downloaded file.
         */
        open(downloadId: number): Promise<void>;

        /**
         * Show the downloaded file in its folder in a file manager.
         */
        show(downloadId: number): Promise<boolean>;

        showDefaultFolder(): void;

        /**
         * Erase matching <a href='#type-DownloadItem'>DownloadItems</a> from history
         */
        erase(query: DownloadQuery): Promise<number[]>;

        removeFile(downloadId: number): Promise<void>;

        /**
         * This event fires with the <a href='#type-DownloadItem'>DownloadItem</a> object when a download begins.
         */
        onCreated: Events.Event<(downloadItem: DownloadItem) => void>;

        /**
         * Fires with the <code>downloadId</code> when a download is erased from history.
         *
         * @param downloadId The <code>id</code> of the <a href='#type-DownloadItem'>DownloadItem</a> that was erased.
         */
        onErased: Events.Event<(downloadId: number) => void>;

        /**
         * When any of a <a href='#type-DownloadItem'>DownloadItem</a>'s properties except <code>bytesReceived</code> changes,
         * this event fires with the <code>downloadId</code> and an object containing the properties that changed.
         */
        onChanged: Events.Event<
          (downloadDelta: OnChangedDownloadDeltaType) => void
        >;
      }
    }

    /**
     * Namespace: browser.events
     */
    namespace Events {
      /**
       * Description of a declarative rule for handling events.
       */
      interface Rule {
        /**
         * Optional identifier that allows referencing this rule.
         * Optional.
         */
        id?: string;

        /**
         * Tags can be used to annotate rules and perform operations on sets of rules.
         * Optional.
         */
        tags?: string[];

        /**
         * List of conditions that can trigger the actions.
         */
        conditions: unknown[];

        /**
         * List of actions that are triggered if one of the condtions is fulfilled.
         */
        actions: unknown[];

        /**
         * Optional priority of this rule. Defaults to 100.
         * Optional.
         */
        priority?: number;
      }

      /**
       * An object which allows the addition and removal of listeners for a Chrome event.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interface Event<T extends (...args: any[]) => any> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param ...params Further parameters, depending on the event.
         */
        addListener(callback: T, ...params: unknown[]): void;

        /**
         * Deregisters an event listener <em>callback</em> from an event.
         *
         * @param callback Listener that shall be unregistered.
         */
        removeListener(callback: T): void;

        /**
         * @param callback Listener whose registration status shall be tested.
         * @returns True if <em>callback</em> is registered to the event.
         */
        hasListener(callback: T): boolean;
      }

      /**
       * Filters URLs for various criteria. See <a href='events#filtered'>event filtering</a>. All criteria are case sensitive.
       */
      interface UrlFilter {
        /**
         * Matches if the host name of the URL contains a specified string. To test whether a host name component has a prefix
         * 'foo', use hostContains: '.foo'. This matches 'www.foobar.com' and 'foo.com', because an implicit dot is added at the
         * beginning of the host name. Similarly, hostContains can be used to match against component suffix ('foo.')
         * and to exactly match against components ('.foo.'). Suffix- and exact-matching for the last components need to be done
         * separately using hostSuffix, because no implicit dot is added at the end of the host name.
         * Optional.
         */
        hostContains?: string;

        /**
         * Matches if the host name of the URL is equal to a specified string.
         * Optional.
         */
        hostEquals?: string;

        /**
         * Matches if the host name of the URL starts with a specified string.
         * Optional.
         */
        hostPrefix?: string;

        /**
         * Matches if the host name of the URL ends with a specified string.
         * Optional.
         */
        hostSuffix?: string;

        /**
         * Matches if the path segment of the URL contains a specified string.
         * Optional.
         */
        pathContains?: string;

        /**
         * Matches if the path segment of the URL is equal to a specified string.
         * Optional.
         */
        pathEquals?: string;

        /**
         * Matches if the path segment of the URL starts with a specified string.
         * Optional.
         */
        pathPrefix?: string;

        /**
         * Matches if the path segment of the URL ends with a specified string.
         * Optional.
         */
        pathSuffix?: string;

        /**
         * Matches if the query segment of the URL contains a specified string.
         * Optional.
         */
        queryContains?: string;

        /**
         * Matches if the query segment of the URL is equal to a specified string.
         * Optional.
         */
        queryEquals?: string;

        /**
         * Matches if the query segment of the URL starts with a specified string.
         * Optional.
         */
        queryPrefix?: string;

        /**
         * Matches if the query segment of the URL ends with a specified string.
         * Optional.
         */
        querySuffix?: string;

        /**
         * Matches if the URL (without fragment identifier) contains a specified string. Port numbers are stripped from the URL if
         * they match the default port number.
         * Optional.
         */
        urlContains?: string;

        /**
         * Matches if the URL (without fragment identifier) is equal to a specified string. Port numbers are stripped from the URL
         * if they match the default port number.
         * Optional.
         */
        urlEquals?: string;

        /**
         * Matches if the URL (without fragment identifier) matches a specified regular expression.
         * Port numbers are stripped from the URL if they match the default port number. The regular expressions use the <a
         * href="https://github.com/google/re2/blob/master/doc/syntax.txt">RE2 syntax</a>.
         * Optional.
         */
        urlMatches?: string;

        /**
         * Matches if the URL without query segment and fragment identifier matches a specified regular expression.
         * Port numbers are stripped from the URL if they match the default port number. The regular expressions use the <a
         * href="https://github.com/google/re2/blob/master/doc/syntax.txt">RE2 syntax</a>.
         * Optional.
         */
        originAndPathMatches?: string;

        /**
         * Matches if the URL (without fragment identifier) starts with a specified string. Port numbers are stripped from the URL
         * if they match the default port number.
         * Optional.
         */
        urlPrefix?: string;

        /**
         * Matches if the URL (without fragment identifier) ends with a specified string. Port numbers are stripped from the URL if
         * they match the default port number.
         * Optional.
         */
        urlSuffix?: string;

        /**
         * Matches if the scheme of the URL is equal to any of the schemes specified in the array.
         * Optional.
         */
        schemes?: string[];

        /**
         * Matches if the port of the URL is contained in any of the specified port lists. For example <code>[80, 443, [1000, 1200]]
         * </code> matches all requests on port 80, 443 and in the range 1000-1200.
         * Optional.
         */
        ports?: Array<number | [number, number]>;
      }

      interface Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.experiments
     */
    namespace Experiments {
      interface ExperimentAPI {
        schema: ExperimentURL;

        /**
         * Optional.
         */
        parent?: ExperimentAPIParentType;

        /**
         * Optional.
         */
        child?: ExperimentAPIChildType;
      }

      type ExperimentURL = string;

      type APIPaths = APIPath[];

      type APIPath = string[];

      type APIEvents = APIEvent[];

      type APIEvent = "startup";

      type APIParentScope =
        | "addon_parent"
        | "content_parent"
        | "devtools_parent";

      type APIChildScope = "addon_child" | "content_child" | "devtools_child";

      interface ExperimentAPIParentType {
        /**
         * Optional.
         */
        events?: APIEvents;

        /**
         * Optional.
         */
        paths?: APIPaths;

        script: ExperimentURL;

        /**
         * Optional.
         */
        scopes?: APIParentScope[];
      }

      interface ExperimentAPIChildType {
        paths: APIPaths;

        script: ExperimentURL;

        scopes: APIChildScope[];
      }

      interface Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.extensionTypes
     */
    namespace ExtensionTypes {
      /**
       * The format of an image.
       */
      type ImageFormat = "jpeg" | "png";

      /**
       * Details about the format, quality, area and scale of the capture.
       */
      interface ImageDetails {
        /**
         * The format of the resulting image.  Default is <code>"jpeg"</code>.
         * Optional.
         */
        format?: ImageFormat;

        /**
         * When format is <code>"jpeg"</code>, controls the quality of the resulting image.  This value is ignored for PNG images.
         * As quality is decreased, the resulting image will have more visual artifacts, and the number of bytes needed to store
         * it will decrease.
         * Optional.
         */
        quality?: number;

        /**
         * The area of the document to capture, in CSS pixels, relative to the page.  If omitted, capture the visible viewport.
         * Optional.
         */
        rect?: ImageDetailsRectType;

        /**
         * The scale of the resulting image.  Defaults to <code>devicePixelRatio</code>.
         * Optional.
         */
        scale?: number;

        /**
         * If true, temporarily resets the scroll position of the document to 0. Only takes effect if rect is also specified.
         * Optional.
         */
        resetScrollPosition?: boolean;
      }

      /**
       * The soonest that the JavaScript or CSS will be injected into the tab.
       */
      type RunAt = "document_start" | "document_end" | "document_idle";

      /**
       * The JavaScript world for a script to execute within. <code>ISOLATED</code> is the default execution environment of
       * content scripts, <code>MAIN</code> is the web page's execution environment.
       */
      type ExecutionWorld = "ISOLATED" | "MAIN";

      /**
       * The origin of the CSS to inject, this affects the cascading order (priority) of the stylesheet.
       */
      type CSSOrigin = "user" | "author";

      /**
       * Details of the script or CSS to inject. Either the code or the file property must be set,
       * but both may not be set at the same time.
       */
      interface InjectDetails {
        /**
         * JavaScript or CSS code to inject.<br><br><b>Warning:</b><br>Be careful using the <code>code</code> parameter.
         * Incorrect use of it may open your extension to <a href="https://en.wikipedia.org/wiki/Cross-site_scripting">
         * cross site scripting</a> attacks.
         * Optional.
         */
        code?: string;

        /**
         * JavaScript or CSS file to inject.
         * Optional.
         */
        file?: string;

        /**
         * If allFrames is <code>true</code>, implies that the JavaScript or CSS should be injected into all frames of current page.
         * By default, it's <code>false</code> and is only injected into the top frame.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * If matchAboutBlank is true, then the code is also injected in about:blank and about:srcdoc frames if your extension has
         * access to its parent document. Code cannot be inserted in top-level about:-frames. By default it is <code>false</code>.
         * Optional.
         */
        matchAboutBlank?: boolean;

        /**
         * The ID of the frame to inject the script into. This may not be used in combination with <code>allFrames</code>.
         * Optional.
         */
        frameId?: number;

        /**
         * The soonest that the JavaScript or CSS will be injected into the tab. Defaults to "document_idle".
         * Optional.
         */
        runAt?: RunAt;

        /**
         * The css origin of the stylesheet to inject. Defaults to "author".
         * Optional.
         */
        cssOrigin?: CSSOrigin;
      }

      type DateType = string | number | Date;

      type ExtensionFileOrCode =
        | ExtensionFileOrCodeC1Type
        | ExtensionFileOrCodeC2Type;

      /**
       * A plain JSON value
       */
      interface PlainJSONValue {
        [s: string]: unknown;
      }

      /**
       * The area of the document to capture, in CSS pixels, relative to the page.  If omitted, capture the visible viewport.
       */
      interface ImageDetailsRectType {
        x: number;

        y: number;

        width: number;

        height: number;
      }

      interface ExtensionFileOrCodeC1Type {
        file: Browser.Manifest.ExtensionURL;
      }

      interface ExtensionFileOrCodeC2Type {
        code: string;
      }

      interface Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.extension
     */
    namespace Extension {
      /**
       * The type of extension view.
       */
      type ViewType = "tab" | "popup" | "sidebar";

      interface GetViewsFetchPropertiesType {
        /**
         * The type of view to get. If omitted, returns all views (including background pages and tabs). Valid values: 'tab',
         * 'popup', 'sidebar'.
         * Optional.
         */
        type?: ViewType;

        /**
         * The window to restrict the search to. If omitted, returns all views.
         * Optional.
         */
        windowId?: number;

        /**
         * Find a view according to a tab id. If this field is omitted, returns all views.
         * Optional.
         */
        tabId?: number;
      }

      interface Static {
        /**
         * Returns an array of the JavaScript 'window' objects for each of the pages running inside the current extension.
         *
         * @param fetchProperties Optional.
         * @returns Array of global objects
         */
        getViews(fetchProperties?: GetViewsFetchPropertiesType): Window[];

        /**
         * Returns the JavaScript 'window' object for the background page running inside the current extension.
         * Returns null if the extension has no background page.
         */
        getBackgroundPage(): Window;

        /**
         * Retrieves the state of the extension's access to Incognito-mode (as determined by the user-controlled 'Allowed in
         * Incognito' checkbox.
         */
        isAllowedIncognitoAccess(): Promise<boolean>;

        /**
         * Retrieves the state of the extension's access to the 'file://' scheme (as determined by the user-controlled 'Allow
         * access to File URLs' checkbox.
         */
        isAllowedFileSchemeAccess(): Promise<boolean>;

        /**
         * True for content scripts running inside incognito tabs, and for extension pages running inside an incognito process.
         * The latter only applies to extensions with 'split' incognito_behavior.
         * Optional.
         */
        inIncognitoContext?: boolean;
      }
    }

    /**
     * Namespace: browser.find
     */
    namespace Find {
      interface RangeData {
        /**
         * The index of the frame containing the match. 0 corresponds to the parent window. Note that the order of objects in the
         * rangeData array will sequentially line up with the order of frame indexes: for example,
         * framePos for the first sequence of rangeData objects will be 0, framePos for the next sequence will be 1, and so on.
         */
        framePos: number;

        /**
         * The ordinal position of the text node in which the match started.
         */
        startTextNodePos: number;

        /**
         * The ordinal position of the text node in which the match ended.
         */
        endTextNodePos: number;

        /**
         * The ordinal string position of the start of the matched word within start text node.
         * If match word include in single text node, Extension can get match word between startOffset and endOffset string index
         * in the single text node.
         */
        startOffset: number;

        /**
         * The ordinal string position of the end of the matched word within end text node.
         */
        endOffset: number;
      }

      interface Rectangle {
        /**
         * Pixels from the top.
         */
        top: number;

        /**
         * Pixels from the left.
         */
        left: number;

        /**
         * Pixels from the bottom.
         */
        bottom: number;

        /**
         * Pixels from the right.
         */
        right: number;
      }

      interface RectsAndTexts {
        /**
         * Rectangles relative to the top-left of the viewport.
         */
        rectList: Rectangle[];

        /**
         * an array of strings, corresponding to the rectList array. The entry at textList[i]
         * contains the part of the match bounded by the rectangle at rectList[i].
         */
        textList: string[];
      }

      interface RectData {
        /**
         * The index of the frame containing the match. 0 corresponds to the parent window. Note that the order of objects in the
         * rangeData array will sequentially line up with the order of frame indexes: for example,
         * framePos for the first sequence of rangeData objects will be 0, framePos for the next sequence will be 1, and so on.
         */
        rectsAndTexts: RectsAndTexts;

        /**
         * The complete text of the match.
         */
        text: string;
      }

      interface FindResult {
        /**
         * The number of results found.
         */
        count: number;

        /**
         * If includeRangeData was given in the options parameter, then this property will be included.
         * It is provided as an array of RangeData objects, one for each match. Each RangeData object describes where in the DOM
         * tree the match was found. This would enable, for example, an extension to get the text surrounding each match,
         * so as to display context for the matches. The items correspond to the items given in rectData, so rangeData[i]
         * describes the same match as rectData[i].
         * Optional.
         */
        rangeData?: RangeData[];

        /**
         * If includeRectData was given in the options parameter, then this property will be included.
         * It is an array of RectData objects. It contains client rectangles for all the text matched in the search,
         * relative to the top-left of the viewport. Extensions can use this to provide custom highlighting of the results.
         * Optional.
         */
        rectData?: RectData[];
      }

      /**
       * Search parameters.
       */
      interface FindParamsType {
        /**
         * Tab to query. Defaults to the active tab.
         * Optional.
         */
        tabId?: number;

        /**
         * Find only ranges with case sensitive match.
         * Optional.
         */
        caseSensitive?: boolean;

        /**
         * Find only ranges with diacritic sensitive match.
         * Optional.
         */
        matchDiacritics?: boolean;

        /**
         * Find only ranges that match entire word.
         * Optional.
         */
        entireWord?: boolean;

        /**
         * Return rectangle data which describes visual position of search results.
         * Optional.
         */
        includeRectData?: boolean;

        /**
         * Return range data which provides range data in a serializable form.
         * Optional.
         */
        includeRangeData?: boolean;
      }

      /**
       * highlightResults parameters
       */
      interface HighlightResultsParamsType {
        /**
         * Found range to be highlighted. Default highlights all ranges.
         * Optional.
         */
        rangeIndex?: number;

        /**
         * Tab to highlight. Defaults to the active tab.
         * Optional.
         */
        tabId?: number;

        /**
         * Don't scroll to highlighted item.
         * Optional.
         */
        noScroll?: boolean;
      }

      interface Static {
        /**
         * Search for text in document and store found ranges in array, in document order.
         *
         * @param queryphrase The string to search for.
         * @param params Optional. Search parameters.
         */
        find(queryphrase: string, params?: FindParamsType): Promise<FindResult>;

        /**
         * Highlight a range
         *
         * @param params Optional. highlightResults parameters
         */
        highlightResults(params?: HighlightResultsParamsType): Promise<void>;

        /**
         * Remove all highlighting from previous searches.
         *
         * @param tabId Optional. Tab to highlight. Defaults to the active tab.
         */
        removeHighlighting(tabId?: number): Promise<void>;
      }
    }

    /**
     * Namespace: browser.geckoProfiler
     */
    namespace GeckoProfiler {
      type ProfilerFeature =
        | "java"
        | "js"
        | "mainthreadio"
        | "fileio"
        | "fileioall"
        | "nomarkerstacks"
        | "screenshots"
        | "seqstyle"
        | "stackwalk"
        | "jsallocations"
        | "nostacksampling"
        | "nativeallocations"
        | "ipcmessages"
        | "audiocallbacktracing"
        | "cpu"
        | "notimerresolutionchange"
        | "cpuallthreads"
        | "samplingallthreads"
        | "markersallthreads"
        | "unregisteredthreads"
        | "processcpu"
        | "power"
        | "responsiveness"
        | "cpufreq"
        | "bandwidth"
        | "memory"
        | "tracing"
        | "sandbox"
        | "flows";

      type supports = "windowLength";

      interface StartSettingsType {
        /**
         * The maximum size in bytes of the buffer used to store profiling data. A larger value allows capturing a profile that
         * covers a greater amount of time.
         */
        bufferSize: number;

        /**
         * The length of the window of time that's kept in the buffer. Any collected samples are discarded as soon as they are
         * older than the number of seconds specified in this setting. Zero means no duration restriction.
         * Optional.
         */
        windowLength?: number;

        /**
         * Interval in milliseconds between samples of profiling data. A smaller value will increase the detail of the profiles
         * captured.
         */
        interval: number;

        /**
         * A list of active features for the profiler.
         */
        features: ProfilerFeature[];

        /**
         * A list of thread names for which to capture profiles.
         * Optional.
         */
        threads?: string[];
      }

      interface Static {
        /**
         * Starts the profiler with the specified settings.
         */
        start(settings: StartSettingsType): void;

        /**
         * Stops the profiler and discards any captured profile data.
         */
        stop(): void;

        /**
         * Pauses the profiler, keeping any profile data that is already written.
         */
        pause(): void;

        /**
         * Resumes the profiler with the settings that were initially used to start it.
         */
        resume(): void;

        /**
         * Gathers the profile data from the current profiling session, and writes it to disk.
         * The returned promise resolves to a path that locates the created file.
         *
         * @param fileName The name of the file inside the profile/profiler directory
         */
        dumpProfileToFile(fileName: string): void;

        /**
         * Gathers the profile data from the current profiling session.
         */
        getProfile(): void;

        /**
         * Gathers the profile data from the current profiling session. The returned promise resolves to an array buffer that
         * contains a JSON string.
         */
        getProfileAsArrayBuffer(): void;

        /**
         * Gathers the profile data from the current profiling session. The returned promise resolves to an array buffer that
         * contains a gzipped JSON string.
         */
        getProfileAsGzippedArrayBuffer(): void;

        /**
         * Gets the debug symbols for a particular library.
         *
         * @param debugName The name of the library's debug file. For example, 'xul.pdb
         * @param breakpadId The Breakpad ID of the library
         */
        getSymbols(debugName: string, breakpadId: string): void;

        /**
         * Fires when the profiler starts/stops running.
         *
         * @param isRunning Whether the profiler is running or not. Pausing the profiler will not affect this value.
         */
        onRunning: Events.Event<(isRunning: boolean) => void>;
      }
    }

    /**
     * Namespace: browser.history
     */
    namespace History {
      /**
       * The $(topic:transition-types)[transition type] for this visit from its referrer.
       */
      type TransitionType =
        | "link"
        | "typed"
        | "auto_bookmark"
        | "auto_subframe"
        | "manual_subframe"
        | "generated"
        | "auto_toplevel"
        | "form_submit"
        | "reload"
        | "keyword"
        | "keyword_generated";

      /**
       * An object encapsulating one result of a history query.
       */
      interface HistoryItem {
        /**
         * The unique identifier for the item.
         */
        id: string;

        /**
         * The URL navigated to by a user.
         * Optional.
         */
        url?: string;

        /**
         * The title of the page when it was last loaded.
         * Optional.
         */
        title?: string;

        /**
         * When this page was last loaded, represented in milliseconds since the epoch.
         * Optional.
         */
        lastVisitTime?: number;

        /**
         * The number of times the user has navigated to this page.
         * Optional.
         */
        visitCount?: number;

        /**
         * The number of times the user has navigated to this page by typing in the address.
         * Optional.
         */
        typedCount?: number;
      }

      /**
       * An object encapsulating one visit to a URL.
       */
      interface VisitItem {
        /**
         * The unique identifier for the item.
         */
        id: string;

        /**
         * The unique identifier for this visit.
         */
        visitId: string;

        /**
         * When this visit occurred, represented in milliseconds since the epoch.
         * Optional.
         */
        visitTime?: number;

        /**
         * The visit ID of the referrer.
         */
        referringVisitId: string;

        /**
         * The $(topic:transition-types)[transition type] for this visit from its referrer.
         */
        transition: TransitionType;
      }

      interface SearchQueryType {
        /**
         * A free-text query to the history service.  Leave empty to retrieve all pages.
         */
        text: string;

        /**
         * Limit results to those visited after this date. If not specified, this defaults to 24 hours in the past.
         * Optional.
         */
        startTime?: ExtensionTypes.DateType;

        /**
         * Limit results to those visited before this date.
         * Optional.
         */
        endTime?: ExtensionTypes.DateType;

        /**
         * The maximum number of results to retrieve.  Defaults to 100.
         * Optional.
         */
        maxResults?: number;
      }

      interface GetVisitsDetailsType {
        /**
         * The URL for which to retrieve visit information.  It must be in the format as returned from a call to history.search.
         */
        url: string;
      }

      interface AddUrlDetailsType {
        /**
         * The URL to add. Must be a valid URL that can be added to history.
         */
        url: string;

        /**
         * The title of the page.
         * Optional.
         */
        title?: string;

        /**
         * The $(topic:transition-types)[transition type] for this visit from its referrer.
         * Optional.
         */
        transition?: TransitionType;

        /**
         * The date when this visit occurred.
         * Optional.
         */
        visitTime?: ExtensionTypes.DateType;
      }

      interface DeleteUrlDetailsType {
        /**
         * The URL to remove.
         */
        url: string;
      }

      interface DeleteRangeRangeType {
        /**
         * Items added to history after this date.
         */
        startTime: ExtensionTypes.DateType;

        /**
         * Items added to history before this date.
         */
        endTime: ExtensionTypes.DateType;
      }

      interface OnVisitRemovedRemovedType {
        /**
         * True if all history was removed.  If true, then urls will be empty.
         */
        allHistory: boolean;

        urls: string[];
      }

      interface OnTitleChangedChangedType {
        /**
         * The URL for which the title has changed
         */
        url: string;

        /**
         * The new title for the URL.
         */
        title: string;
      }

      interface Static {
        /**
         * Searches the history for the last visit time of each page matching the query.
         */
        search(query: SearchQueryType): Promise<HistoryItem[]>;

        /**
         * Retrieves information about visits to a URL.
         */
        getVisits(details: GetVisitsDetailsType): Promise<VisitItem[]>;

        /**
         * Adds a URL to the history with a default visitTime of the current time and a default $(topic:transition-types)
         * [transition type] of "link".
         */
        addUrl(details: AddUrlDetailsType): Promise<void>;

        /**
         * Removes all occurrences of the given URL from the history.
         */
        deleteUrl(details: DeleteUrlDetailsType): Promise<void>;

        /**
         * Removes all items within the specified date range from the history.  Pages will not be removed from the history unless
         * all visits fall within the range.
         */
        deleteRange(range: DeleteRangeRangeType): Promise<void>;

        /**
         * Deletes all items from the history.
         */
        deleteAll(): Promise<void>;

        /**
         * Fired when a URL is visited, providing the HistoryItem data for that URL.  This event fires before the page has loaded.
         */
        onVisited: Events.Event<(result: HistoryItem) => void>;

        /**
         * Fired when one or more URLs are removed from the history service.  When all visits have been removed the URL is purged
         * from history.
         */
        onVisitRemoved: Events.Event<
          (removed: OnVisitRemovedRemovedType) => void
        >;

        /**
         * Fired when the title of a URL is changed in the browser history.
         */
        onTitleChanged: Events.Event<
          (changed: OnTitleChangedChangedType) => void
        >;
      }
    }

    /**
     * Namespace: browser.i18n
     */
    namespace I18n {
      /**
       * An ISO language code such as <code>en</code> or <code>fr</code>. For a complete list of languages supported by this
       * method, see <a href='http://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc'>
       * kLanguageInfoTable</a>. For an unknown language, <code>und</code> will be returned, which means that [percentage]
       * of the text is unknown to CLD
       */
      type LanguageCode = string;

      /**
       * LanguageDetectionResult object that holds detected langugae reliability and array of DetectedLanguage
       */
      interface DetectLanguageCallbackResultType {
        /**
         * CLD detected language reliability
         */
        isReliable: boolean;

        /**
         * array of detectedLanguage
         */
        languages: DetectLanguageCallbackResultTypeLanguagesItemType[];
      }

      /**
       * DetectedLanguage object that holds detected ISO language code and its percentage in the input string
       */
      interface DetectLanguageCallbackResultTypeLanguagesItemType {
        language: LanguageCode;

        /**
         * The percentage of the detected language
         */
        percentage: number;
      }

      interface Static {
        /**
         * Gets the accept-languages of the browser. This is different from the locale used by the browser; to get the locale,
         * use $(ref:i18n.getUILanguage).
         */
        getAcceptLanguages(): Promise<LanguageCode[]>;

        /**
         * Gets the localized string for the specified message. If the message is missing, this method returns an empty string ('').
         * If the format of the <code>getMessage()</code> call is wrong &mdash; for example, <em>messageName</em>
         * is not a string or the <em>substitutions</em> array has more than 9 elements &mdash; this method returns <code>
         * undefined</code>.
         *
         * @param messageName The name of the message, as specified in the <code>$(topic:i18n-messages)[messages.json]</code> file.
         * @param substitutions Optional. Substitution strings, if the message requires any.
         * @returns Message localized for current locale.
         */
        getMessage(
          messageName: string,
          substitutions?: string[] | string
        ): string;

        /**
         * Gets the browser UI language of the browser. This is different from $(ref:i18n.getAcceptLanguages)
         * which returns the preferred user languages.
         *
         * @returns The browser UI language code such as en-US or fr-FR.
         */
        getUILanguage(): string;

        /**
         * Detects the language of the provided text using CLD.
         *
         * @param text User input string to be translated.
         */
        detectLanguage(text: string): Promise<DetectLanguageCallbackResultType>;
      }
    }

    /**
     * Namespace: browser.identity
     */
    namespace Identity {
      /**
       * An object encapsulating an OAuth account id.
       */
      interface AccountInfo {
        /**
         * A unique identifier for the account. This ID will not change for the lifetime of the account.
         */
        id: string;
      }

      interface LaunchWebAuthFlowDetailsType {
        url: Browser.Manifest.HttpURL;

        /**
         * Optional.
         */
        interactive?: boolean;
      }

      interface Static {
        /**
         * Starts an auth flow at the specified URL.
         */
        launchWebAuthFlow(
          details: LaunchWebAuthFlowDetailsType
        ): Promise<string>;

        /**
         * Generates a redirect URL to be used in |launchWebAuthFlow|.
         *
         * @param path Optional. The path appended to the end of the generated URL.
         */
        getRedirectURL(path?: string): string;
      }
    }

    /**
     * Namespace: browser.idle
     */
    namespace Idle {
      type IdleState = "active" | "idle" | "locked";

      interface Static {
        /**
         * Returns "idle" if the user has not generated any input for a specified number of seconds, or "active" otherwise.
         *
         * @param detectionIntervalInSeconds The system is considered idle if detectionIntervalInSeconds seconds have elapsed since
         * the last user input detected.
         */
        queryState(detectionIntervalInSeconds: number): Promise<IdleState>;

        /**
         * Sets the interval, in seconds, used to determine when the system is in an idle state for onStateChanged events.
         * The default interval is 60 seconds.
         *
         * @param intervalInSeconds Threshold, in seconds, used to determine when the system is in an idle state.
         */
        setDetectionInterval(intervalInSeconds: number): void;

        /**
         * Fired when the system changes to an active or idle state. The event fires with "idle" if the the user has not generated
         * any input for a specified number of seconds, and "active" when the user generates input on an idle system.
         */
        onStateChanged: Events.Event<(newState: IdleState) => void>;
      }
    }

    /**
     * Namespace: browser.management
     */
    namespace Management {
      /**
       * Information about an icon belonging to an extension.
       */
      interface IconInfo {
        /**
         * A number representing the width and height of the icon. Likely values include (but are not limited to) 128, 48, 24,
         * and 16.
         */
        size: number;

        /**
         * The URL for this icon image. To display a grayscale version of the icon (to indicate that an extension is disabled,
         * for example), append <code>?grayscale=true</code> to the URL.
         */
        url: string;
      }

      /**
       * A reason the item is disabled.
       */
      type ExtensionDisabledReason = "unknown" | "permissions_increase";

      /**
       * The type of this extension, 'extension' or 'theme'.
       */
      type ExtensionType = "extension" | "theme";

      /**
       * How the extension was installed. One of<br><var>development</var>: The extension was loaded unpacked in developer mode,
       * <br><var>normal</var>: The extension was installed normally via an .xpi file,<br><var>sideload</var>
       * : The extension was installed by other software on the machine,<br><var>admin</var>
       * : The extension was installed by policy,<br><var>other</var>: The extension was installed by other means.
       */
      type ExtensionInstallType =
        | "development"
        | "normal"
        | "sideload"
        | "admin"
        | "other";

      /**
       * Information about an installed extension.
       */
      interface ExtensionInfo {
        /**
         * The extension's unique identifier.
         */
        id: string;

        /**
         * The name of this extension.
         */
        name: string;

        /**
         * A short version of the name of this extension.
         * Optional.
         */
        shortName?: string;

        /**
         * The description of this extension.
         */
        description: string;

        /**
         * The <a href='manifest/version'>version</a> of this extension.
         */
        version: string;

        /**
         * The <a href='manifest/version#version_name'>version name</a> of this extension if the manifest specified one.
         * Optional.
         */
        versionName?: string;

        /**
         * Whether this extension can be disabled or uninstalled by the user.
         */
        mayDisable: boolean;

        /**
         * Whether it is currently enabled or disabled.
         */
        enabled: boolean;

        /**
         * A reason the item is disabled.
         * Optional.
         */
        disabledReason?: ExtensionDisabledReason;

        /**
         * The type of this extension, 'extension' or 'theme'.
         */
        type: ExtensionType;

        /**
         * The URL of the homepage of this extension.
         * Optional.
         */
        homepageUrl?: string;

        /**
         * The update URL of this extension.
         * Optional.
         */
        updateUrl?: string;

        /**
         * The url for the item's options page, if it has one.
         */
        optionsUrl: string;

        /**
         * A list of icon information. Note that this just reflects what was declared in the manifest,
         * and the actual image at that url may be larger or smaller than what was declared,
         * so you might consider using explicit width and height attributes on img tags referencing these images.
         * See the <a href='manifest/icons'>manifest documentation on icons</a> for more details.
         * Optional.
         */
        icons?: IconInfo[];

        /**
         * Returns a list of API based permissions.
         * Optional.
         */
        permissions?: string[];

        /**
         * Returns a list of host based permissions.
         * Optional.
         */
        hostPermissions?: string[];

        /**
         * How the extension was installed.
         */
        installType: ExtensionInstallType;
      }

      interface InstallOptionsType {
        /**
         * URL pointing to the XPI file on addons.mozilla.org or similar.
         */
        url: Browser.Manifest.HttpURL;

        /**
         * A hash of the XPI file, using sha256 or stronger.
         * Optional.
         */
        hash?: string;
      }

      interface InstallCallbackResultType {
        id: Browser.Manifest.ExtensionID;
      }

      interface UninstallSelfOptionsType {
        /**
         * Whether or not a confirm-uninstall dialog should prompt the user. Defaults to false.
         * Optional.
         */
        showConfirmDialog?: boolean;

        /**
         * The message to display to a user when being asked to confirm removal of the extension.
         * Optional.
         */
        dialogMessage?: string;
      }

      interface Static {
        /**
         * Returns a list of information about installed extensions.
         */
        getAll(): Promise<ExtensionInfo[]>;

        /**
         * Returns information about the installed extension that has the given ID.
         *
         * @param id The ID from an item of $(ref:management.ExtensionInfo).
         */
        get(id: Browser.Manifest.ExtensionID): Promise<ExtensionInfo>;

        /**
         * Installs and enables a theme extension from the given url.
         */
        install(
          options: InstallOptionsType
        ): Promise<InstallCallbackResultType>;

        /**
         * Returns information about the calling extension. Note: This function can be used without requesting the 'management'
         * permission in the manifest.
         */
        getSelf(): Promise<ExtensionInfo>;

        /**
         * Uninstalls the calling extension. Note: This function can be used without requesting the 'management' permission in the
         * manifest.
         *
         * @param options Optional.
         */
        uninstallSelf(options?: UninstallSelfOptionsType): Promise<void>;

        /**
         * Enables or disables the given add-on.
         *
         * @param id ID of the add-on to enable/disable.
         * @param enabled Whether to enable or disable the add-on.
         */
        setEnabled(id: string, enabled: boolean): Promise<void>;

        /**
         * Fired when an addon has been disabled.
         */
        onDisabled: Events.Event<(info: ExtensionInfo) => void>;

        /**
         * Fired when an addon has been enabled.
         */
        onEnabled: Events.Event<(info: ExtensionInfo) => void>;

        /**
         * Fired when an addon has been installed.
         */
        onInstalled: Events.Event<(info: ExtensionInfo) => void>;

        /**
         * Fired when an addon has been uninstalled.
         */
        onUninstalled: Events.Event<(info: ExtensionInfo) => void>;
      }
    }

    /**
     * Namespace: browser.manifest
     */
    namespace Manifest {
      /**
       * Common properties for all manifest.json files
       */
      interface ManifestBase {
        manifest_version: number;

        /**
         * The applications property is deprecated, please use 'browser_specific_settings'
         * Optional.
         */
        applications?: DeprecatedApplications;

        /**
         * Optional.
         */
        browser_specific_settings?: BrowserSpecificSettings;

        /**
         * Name must be at least 2, and should be at most 75 characters
         */
        name: string;

        /**
         * Optional.
         */
        short_name?: string;

        /**
         * Optional.
         */
        description?: string;

        /**
         * Optional.
         */
        author?: string;

        version: string;

        /**
         * Optional.
         */
        homepage_url?: string;

        /**
         * Optional.
         */
        install_origins?: string[];

        /**
         * Optional.
         */
        developer?: ManifestBaseDeveloperType;

        /**
         * In addition to the version field, which is used for update purposes, version_name can be set to a descriptive version
         * string and will be used for display purposes if present. If no version_name is present,
         * the version field will be used for display purposes as well.
         * Optional.
         */
        version_name?: string;
      }

      /**
       * Represents a WebExtension manifest.json file
       */
      interface WebExtensionManifest extends ManifestBase {
        /**
         * Optional.
         */
        minimum_chrome_version?: string;

        /**
         * Optional.
         */
        minimum_opera_version?: string;

        /**
         * Optional.
         */
        icons?: Record<string, ExtensionFileUrl>;

        /**
         * The 'split' value is not supported.
         * Optional.
         */
        incognito?: WebExtensionManifestIncognitoEnum;

        /**
         * Optional.
         */
        background?: WebExtensionManifestBackgroundType;

        /**
         * Alias property for options_ui.page, ignored when options_ui.page is set. When using this property the options page is
         * always opened in a new tab.
         * Optional.
         */
        options_page?: ExtensionURL;

        /**
         * Optional.
         */
        options_ui?: WebExtensionManifestOptionsUiType;

        /**
         * Optional.
         */
        content_scripts?: ContentScript[];

        /**
         * Optional.
         */
        content_security_policy?:
          | string
          | WebExtensionManifestContentSecurityPolicyC2Type;

        /**
         * Optional.
         */
        permissions?: PermissionOrOrigin[] | Permission[];

        /**
         * Optional.
         */
        granted_host_permissions?: boolean;

        /**
         * Optional.
         */
        host_permissions?: MatchPattern[];

        /**
         * Optional.
         */
        optional_host_permissions?: MatchPattern[];

        /**
         * Optional.
         */
        optional_permissions?: OptionalPermissionOrOrigin[];

        /**
         * Optional.
         */
        web_accessible_resources?:
          | string[]
          | WebExtensionManifestWebAccessibleResourcesC2ItemType[];

        /**
         * Optional.
         */
        hidden?: boolean;

        /**
         * Optional.
         */
        action?: ActionManifest;

        /**
         * Optional.
         */
        browser_action?: ActionManifest;

        /**
         * Optional.
         */
        chrome_settings_overrides?: WebExtensionManifestChromeSettingsOverridesType;

        /**
         * Optional.
         */
        commands?: Record<string, WebExtensionManifestCommandsType>;

        /**
         * Optional.
         */
        declarative_net_request?: WebExtensionManifestDeclarativeNetRequestType;

        /**
         * Optional.
         */
        devtools_page?: ExtensionURL;

        /**
         * Optional.
         */
        experiment_apis?: WebExtensionManifestExperimentApisType;

        /**
         * A list of protocol handler definitions.
         * Optional.
         */
        protocol_handlers?: ProtocolHandler[];

        /**
         * Optional.
         */
        default_locale?: string;

        /**
         * Optional.
         */
        l10n_resources?: string[];

        /**
         * Optional.
         */
        omnibox?: WebExtensionManifestOmniboxType;

        /**
         * Optional.
         */
        page_action?: WebExtensionManifestPageActionType;

        /**
         * Optional.
         */
        sidebar_action?: WebExtensionManifestSidebarActionType;

        /**
         * Optional.
         */
        theme_experiment?: ThemeExperiment;

        /**
         * Optional.
         */
        chrome_url_overrides?: WebExtensionManifestChromeUrlOverridesType;

        /**
         * Optional.
         */
        user_scripts?: WebExtensionManifestUserScriptsType;
      }

      /**
       * Represents a WebExtension language pack manifest.json file
       */
      interface WebExtensionLangpackManifest extends ManifestBase {
        langpack_id: string;

        languages: Record<
          string,
          WebExtensionLangpackManifestLanguagesPatternType
        >;

        /**
         * Optional.
         */
        sources?: Record<
          string,
          WebExtensionLangpackManifestSourcesPatternType
        >;
      }

      /**
       * Represents a WebExtension dictionary manifest.json file
       */
      interface WebExtensionDictionaryManifest extends ManifestBase {
        dictionaries: Record<string, string>;
      }

      interface ThemeIcons {
        /**
         * A light icon to use for dark themes
         */
        light: ExtensionURL;

        /**
         * The dark icon to use for light themes
         */
        dark: ExtensionURL;

        /**
         * The size of the icons
         */
        size: number;
      }

      type OptionalOnlyPermission = "trialML" | "userScripts";

      type OptionalPermissionNoPrompt =
        | "idle"
        | "cookies"
        | "menus.overrideContext"
        | "scripting"
        | "search"
        | "tabGroups"
        | "activeTab"
        | "webRequest"
        | "webRequestAuthProvider"
        | "webRequestBlocking"
        | "webRequestFilterResponse"
        | "webRequestFilterResponse.serviceWorkerScript";

      type OptionalPermission =
        | OptionalPermissionNoPrompt
        | "clipboardRead"
        | "clipboardWrite"
        | "geolocation"
        | "notifications"
        | "bookmarks"
        | "browserSettings"
        | "browsingData"
        | "declarativeNetRequestFeedback"
        | "devtools"
        | "downloads"
        | "downloads.open"
        | "find"
        | "history"
        | "management"
        | "pkcs11"
        | "privacy"
        | "proxy"
        | "nativeMessaging"
        | "sessions"
        | "tabs"
        | "tabHide"
        | "topSites"
        | "webNavigation"
        | "identity.email";

      type OptionalPermissionOrOrigin =
        | OptionalPermission
        | OptionalOnlyPermission
        | MatchPattern;

      type PermissionPrivileged =
        | "mozillaAddons"
        | "activityLog"
        | "networkStatus"
        | "normandyAddonStudy";

      type CommonDataCollectionPermission =
        | "authenticationInfo"
        | "bookmarksInfo"
        | "browsingActivity"
        | "financialAndPaymentInfo"
        | "healthInfo"
        | "locationInfo"
        | "personalCommunications"
        | "personallyIdentifyingInfo"
        | "searchTerms"
        | "websiteActivity"
        | "websiteContent";

      type DataCollectionPermission = CommonDataCollectionPermission | "none";

      type OptionalDataCollectionPermission =
        | CommonDataCollectionPermission
        | "technicalAndInteraction";

      type PermissionNoPrompt =
        | OptionalPermissionNoPrompt
        | PermissionPrivileged
        | "alarms"
        | "storage"
        | "unlimitedStorage"
        | "captivePortal"
        | "contextualIdentities"
        | "declarativeNetRequestWithHostAccess"
        | "dns"
        | "geckoProfiler"
        | "identity"
        | "menus"
        | "contextMenus"
        | "theme";

      type Permission =
        | PermissionNoPrompt
        | OptionalPermission
        | "declarativeNetRequest"
        | string;

      type PermissionOrOrigin = Permission | MatchPattern;

      type HttpURL = string;

      type ExtensionURL = string;

      type ExtensionFileUrl = string;

      type ImageDataOrExtensionURL = string;

      type ExtensionID = string;

      interface FirefoxSpecificProperties {
        /**
         * Optional.
         */
        id?: ExtensionID;

        /**
         * Optional.
         */
        update_url?: string;

        /**
         * Optional.
         */
        strict_min_version?: string;

        /**
         * Optional.
         */
        strict_max_version?: string;

        /**
         * Optional.
         */
        admin_install_only?: boolean;

        /**
         * Optional.
         */
        data_collection_permissions?: FirefoxSpecificPropertiesDataCollectionPermissionsType;
      }

      interface GeckoAndroidSpecificProperties {
        /**
         * Optional.
         */
        strict_min_version?: string;

        /**
         * Optional.
         */
        strict_max_version?: string;
      }

      interface DeprecatedApplications {
        /**
         * Optional.
         */
        gecko?: FirefoxSpecificProperties;
      }

      interface BrowserSpecificSettings {
        /**
         * Optional.
         */
        gecko?: FirefoxSpecificProperties;

        /**
         * Optional.
         */
        gecko_android?: GeckoAndroidSpecificProperties;
      }

      type MatchPattern =
        | "<all_urls>"
        | MatchPatternRestricted
        | MatchPatternUnestricted;

      /**
       * Same as MatchPattern above, but excludes <all_urls>
       */
      type MatchPatternRestricted = string;

      /**
       * Mostly unrestricted match patterns for privileged add-ons. This should technically be rejected for unprivileged add-ons,
       * but, reasons. The MatchPattern class will still refuse privileged schemes for those extensions.
       */
      type MatchPatternUnestricted = string;

      /**
       * Details of the script or CSS to inject. Either the code or the file property must be set,
       * but both may not be set at the same time. Based on InjectDetails, but using underscore rather than camel case naming
       * conventions.
       */
      interface ContentScript {
        matches: MatchPattern[];

        /**
         * Optional.
         */
        exclude_matches?: MatchPattern[];

        /**
         * Optional.
         */
        include_globs?: string[];

        /**
         * Optional.
         */
        exclude_globs?: string[];

        /**
         * The list of CSS files to inject
         * Optional.
         */
        css?: ExtensionURL[];

        /**
         * The list of JS files to inject
         * Optional.
         */
        js?: ExtensionURL[];

        /**
         * If allFrames is <code>true</code>, implies that the JavaScript or CSS should be injected into all frames of current page.
         * By default, it's <code>false</code> and is only injected into the top frame.
         * Optional.
         */
        all_frames?: boolean;

        /**
         * If match_about_blank is true, then the code is also injected in about:blank and about:srcdoc frames if your extension
         * has access to its parent document. Ignored if match_origin_as_fallback is specified. By default it is <code>false</code>.
         * Optional.
         */
        match_about_blank?: boolean;

        /**
         * If match_origin_as_fallback is true, then the code is also injected in about:, data:,
         * blob: when their origin matches the pattern in 'matches', even if the actual document origin is opaque (due to the use
         * of CSP sandbox or iframe sandbox). Match patterns in 'matches' must specify a wildcard path glob. By default it is <code>
         * false</code>.
         * Optional.
         */
        match_origin_as_fallback?: boolean;

        /**
         * The soonest that the JavaScript or CSS will be injected into the tab. Defaults to "document_idle".
         * Optional.
         */
        run_at?: Browser.ExtensionTypes.RunAt;

        /**
         * The JavaScript world for a script to execute within. Defaults to "ISOLATED".
         * Optional.
         */
        world?: Browser.ExtensionTypes.ExecutionWorld;
      }

      type IconPath = Record<string, ExtensionFileUrl> | ExtensionFileUrl;

      type IconImageData = Record<string, ImageData> | ImageData;

      interface ActionManifest {
        /**
         * Optional.
         */
        default_title?: string;

        /**
         * Optional.
         */
        default_icon?: IconPath;

        /**
         * Specifies icons to use for dark and light themes
         * Optional.
         */
        theme_icons?: ThemeIcons[];

        /**
         * Optional.
         */
        default_popup?: string;

        /**
         * Deprecated in Manifest V3.
         * Optional.
         */
        browser_style?: boolean;

        /**
         * Defines the location the browserAction will appear by default.  The default location is navbar.
         * Optional.
         */
        default_area?: ActionManifestDefaultAreaEnum;
      }

      type KeyName = string;

      /**
       * Represents a protocol handler definition.
       */
      interface ProtocolHandler {
        /**
         * A user-readable title string for the protocol handler. This will be displayed to the user in interface objects as needed.
         */
        name: string;

        /**
         * The protocol the site wishes to handle, specified as a string. For example, you can register to handle SMS text message
         * links by registering to handle the "sms" scheme.
         */
        protocol:
          | "bitcoin"
          | "dat"
          | "dweb"
          | "ftp"
          | "geo"
          | "gopher"
          | "im"
          | "ipfs"
          | "ipns"
          | "irc"
          | "ircs"
          | "magnet"
          | "mailto"
          | "matrix"
          | "mms"
          | "news"
          | "nntp"
          | "sip"
          | "sms"
          | "smsto"
          | "ssb"
          | "ssh"
          | "tel"
          | "urn"
          | "webcal"
          | "wtai"
          | "xmpp"
          | string;

        /**
         * The URL of the handler, as a string. This string should include "%s" as a placeholder which will be replaced with the
         * escaped URL of the document to be handled. This URL might be a true URL, or it could be a phone number, email address,
         * or so forth.
         */
        uriTemplate: ExtensionURL | HttpURL;
      }

      type ThemeColor =
        | string
        | [number, number, number]
        | [number, number, number, number];

      interface ThemeExperiment {
        /**
         * Optional.
         */
        stylesheet?: ExtensionURL;

        /**
         * Optional.
         */
        images?: ThemeExperimentImagesType;

        /**
         * Optional.
         */
        colors?: ThemeExperimentColorsType;

        /**
         * Optional.
         */
        properties?: ThemeExperimentPropertiesType;
      }

      interface ThemeType {
        /**
         * Optional.
         */
        images?: ThemeTypeImagesType;

        /**
         * Optional.
         */
        colors?: ThemeTypeColorsType;

        /**
         * Optional.
         */
        properties?: ThemeTypePropertiesType;
      }

      /**
       * Contents of manifest.json for a static theme
       */
      interface ThemeManifest extends Browser.Manifest.ManifestBase {
        theme: ThemeType;

        /**
         * Optional.
         */
        dark_theme?: ThemeType;

        /**
         * Optional.
         */
        default_locale?: string;

        /**
         * Optional.
         */
        theme_experiment?: ThemeExperiment;

        /**
         * Optional.
         */
        icons?: Record<string, string>;
      }

      interface ManifestBaseDeveloperType {
        /**
         * Optional.
         */
        name?: string;

        /**
         * Optional.
         */
        url?: string;
      }

      /**
       * The 'split' value is not supported.
       */
      type WebExtensionManifestIncognitoEnum =
        | "not_allowed"
        | "spanning"
        | "split";

      /**
       * Only supported for page/scripts; not for service_worker yet, see bug 1775574
       */
      type WebExtensionManifestBackgroundTypeEnum = "module" | "classic";

      type WebExtensionManifestBackgroundPreferredEnvironmentItemEnum =
        | "service_worker"
        | "document";

      interface WebExtensionManifestBackgroundType {
        /**
         * Optional.
         */
        service_worker?: ExtensionURL;

        /**
         * Optional.
         */
        page?: ExtensionURL;

        /**
         * Optional.
         */
        scripts?: ExtensionURL[];

        /**
         * Only supported for page/scripts; not for service_worker yet, see bug 1775574
         * Optional.
         */
        type?: WebExtensionManifestBackgroundTypeEnum;

        /**
         * Optional.
         */
        persistent?: boolean;

        /**
         * Optional.
         */
        preferred_environment?: WebExtensionManifestBackgroundPreferredEnvironmentItemEnum[];
      }

      interface WebExtensionManifestOptionsUiType {
        page: ExtensionURL;

        /**
         * Defaults to true in Manifest V2; Deprecated in Manifest V3.
         * Optional.
         */
        browser_style?: boolean;

        /**
         * chrome_style is ignored in Firefox. Its replacement (browser_style) has been deprecated.
         * Optional.
         */
        chrome_style?: boolean;

        /**
         * Optional.
         */
        open_in_tab?: boolean;
      }

      interface WebExtensionManifestContentSecurityPolicyC2Type {
        /**
         * The Content Security Policy used for extension pages.
         * Optional.
         */
        extension_pages?: string;

        /**
         * In addition, Manifest V3 disallows certain CSP modifications for `extension_pages` that were permitted in Manifest V2.
         * The `script-src`, `object-src`, and `worker-src` directives may only have the following values:
         * - `self`
         * - `none` - Any localhost source, (`http://localhost`, `http://127.0.0.1`, or any port on those domains)
         * Optional.
         */
        sandbox?: string;
      }

      interface WebExtensionManifestWebAccessibleResourcesC2ItemType {
        resources: string[];

        /**
         * Optional.
         */
        matches?: MatchPattern[];

        /**
         * Optional.
         */
        extension_ids?: Array<ExtensionID | "*">;
      }

      interface WebExtensionManifestChromeSettingsOverridesSearchProviderType {
        name: string;

        /**
         * Optional.
         */
        keyword?: string | string[];

        search_url: string;

        /**
         * Optional.
         */
        favicon_url?: string;

        /**
         * Optional.
         */
        suggest_url?: string;

        /**
         * GET parameters to the search_url as a query string.
         * Optional.
         */
        search_url_get_params?: string;

        /**
         * POST parameters to the search_url as a query string.
         * Optional.
         */
        search_url_post_params?: string;

        /**
         * GET parameters to the suggest_url as a query string.
         * Optional.
         */
        suggest_url_get_params?: string;

        /**
         * POST parameters to the suggest_url as a query string.
         * Optional.
         */
        suggest_url_post_params?: string;

        /**
         * Encoding of the search term.
         * Optional.
         */
        encoding?: string;

        /**
         * Sets the default engine to a built-in engine only.
         * Optional.
         */
        is_default?: boolean;
      }

      interface WebExtensionManifestChromeSettingsOverridesType {
        /**
         * Optional.
         */
        homepage?: string;

        /**
         * Optional.
         */
        search_provider?: WebExtensionManifestChromeSettingsOverridesSearchProviderType;
      }

      interface WebExtensionManifestCommandsSuggestedKeyType {
        /**
         * Optional.
         */
        default?: KeyName;

        /**
         * Optional.
         */
        mac?: KeyName;

        /**
         * Optional.
         */
        linux?: KeyName;

        /**
         * Optional.
         */
        windows?: KeyName;

        /**
         * Optional.
         */
        chromeos?: string;

        /**
         * Optional.
         */
        android?: string;

        /**
         * Optional.
         */
        ios?: string;
      }

      interface WebExtensionManifestCommandsType {
        /**
         * Optional.
         */
        suggested_key?: WebExtensionManifestCommandsSuggestedKeyType;

        /**
         * Optional.
         */
        description?: string;
      }

      interface WebExtensionManifestDeclarativeNetRequestRuleResourcesItemType {
        /**
         * A non-empty string uniquely identifying the ruleset. IDs beginning with '_' are reserved for internal use.
         */
        id: string;

        /**
         * Whether the ruleset is enabled by default.
         */
        enabled: boolean;

        /**
         * The path of the JSON ruleset relative to the extension directory.
         */
        path: Browser.Manifest.ExtensionURL;
      }

      interface WebExtensionManifestDeclarativeNetRequestType {
        rule_resources: WebExtensionManifestDeclarativeNetRequestRuleResourcesItemType[];
      }

      interface WebExtensionManifestExperimentApisType {
        [s: string]: Browser.Experiments.ExperimentAPI;
      }

      interface WebExtensionManifestOmniboxType {
        keyword: string;
      }

      interface WebExtensionManifestPageActionType {
        /**
         * Optional.
         */
        default_title?: string;

        /**
         * Optional.
         */
        default_icon?: IconPath;

        /**
         * Optional.
         */
        default_popup?: string;

        /**
         * Deprecated in Manifest V3.
         * Optional.
         */
        browser_style?: boolean;

        /**
         * Optional.
         */
        show_matches?: MatchPattern[];

        /**
         * Optional.
         */
        hide_matches?: MatchPatternRestricted[];

        /**
         * Optional.
         */
        pinned?: boolean;
      }

      interface WebExtensionManifestSidebarActionType {
        /**
         * Optional.
         */
        default_title?: string;

        /**
         * Optional.
         */
        default_icon?: IconPath;

        /**
         * Defaults to true in Manifest V2; Deprecated in Manifest V3.
         * Optional.
         */
        browser_style?: boolean;

        default_panel: string;

        /**
         * Whether or not the sidebar is opened at install. Default is <code>true</code>.
         * Optional.
         */
        open_at_install?: boolean;
      }

      interface WebExtensionManifestChromeUrlOverridesType {
        /**
         * Optional.
         */
        newtab?: ExtensionURL;
      }

      interface WebExtensionManifestUserScriptsType {
        /**
         * Optional.
         */
        api_script?: Browser.Manifest.ExtensionURL;
      }

      interface WebExtensionLangpackManifestLanguagesPatternType {
        chrome_resources: Record<
          string,
          ExtensionURL | Record<string, ExtensionURL>
        >;

        version: string;
      }

      interface WebExtensionLangpackManifestSourcesPatternType {
        base_path: ExtensionURL;

        /**
         * Optional.
         */
        paths?: string[];
      }

      interface FirefoxSpecificPropertiesDataCollectionPermissionsType {
        /**
         * Optional.
         */
        required?: DataCollectionPermission[];

        /**
         * Optional.
         */
        optional?: OptionalDataCollectionPermission[];
      }

      /**
       * Defines the location the browserAction will appear by default.  The default location is navbar.
       */
      type ActionManifestDefaultAreaEnum =
        | "navbar"
        | "menupanel"
        | "tabstrip"
        | "personaltoolbar";

      interface ThemeExperimentImagesType {
        [s: string]: unknown;
      }

      interface ThemeExperimentColorsType {
        [s: string]: unknown;
      }

      interface ThemeExperimentPropertiesType {
        [s: string]: unknown;
      }

      interface ThemeTypeImagesType {
        /**
         * Optional.
         */
        additional_backgrounds?: ImageDataOrExtensionURL[];

        /**
         * Optional.
         */
        theme_frame?: ImageDataOrExtensionURL;
      }

      interface ThemeTypeColorsType {
        /**
         * Optional.
         */
        tab_selected?: ThemeColor;

        /**
         * Optional.
         */
        frame?: ThemeColor;

        /**
         * Optional.
         */
        frame_inactive?: ThemeColor;

        /**
         * Optional.
         */
        tab_background_text?: ThemeColor;

        /**
         * Optional.
         */
        tab_background_separator?: ThemeColor;

        /**
         * Optional.
         */
        tab_loading?: ThemeColor;

        /**
         * Optional.
         */
        tab_text?: ThemeColor;

        /**
         * Optional.
         */
        tab_line?: ThemeColor;

        /**
         * Optional.
         */
        toolbar?: ThemeColor;

        /**
         * This color property is an alias of 'bookmark_text'.
         * Optional.
         */
        toolbar_text?: ThemeColor;

        /**
         * Optional.
         */
        bookmark_text?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_text?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_border?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_top_separator?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_bottom_separator?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_vertical_separator?: ThemeColor;

        /**
         * Optional.
         */
        icons?: ThemeColor;

        /**
         * Optional.
         */
        icons_attention?: ThemeColor;

        /**
         * Optional.
         */
        button_background_hover?: ThemeColor;

        /**
         * Optional.
         */
        button_background_active?: ThemeColor;

        /**
         * Optional.
         */
        popup?: ThemeColor;

        /**
         * Optional.
         */
        popup_text?: ThemeColor;

        /**
         * Optional.
         */
        popup_border?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_focus?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_text_focus?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_border_focus?: ThemeColor;

        /**
         * Optional.
         */
        popup_highlight?: ThemeColor;

        /**
         * Optional.
         */
        popup_highlight_text?: ThemeColor;

        /**
         * Optional.
         */
        ntp_background?: ThemeColor;

        /**
         * Optional.
         */
        ntp_card_background?: ThemeColor;

        /**
         * Optional.
         */
        ntp_text?: ThemeColor;

        /**
         * Optional.
         */
        sidebar?: ThemeColor;

        /**
         * Optional.
         */
        sidebar_border?: ThemeColor;

        /**
         * Optional.
         */
        sidebar_text?: ThemeColor;

        /**
         * Optional.
         */
        sidebar_highlight?: ThemeColor;

        /**
         * Optional.
         */
        sidebar_highlight_text?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_highlight?: ThemeColor;

        /**
         * Optional.
         */
        toolbar_field_highlight_text?: ThemeColor;
      }

      type ThemeTypePropertiesAdditionalBackgroundsAlignmentItemEnum =
        | "bottom"
        | "center"
        | "left"
        | "right"
        | "top"
        | "center bottom"
        | "center center"
        | "center top"
        | "left bottom"
        | "left center"
        | "left top"
        | "right bottom"
        | "right center"
        | "right top";

      type ThemeTypePropertiesAdditionalBackgroundsTilingItemEnum =
        | "no-repeat"
        | "repeat"
        | "repeat-x"
        | "repeat-y";

      type ThemeTypePropertiesColorSchemeEnum =
        | "auto"
        | "light"
        | "dark"
        | "system";

      type ThemeTypePropertiesContentColorSchemeEnum =
        | "auto"
        | "light"
        | "dark"
        | "system";

      interface ThemeTypePropertiesType {
        /**
         * Optional.
         */
        additional_backgrounds_alignment?: ThemeTypePropertiesAdditionalBackgroundsAlignmentItemEnum[];

        /**
         * Optional.
         */
        additional_backgrounds_tiling?: ThemeTypePropertiesAdditionalBackgroundsTilingItemEnum[];

        /**
         * Optional.
         */
        color_scheme?: ThemeTypePropertiesColorSchemeEnum;

        /**
         * Optional.
         */
        content_color_scheme?: ThemeTypePropertiesContentColorSchemeEnum;
      }

      interface Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.contextMenus
     */
    namespace ContextMenus {
      interface Static extends Menus.Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.menus
     */
    namespace Menus {
      /**
       * The different contexts a menu can appear in. Specifying 'all' is equivalent to the combination of all other contexts
       * except for 'tab' and 'tools_menu'.
       */
      type ContextType =
        | "all"
        | "page"
        | "frame"
        | "selection"
        | "link"
        | "editable"
        | "password"
        | "image"
        | "video"
        | "audio"
        | "launcher"
        | "bookmark"
        | "page_action"
        | "tab"
        | "tools_menu"
        | "browser_action"
        | "action";

      /**
       * The type of menu item.
       */
      type ItemType = "normal" | "checkbox" | "radio" | "separator";

      /**
       * Information sent when a context menu item is clicked.
       */
      interface OnClickData {
        /**
         * The ID of the menu item that was clicked.
         */
        menuItemId: number | string;

        /**
         * The parent ID, if any, for the item clicked.
         * Optional.
         */
        parentMenuItemId?: number | string;

        /**
         * The type of view where the menu is clicked. May be unset if the menu is not associated with a view.
         * Optional.
         */
        viewType?: Browser.Extension.ViewType;

        /**
         * One of 'image', 'video', or 'audio' if the context menu was activated on one of these types of elements.
         * Optional.
         */
        mediaType?: string;

        /**
         * If the element is a link, the text of that link.
         * Optional.
         */
        linkText?: string;

        /**
         * If the element is a link, the URL it points to.
         * Optional.
         */
        linkUrl?: string;

        /**
         * Will be present for elements with a 'src' URL.
         * Optional.
         */
        srcUrl?: string;

        /**
         * The URL of the page where the menu item was clicked. This property is not set if the click occured in a context where
         * there is no current page, such as in a launcher context menu.
         * Optional.
         */
        pageUrl?: string;

        /**
         * The id of the frame of the element where the context menu was clicked.
         * Optional.
         */
        frameId?: number;

        /**
         * The URL of the frame of the element where the context menu was clicked, if it was in a frame.
         * Optional.
         */
        frameUrl?: string;

        /**
         * The text for the context selection, if any.
         * Optional.
         */
        selectionText?: string;

        /**
         * A flag indicating whether the element is editable (text input, textarea, etc.).
         */
        editable: boolean;

        /**
         * A flag indicating the state of a checkbox or radio item before it was clicked.
         * Optional.
         */
        wasChecked?: boolean;

        /**
         * A flag indicating the state of a checkbox or radio item after it is clicked.
         * Optional.
         */
        checked?: boolean;

        /**
         * The id of the bookmark where the context menu was clicked, if it was on a bookmark.
         * Optional.
         */
        bookmarkId?: string;

        /**
         * An array of keyboard modifiers that were held while the menu item was clicked.
         */
        modifiers: OnClickDataModifiersItemEnum[];

        /**
         * An integer value of button by which menu item was clicked.
         * Optional.
         */
        button?: number;

        /**
         * An identifier of the clicked element, if any. Use menus.getTargetElement in the page to find the corresponding element.
         * Optional.
         */
        targetElementId?: number;
      }

      interface CreateCreatePropertiesType {
        /**
         * The type of menu item. Defaults to 'normal' if not specified.
         * Optional.
         */
        type?: ItemType;

        /**
         * The unique ID to assign to this item. Mandatory for event pages. Cannot be the same as another ID for this extension.
         * Optional.
         */
        id?: string;

        /**
         * Optional.
         */
        icons?: Record<string, string>;

        /**
         * The text to be displayed in the item; this is <em>required</em> unless <code>type</code> is 'separator'.
         * When the context is 'selection', you can use <code>%s</code> within the string to show the selected text. For example,
         * if this parameter's value is "Translate '%s' to Pig Latin" and the user selects the word "cool",
         * the context menu item for the selection is "Translate 'cool' to Pig Latin".
         * Optional.
         */
        title?: string;

        /**
         * The initial state of a checkbox or radio item: true for selected and false for unselected.
         * Only one radio item can be selected at a time in a given group of radio items.
         * Optional.
         */
        checked?: boolean;

        /**
         * List of contexts this menu item will appear in. Defaults to ['page'] if not specified.
         * Optional.
         */
        contexts?: ContextType[];

        /**
         * List of view types where the menu item will be shown. Defaults to any view, including those without a viewType.
         * Optional.
         */
        viewTypes?: Browser.Extension.ViewType[];

        /**
         * Whether the item is visible in the menu.
         * Optional.
         */
        visible?: boolean;

        /**
         * A function that will be called back when the menu item is clicked. Event pages cannot use this; instead,
         * they should register a listener for $(ref:contextMenus.onClicked).
         *
         * @param info Information about the item clicked and the context where the click happened.
         * @param tab The details of the tab where the click took place. Note: this parameter only present for extensions.
         */
        onclick?(info: OnClickData, tab: Browser.Tabs.Tab): void;

        /**
         * The ID of a parent menu item; this makes the item a child of a previously added item.
         * Optional.
         */
        parentId?: number | string;

        /**
         * Lets you restrict the item to apply only to documents whose URL matches one of the given patterns.
         * (This applies to frames as well.) For details on the format of a pattern, see $(topic:match_patterns)[Match Patterns].
         * Optional.
         */
        documentUrlPatterns?: string[];

        /**
         * Similar to documentUrlPatterns, but lets you filter based on the src attribute of img/audio/video tags and the href of
         * anchor tags.
         * Optional.
         */
        targetUrlPatterns?: string[];

        /**
         * Whether this context menu item is enabled or disabled. Defaults to true.
         * Optional.
         */
        enabled?: boolean;

        /**
         * Specifies a command to issue for the context click.
         * Optional.
         */
        command?:
          | string
          | "_execute_browser_action"
          | "_execute_page_action"
          | "_execute_sidebar_action"
          | "_execute_action"
          | "_execute_page_action"
          | "_execute_sidebar_action";
      }

      /**
       * The properties to update. Accepts the same values as the create function.
       */
      interface UpdateUpdatePropertiesType {
        /**
         * Optional.
         */
        type?: ItemType;

        /**
         * Optional.
         */
        icons?: Record<string, string>;

        /**
         * Optional.
         */
        title?: string;

        /**
         * Optional.
         */
        checked?: boolean;

        /**
         * Optional.
         */
        contexts?: ContextType[];

        /**
         * Optional.
         */
        viewTypes?: Browser.Extension.ViewType[];

        /**
         * Whether the item is visible in the menu.
         * Optional.
         */
        visible?: boolean;

        /**
         * @param tab The details of the tab where the click took place. Note: this parameter only present for extensions.
         */
        onclick?(info: OnClickData, tab: Browser.Tabs.Tab): void;

        /**
         * Note: You cannot change an item to be a child of one of its own descendants.
         * Optional.
         */
        parentId?: number | string;

        /**
         * Optional.
         */
        documentUrlPatterns?: string[];

        /**
         * Optional.
         */
        targetUrlPatterns?: string[];

        /**
         * Optional.
         */
        enabled?: boolean;
      }

      interface OverrideContextContextOptionsType {
        /**
         * Whether to also include default menu items in the menu.
         * Optional.
         */
        showDefaults?: boolean;

        /**
         * ContextType to override, to allow menu items from other extensions in the menu. Currently only 'bookmark' and 'tab' are
         * supported. showDefaults cannot be used with this option.
         * Optional.
         */
        context?: OverrideContextContextOptionsTypeContextEnum;

        /**
         * Required when context is 'bookmark'. Requires 'bookmark' permission.
         * Optional.
         */
        bookmarkId?: string;

        /**
         * Required when context is 'tab'. Requires 'tabs' permission.
         * Optional.
         */
        tabId?: number;
      }

      /**
       * Information about the context of the menu action and the created menu items. For more information about each property,
       * see OnClickData. The following properties are only set if the extension has host permissions for the given context:
       * linkUrl, linkText, srcUrl, pageUrl, frameUrl, selectionText.
       */
      interface OnShownInfoType {
        /**
         * A list of IDs of the menu items that were shown.
         */
        menuIds: Array<number | string>;

        /**
         * A list of all contexts that apply to the menu.
         */
        contexts: ContextType[];

        /**
         * Optional.
         */
        viewType?: Browser.Extension.ViewType;

        editable: boolean;

        /**
         * Optional.
         */
        mediaType?: string;

        /**
         * Optional.
         */
        linkUrl?: string;

        /**
         * Optional.
         */
        linkText?: string;

        /**
         * Optional.
         */
        srcUrl?: string;

        /**
         * Optional.
         */
        pageUrl?: string;

        /**
         * Optional.
         */
        frameUrl?: string;

        /**
         * Optional.
         */
        selectionText?: string;

        /**
         * Optional.
         */
        targetElementId?: number;
      }

      type OnClickDataModifiersItemEnum =
        | "Shift"
        | "Alt"
        | "Command"
        | "Ctrl"
        | "MacCtrl";

      /**
       * ContextType to override, to allow menu items from other extensions in the menu. Currently only 'bookmark' and 'tab' are
       * supported. showDefaults cannot be used with this option.
       */
      type OverrideContextContextOptionsTypeContextEnum = "bookmark" | "tab";

      interface Static {
        /**
         * Creates a new context menu item. Note that if an error occurs during creation, you may not find out until the creation
         * callback fires (the details will be in $(ref:runtime.lastError)).
         *
         * @param callback Optional. Called when the item has been created in the browser. If there were any problems creating the
         * item, details will be available in $(ref:runtime.lastError).
         * @returns The ID of the newly created item.
         */
        create(
          createProperties: CreateCreatePropertiesType,
          callback?: () => void
        ): number | string;

        /**
         * Updates a previously created context menu item.
         *
         * @param id The ID of the item to update.
         * @param updateProperties The properties to update. Accepts the same values as the create function.
         * @returns Called when the context menu has been updated.
         */
        update(
          id: number | string,
          updateProperties: UpdateUpdatePropertiesType
        ): Promise<void>;

        /**
         * Removes a context menu item.
         *
         * @param menuItemId The ID of the context menu item to remove.
         * @returns Called when the context menu has been removed.
         */
        remove(menuItemId: number | string): Promise<void>;

        /**
         * Removes all context menu items added by this extension.
         *
         * @returns Called when removal is complete.
         */
        removeAll(): Promise<void>;

        /**
         * Show the matching menu items from this extension instead of the default menu. This should be called during a
         * 'contextmenu' DOM event handler, and only applies to the menu that opens after this event.
         */
        overrideContext(
          contextOptions: OverrideContextContextOptionsType
        ): void;

        /**
         * Updates the extension items in the shown menu, including changes that have been made since the menu was shown.
         * Has no effect if the menu is hidden. Rebuilding a shown menu is an expensive operation,
         * only invoke this method when necessary.
         */
        refresh(): Promise<void>;

        /**
         * Retrieve the element that was associated with a recent contextmenu event.
         *
         * @param targetElementId The identifier of the clicked element, available as info.targetElementId in the menus.onShown,
         * onClicked or onclick event.
         */
        getTargetElement(targetElementId: number): Element;

        /**
         * Fired when a context menu item is clicked.
         *
         * @param info Information about the item clicked and the context where the click happened.
         * @param tab Optional. The details of the tab where the click took place. If the click did not take place in a tab,
         * this parameter will be missing.
         */
        onClicked: Events.Event<
          (info: OnClickData, tab: Browser.Tabs.Tab | undefined) => void
        >;

        /**
         * Fired when a menu is shown. The extension can add, modify or remove menu items and call menus.refresh()
         * to update the menu.
         *
         * @param info Information about the context of the menu action and the created menu items.
         * For more information about each property, see OnClickData. The following properties are only set if the extension has
         * host permissions for the given context: linkUrl, linkText, srcUrl, pageUrl, frameUrl, selectionText.
         * @param tab The details of the tab where the menu was opened.
         */
        onShown: Events.Event<
          (info: OnShownInfoType, tab: Browser.Tabs.Tab) => void
        >;

        /**
         * Fired when a menu is hidden. This event is only fired if onShown has fired before.
         */
        onHidden: Events.Event<() => void>;

        /**
         * The maximum number of top level extension items that can be added to an extension action context menu.
         * Any items beyond this limit will be ignored.
         */
        ACTION_MENU_TOP_LEVEL_LIMIT: 6;
      }
    }

    /**
     * Namespace: browser.networkStatus
     */
    namespace NetworkStatus {
      interface NetworkLinkInfo {
        /**
         * Status of the network link, if "unknown" then link is usually assumed to be "up"
         */
        status: NetworkLinkInfoStatusEnum;

        /**
         * If known, the type of network connection that is avialable.
         */
        type: NetworkLinkInfoTypeEnum;

        /**
         * If known, the network id or name.
         * Optional.
         */
        id?: string;
      }

      /**
       * Status of the network link, if "unknown" then link is usually assumed to be "up"
       */
      type NetworkLinkInfoStatusEnum = "unknown" | "up" | "down";

      /**
       * If known, the type of network connection that is avialable.
       */
      type NetworkLinkInfoTypeEnum =
        | "unknown"
        | "ethernet"
        | "usb"
        | "wifi"
        | "wimax"
        | "mobile";

      interface Static {
        /**
         * Returns the $(ref:NetworkLinkInfo) of the current network connection.
         */
        getLinkInfo(): void;

        /**
         * Fired when the network connection state changes.
         */
        onConnectionChanged: Events.Event<(details: NetworkLinkInfo) => void>;
      }
    }

    /**
     * Namespace: browser.normandyAddonStudy
     */
    namespace NormandyAddonStudy {
      interface Study {
        /**
         * The ID of the recipe for the study.
         */
        recipeId: number;

        /**
         * A slug to identify the study.
         */
        slug: string;

        /**
         * The name presented on about:studies.
         */
        userFacingName: string;

        /**
         * The description presented on about:studies.
         */
        userFacingDescription: string;

        /**
         * The study branch in which the user is enrolled.
         */
        branch: string;

        /**
         * The state of the study.
         */
        active: boolean;

        /**
         * The ID of the extension installed by the study.
         */
        addonId: string;

        /**
         * The URL of the XPI that was downloaded and installed by the study.
         */
        addonUrl: string;

        /**
         * The version of the extension installed by the study.
         */
        addonVersion: string;

        /**
         * The start date for the study.
         */
        studyStartDate: ExtensionTypes.DateType;

        /**
         * The end date for the study.
         */
        studyEndDate: ExtensionTypes.DateType;

        /**
         * The record ID for the extension in Normandy server's database.
         */
        extensionApiId: number;

        /**
         * A hash of the extension XPI file.
         */
        extensionHash: string;

        /**
         * The algorithm used to hash the extension XPI file.
         */
        extensionHashAlgorithm: string;
      }

      interface Static {
        /**
         * Returns a study object for the current study.
         */
        getStudy(): void;

        /**
         * Marks the study as ended and then uninstalls the addon.
         *
         * @param reason The reason why the study is ending.
         */
        endStudy(reason: string): void;

        /**
         * Returns an object with metadata about the client which may be required for constructing survey URLs.
         */
        getClientMetadata(): void;

        /**
         * Fired when a user unenrolls from a study but before the addon is uninstalled.
         *
         * @param reason The reason why the study is ending.
         */
        onUnenroll: Events.Event<(reason: string) => void>;
      }
    }

    /**
     * Namespace: browser.notifications
     */
    namespace Notifications {
      type TemplateType = "basic" | "image" | "list" | "progress";

      type PermissionLevel = "granted" | "denied";

      interface NotificationItem {
        /**
         * Title of one item of a list notification.
         */
        title: string;

        /**
         * Additional details about this item.
         */
        message: string;
      }

      interface CreateNotificationOptions {
        /**
         * Which type of notification to display.
         */
        type: TemplateType;

        /**
         * A URL to the sender's avatar, app icon, or a thumbnail for image notifications.
         * Optional.
         */
        iconUrl?: string;

        /**
         * A URL to the app icon mask.
         * Optional.
         */
        appIconMaskUrl?: string;

        /**
         * Title of the notification (e.g. sender name for email).
         */
        title: string;

        /**
         * Main notification content.
         */
        message: string;

        /**
         * Alternate notification content with a lower-weight font.
         * Optional.
         */
        contextMessage?: string;

        /**
         * Priority ranges from -2 to 2. -2 is lowest priority. 2 is highest. Zero is default.
         * Optional.
         */
        priority?: number;

        /**
         * A timestamp associated with the notification, in milliseconds past the epoch.
         * Optional.
         */
        eventTime?: number;

        /**
         * A URL to the image thumbnail for image-type notifications.
         * Optional.
         */
        imageUrl?: string;

        /**
         * Items for multi-item notifications.
         * Optional.
         */
        items?: NotificationItem[];

        /**
         * Current progress ranges from 0 to 100.
         * Optional.
         */
        progress?: number;

        /**
         * Whether to show UI indicating that the app will visibly respond to clicks on the body of a notification.
         * Optional.
         */
        isClickable?: boolean;
      }

      interface UpdateNotificationOptions {
        /**
         * Which type of notification to display.
         * Optional.
         */
        type?: TemplateType;

        /**
         * A URL to the sender's avatar, app icon, or a thumbnail for image notifications.
         * Optional.
         */
        iconUrl?: string;

        /**
         * A URL to the app icon mask.
         * Optional.
         */
        appIconMaskUrl?: string;

        /**
         * Title of the notification (e.g. sender name for email).
         * Optional.
         */
        title?: string;

        /**
         * Main notification content.
         * Optional.
         */
        message?: string;

        /**
         * Alternate notification content with a lower-weight font.
         * Optional.
         */
        contextMessage?: string;

        /**
         * Priority ranges from -2 to 2. -2 is lowest priority. 2 is highest. Zero is default.
         * Optional.
         */
        priority?: number;

        /**
         * A timestamp associated with the notification, in milliseconds past the epoch.
         * Optional.
         */
        eventTime?: number;

        /**
         * A URL to the image thumbnail for image-type notifications.
         * Optional.
         */
        imageUrl?: string;

        /**
         * Items for multi-item notifications.
         * Optional.
         */
        items?: NotificationItem[];

        /**
         * Current progress ranges from 0 to 100.
         * Optional.
         */
        progress?: number;

        /**
         * Whether to show UI indicating that the app will visibly respond to clicks on the body of a notification.
         * Optional.
         */
        isClickable?: boolean;
      }

      interface Static {
        /**
         * Creates and displays a notification.
         *
         * @param notificationId Optional. Identifier of the notification. If it is empty, this method generates an id.
         * If it matches an existing notification, this method first clears that notification before proceeding with the create
         * operation.
         * @param options Contents of the notification.
         */
        create(
          notificationId: string | undefined,
          options: CreateNotificationOptions
        ): Promise<string>;

        /**
         * Creates and displays a notification.
         *
         * @param options Contents of the notification.
         */
        create(options: CreateNotificationOptions): Promise<string>;

        /**
         * Clears an existing notification.
         *
         * @param notificationId The id of the notification to be updated.
         */
        clear(notificationId: string): Promise<boolean>;

        /**
         * Retrieves all the notifications.
         */
        getAll(): Promise<Record<string, CreateNotificationOptions>>;

        /**
         * Fired when the notification closed, either by the system or by user action.
         *
         * @param notificationId The notificationId of the closed notification.
         * @param byUser True if the notification was closed by the user.
         */
        onClosed: Events.Event<
          (notificationId: string, byUser: boolean) => void
        >;

        /**
         * Fired when the user clicked in a non-button area of the notification.
         *
         * @param notificationId The notificationId of the clicked notification.
         */
        onClicked: Events.Event<(notificationId: string) => void>;

        /**
         * Fired when the  user pressed a button in the notification.
         *
         * @param notificationId The notificationId of the clicked notification.
         * @param buttonIndex The index of the button clicked by the user.
         */
        onButtonClicked: Events.Event<
          (notificationId: string, buttonIndex: number) => void
        >;

        /**
         * Fired when the notification is shown.
         *
         * @param notificationId The notificationId of the shown notification.
         */
        onShown: Events.Event<(notificationId: string) => void>;
      }
    }

    /**
     * Namespace: browser.omnibox
     */
    namespace Omnibox {
      /**
       * The style type.
       */
      type DescriptionStyleType = "url" | "match" | "dim";

      /**
       * The window disposition for the omnibox query. This is the recommended context to display results. For example,
       * if the omnibox command is to navigate to a certain URL, a disposition of 'newForegroundTab' means the navigation should
       * take place in a new selected tab.
       */
      type OnInputEnteredDisposition =
        | "currentTab"
        | "newForegroundTab"
        | "newBackgroundTab";

      /**
       * A suggest result.
       */
      interface SuggestResult {
        /**
         * The text that is put into the URL bar, and that is sent to the extension when the user chooses this entry.
         */
        content: string;

        /**
         * The text that is displayed in the URL dropdown. Can contain XML-style markup for styling.
         * The supported tags are 'url' (for a literal URL), 'match' (for highlighting text that matched what the user's query),
         * and 'dim' (for dim helper text). The styles can be nested, eg. <dim><match>dimmed match</match></dim>.
         * You must escape the five predefined entities to display them as text: stackoverflow.com/a/1091953/89484
         */
        description: string;

        /**
         * Whether the suggest result can be deleted by the user.
         * Optional.
         */
        deletable?: boolean;
      }

      /**
       * A suggest result.
       */
      interface DefaultSuggestResult {
        /**
         * The text that is displayed in the URL dropdown.
         */
        description: string;
      }

      interface Static {
        /**
         * Sets the description and styling for the default suggestion. The default suggestion is the text that is displayed in the
         * first suggestion row underneath the URL bar.
         *
         * @param suggestion A partial SuggestResult object, without the 'content' parameter.
         */
        setDefaultSuggestion(suggestion: DefaultSuggestResult): void;

        /**
         * User has started a keyword input session by typing the extension's keyword. This is guaranteed to be sent exactly once
         * per input session, and before any onInputChanged events.
         */
        onInputStarted: Events.Event<() => void>;

        /**
         * User has changed what is typed into the omnibox.
         *
         * @param suggest A callback passed to the onInputChanged event used for sending suggestions back to the browser.
         */
        onInputChanged: Events.Event<
          (
            text: string,
            suggest: (suggestResults: SuggestResult[]) => void
          ) => void
        >;

        /**
         * User has accepted what is typed into the omnibox.
         */
        onInputEntered: Events.Event<
          (text: string, disposition: OnInputEnteredDisposition) => void
        >;

        /**
         * User has ended the keyword input session without accepting the input.
         */
        onInputCancelled: Events.Event<() => void>;

        /**
         * User has deleted a suggested result.
         */
        onDeleteSuggestion: Events.Event<(text: string) => void>;
      }
    }

    /**
     * Namespace: browser.pageAction
     */
    namespace PageAction {
      /**
       * Pixel data for an image. Must be an ImageData object (for example, from a <code>canvas</code> element).
       */
      interface ImageDataType extends ImageData {
        [s: string]: unknown;
      }

      /**
       * Information sent when a page action is clicked.
       */
      interface OnClickData {
        /**
         * An array of keyboard modifiers that were held while the menu item was clicked.
         */
        modifiers: OnClickDataModifiersItemEnum[];

        /**
         * An integer value of button by which menu item was clicked.
         * Optional.
         */
        button?: number;
      }

      interface IsShownDetailsType {
        /**
         * Specify the tab to get the shownness from.
         */
        tabId: number;
      }

      interface SetTitleDetailsType {
        /**
         * The id of the tab for which you want to modify the page action.
         */
        tabId: number;

        /**
         * The tooltip string.
         */
        title: string | null;
      }

      interface GetTitleDetailsType {
        /**
         * Specify the tab to get the title from.
         */
        tabId: number;
      }

      interface SetIconDetailsType {
        /**
         * The id of the tab for which you want to modify the page action.
         */
        tabId: number;

        /**
         * Either an ImageData object or a dictionary {size -> ImageData} representing icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.imageData = foo' is equivalent to 'details.
         * imageData = {'19': foo}'
         * Optional.
         */
        imageData?: ImageDataType | Record<string, ImageDataType>;

        /**
         * Either a relative image path or a dictionary {size -> relative image path} pointing to icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.path = foo' is equivalent to 'details.imageData = {'19': foo}'
         * Optional.
         */
        path?: string | Record<string, string>;
      }

      interface SetPopupDetailsType {
        /**
         * The id of the tab for which you want to modify the page action.
         */
        tabId: number;

        /**
         * The html file to show in a popup.  If set to the empty string (''), no popup is shown.
         */
        popup: string | null;
      }

      interface GetPopupDetailsType {
        /**
         * Specify the tab to get the popup from.
         */
        tabId: number;
      }

      type OnClickDataModifiersItemEnum =
        | "Shift"
        | "Alt"
        | "Command"
        | "Ctrl"
        | "MacCtrl";

      interface Static {
        /**
         * Shows the page action. The page action is shown whenever the tab is selected.
         *
         * @param tabId The id of the tab for which you want to modify the page action.
         */
        show(tabId: number): Promise<void>;

        /**
         * Hides the page action.
         *
         * @param tabId The id of the tab for which you want to modify the page action.
         */
        hide(tabId: number): Promise<void>;

        /**
         * Checks whether the page action is shown.
         */
        isShown(details: IsShownDetailsType): Promise<boolean>;

        /**
         * Sets the title of the page action. This is displayed in a tooltip over the page action.
         */
        setTitle(details: SetTitleDetailsType): void;

        /**
         * Gets the title of the page action.
         */
        getTitle(details: GetTitleDetailsType): Promise<string>;

        /**
         * Sets the icon for the page action. The icon can be specified either as the path to an image file or as the pixel data
         * from a canvas element, or as dictionary of either one of those. Either the <b>path</b> or the <b>imageData</b>
         * property must be specified.
         */
        setIcon(details: SetIconDetailsType): Promise<void>;

        /**
         * Sets the html document to be opened as a popup when the user clicks on the page action's icon.
         */
        setPopup(details: SetPopupDetailsType): Promise<void>;

        /**
         * Gets the html document set as the popup for this page action.
         */
        getPopup(details: GetPopupDetailsType): Promise<string>;

        /**
         * Opens the extension page action in the active window.
         */
        openPopup(): Promise<void>;

        /**
         * Fired when a page action icon is clicked.  This event will not fire if the page action has a popup.
         *
         * @param info Optional.
         */
        onClicked: Events.Event<
          (tab: Browser.Tabs.Tab, info: OnClickData | undefined) => void
        >;
      }
    }

    /**
     * Namespace: browser.permissions
     */
    namespace Permissions {
      interface Permissions {
        /**
         * Optional.
         */
        permissions?: Array<
          | Browser.Manifest.OptionalPermission
          | Browser.Manifest.OptionalOnlyPermission
        >;

        /**
         * Optional.
         */
        origins?: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        data_collection?: Browser.Manifest.OptionalDataCollectionPermission[];
      }

      interface AnyPermissions {
        /**
         * Optional.
         */
        permissions?: Array<
          Browser.Manifest.Permission | Browser.Manifest.OptionalOnlyPermission
        >;

        /**
         * Optional.
         */
        origins?: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        data_collection?: Browser.Manifest.OptionalDataCollectionPermission[];
      }

      interface Static {
        /**
         * Get a list of all the extension's permissions.
         */
        getAll(): Promise<AnyPermissions>;

        /**
         * Check if the extension has the given permissions.
         */
        contains(permissions: AnyPermissions): Promise<boolean>;

        /**
         * Request the given permissions.
         */
        request(permissions: Permissions): Promise<boolean>;

        /**
         * Relinquish the given permissions.
         */
        remove(permissions: Permissions): Promise<boolean>;

        /**
         * Fired when the extension acquires new permissions.
         */
        onAdded: Events.Event<(permissions: Permissions) => void>;

        /**
         * Fired when permissions are removed from the extension.
         */
        onRemoved: Events.Event<(permissions: Permissions) => void>;
      }
    }

    /**
     * Namespace: browser.pkcs11
     */
    namespace Pkcs11 {
      interface Token {
        /**
         * Name of the token.
         */
        name: string;

        /**
         * Name of the token's manufacturer.
         */
        manufacturer: string;

        /**
         * Hardware version, as a PKCS #11 version number (two 32-bit integers separated with a dot, like "1.0".
         */
        HWVersion: string;

        /**
         * Firmware version, as a PKCS #11 version number (two 32-bit integers separated with a dot, like "1.0".
         */
        FWVersion: string;

        /**
         * Serial number, whose format is defined by the token specification.
         */
        serial: string;

        /**
         * true if the token is logged on already, false otherwise.
         */
        isLoggedIn: boolean;
      }

      interface ModuleSlot {
        /**
         * The name of the slot.
         */
        name: string;

        /**
         * The token of the slot.
         */
        token: Token | null;
      }

      interface Static {
        /**
         * checks whether a PKCS#11 module, given by name, is installed
         */
        isModuleInstalled(name: string): Promise<boolean>;

        /**
         * Install a PKCS#11 module with a given name
         *
         * @param flags Optional.
         */
        installModule(name: string, flags?: number): Promise<void>;

        /**
         * Remove an installed PKCS#11 module from firefox
         */
        uninstallModule(name: string): Promise<void>;

        /**
         * Enumerate a module's slots, each with their name and whether a token is present
         */
        getModuleSlots(name: string): Promise<undefined>;
      }
    }

    /**
     * Namespace: browser.privacy
     */
    namespace Privacy {
      interface Static {
        network: Network.Static;
        services: Services.Static;
        websites: Websites.Static;
      }
    }

    /**
     * Namespace: browser.proxy
     */
    namespace Proxy {
      /**
       * An object which describes proxy settings.
       */
      interface ProxyConfig {
        /**
         * The type of proxy to use.
         * Optional.
         */
        proxyType?: ProxyConfigProxyTypeEnum;

        /**
         * The address of the http proxy, can include a port.
         * Optional.
         */
        http?: string;

        /**
         * Use the http proxy server for all protocols.
         * Optional.
         */
        httpProxyAll?: boolean;

        /**
         * The address of the ssl proxy, can include a port.
         * Optional.
         */
        ssl?: string;

        /**
         * The address of the socks proxy, can include a port.
         * Optional.
         */
        socks?: string;

        /**
         * The version of the socks proxy.
         * Optional.
         */
        socksVersion?: number;

        /**
         * A list of hosts which should not be proxied.
         * Optional.
         */
        passthrough?: string;

        /**
         * A URL to use to configure the proxy.
         * Optional.
         */
        autoConfigUrl?: string;

        /**
         * Do not prompt for authentication if password is saved.
         * Optional.
         */
        autoLogin?: boolean;

        /**
         * Proxy DNS when using SOCKS. DNS queries get leaked to the network when set to false. True by default for SOCKS v5.
         * False by default for SOCKS v4.
         * Optional.
         */
        proxyDNS?: boolean;

        /**
         * If true (the default value), do not use newer TLS protocol features that might have interoperability problems on the
         * Internet. This is intended only for use with critical infrastructure like the updates,
         * and is only available to privileged addons.
         * Optional.
         */
        respectBeConservative?: boolean;
      }

      interface OnRequestDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: Browser.WebRequest.ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * Indicates if this response was fetched from disk cache.
         */
        fromCache: boolean;

        /**
         * The HTTP request headers that are going to be sent out with this request.
         * Optional.
         */
        requestHeaders?: Browser.WebRequest.HttpHeaders;

        /**
         * Url classification if the request has been classified.
         */
        urlClassification: Browser.WebRequest.UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;
      }

      interface OnErrorErrorType {
        [s: string]: unknown;
      }

      /**
       * The type of proxy to use.
       */
      type ProxyConfigProxyTypeEnum =
        | "none"
        | "autoDetect"
        | "system"
        | "manual"
        | "autoConfig";

      /**
       * Fired when proxy data is needed for a request.
       */
      interface OnRequestEvent
        extends Events.Event<(details: OnRequestDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnRequestDetailsType) => void,
          filter: Browser.WebRequest.RequestFilter,
          extraInfoSpec?: string[]
        ): void;
      }

      interface Static {
        /**
         * Fired when proxy data is needed for a request.
         */
        onRequest: OnRequestEvent;

        /**
         * Notifies about errors caused by the invalid use of the proxy API.
         */
        onError: Events.Event<(error: OnErrorErrorType) => void>;

        /**
         * Configures proxy settings. This setting's value is an object of type ProxyConfig.
         */
        settings: Browser.Types.Setting;
      }
    }

    /**
     * Namespace: browser.runtime
     */
    namespace Runtime {
      /**
       * A filter to match against existing extension context. Matching contexts must match all specified filters.
       */
      interface ContextFilter {
        /**
         * Optional.
         */
        contextIds?: string[];

        /**
         * Optional.
         */
        contextTypes?: ContextType[];

        /**
         * Optional.
         */
        documentIds?: string[];

        /**
         * Optional.
         */
        documentOrigins?: string[];

        /**
         * Optional.
         */
        documentUrls?: string[];

        /**
         * Optional.
         */
        frameIds?: number[];

        /**
         * Optional.
         */
        tabIds?: number[];

        /**
         * Optional.
         */
        windowIds?: number[];

        /**
         * Optional.
         */
        incognito?: boolean;
      }

      /**
       * The type of extension view.
       */
      type ContextType = "BACKGROUND" | "POPUP" | "SIDE_PANEL" | "TAB";

      /**
       * A context hosting extension content
       */
      interface ExtensionContext {
        /**
         * An unique identifier associated to this context
         */
        contextId: string;

        /**
         * The type of the context
         */
        contextType: ContextType;

        /**
         * The origin of the document associated with this context, or undefined if it is not hosted in a document
         * Optional.
         */
        documentOrigin?: string;

        /**
         * The URL of the document associated with this context, or undefined if it is not hosted in a document
         * Optional.
         */
        documentUrl?: string;

        /**
         * Whether the context is associated with an private browsing context.
         */
        incognito: boolean;

        /**
         * The frame ID for this context, or -1 if it is not hosted in a frame.
         */
        frameId: number;

        /**
         * The tab ID for this context, or -1 if it is not hosted in a tab.
         */
        tabId: number;

        /**
         * The window ID for this context, or -1 if it is not hosted in a window.
         */
        windowId: number;
      }

      /**
       * An object which allows two way communication with other pages.
       */
      interface Port {
        name: string;

        disconnect(): void;

        onDisconnect: Events.Event<(port: Port) => void>;

        onMessage: Events.Event<(message: unknown, port: Port) => void>;

        /**
         * Send a message to the other end. This takes one argument, which is a JSON object representing the message to send.
         * It will be delivered to any script listening to the port's onMessage event, or to the native application if this port
         * is connected to a native application.
         */
        postMessage(message: unknown): void;

        /**
         * This property will <b>only</b> be present on ports passed to onConnect/onConnectExternal listeners.
         * Optional.
         */
        sender?: MessageSender;

        /**
         * If the port was disconnected due to an error, this will be set to an object with a string property message,
         * giving you more information about the error. See onDisconnect.
         * Optional.
         */
        error?: PortErrorType;
      }

      /**
       * An object containing information about the script context that sent a message or request.
       */
      interface MessageSender {
        /**
         * The $(ref:tabs.Tab) which opened the connection, if any. This property will <strong>only</strong>
         * be present when the connection was opened from a tab (including content scripts), and <strong>only</strong>
         * if the receiver is an extension, not an app.
         * Optional.
         */
        tab?: Browser.Tabs.Tab;

        /**
         * The $(topic:frame_ids)[frame] that opened the connection. 0 for top-level frames, positive for child frames.
         * This will only be set when <code>tab</code> is set.
         * Optional.
         */
        frameId?: number;

        /**
         * The ID of the extension or app that opened the connection, if any.
         * Optional.
         */
        id?: string;

        /**
         * The URL of the page or frame that opened the connection. If the sender is in an iframe,
         * it will be iframe's URL not the URL of the page which hosts it.
         * Optional.
         */
        url?: string;

        /**
         * The worldId of the USER_SCRIPT world that sent the message. Only present on onUserScriptMessage and onUserScriptConnect
         * (in port.sender) events.
         * Optional.
         */
        userScriptWorldId?: string;
      }

      /**
       * The operating system the browser is running on.
       */
      type PlatformOs =
        | "mac"
        | "win"
        | "android"
        | "cros"
        | "linux"
        | "openbsd";

      /**
       * The machine's processor architecture.
       */
      type PlatformArch =
        | "aarch64"
        | "arm"
        | "ppc64"
        | "s390x"
        | "sparc64"
        | "x86-32"
        | "x86-64"
        | "noarch";

      /**
       * An object containing information about the current platform.
       */
      interface PlatformInfo {
        /**
         * The operating system the browser is running on.
         */
        os: PlatformOs;

        /**
         * The machine's processor architecture.
         */
        arch: PlatformArch;
      }

      /**
       * An object containing information about the current browser.
       */
      interface BrowserInfo {
        /**
         * The name of the browser, for example 'Firefox'.
         */
        name: string;

        /**
         * The name of the browser vendor, for example 'Mozilla'.
         */
        vendor: string;

        /**
         * The browser's version, for example '42.0.0' or '0.8.1pre'.
         */
        version: string;

        /**
         * The browser's build ID/date, for example '20160101'.
         */
        buildID: string;
      }

      /**
       * Result of the update check.
       */
      type RequestUpdateCheckStatus =
        | "throttled"
        | "no_update"
        | "update_available";

      /**
       * The reason that this event is being dispatched.
       */
      type OnInstalledReason = "install" | "update" | "browser_update";

      /**
       * The reason that the event is being dispatched. 'app_update' is used when the restart is needed because the application
       * is updated to a newer version. 'os_update' is used when the restart is needed because the browser/OS is updated to a
       * newer version. 'periodic' is used when the system runs for more than the permitted uptime set in the enterprise policy.
       */
      type OnRestartRequiredReason = "app_update" | "os_update" | "periodic";

      /**
       * The performance warning event category, e.g. 'content_script'.
       */
      type OnPerformanceWarningCategory = "content_script";

      /**
       * The performance warning event severity. Will be 'high' for serious and user-visible issues.
       */
      type OnPerformanceWarningSeverity = "low" | "medium" | "high";

      /**
       * The third parameter is a function to call (at most once) when you have a response.
       * The argument should be any JSON-ifiable object. If you have more than one <code>onMessage</code>
       * listener in the same document, then only one may send a response. <code>sendResponse</code>
       * becomes invalid when the event listener returns, unless you return true from the event listener to indicate you wish to
       * send a response asynchronously (this will keep the message channel open to the other end until <code>sendResponse</code>
       * is called).
       */
      type OnMessageListenerCallback = (
        message: unknown,
        sender: MessageSender,
        sendResponse: (response: unknown) => void
      ) => true;

      /**
       * The return value should be a promise of any JSON-ifiable object. If you have more than one <code>onMessage</code>
       * listener in the same document, then only one may send a response.
       */
      type OnMessageListenerAsync = (
        message: unknown,
        sender: MessageSender
      ) => Promise<unknown>;

      type OnMessageListenerNoResponse = (
        message: unknown,
        sender: MessageSender
      ) => void;

      type OnMessageListener =
        | OnMessageListenerCallback
        | OnMessageListenerAsync
        | OnMessageListenerNoResponse;

      /**
       * If an update is available, this contains more information about the available update.
       */
      interface RequestUpdateCheckCallbackDetailsType {
        /**
         * The version of the available update.
         */
        version: string;
      }

      interface ConnectConnectInfoType {
        /**
         * Will be passed into onConnect for processes that are listening for the connection event.
         * Optional.
         */
        name?: string;

        /**
         * Whether the TLS channel ID will be passed into onConnectExternal for processes that are listening for the connection
         * event.
         * Optional.
         */
        includeTlsChannelId?: boolean;
      }

      interface SendMessageOptionsType {
        [s: string]: unknown;
      }

      interface OnInstalledDetailsType {
        /**
         * The reason that this event is being dispatched.
         */
        reason: OnInstalledReason;

        /**
         * Indicates the previous version of the extension, which has just been updated. This is present only if 'reason' is
         * 'update'.
         * Optional.
         */
        previousVersion?: string;

        /**
         * Indicates whether the addon is installed as a temporary extension.
         */
        temporary: boolean;
      }

      /**
       * The manifest details of the available update.
       */
      interface OnUpdateAvailableDetailsType {
        /**
         * The version number of the available update.
         */
        version: string;
      }

      interface OnPerformanceWarningDetailsType {
        /**
         * The performance warning event category, e.g. 'content_script'.
         */
        category: OnPerformanceWarningCategory;

        /**
         * The performance warning event severity, e.g. 'high'.
         */
        severity: OnPerformanceWarningSeverity;

        /**
         * The $(ref:tabs.Tab) that the performance warning relates to, if any.
         * Optional.
         */
        tabId?: number;

        /**
         * An explanation of what the warning means, and hopefully how to address it.
         */
        description: string;
      }

      /**
       * This will be defined during an API method callback if there was an error
       */
      interface PropertyLastErrorType {
        /**
         * Details about the error which occurred.
         * Optional.
         */
        message?: string;
      }

      /**
       * If the port was disconnected due to an error, this will be set to an object with a string property message,
       * giving you more information about the error. See onDisconnect.
       */
      interface PortErrorType {
        message: string;
      }

      interface Static {
        /**
         * Retrieves the JavaScript 'window' object for the background page running inside the current extension/app.
         * If the background page is an event page, the system will ensure it is loaded before calling the callback.
         * If there is no background page, an error is set.
         */
        getBackgroundPage(): Promise<Window>;

        /**
         * Fetches information about active contexts associated with this extension
         *
         * @param filter A filter to find matching context.
         */
        getContexts(filter: ContextFilter): Promise<ExtensionContext[]>;

        /**
         * <p>Open your Extension's options page, if possible.</p><p>The precise behavior may depend on your manifest's <code>
         * $(topic:optionsV2)[options_ui]</code> or <code>$(topic:options)[options_page]</code> key,
         * or what the browser happens to support at the time.</p><p>If your Extension does not declare an options page,
         * or the browser failed to create one for some other reason, the callback will set $(ref:lastError).</p>
         */
        openOptionsPage(): Promise<void>;

        /**
         * Returns details about the app or extension from the manifest. The object returned is a serialization of the full
         * $(topic:manifest)[manifest file].
         *
         * @returns The manifest details.
         */
        getManifest(): Browser.Manifest.WebExtensionManifest;

        /**
         * Converts a relative path within an app/extension install directory to a fully-qualified URL.
         *
         * @param path A path to a resource within an app/extension expressed relative to its install directory.
         * @returns The fully-qualified URL to the resource.
         */
        getURL(path: string): string;

        /**
         * Get the frameId of any window global or frame element.
         *
         * @param target A WindowProxy or a Browsing Context container element (IFrame, Frame, Embed, Object) for the target frame.
         * @returns The frameId of the target frame, or -1 if it doesn't exist.
         */
        getFrameId(target: unknown): number;

        /**
         * Sets the URL to be visited upon uninstallation. This may be used to clean up server-side data, do analytics,
         * and implement surveys. Maximum 1023 characters.
         *
         * @param url Optional. URL to be opened after the extension is uninstalled. This URL must have an http: or https: scheme.
         * Set an empty string to not open a new tab upon uninstallation.
         * @returns Called when the uninstall URL is set. If the given URL is invalid, $(ref:runtime.lastError) will be set.
         */
        setUninstallURL(url?: string): Promise<void>;

        /**
         * Reloads the app or extension.
         */
        reload(): void;

        /**
         * Requests an update check for this app/extension.
         */
        requestUpdateCheck(): Promise<
          [RequestUpdateCheckStatus, RequestUpdateCheckCallbackDetailsType]
        >;

        /**
         * Attempts to connect to connect listeners within an extension/app (such as the background page), or other extensions/apps.
         * This is useful for content scripts connecting to their extension processes, inter-app/extension communication,
         * and $(topic:manifest/externally_connectable)[web messaging]. Note that this does not connect to any listeners in a
         * content script. Extensions may connect to content scripts embedded in tabs via $(ref:tabs.connect).
         *
         * @param extensionId Optional. The ID of the extension or app to connect to. If omitted,
         * a connection will be attempted with your own extension. Required if sending messages from a web page for
         * $(topic:manifest/externally_connectable)[web messaging].
         * @param connectInfo Optional.
         * @returns Port through which messages can be sent and received. The port's $(ref:runtime.Port onDisconnect)
         * event is fired if the extension/app does not exist.
         */
        connect(
          extensionId?: string,
          connectInfo?: ConnectConnectInfoType
        ): Port;

        /**
         * Attempts to connect to connect listeners within an extension/app (such as the background page), or other extensions/apps.
         * This is useful for content scripts connecting to their extension processes, inter-app/extension communication,
         * and $(topic:manifest/externally_connectable)[web messaging]. Note that this does not connect to any listeners in a
         * content script. Extensions may connect to content scripts embedded in tabs via $(ref:tabs.connect).
         *
         * @param connectInfo Optional.
         * @returns Port through which messages can be sent and received. The port's $(ref:runtime.Port onDisconnect)
         * event is fired if the extension/app does not exist.
         */
        connect(connectInfo?: ConnectConnectInfoType): Port;

        /**
         * Connects to a native application in the host machine.
         *
         * @param application The name of the registered application to connect to.
         * @returns Port through which messages can be sent and received with the application
         */
        connectNative(application: string): Port;

        /**
         * Sends a single message to event listeners within your extension/app or a different extension/app.
         * Similar to $(ref:runtime.connect) but only sends a single message, with an optional response.
         * If sending to your extension, the $(ref:runtime.onMessage) event will be fired in each page, or $(ref:runtime.
         * onMessageExternal), if a different extension. Note that extensions cannot send messages to content scripts using this
         * method. To send messages to content scripts, use $(ref:tabs.sendMessage).
         *
         * @param extensionId Optional. The ID of the extension/app to send the message to. If omitted,
         * the message will be sent to your own extension/app. Required if sending messages from a web page for
         * $(topic:manifest/externally_connectable)[web messaging].
         * @param options Optional.
         */
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        sendMessage<TMessage = unknown, TResponse = unknown>(
          extensionId: string | undefined,
          message: TMessage,
          options?: SendMessageOptionsType
        ): Promise<TResponse>;

        /**
         * Sends a single message to event listeners within your extension/app or a different extension/app.
         * Similar to $(ref:runtime.connect) but only sends a single message, with an optional response.
         * If sending to your extension, the $(ref:runtime.onMessage) event will be fired in each page, or $(ref:runtime.
         * onMessageExternal), if a different extension. Note that extensions cannot send messages to content scripts using this
         * method. To send messages to content scripts, use $(ref:tabs.sendMessage).
         *
         * @param options Optional.
         */
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        sendMessage<TMessage = unknown, TResponse = unknown>(
          message: TMessage,
          options?: SendMessageOptionsType
        ): Promise<TResponse>;

        /**
         * Send a single message to a native application.
         *
         * @param application The name of the native messaging host.
         * @param message The message that will be passed to the native messaging host.
         */
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        sendNativeMessage<TMessage = unknown, TResponse = unknown>(
          application: string,
          message: TMessage
        ): Promise<TResponse>;

        /**
         * Returns information about the current browser.
         *
         * @returns Called with results
         */
        getBrowserInfo(): Promise<BrowserInfo>;

        /**
         * Returns information about the current platform.
         *
         * @returns Called with results
         */
        getPlatformInfo(): Promise<PlatformInfo>;

        /**
         * Fired when a profile that has this extension installed first starts up. This event is not fired for incognito profiles.
         */
        onStartup: Events.Event<() => void>;

        /**
         * Fired when the extension is first installed, when the extension is updated to a new version,
         * and when the browser is updated to a new version.
         */
        onInstalled: Events.Event<(details: OnInstalledDetailsType) => void>;

        /**
         * Sent to the event page just before it is unloaded. This gives the extension opportunity to do some clean up.
         * Note that since the page is unloading, any asynchronous operations started while handling this event are not guaranteed
         * to complete. If more activity for the event page occurs before it gets unloaded the onSuspendCanceled event will be sent
         * and the page won't be unloaded.
         */
        onSuspend: Events.Event<() => void>;

        /**
         * Sent after onSuspend to indicate that the app won't be unloaded after all.
         */
        onSuspendCanceled: Events.Event<() => void>;

        /**
         * Fired when an update is available, but isn't installed immediately because the app is currently running.
         * If you do nothing, the update will be installed the next time the background page gets unloaded,
         * if you want it to be installed sooner you can explicitly call $(ref:runtime.reload).
         * If your extension is using a persistent background page, the background page of course never gets unloaded,
         * so unless you call $(ref:runtime.reload) manually in response to this event the update will not get installed until the
         * next time the browser itself restarts. If no handlers are listening for this event,
         * and your extension has a persistent background page, it behaves as if $(ref:runtime.reload)
         * is called in response to this event.
         *
         * @param details The manifest details of the available update.
         */
        onUpdateAvailable: Events.Event<
          (details: OnUpdateAvailableDetailsType) => void
        >;

        /**
         * Fired when a connection is made from either an extension process or a content script.
         */
        onConnect: Events.Event<(port: Port) => void>;

        /**
         * Fired when a connection is made from a USER_SCRIPT world registered through the userScripts API.
         */
        onUserScriptConnect: Events.Event<(port: Port) => void>;

        /**
         * Fired when a connection is made from another extension.
         */
        onConnectExternal: Events.Event<(port: Port) => void>;

        /**
         * Fired when a message is sent from either an extension process or a content script.
         */
        onMessage: Events.Event<OnMessageListener>;

        /**
         * Fired when a message is sent from another extension/app. Cannot be used in a content script.
         */
        onMessageExternal: Events.Event<OnMessageListener>;

        /**
         * Fired when a message is sent from a USER_SCRIPT world registered through the userScripts API.
         */
        onUserScriptMessage: Events.Event<OnMessageListener>;

        /**
         * Fired when a runtime performance issue is detected with the extension. Observe this event to be proactively notified of
         * runtime performance problems with the extension.
         */
        onPerformanceWarning: Events.Event<
          (details: OnPerformanceWarningDetailsType) => void
        >;

        /**
         * This will be defined during an API method callback if there was an error
         * Optional.
         */
        lastError?: PropertyLastErrorType;

        /**
         * The ID of the extension/app.
         */
        id: string;
      }
    }

    /**
     * Namespace: browser.scripting
     */
    namespace Scripting {
      /**
       * Details of a script injection
       */
      interface ScriptInjection {
        /**
         * The arguments to curry into a provided function. This is only valid if the <code>func</code> parameter is specified.
         * These arguments must be JSON-serializable.
         * Optional.
         */
        args?: unknown[];

        /**
         * The path of the JS files to inject, relative to the extension's root directory. Exactly one of <code>files</code>
         * and <code>func</code> must be specified.
         * Optional.
         */
        files?: string[];

        /**
         * A JavaScript function to inject. This function will be serialized, and then deserialized for injection.
         * This means that any bound parameters and execution context will be lost. Exactly one of <code>files</code> and <code>
         * func</code> must be specified.
         *
         * @param ...args The arguments
         * @returns The return value
         */
        func?(...args: unknown[]): unknown;

        /**
         * Details specifying the target into which to inject the script.
         */
        target: InjectionTarget;

        /**
         * Optional.
         */
        world?: ExecutionWorld;

        /**
         * Whether the injection should be triggered in the target as soon as possible (but not necessarily prior to page load).
         * Optional.
         */
        injectImmediately?: boolean;
      }

      /**
       * Result of a script injection.
       */
      interface InjectionResult {
        /**
         * The frame ID associated with the injection.
         */
        frameId: number;

        /**
         * The result of the script execution.
         * Optional.
         */
        result?: unknown;

        /**
         * The error property is set when the script execution failed. The value is typically an (Error)
         * object with a message property, but could be any value (including primitives and undefined)
         * if the script threw or rejected with such a value.
         * Optional.
         */
        error?: unknown;

        /**
         * Whether the script should inject into all frames within the tab. Defaults to false.
         * This must not be true if frameIds is specified.
         * Optional.
         */
        allFrames?: boolean;
      }

      /**
       * Details of the script to insert.
       */
      interface InjectionTarget {
        /**
         * The IDs of specific frames to inject into.
         * Optional.
         */
        frameIds?: number[];

        /**
         * Whether the script should inject into all frames within the tab. Defaults to false.
         * This must not be true if frameIds is specified.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * The ID of the tab into which to inject.
         */
        tabId: number;
      }

      interface CSSInjection {
        /**
         * A string containing the CSS to inject. Exactly one of <code>files</code> and <code>css</code> must be specified.
         * Optional.
         */
        css?: string;

        /**
         * The path of the CSS files to inject, relative to the extension's root directory. Exactly one of <code>files</code>
         * and <code>css</code> must be specified.
         * Optional.
         */
        files?: string[];

        /**
         * The style origin for the injection. Defaults to <code>'AUTHOR'</code>.
         * Optional.
         */
        origin?: CSSInjectionOriginEnum;

        /**
         * Details specifying the target into which to inject the CSS.
         */
        target: InjectionTarget;
      }

      interface ContentScriptFilter {
        /**
         * The IDs of specific scripts to retrieve with <code>getRegisteredContentScripts()</code> or to unregister with <code>
         * unregisterContentScripts()</code>.
         * Optional.
         */
        ids?: string[];
      }

      /**
       * The JavaScript world for a script to execute within. <code>ISOLATED</code> is the default execution environment of
       * content scripts, <code>MAIN</code> is the web page's execution environment.
       */
      type ExecutionWorld = "ISOLATED" | "MAIN";

      interface RegisteredContentScript {
        /**
         * If specified true, it will inject into all frames, even if the frame is not the top-most frame in the tab.
         * Each frame is checked independently for URL requirements; it will not inject into child frames if the URL requirements
         * are not met. Defaults to false, meaning that only the top frame is matched.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * Excludes pages that this content script would otherwise be injected into.
         * Optional.
         */
        excludeMatches?: string[];

        /**
         * The id of the content script, specified in the API call.
         */
        id: string;

        /**
         * The list of JavaScript files to be injected into matching pages. These are injected in the order they appear in this
         * array.
         * Optional.
         */
        js?: Browser.Manifest.ExtensionURL[];

        /**
         * Specifies which pages this content script will be injected into. Must be specified for <code>registerContentScripts()
         * </code>.
         * Optional.
         */
        matches?: string[];

        /**
         * If matchOriginAsFallback is true, then the code is also injected in about:, data:,
         * blob: when their origin matches the pattern in 'matches', even if the actual document origin is opaque (due to the use
         * of CSP sandbox or iframe sandbox). Match patterns in 'matches' must specify a wildcard path glob. By default it is <code>
         * false</code>.
         * Optional.
         */
        matchOriginAsFallback?: boolean;

        /**
         * Specifies when JavaScript files are injected into the web page. The preferred and default value is <code>
         * document_idle</code>.
         * Optional.
         */
        runAt?: Browser.ExtensionTypes.RunAt;

        /**
         * The JavaScript world for a script to execute within. Defaults to "ISOLATED".
         * Optional.
         */
        world?: ExecutionWorld;

        /**
         * Specifies if this content script will persist into future sessions. This is currently NOT supported.
         * Optional.
         */
        persistAcrossSessions?: boolean;

        /**
         * The list of CSS files to be injected into matching pages. These are injected in the order they appear in this array.
         * Optional.
         */
        css?: Browser.Manifest.ExtensionURL[];
      }

      /**
       * The origin for a style change. See style origins for more info.
       *
       * "AUTHOR": The author origin is the style origin which contains all of the styles which are part of the document,
       * whether embedded within the HTML or loaded from an external stylesheet file.
       * "USER": The user origin is the style origin containing any CSS that the user of the web browser has added.
       * These may be from adding styles using a developer tool or from a browser extension that automatically applies custom
       * styles to content, such as Stylus or Stylish.
       */
      type StyleOrigin = "AUTHOR" | "USER";

      /**
       * Details of the css to insert.
       */
      interface CSSInjection {
        /**
         * A string containing the CSS to inject. Exactly one of files and css must be specified.
         * Optional.
         */
        css?: string;

        /**
         * The path of the CSS files to inject, relative to the extension's root directory. NOTE: Currently a maximum of one file
         * is supported. Exactly one of files and css must be specified.
         * Optional.
         */
        files?: string[];

        /**
         * The style origin for the injection. Defaults to 'AUTHOR'.
         * Optional.
         */
        origin?: StyleOrigin;

        /**
         * Details specifying the target into which to insert the CSS.
         */
        target: InjectionTarget;
      }

      interface UpdateContentScriptsScriptsItemType
        extends RegisteredContentScript {
        /**
         * Specifies if this content script will persist into future sessions.
         * Optional.
         */
        persistAcrossSessions?: boolean;
      }

      /**
       * The style origin for the injection. Defaults to <code>'AUTHOR'</code>.
       */
      type CSSInjectionOriginEnum = "USER" | "AUTHOR";

      interface Static {
        /**
         * Injects a script into a target context. The script will be run at <code>document_idle</code>.
         *
         * @param injection The details of the script which to inject.
         * @returns Invoked upon completion of the injection. The resulting array contains the result of execution for each frame
         * where the injection succeeded.
         */
        executeScript(injection: ScriptInjection): Promise<InjectionResult[]>;

        /**
         * Inserts a CSS stylesheet into a target context. If multiple frames are specified, unsuccessful injections are ignored.
         *
         * @param injection The details of the styles to insert.
         * @returns Invoked upon completion of the injection.
         */
        insertCSS(injection: CSSInjection): Promise<void>;

        /**
         * Removes a CSS stylesheet that was previously inserted by this extension from a target context.
         *
         * @param injection The details of the styles to remove. Note that the <code>css</code>, <code>files</code>, and <code>
         * origin</code> properties must exactly match the stylesheet inserted through <code>insertCSS</code>.
         * Attempting to remove a non-existent stylesheet is a no-op.
         * @returns Invoked upon completion of the injection.
         */
        removeCSS(injection: CSSInjection): Promise<void>;

        /**
         * Registers one or more content scripts for this extension.
         *
         * @param scripts Contains a list of scripts to be registered. If there are errors during script parsing/file validation,
         * or if the IDs specified already exist, then no scripts are registered.
         * @returns Invoked upon completion of the registration.
         */
        registerContentScripts(
          scripts: RegisteredContentScript[]
        ): Promise<void>;

        /**
         * Returns all dynamically registered content scripts for this extension that match the given filter.
         *
         * @param filter Optional. An object to filter the extension's dynamically registered scripts.
         * @returns The resulting array contains the registered content scripts.
         */
        getRegisteredContentScripts(
          filter?: ContentScriptFilter
        ): Promise<RegisteredContentScript[]>;

        /**
         * Unregisters one or more content scripts for this extension.
         *
         * @param filter Optional. If specified, only unregisters dynamic content scripts which match the filter. Otherwise,
         * all of the extension's dynamic content scripts are unregistered.
         * @returns Invoked upon completion of the unregistration.
         */
        unregisterContentScripts(filter?: ContentScriptFilter): Promise<void>;

        /**
         * Updates one or more content scripts for this extension.
         *
         * @param scripts Contains a list of scripts to be updated. If there are errors during script parsing/file validation,
         * or if the IDs specified do not already exist, then no scripts are updated.
         * @returns Invoked when scripts have been updated.
         */
        updateContentScripts(
          scripts: UpdateContentScriptsScriptsItemType[]
        ): Promise<void>;
      }
    }

    /**
     * Namespace: browser.search
     */
    namespace Search {
      /**
       * An object encapsulating a search engine
       */
      interface SearchEngine {
        name: string;

        isDefault: boolean;

        /**
         * Optional.
         */
        alias?: string;

        /**
         * Optional.
         */
        favIconUrl?: string;
      }

      /**
       * Location where search results should be displayed.
       */
      type Disposition = "CURRENT_TAB" | "NEW_TAB" | "NEW_WINDOW";

      interface SearchSearchPropertiesType {
        /**
         * Terms to search for.
         */
        query: string;

        /**
         * Search engine to use. Uses the default if not specified.
         * Optional.
         */
        engine?: string;

        /**
         * Location where search results should be displayed. NEW_TAB is the default.
         * Optional.
         */
        disposition?: Disposition;

        /**
         * The ID of the tab for the search results. If not specified, a new tab is created, unless disposition is set.
         * tabId cannot be used with disposition.
         * Optional.
         */
        tabId?: number;
      }

      interface QueryQueryInfoType {
        /**
         * String to query with the default search provider.
         */
        text: string;

        /**
         * Location where search results should be displayed. CURRENT_TAB is the default.
         * Optional.
         */
        disposition?: Disposition;

        /**
         * Location where search results should be displayed. tabId cannot be used with disposition.
         * Optional.
         */
        tabId?: number;
      }

      interface Static {
        /**
         * Gets a list of search engines.
         *
         * @returns A Promise that will be fulfilled with an array of search engine objects.
         */
        get(): Promise<SearchEngine[]>;

        /**
         * Perform a search.
         */
        search(searchProperties: SearchSearchPropertiesType): Promise<void>;

        /**
         * Use the chrome.search API to search via the default provider.
         */
        query(queryInfo: QueryQueryInfoType): Promise<void>;
      }
    }

    /**
     * Namespace: browser.sessions
     */
    namespace Sessions {
      interface Filter {
        /**
         * The maximum number of entries to be fetched in the requested list. Omit this parameter to fetch the maximum number of
         * entries ($(ref:sessions.MAX_SESSION_RESULTS)).
         * Optional.
         */
        maxResults?: number;
      }

      interface Session {
        /**
         * The time when the window or tab was closed or modified, represented in milliseconds since the epoch.
         */
        lastModified: number;

        /**
         * The $(ref:tabs.Tab), if this entry describes a tab. Either this or $(ref:sessions.Session.window) will be set.
         * Optional.
         */
        tab?: Browser.Tabs.Tab;

        /**
         * The $(ref:windows.Window), if this entry describes a window. Either this or $(ref:sessions.Session.tab) will be set.
         * Optional.
         */
        window?: Browser.Windows.Window;
      }

      interface Device {
        info: string;

        /**
         * The name of the foreign device.
         */
        deviceName: string;

        /**
         * A list of open window sessions for the foreign device, sorted from most recently to least recently modified session.
         */
        sessions: Session[];
      }

      interface Static {
        /**
         * Forget a recently closed tab.
         *
         * @param windowId The windowId of the window to which the recently closed tab to be forgotten belongs.
         * @param sessionId The sessionId (closedId) of the recently closed tab to be forgotten.
         */
        forgetClosedTab(windowId: number, sessionId: string): Promise<void>;

        /**
         * Forget a recently closed window.
         *
         * @param sessionId The sessionId (closedId) of the recently closed window to be forgotten.
         */
        forgetClosedWindow(sessionId: string): Promise<void>;

        /**
         * Gets the list of recently closed tabs and/or windows.
         *
         * @param filter Optional.
         */
        getRecentlyClosed(filter?: Filter): Promise<Session[]>;

        /**
         * Reopens a $(ref:windows.Window) or $(ref:tabs.Tab), with an optional callback to run when the entry has been restored.
         *
         * @param sessionId Optional. The $(ref:windows.Window.sessionId), or $(ref:tabs.Tab.sessionId) to restore.
         * If this parameter is not specified, the most recently closed session is restored.
         */
        restore(sessionId?: string): Promise<Session>;

        /**
         * Set a key/value pair on a given tab.
         *
         * @param tabId The id of the tab that the key/value pair is being set on.
         * @param key The key which corresponds to the value being set.
         * @param value The value being set.
         */
        setTabValue(tabId: number, key: string, value: unknown): Promise<void>;

        /**
         * Retrieve a value that was set for a given key on a given tab.
         *
         * @param tabId The id of the tab whose value is being retrieved from.
         * @param key The key which corresponds to the value.
         */
        getTabValue(tabId: number, key: string): Promise<unknown>;

        /**
         * Remove a key/value pair that was set on a given tab.
         *
         * @param tabId The id of the tab whose key/value pair is being removed.
         * @param key The key which corresponds to the value.
         */
        removeTabValue(tabId: number, key: string): Promise<void>;

        /**
         * Set a key/value pair on a given window.
         *
         * @param windowId The id of the window that the key/value pair is being set on.
         * @param key The key which corresponds to the value being set.
         * @param value The value being set.
         */
        setWindowValue(
          windowId: number,
          key: string,
          value: unknown
        ): Promise<void>;

        /**
         * Retrieve a value that was set for a given key on a given window.
         *
         * @param windowId The id of the window whose value is being retrieved from.
         * @param key The key which corresponds to the value.
         */
        getWindowValue(windowId: number, key: string): Promise<unknown>;

        /**
         * Remove a key/value pair that was set on a given window.
         *
         * @param windowId The id of the window whose key/value pair is being removed.
         * @param key The key which corresponds to the value.
         */
        removeWindowValue(windowId: number, key: string): Promise<void>;

        /**
         * Fired when recently closed tabs and/or windows are changed. This event does not monitor synced sessions changes.
         */
        onChanged: Events.Event<() => void>;

        /**
         * The maximum number of $(ref:sessions.Session) that will be included in a requested list.
         */
        MAX_SESSION_RESULTS: 25;
      }
    }

    /**
     * Namespace: browser.sidebarAction
     */
    namespace SidebarAction {
      /**
       * Pixel data for an image. Must be an ImageData object (for example, from a <code>canvas</code> element).
       */
      interface ImageDataType extends ImageData {
        [s: string]: unknown;
      }

      interface SetTitleDetailsType {
        /**
         * The string the sidebar action should display when moused over.
         */
        title: string | null;

        /**
         * Sets the sidebar title for the tab specified by tabId. Automatically resets when the tab is closed.
         * Optional.
         */
        tabId?: number;

        /**
         * Sets the sidebar title for the window specified by windowId.
         * Optional.
         */
        windowId?: number;
      }

      interface GetTitleDetailsType {
        /**
         * Specify the tab to get the title from. If no tab nor window is specified, the global title is returned.
         * Optional.
         */
        tabId?: number;

        /**
         * Specify the window to get the title from. If no tab nor window is specified, the global title is returned.
         * Optional.
         */
        windowId?: number;
      }

      interface SetIconDetailsType {
        /**
         * Either an ImageData object or a dictionary {size -> ImageData} representing icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.imageData = foo' is equivalent to 'details.
         * imageData = {'19': foo}'
         * Optional.
         */
        imageData?: ImageDataType | Record<string, ImageDataType>;

        /**
         * Either a relative image path or a dictionary {size -> relative image path} pointing to icon to be set.
         * If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density.
         * If the number of image pixels that fit into one screen space unit equals <code>scale</code>, then image with size <code>
         * scale</code> * 19 will be selected. Initially only scales 1 and 2 will be supported.
         * At least one image must be specified. Note that 'details.path = foo' is equivalent to 'details.imageData = {'19': foo}'
         * Optional.
         */
        path?: string | SetIconDetailsTypePathC2Type;

        /**
         * Sets the sidebar icon for the tab specified by tabId. Automatically resets when the tab is closed.
         * Optional.
         */
        tabId?: number;

        /**
         * Sets the sidebar icon for the window specified by windowId.
         * Optional.
         */
        windowId?: number;
      }

      interface SetPanelDetailsType {
        /**
         * Sets the sidebar url for the tab specified by tabId. Automatically resets when the tab is closed.
         * Optional.
         */
        tabId?: number;

        /**
         * Sets the sidebar url for the window specified by windowId.
         * Optional.
         */
        windowId?: number;

        /**
         * The url to the html file to show in a sidebar.  If set to the empty string (''), no sidebar is shown.
         */
        panel: string | null;
      }

      interface GetPanelDetailsType {
        /**
         * Specify the tab to get the panel from. If no tab nor window is specified, the global panel is returned.
         * Optional.
         */
        tabId?: number;

        /**
         * Specify the window to get the panel from. If no tab nor window is specified, the global panel is returned.
         * Optional.
         */
        windowId?: number;
      }

      interface IsOpenDetailsType {
        /**
         * Specify the window to get the openness from.
         * Optional.
         */
        windowId?: number;
      }

      interface SetIconDetailsTypePathC2Type {
        [s: string]: unknown;
      }

      interface Static {
        /**
         * Sets the title of the sidebar action. This shows up in the tooltip.
         */
        setTitle(details: SetTitleDetailsType): Promise<void>;

        /**
         * Gets the title of the sidebar action.
         */
        getTitle(details: GetTitleDetailsType): Promise<string>;

        /**
         * Sets the icon for the sidebar action. The icon can be specified either as the path to an image file or as the pixel data
         * from a canvas element, or as dictionary of either one of those. Either the <strong>path</strong> or the <strong>
         * imageData</strong> property must be specified.
         */
        setIcon(details: SetIconDetailsType): Promise<void>;

        /**
         * Sets the url to the html document to be opened in the sidebar when the user clicks on the sidebar action's icon.
         */
        setPanel(details: SetPanelDetailsType): Promise<void>;

        /**
         * Gets the url to the html document set as the panel for this sidebar action.
         */
        getPanel(details: GetPanelDetailsType): Promise<string>;

        /**
         * Opens the extension sidebar in the active window.
         */
        open(): Promise<void>;

        /**
         * Closes the extension sidebar in the active window if the sidebar belongs to the extension.
         */
        close(): Promise<void>;

        /**
         * Toggles the extension sidebar in the active window.
         */
        toggle(): Promise<void>;

        /**
         * Checks whether the sidebar action is open.
         */
        isOpen(details: IsOpenDetailsType): Promise<boolean>;
      }
    }

    /**
     * Namespace: browser.storage
     */
    namespace Storage {
      interface StorageChange {
        /**
         * The old value of the item, if there was an old value.
         * Optional.
         */
        oldValue?: unknown;

        /**
         * The new value of the item, if there is a new value.
         * Optional.
         */
        newValue?: unknown;
      }

      interface StorageArea {
        /**
         * Gets one or more items from storage.
         *
         * @param keys Optional. A single key to get, list of keys to get, or a dictionary specifying default values (see
         * description of the object).  An empty list or object will return an empty result object.  Pass in <code>null</code>
         * to get the entire contents of storage.
         * @returns Callback with storage items, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        get(
          keys?: null | string | string[] | Record<string, unknown>
        ): Promise<Record<string, unknown>>;

        /**
         * Sets multiple items.
         *
         * @param items <p>An object which gives each key/value pair to update storage with. Any other key/value pairs in storage
         * will not be affected.</p><p>Primitive values such as numbers will serialize as expected. Values with a <code>
         * typeof</code> <code>"object"</code> and <code>"function"</code> will typically serialize to <code>{}</code>,
         * with the exception of <code>Array</code> (serializes as expected), <code>Date</code>, and <code>Regex</code>
         * (serialize using their <code>String</code> representation).</p>
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        set(items: Record<string, unknown>): Promise<void>;

        /**
         * Removes one or more items from storage.
         *
         * @param keys A single key or a list of keys for items to remove.
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        remove(keys: string | string[]): Promise<void>;

        /**
         * Removes all items from storage.
         *
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        clear(): Promise<void>;

        /**
         * Fired when one or more items change.
         *
         * @param changes Object mapping each key that changed to its corresponding $(ref:storage.StorageChange) for that item.
         */
        onChanged: Events.Event<
          (changes: StorageAreaOnChangedChangesType) => void
        >;
      }

      interface StorageAreaWithUsage {
        /**
         * Gets one or more items from storage.
         *
         * @param keys Optional. A single key to get, list of keys to get, or a dictionary specifying default values (see
         * description of the object).  An empty list or object will return an empty result object.  Pass in <code>null</code>
         * to get the entire contents of storage.
         * @returns Callback with storage items, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        get(
          keys?: null | string | string[] | Record<string, unknown>
        ): Promise<Record<string, unknown>>;

        /**
         * Gets the amount of space (in bytes) being used by one or more items.
         *
         * @param keys Optional. A single key or list of keys to get the total usage for. An empty list will return 0.
         * Pass in <code>null</code> to get the total usage of all of storage.
         * @returns Callback with the amount of space being used by storage, or on failure (in which case $(ref:runtime.lastError)
         * will be set).
         */
        getBytesInUse(keys?: null | string | string[]): Promise<number>;

        /**
         * Sets multiple items.
         *
         * @param items <p>An object which gives each key/value pair to update storage with. Any other key/value pairs in storage
         * will not be affected.</p><p>Primitive values such as numbers will serialize as expected. Values with a <code>
         * typeof</code> <code>"object"</code> and <code>"function"</code> will typically serialize to <code>{}</code>,
         * with the exception of <code>Array</code> (serializes as expected), <code>Date</code>, and <code>Regex</code>
         * (serialize using their <code>String</code> representation).</p>
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        set(items: Record<string, unknown>): Promise<void>;

        /**
         * Removes one or more items from storage.
         *
         * @param keys A single key or a list of keys for items to remove.
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        remove(keys: string | string[]): Promise<void>;

        /**
         * Removes all items from storage.
         *
         * @returns Callback on success, or on failure (in which case $(ref:runtime.lastError) will be set).
         */
        clear(): Promise<void>;

        /**
         * Fired when one or more items change.
         *
         * @param changes Object mapping each key that changed to its corresponding $(ref:storage.StorageChange) for that item.
         */
        onChanged: Events.Event<
          (changes: StorageAreaWithUsageOnChangedChangesType) => void
        >;
      }

      /**
       * Object mapping each key that changed to its corresponding $(ref:storage.StorageChange) for that item.
       */
      interface StorageAreaOnChangedChangesType {
        [s: string]: StorageChange;
      }

      /**
       * Object mapping each key that changed to its corresponding $(ref:storage.StorageChange) for that item.
       */
      interface StorageAreaWithUsageOnChangedChangesType {
        [s: string]: StorageChange;
      }

      interface Static {
        /**
         * Fired when one or more items change.
         *
         * @param changes Object mapping each key that changed to its corresponding $(ref:storage.StorageChange) for that item.
         * @param areaName The name of the storage area (<code>"sync"</code>, <code>"local"</code> or <code>"managed"</code>)
         * the changes are for.
         */
        onChanged: Events.Event<
          (changes: Record<string, StorageChange>, areaName: string) => void
        >;

        /**
         * Items in the <code>sync</code> storage area are synced by the browser.
         */
        sync: StorageAreaWithUsage;

        /**
         * Items in the <code>local</code> storage area are local to each machine.
         */
        local: StorageArea;

        /**
         * Items in the <code>managed</code> storage area are set by administrators or native applications,
         * and are read-only for the extension; trying to modify this namespace results in an error.
         */
        managed: StorageArea;

        /**
         * Items in the <code>session</code> storage area are kept in memory, and only until the either browser or extension is
         * closed or reloaded.
         */
        session: StorageAreaWithUsage;
      }
    }

    /**
     * Namespace: browser.tabGroups
     */
    namespace TabGroups {
      /**
       * The group's color, using 'grey' spelling for compatibility with Chromium.
       */
      type Color =
        | "blue"
        | "cyan"
        | "grey"
        | "green"
        | "orange"
        | "pink"
        | "purple"
        | "red"
        | "yellow";

      /**
       * State of a tab group inside of an open window.
       */
      interface TabGroup {
        /**
         * Whether the tab group is collapsed or expanded in the tab strip.
         */
        collapsed: boolean;

        /**
         * User-selected color name for the tab group's label/icons.
         */
        color: Color;

        /**
         * Unique ID of the tab group.
         */
        id: number;

        /**
         * User-defined name of the tab group.
         * Optional.
         */
        title?: string;

        /**
         * Window that the tab group is in.
         */
        windowId: number;
      }

      interface MoveMovePropertiesType {
        index: number;

        /**
         * Optional.
         */
        windowId?: number;
      }

      interface QueryQueryInfoType {
        /**
         * Optional.
         */
        collapsed?: boolean;

        /**
         * Optional.
         */
        color?: Color;

        /**
         * Optional.
         */
        title?: string;

        /**
         * Optional.
         */
        windowId?: number;
      }

      interface UpdateUpdatePropertiesType {
        /**
         * Optional.
         */
        collapsed?: boolean;

        /**
         * Optional.
         */
        color?: Color;

        /**
         * Optional.
         */
        title?: string;
      }

      interface OnRemovedRemoveInfoType {
        /**
         * True when the tab group is being closed because its window is being closed.
         */
        isWindowClosing: boolean;
      }

      interface Static {
        /**
         * Retrieves details about the specified group.
         */
        get(groupId: number): Promise<TabGroup>;

        /**
         * Move a group within, or to another window.
         */
        move(
          groupId: number,
          moveProperties: MoveMovePropertiesType
        ): Promise<TabGroup>;

        /**
         * Return all grups, or find groups with specified properties.
         */
        query(queryInfo: QueryQueryInfoType): Promise<TabGroup[]>;

        /**
         * Modifies state of a specified group.
         */
        update(
          groupId: number,
          updateProperties: UpdateUpdatePropertiesType
        ): Promise<TabGroup>;

        /**
         * Fired when a tab group is created.
         */
        onCreated: Events.Event<(group: TabGroup) => void>;

        /**
         * Fired when a tab group is moved, within a window or to another window.
         */
        onMoved: Events.Event<(group: TabGroup) => void>;

        /**
         * Fired when a tab group is removed.
         */
        onRemoved: Events.Event<
          (group: TabGroup, removeInfo: OnRemovedRemoveInfoType) => void
        >;

        /**
         * Fired when a tab group is updated.
         */
        onUpdated: Events.Event<(group: TabGroup) => void>;

        /**
         * An ID that represents the absence of a group.
         */
        TAB_GROUP_ID_NONE: -1;
      }
    }

    /**
     * Namespace: browser.tabs
     */
    namespace Tabs {
      /**
       * An event that caused a muted state change.
       *
       * "user": A user input action has set/overridden the muted state.
       * "capture": Tab capture started, forcing a muted state change.
       * "extension": An extension, identified by the extensionId field, set the muted state.
       */
      type MutedInfoReason = "user" | "capture" | "extension";

      /**
       * Tab muted state and the reason for the last state change.
       */
      interface MutedInfo {
        /**
         * Whether the tab is prevented from playing sound (but hasn't necessarily recently produced sound).
         * Equivalent to whether the muted audio indicator is showing.
         */
        muted: boolean;

        /**
         * The reason the tab was muted or unmuted. Not set if the tab's mute state has never been changed.
         * Optional.
         */
        reason?: MutedInfoReason;

        /**
         * The ID of the extension that changed the muted state. Not set if an extension was not the reason the muted state last
         * changed.
         * Optional.
         */
        extensionId?: string;
      }

      /**
       * Tab sharing state for screen, microphone and camera.
       */
      interface SharingState {
        /**
         * If the tab is sharing the screen the value will be one of "Screen", "Window", or "Application",
         * or undefined if not screen sharing.
         * Optional.
         */
        screen?: string;

        /**
         * True if the tab is using the camera.
         */
        camera: boolean;

        /**
         * True if the tab is using the microphone.
         */
        microphone: boolean;
      }

      interface Tab {
        /**
         * The ID of the tab. Tab IDs are unique within a browser session. Under some circumstances a Tab may not be assigned an ID,
         * for example when querying foreign tabs using the $(ref:sessions) API, in which case a session ID may be present.
         * Tab ID can also be set to $(ref:tabs.TAB_ID_NONE) for apps and devtools windows.
         * Optional.
         */
        id?: number;

        /**
         * The zero-based index of the tab within its window.
         */
        index: number;

        /**
         * The ID of the window the tab is contained within.
         * Optional.
         */
        windowId?: number;

        /**
         * The ID of the tab that opened this tab, if any. This property is only present if the opener tab still exists.
         * Optional.
         */
        openerTabId?: number;

        /**
         * Whether the tab is highlighted. Works as an alias of active
         */
        highlighted: boolean;

        /**
         * Whether the tab is active in its window. (Does not necessarily mean the window is focused.)
         */
        active: boolean;

        /**
         * Whether the tab is pinned.
         */
        pinned: boolean;

        /**
         * The last time the tab was accessed as the number of milliseconds since epoch.
         * Optional.
         */
        lastAccessed?: number;

        /**
         * Whether the tab has produced sound over the past couple of seconds (but it might not be heard if also muted).
         * Equivalent to whether the speaker audio indicator is showing.
         * Optional.
         */
        audible?: boolean;

        /**
         * Whether the tab can be discarded automatically by the browser when resources are low.
         * Optional.
         */
        autoDiscardable?: boolean;

        /**
         * Current tab muted state and the reason for the last state change.
         * Optional.
         */
        mutedInfo?: MutedInfo;

        /**
         * The URL the tab is displaying. This property is only present if the extension's manifest includes the <code>"tabs"</code>
         * permission.
         * Optional.
         */
        url?: string;

        /**
         * The title of the tab. This property is only present if the extension's manifest includes the <code>"tabs"</code>
         * permission.
         * Optional.
         */
        title?: string;

        /**
         * The URL of the tab's favicon. This property is only present if the extension's manifest includes the <code>"tabs"</code>
         * permission. It may also be an empty string if the tab is loading.
         * Optional.
         */
        favIconUrl?: string;

        /**
         * Either <em>loading</em> or <em>complete</em>.
         * Optional.
         */
        status?: string;

        /**
         * True while the tab is not loaded with content.
         * Optional.
         */
        discarded?: boolean;

        /**
         * Whether the tab is in an incognito window.
         */
        incognito: boolean;

        /**
         * The width of the tab in pixels.
         * Optional.
         */
        width?: number;

        /**
         * The height of the tab in pixels.
         * Optional.
         */
        height?: number;

        /**
         * True if the tab is hidden.
         * Optional.
         */
        hidden?: boolean;

        /**
         * The session ID used to uniquely identify a Tab obtained from the $(ref:sessions) API.
         * Optional.
         */
        sessionId?: string;

        /**
         * The CookieStoreId used for the tab.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * Whether the document in the tab can be rendered in reader mode.
         * Optional.
         */
        isArticle?: boolean;

        /**
         * Whether the document in the tab is being rendered in reader mode.
         * Optional.
         */
        isInReaderMode?: boolean;

        /**
         * Current tab sharing state for screen, microphone and camera.
         * Optional.
         */
        sharingState?: SharingState;

        /**
         * Whether the tab is drawing attention.
         * Optional.
         */
        attention?: boolean;

        /**
         * The ID of this tab's successor, if any; $(ref:tabs.TAB_ID_NONE) otherwise.
         * Optional.
         */
        successorTabId?: number;

        /**
         * The ID of the group that the tab belongs to.
         * Optional.
         */
        groupId?: number;

        /**
         * The URL the tab is navigating to, before it has committed. This property is only present if the extension's manifest
         * includes the "tabs" permission and there is a pending navigation.
         * Optional.
         */
        pendingUrl?: string;
      }

      /**
       * Defines how zoom changes are handled, i.e. which entity is responsible for the actual scaling of the page; defaults to
       * <code>automatic</code>.
       *
       * "automatic": Zoom changes are handled automatically by the browser.
       * "manual": Overrides the automatic handling of zoom changes. The <code>onZoomChange</code> event will still be dispatched,
       * and it is the responsibility of the extension to listen for this event and manually scale the page.
       * This mode does not support <code>per-origin</code> zooming, and will thus ignore the <code>scope</code>
       * zoom setting and assume <code>per-tab</code>.
       * "disabled": Disables all zooming in the tab. The tab will revert to the default zoom level,
       * and all attempted zoom changes will be ignored.
       */
      type ZoomSettingsMode = "automatic" | "manual" | "disabled";

      /**
       * Defines whether zoom changes will persist for the page's origin, or only take effect in this tab; defaults to <code>
       * per-origin</code> when in <code>automatic</code> mode, and <code>per-tab</code> otherwise.
       *
       * "per-origin": Zoom changes will persist in the zoomed page's origin, i.e. all other tabs navigated to that same origin
       * will be zoomed as well. Moreover, <code>per-origin</code> zoom changes are saved with the origin,
       * meaning that when navigating to other pages in the same origin, they will all be zoomed to the same zoom factor.
       * The <code>per-origin</code> scope is only available in the <code>automatic</code> mode.
       * "per-tab": Zoom changes only take effect in this tab, and zoom changes in other tabs will not affect the zooming of this
       * tab. Also, <code>per-tab</code> zoom changes are reset on navigation; navigating a tab will always load pages with their
       * <code>per-origin</code> zoom factors.
       */
      type ZoomSettingsScope = "per-origin" | "per-tab";

      /**
       * Defines how zoom changes in a tab are handled and at what scope.
       */
      interface ZoomSettings {
        /**
         * Defines how zoom changes are handled, i.e. which entity is responsible for the actual scaling of the page; defaults to
         * <code>automatic</code>.
         * Optional.
         */
        mode?: ZoomSettingsMode;

        /**
         * Defines whether zoom changes will persist for the page's origin, or only take effect in this tab; defaults to <code>
         * per-origin</code> when in <code>automatic</code> mode, and <code>per-tab</code> otherwise.
         * Optional.
         */
        scope?: ZoomSettingsScope;

        /**
         * Used to return the default zoom level for the current tab in calls to tabs.getZoomSettings.
         * Optional.
         */
        defaultZoomFactor?: number;
      }

      /**
       * Defines the page settings to be used when saving a page as a pdf file.
       */
      interface PageSettings {
        /**
         * The name of the file. May include optional .pdf extension.
         * Optional.
         */
        toFileName?: string;

        /**
         * The page size unit: 0 = inches, 1 = millimeters. Default: 0.
         * Optional.
         */
        paperSizeUnit?: number;

        /**
         * The paper width in paper size units. Default: 8.5.
         * Optional.
         */
        paperWidth?: number;

        /**
         * The paper height in paper size units. Default: 11.0.
         * Optional.
         */
        paperHeight?: number;

        /**
         * The page content orientation: 0 = portrait, 1 = landscape. Default: 0.
         * Optional.
         */
        orientation?: number;

        /**
         * The page content scaling factor: 1.0 = 100% = normal size. Default: 1.0.
         * Optional.
         */
        scaling?: number;

        /**
         * Whether the page content should shrink to fit the page width (overrides scaling). Default: true.
         * Optional.
         */
        shrinkToFit?: boolean;

        /**
         * Whether the page background colors should be shown. Default: false.
         * Optional.
         */
        showBackgroundColors?: boolean;

        /**
         * Whether the page background images should be shown. Default: false.
         * Optional.
         */
        showBackgroundImages?: boolean;

        /**
         * The spacing between the left header/footer and the left edge of the paper (inches). Default: 0.
         * Optional.
         */
        edgeLeft?: number;

        /**
         * The spacing between the right header/footer and the right edge of the paper (inches). Default: 0.
         * Optional.
         */
        edgeRight?: number;

        /**
         * The spacing between the top of the headers and the top edge of the paper (inches). Default: 0
         * Optional.
         */
        edgeTop?: number;

        /**
         * The spacing between the bottom of the footers and the bottom edge of the paper (inches). Default: 0.
         * Optional.
         */
        edgeBottom?: number;

        /**
         * The margin between the page content and the left edge of the paper (inches). Default: 0.5.
         * Optional.
         */
        marginLeft?: number;

        /**
         * The margin between the page content and the right edge of the paper (inches). Default: 0.5.
         * Optional.
         */
        marginRight?: number;

        /**
         * The margin between the page content and the top edge of the paper (inches). Default: 0.5.
         * Optional.
         */
        marginTop?: number;

        /**
         * The margin between the page content and the bottom edge of the paper (inches). Default: 0.5.
         * Optional.
         */
        marginBottom?: number;

        /**
         * The text for the page's left header. Default: '&T'.
         * Optional.
         */
        headerLeft?: string;

        /**
         * The text for the page's center header. Default: ''.
         * Optional.
         */
        headerCenter?: string;

        /**
         * The text for the page's right header. Default: '&U'.
         * Optional.
         */
        headerRight?: string;

        /**
         * The text for the page's left footer. Default: '&PT'.
         * Optional.
         */
        footerLeft?: string;

        /**
         * The text for the page's center footer. Default: ''.
         * Optional.
         */
        footerCenter?: string;

        /**
         * The text for the page's right footer. Default: '&D'.
         * Optional.
         */
        footerRight?: string;
      }

      /**
       * Whether the tabs have completed loading.
       */
      type TabStatus = "loading" | "complete";

      /**
       * The type of window.
       */
      type WindowType = "normal" | "popup" | "panel" | "app" | "devtools";

      /**
       * Event names supported in onUpdated.
       */
      type UpdatePropertyName =
        | "attention"
        | "audible"
        | "autoDiscardable"
        | "discarded"
        | "favIconUrl"
        | "groupId"
        | "hidden"
        | "isArticle"
        | "mutedInfo"
        | "pinned"
        | "sharingState"
        | "status"
        | "title"
        | "url";

      /**
       * An object describing filters to apply to tabs.onUpdated events.
       */
      interface UpdateFilter {
        /**
         * A list of URLs or URL patterns. Events that cannot match any of the URLs will be filtered out.
         * Filtering with urls requires the <code>"tabs"</code> or  <code>"activeTab"</code> permission.
         * Optional.
         */
        urls?: string[];

        /**
         * A list of property names. Events that do not match any of the names will be filtered out.
         * Optional.
         */
        properties?: UpdatePropertyName[];

        /**
         * Optional.
         */
        tabId?: number;

        /**
         * Optional.
         */
        windowId?: number;
      }

      interface ConnectConnectInfoType {
        /**
         * Will be passed into onConnect for content scripts that are listening for the connection event.
         * Optional.
         */
        name?: string;

        /**
         * Open a port to a specific $(topic:frame_ids)[frame] identified by <code>frameId</code> instead of all frames in the tab.
         * Optional.
         */
        frameId?: number;
      }

      interface SendMessageOptionsType {
        /**
         * Send a message to a specific $(topic:frame_ids)[frame] identified by <code>frameId</code>
         * instead of all frames in the tab.
         * Optional.
         */
        frameId?: number;
      }

      interface CreateCreatePropertiesType {
        /**
         * The window to create the new tab in. Defaults to the $(topic:current-window)[current window].
         * Optional.
         */
        windowId?: number;

        /**
         * The position the tab should take in the window. The provided value will be clamped to between zero and the number of
         * tabs in the window.
         * Optional.
         */
        index?: number;

        /**
         * The URL to navigate the tab to initially. Fully-qualified URLs must include a scheme (i.e. 'http://www.google.com',
         * not 'www.google.com'). Relative URLs will be relative to the current page within the extension.
         * Defaults to the New Tab Page.
         * Optional.
         */
        url?: string;

        /**
         * Whether the tab should become the active tab in the window. Does not affect whether the window is focused (see
         * $(ref:windows.update)). Defaults to <var>true</var>.
         * Optional.
         */
        active?: boolean;

        /**
         * Whether the tab should be pinned. Defaults to <var>false</var>
         * Optional.
         */
        pinned?: boolean;

        /**
         * The ID of the tab that opened this tab. If specified, the opener tab must be in the same window as the newly created tab.
         * Optional.
         */
        openerTabId?: number;

        /**
         * The CookieStoreId for the tab that opened this tab.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * Whether the document in the tab should be opened in reader mode.
         * Optional.
         */
        openInReaderMode?: boolean;

        /**
         * Whether the tab is marked as 'discarded' when created.
         * Optional.
         */
        discarded?: boolean;

        /**
         * The title used for display if the tab is created in discarded mode.
         * Optional.
         */
        title?: string;

        /**
         * Whether the tab should be muted when created.
         * Optional.
         */
        muted?: boolean;
      }

      interface DuplicateDuplicatePropertiesType {
        /**
         * The position the new tab should take in the window. The provided value will be clamped to between zero and the number of
         * tabs in the window.
         * Optional.
         */
        index?: number;

        /**
         * Whether the tab should become the active tab in the window. Does not affect whether the window is focused (see
         * $(ref:windows.update)). Defaults to <var>true</var>.
         * Optional.
         */
        active?: boolean;
      }

      interface QueryQueryInfoType {
        /**
         * Whether the tabs are active in their windows.
         * Optional.
         */
        active?: boolean;

        /**
         * Whether the tabs are drawing attention.
         * Optional.
         */
        attention?: boolean;

        /**
         * Whether the tabs are pinned.
         * Optional.
         */
        pinned?: boolean;

        /**
         * Whether the tabs are audible.
         * Optional.
         */
        audible?: boolean;

        /**
         * Whether the tabs can be discarded automatically by the browser when resources are low.
         * Optional.
         */
        autoDiscardable?: boolean;

        /**
         * Whether the tabs are muted.
         * Optional.
         */
        muted?: boolean;

        /**
         * Whether the tabs are highlighted.  Works as an alias of active.
         * Optional.
         */
        highlighted?: boolean;

        /**
         * Whether the tabs are in the $(topic:current-window)[current window].
         * Optional.
         */
        currentWindow?: boolean;

        /**
         * Whether the tabs are in the last focused window.
         * Optional.
         */
        lastFocusedWindow?: boolean;

        /**
         * Whether the tabs have completed loading.
         * Optional.
         */
        status?: TabStatus;

        /**
         * True while the tabs are not loaded with content.
         * Optional.
         */
        discarded?: boolean;

        /**
         * True while the tabs are hidden.
         * Optional.
         */
        hidden?: boolean;

        /**
         * Match page titles against a pattern.
         * Optional.
         */
        title?: string;

        /**
         * Match tabs against one or more $(topic:match_patterns)[URL patterns]. Note that fragment identifiers are not matched.
         * Optional.
         */
        url?: string | string[];

        /**
         * The ID of the parent window, or $(ref:windows.WINDOW_ID_CURRENT) for the $(topic:current-window)[current window].
         * Optional.
         */
        windowId?: number;

        /**
         * The type of window the tabs are in.
         * Optional.
         */
        windowType?: WindowType;

        /**
         * The position of the tabs within their windows.
         * Optional.
         */
        index?: number;

        /**
         * The CookieStoreId used for the tab.
         * Optional.
         */
        cookieStoreId?: string[] | string;

        /**
         * The ID of the tab that opened this tab. If specified, the opener tab must be in the same window as this tab.
         * Optional.
         */
        openerTabId?: number;

        /**
         * The ID of the group that the tabs are in, or $(ref:tabGroups.TAB_GROUP_ID_NONE) (-1) for ungrouped tabs.
         * Optional.
         */
        groupId?: number;

        /**
         * True for any screen sharing, or a string to specify type of screen sharing.
         * Optional.
         */
        screen?: "Screen" | "Window" | "Application" | boolean;

        /**
         * True if the tab is using the camera.
         * Optional.
         */
        camera?: boolean;

        /**
         * True if the tab is using the microphone.
         * Optional.
         */
        microphone?: boolean;
      }

      interface HighlightHighlightInfoType {
        /**
         * The window that contains the tabs.
         * Optional.
         */
        windowId?: number;

        /**
         * If true, the $(ref:windows.Window) returned will have a <var>tabs</var> property that contains a list of the $(ref:tabs.
         * Tab) objects. The <code>Tab</code> objects only contain the <code>url</code>, <code>title</code> and <code>
         * favIconUrl</code> properties if the extension's manifest file includes the <code>"tabs"</code> permission. If false,
         * the $(ref:windows.Window) won't have the <var>tabs</var> property.
         * Optional.
         */
        populate?: boolean;

        /**
         * One or more tab indices to highlight.
         */
        tabs: number[] | number;
      }

      interface UpdateUpdatePropertiesType {
        /**
         * A URL to navigate the tab to.
         * Optional.
         */
        url?: string;

        /**
         * Whether the tab should be active. Does not affect whether the window is focused (see $(ref:windows.update)).
         * Optional.
         */
        active?: boolean;

        /**
         * Whether the tab should be discarded automatically by the browser when resources are low.
         * Optional.
         */
        autoDiscardable?: boolean;

        /**
         * Adds or removes the tab from the current selection.
         * Optional.
         */
        highlighted?: boolean;

        /**
         * Whether the tab should be pinned.
         * Optional.
         */
        pinned?: boolean;

        /**
         * Whether the tab should be muted.
         * Optional.
         */
        muted?: boolean;

        /**
         * The ID of the tab that opened this tab. If specified, the opener tab must be in the same window as this tab.
         * Optional.
         */
        openerTabId?: number;

        /**
         * Whether the load should replace the current history entry for the tab.
         * Optional.
         */
        loadReplace?: boolean;

        /**
         * The ID of this tab's successor. If specified, the successor tab must be in the same window as this tab.
         * Optional.
         */
        successorTabId?: number;
      }

      interface MoveMovePropertiesType {
        /**
         * Defaults to the window the tab is currently in.
         * Optional.
         */
        windowId?: number;

        /**
         * The position to move the window to. -1 will place the tab at the end of the window.
         */
        index: number;
      }

      interface ReloadReloadPropertiesType {
        /**
         * Whether using any local cache. Default is false.
         * Optional.
         */
        bypassCache?: boolean;
      }

      interface MoveInSuccessionOptionsType {
        /**
         * Whether to move the tabs before (false) or after (true) tabId in the succession. Defaults to false.
         * Optional.
         */
        append?: boolean;

        /**
         * Whether to link up the current predecessors or successor (depending on options.append)
         * of tabId to the other side of the chain after it is prepended or appended. If true,
         * one of the following happens: if options.append is false, the first tab in the array is set as the successor of any
         * current predecessors of tabId; if options.append is true, the current successor of tabId is set as the successor of the
         * last tab in the array. Defaults to false.
         * Optional.
         */
        insert?: boolean;
      }

      interface GroupOptionsType {
        /**
         * The tab ID or list of tab IDs to add to the specified group.
         */
        tabIds: number | number[];

        /**
         * The ID of the group to add the tabs to. If not specified, a new group will be created.
         * Optional.
         */
        groupId?: number;

        /**
         * Configurations for creating a group. Cannot be used if groupId is already specified.
         * Optional.
         */
        createProperties?: GroupOptionsTypeCreatePropertiesType;
      }

      /**
       * Lists the changes to the state of the tab that was updated.
       */
      interface OnUpdatedChangeInfoType {
        /**
         * The tab's new attention state.
         * Optional.
         */
        attention?: boolean;

        /**
         * The tab's new audible state.
         * Optional.
         */
        audible?: boolean;

        /**
         * The tab's new autoDiscardable state.
         * Optional.
         */
        autoDiscardable?: boolean;

        /**
         * True while the tab is not loaded with content.
         * Optional.
         */
        discarded?: boolean;

        /**
         * The tab's new favicon URL. This property is only present if the extension's manifest includes the <code>"tabs"</code>
         * permission.
         * Optional.
         */
        favIconUrl?: string;

        /**
         * The tab's new hidden state.
         * Optional.
         */
        hidden?: boolean;

        /**
         * Whether the document in the tab can be rendered in reader mode.
         * Optional.
         */
        isArticle?: boolean;

        /**
         * The tab's new muted state and the reason for the change.
         * Optional.
         */
        mutedInfo?: MutedInfo;

        /**
         * The tab's new pinned state.
         * Optional.
         */
        pinned?: boolean;

        /**
         * The tab's new sharing state for screen, microphone and camera.
         * Optional.
         */
        sharingState?: SharingState;

        /**
         * The status of the tab. Can be either <em>loading</em> or <em>complete</em>.
         * Optional.
         */
        status?: string;

        /**
         * The title of the tab if it has changed. This property is only present if the extension's manifest includes the <code>
         * "tabs"</code> permission.
         * Optional.
         */
        title?: string;

        /**
         * The tab's URL if it has changed. This property is only present if the extension's manifest includes the <code>
         * "tabs"</code> permission.
         * Optional.
         */
        url?: string;
      }

      interface OnMovedMoveInfoType {
        windowId: number;

        fromIndex: number;

        toIndex: number;
      }

      interface OnActivatedActiveInfoType {
        /**
         * The ID of the tab that has become active.
         */
        tabId: number;

        /**
         * The ID of the tab that was previously active, if that tab is still open.
         * Optional.
         */
        previousTabId?: number;

        /**
         * The ID of the window the active tab changed inside of.
         */
        windowId: number;
      }

      interface OnHighlightedHighlightInfoType {
        /**
         * The window whose tabs changed.
         */
        windowId: number;

        /**
         * All highlighted tabs in the window.
         */
        tabIds: number[];
      }

      interface OnDetachedDetachInfoType {
        oldWindowId: number;

        oldPosition: number;
      }

      interface OnAttachedAttachInfoType {
        newWindowId: number;

        newPosition: number;
      }

      interface OnRemovedRemoveInfoType {
        /**
         * The window whose tab is closed.
         */
        windowId: number;

        /**
         * True when the tab is being closed because its window is being closed.
         */
        isWindowClosing: boolean;
      }

      interface OnZoomChangeZoomChangeInfoType {
        tabId: number;

        oldZoomFactor: number;

        newZoomFactor: number;

        zoomSettings: ZoomSettings;
      }

      /**
       * Configurations for creating a group. Cannot be used if groupId is already specified.
       */
      interface GroupOptionsTypeCreatePropertiesType {
        /**
         * The window of the new group. Defaults to the current window.
         * Optional.
         */
        windowId?: number;
      }

      /**
       * Fired when a tab is updated.
       */
      interface OnUpdatedEvent
        extends Events.Event<
          (tabId: number, changeInfo: OnUpdatedChangeInfoType, tab: Tab) => void
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter Optional. A set of filters that restricts the events that will be sent to this listener.
         */
        addListener(
          callback: (
            tabId: number,
            changeInfo: OnUpdatedChangeInfoType,
            tab: Tab
          ) => void,
          filter?: UpdateFilter
        ): void;
      }

      interface Static {
        /**
         * Retrieves details about the specified tab.
         */
        get(tabId: number): Promise<Tab>;

        /**
         * Gets the tab that this script call is being made from. May be undefined if called from a non-tab context (for example: a
         * background page or popup view).
         */
        getCurrent(): Promise<Tab>;

        /**
         * Connects to the content script(s) in the specified tab. The $(ref:runtime.onConnect)
         * event is fired in each content script running in the specified tab for the current extension. For more details,
         * see $(topic:messaging)[Content Script Messaging].
         *
         * @param connectInfo Optional.
         * @returns A port that can be used to communicate with the content scripts running in the specified tab.
         * The port's $(ref:runtime.Port) event is fired if the tab closes or does not exist.
         */
        connect(
          tabId: number,
          connectInfo?: ConnectConnectInfoType
        ): Browser.Runtime.Port;

        /**
         * Sends a single message to the content script(s) in the specified tab, with an optional callback to run when a response
         * is sent back.  The $(ref:runtime.onMessage) event is fired in each content script running in the specified tab for the
         * current extension.
         *
         * @param options Optional.
         */
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        sendMessage<TMessage = unknown, TResponse = unknown>(
          tabId: number,
          message: TMessage,
          options?: SendMessageOptionsType
        ): Promise<TResponse>;

        /**
         * Creates a new tab.
         */
        create(createProperties: CreateCreatePropertiesType): Promise<Tab>;

        /**
         * Duplicates a tab.
         *
         * @param tabId The ID of the tab which is to be duplicated.
         * @param duplicateProperties Optional.
         */
        duplicate(
          tabId: number,
          duplicateProperties?: DuplicateDuplicatePropertiesType
        ): Promise<Tab>;

        /**
         * Gets all tabs that have the specified properties, or all tabs if no properties are specified.
         */
        query(queryInfo: QueryQueryInfoType): Promise<Tab[]>;

        /**
         * Highlights the given tabs.
         */
        highlight(
          highlightInfo: HighlightHighlightInfoType
        ): Promise<Browser.Windows.Window>;

        /**
         * Modifies the properties of a tab. Properties that are not specified in <var>updateProperties</var> are not modified.
         *
         * @param tabId Optional. Defaults to the selected tab of the $(topic:current-window)[current window].
         */
        update(
          tabId: number | undefined,
          updateProperties: UpdateUpdatePropertiesType
        ): Promise<Tab>;

        /**
         * Modifies the properties of a tab. Properties that are not specified in <var>updateProperties</var> are not modified.
         */
        update(updateProperties: UpdateUpdatePropertiesType): Promise<Tab>;

        /**
         * Moves one or more tabs to a new position within its window, or to a new window. Note that tabs can only be moved to and
         * from normal (window.type === "normal") windows.
         *
         * @param tabIds The tab or list of tabs to move.
         */
        move(
          tabIds: number | number[],
          moveProperties: MoveMovePropertiesType
        ): Promise<Tab | Tab[]>;

        /**
         * Reload a tab.
         *
         * @param tabId Optional. The ID of the tab to reload; defaults to the selected tab of the current window.
         * @param reloadProperties Optional.
         */
        reload(
          tabId?: number,
          reloadProperties?: ReloadReloadPropertiesType
        ): Promise<void>;

        /**
         * Warm up a tab
         *
         * @param tabId The ID of the tab to warm up.
         */
        warmup(tabId: number): Promise<void>;

        /**
         * Closes one or more tabs.
         *
         * @param tabIds The tab or list of tabs to close.
         */
        remove(tabIds: number | number[]): Promise<void>;

        /**
         * discards one or more tabs.
         *
         * @param tabIds The tab or list of tabs to discard.
         */
        discard(tabIds: number | number[]): Promise<void>;

        /**
         * Detects the primary language of the content in a tab.
         *
         * @param tabId Optional. Defaults to the active tab of the $(topic:current-window)[current window].
         */
        detectLanguage(tabId?: number): Promise<string>;

        /**
         * Toggles reader mode for the document in the tab.
         *
         * @param tabId Optional. Defaults to the active tab of the $(topic:current-window)[current window].
         */
        toggleReaderMode(tabId?: number): Promise<void>;

        /**
         * Captures an area of a specified tab. You must have $(topic:declare_permissions)[&lt;all_urls&gt;]
         * permission to use this method.
         *
         * @param tabId Optional. The tab to capture. Defaults to the active tab of the current window.
         * @param options Optional.
         */
        captureTab(
          tabId?: number,
          options?: Browser.ExtensionTypes.ImageDetails
        ): Promise<string>;

        /**
         * Captures an area of the currently active tab in the specified window. You must have &lt;all_urls&gt; or activeTab
         * permission to use this method.
         *
         * @param windowId Optional. The target window. Defaults to the $(topic:current-window)[current window].
         * @param options Optional.
         */
        captureVisibleTab(
          windowId?: number,
          options?: Browser.ExtensionTypes.ImageDetails
        ): Promise<string>;

        /**
         * Injects JavaScript code into a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param tabId Optional. The ID of the tab in which to run the script; defaults to the active tab of the current window.
         * @param details Details of the script to run.
         * @returns Called after all the JavaScript has been executed.
         */
        executeScript(
          tabId: number | undefined,
          details: Browser.ExtensionTypes.InjectDetails
        ): Promise<unknown[]>;

        /**
         * Injects JavaScript code into a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param details Details of the script to run.
         * @returns Called after all the JavaScript has been executed.
         */
        executeScript(
          details: Browser.ExtensionTypes.InjectDetails
        ): Promise<unknown[]>;

        /**
         * Injects CSS into a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param tabId Optional. The ID of the tab in which to insert the CSS; defaults to the active tab of the current window.
         * @param details Details of the CSS text to insert.
         * @returns Called when all the CSS has been inserted.
         */
        insertCSS(
          tabId: number | undefined,
          details: Browser.ExtensionTypes.InjectDetails
        ): Promise<void>;

        /**
         * Injects CSS into a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param details Details of the CSS text to insert.
         * @returns Called when all the CSS has been inserted.
         */
        insertCSS(details: Browser.ExtensionTypes.InjectDetails): Promise<void>;

        /**
         * Removes injected CSS from a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param tabId Optional. The ID of the tab from which to remove the injected CSS; defaults to the active tab of the
         * current window.
         * @param details Details of the CSS text to remove.
         * @returns Called when all the CSS has been removed.
         */
        removeCSS(
          tabId: number | undefined,
          details: Browser.ExtensionTypes.InjectDetails
        ): Promise<void>;

        /**
         * Removes injected CSS from a page. For details, see the $(topic:content_scripts)[programmatic injection]
         * section of the content scripts doc.
         *
         * @param details Details of the CSS text to remove.
         * @returns Called when all the CSS has been removed.
         */
        removeCSS(details: Browser.ExtensionTypes.InjectDetails): Promise<void>;

        /**
         * Zooms a specified tab.
         *
         * @param tabId Optional. The ID of the tab to zoom; defaults to the active tab of the current window.
         * @param zoomFactor The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor.
         * Values greater than zero specify a (possibly non-default) zoom factor for the tab.
         * @returns Called after the zoom factor has been changed.
         */
        setZoom(tabId: number | undefined, zoomFactor: number): Promise<void>;

        /**
         * Zooms a specified tab.
         *
         * @param zoomFactor The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor.
         * Values greater than zero specify a (possibly non-default) zoom factor for the tab.
         * @returns Called after the zoom factor has been changed.
         */
        setZoom(zoomFactor: number): Promise<void>;

        /**
         * Gets the current zoom factor of a specified tab.
         *
         * @param tabId Optional. The ID of the tab to get the current zoom factor from; defaults to the active tab of the current
         * window.
         * @returns Called with the tab's current zoom factor after it has been fetched.
         */
        getZoom(tabId?: number): Promise<number>;

        /**
         * Sets the zoom settings for a specified tab, which define how zoom changes are handled.
         * These settings are reset to defaults upon navigating the tab.
         *
         * @param tabId Optional. The ID of the tab to change the zoom settings for; defaults to the active tab of the current
         * window.
         * @param zoomSettings Defines how zoom changes are handled and at what scope.
         * @returns Called after the zoom settings have been changed.
         */
        setZoomSettings(
          tabId: number | undefined,
          zoomSettings: ZoomSettings
        ): Promise<void>;

        /**
         * Sets the zoom settings for a specified tab, which define how zoom changes are handled.
         * These settings are reset to defaults upon navigating the tab.
         *
         * @param zoomSettings Defines how zoom changes are handled and at what scope.
         * @returns Called after the zoom settings have been changed.
         */
        setZoomSettings(zoomSettings: ZoomSettings): Promise<void>;

        /**
         * Gets the current zoom settings of a specified tab.
         *
         * @param tabId Optional. The ID of the tab to get the current zoom settings from; defaults to the active tab of the
         * current window.
         * @returns Called with the tab's current zoom settings.
         */
        getZoomSettings(tabId?: number): Promise<ZoomSettings>;

        /**
         * Prints page in active tab.
         */
        print(): void;

        /**
         * Shows print preview for page in active tab.
         *
         * @returns Called after print preview entered.
         */
        printPreview(): Promise<void>;

        /**
         * Saves page in active tab as a PDF file.
         *
         * @param pageSettings The page settings used to save the PDF file.
         * @returns Called after save as dialog closed.
         */
        saveAsPDF(pageSettings: PageSettings): Promise<string>;

        /**
         * Shows one or more tabs.
         *
         * @param tabIds The TAB ID or list of TAB IDs to show.
         */
        show(tabIds: number | number[]): Promise<void>;

        /**
         * Hides one or more tabs. The <code>"tabHide"</code> permission is required to hide tabs.  Not all tabs are hidable.
         * Returns an array of hidden tabs.
         *
         * @param tabIds The TAB ID or list of TAB IDs to hide.
         */
        hide(tabIds: number | number[]): Promise<number[]>;

        /**
         * Removes an array of tabs from their lines of succession and prepends or appends them in a chain to another tab.
         *
         * @param tabIds An array of tab IDs to move in the line of succession. For each tab in the array,
         * the tab's current predecessors will have their successor set to the tab's current successor,
         * and each tab will then be set to be the successor of the previous tab in the array.
         * Any tabs not in the same window as the tab indicated by the second argument (or the first tab in the array,
         * if no second argument) will be skipped.
         * @param tabId Optional. The ID of a tab to set as the successor of the last tab in the array, or $(ref:tabs.TAB_ID_NONE)
         * to leave the last tab without a successor. If options.append is true, then this tab is made the predecessor of the
         * first tab in the array instead.
         * @param options Optional.
         */
        moveInSuccession(
          tabIds: number[],
          tabId?: number,
          options?: MoveInSuccessionOptionsType
        ): void;

        /**
         * Navigate to next page in tab's history, if available
         *
         * @param tabId Optional. The ID of the tab to navigate forward.
         */
        goForward(tabId?: number): Promise<void>;

        /**
         * Navigate to previous page in tab's history, if available.
         *
         * @param tabId Optional. The ID of the tab to navigate backward.
         */
        goBack(tabId?: number): Promise<void>;

        /**
         * Adds one or more tabs to a specified group, or if no group is specified, adds the given tabs to a newly created group.
         */
        group(options: GroupOptionsType): Promise<number>;

        /**
         * Removes one or more tabs from their respective groups. If any groups become empty, they are deleted.
         *
         * @param tabIds The tab ID or list of tab IDs to remove from their respective groups.
         */
        ungroup(tabIds: number | number[]): void;

        /**
         * Fired when a tab is created. Note that the tab's URL may not be set at the time this event fired,
         * but you can listen to onUpdated events to be notified when a URL is set.
         *
         * @param tab Details of the tab that was created.
         */
        onCreated: Events.Event<(tab: Tab) => void>;

        /**
         * Fired when a tab is updated.
         */
        onUpdated: OnUpdatedEvent;

        /**
         * Fired when a tab is moved within a window. Only one move event is fired, representing the tab the user directly moved.
         * Move events are not fired for the other tabs that must move in response. This event is not fired when a tab is moved
         * between windows. For that, see $(ref:tabs.onDetached).
         */
        onMoved: Events.Event<
          (tabId: number, moveInfo: OnMovedMoveInfoType) => void
        >;

        /**
         * Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired,
         * but you can listen to onUpdated events to be notified when a URL is set.
         */
        onActivated: Events.Event<
          (activeInfo: OnActivatedActiveInfoType) => void
        >;

        /**
         * Fired when the highlighted or selected tabs in a window changes.
         */
        onHighlighted: Events.Event<
          (highlightInfo: OnHighlightedHighlightInfoType) => void
        >;

        /**
         * Fired when a tab is detached from a window, for example because it is being moved between windows.
         */
        onDetached: Events.Event<
          (tabId: number, detachInfo: OnDetachedDetachInfoType) => void
        >;

        /**
         * Fired when a tab is attached to a window, for example because it was moved between windows.
         */
        onAttached: Events.Event<
          (tabId: number, attachInfo: OnAttachedAttachInfoType) => void
        >;

        /**
         * Fired when a tab is closed.
         */
        onRemoved: Events.Event<
          (tabId: number, removeInfo: OnRemovedRemoveInfoType) => void
        >;

        /**
         * Fired when a tab is replaced with another tab due to prerendering or instant.
         */
        onReplaced: Events.Event<
          (addedTabId: number, removedTabId: number) => void
        >;

        /**
         * Fired when a tab is zoomed.
         */
        onZoomChange: Events.Event<
          (ZoomChangeInfo: OnZoomChangeZoomChangeInfoType) => void
        >;

        /**
         * An ID which represents the absence of a browser tab.
         */
        TAB_ID_NONE: -1;
      }
    }

    /**
     * Namespace: browser.theme
     */
    namespace Theme {
      /**
       * Info provided in the onUpdated listener.
       */
      interface ThemeUpdateInfo {
        /**
         * The new theme after update
         */
        theme: ThemeUpdateInfoThemeType;

        /**
         * The id of the window the theme has been applied to
         * Optional.
         */
        windowId?: number;
      }

      /**
       * The new theme after update
       */
      interface ThemeUpdateInfoThemeType {
        [s: string]: unknown;
      }

      interface Static {
        /**
         * Returns the current theme for the specified window or the last focused window.
         *
         * @param windowId Optional. The window for which we want the theme.
         */
        getCurrent(windowId?: number): Promise<Manifest.ThemeType>;

        /**
         * Make complete updates to the theme. Resolves when the update has completed.
         *
         * @param windowId Optional. The id of the window to update. No id updates all windows.
         * @param details The properties of the theme to update.
         */
        update(
          windowId: number | undefined,
          details: Browser.Manifest.ThemeType
        ): Promise<void>;

        /**
         * Make complete updates to the theme. Resolves when the update has completed.
         *
         * @param details The properties of the theme to update.
         */
        update(details: Browser.Manifest.ThemeType): Promise<void>;

        /**
         * Removes the updates made to the theme.
         *
         * @param windowId Optional. The id of the window to reset. No id resets all windows.
         */
        reset(windowId?: number): Promise<void>;

        /**
         * Fired when a new theme has been applied
         *
         * @param updateInfo Details of the theme update
         */
        onUpdated: Events.Event<(updateInfo: ThemeUpdateInfo) => void>;
      }
    }

    /**
     * Namespace: browser.topSites
     */
    namespace TopSites {
      /**
       * An object encapsulating a most visited URL, such as the URLs on the new tab page.
       */
      interface MostVisitedURL {
        /**
         * The most visited URL.
         */
        url: string;

        /**
         * The title of the page.
         * Optional.
         */
        title?: string;

        /**
         * Data URL for the favicon, if available.
         * Optional.
         */
        favicon?: string;

        /**
         * The entry type, either <code>url</code> for a normal page link, or <code>search</code> for a search shortcut.
         * Optional.
         */
        type?: MostVisitedURLTypeEnum;
      }

      interface GetOptionsType {
        /**
         * The number of top sites to return, defaults to the value used by Firefox
         * Optional.
         */
        limit?: number;

        /**
         * Limit the result to a single top site link per domain
         * Optional.
         */
        onePerDomain?: boolean;

        /**
         * Include sites that the user has blocked from appearing on the Firefox new tab.
         * Optional.
         */
        includeBlocked?: boolean;

        /**
         * Include sites favicon if available.
         * Optional.
         */
        includeFavicon?: boolean;

        /**
         * Include sites that the user has pinned on the Firefox new tab.
         * Optional.
         */
        includePinned?: boolean;

        /**
         * Include search shortcuts appearing on the Firefox new tab.
         * Optional.
         */
        includeSearchShortcuts?: boolean;

        /**
         * Return the sites that exactly appear on the user's new-tab page. When true, all other options are ignored except limit
         * and includeFavicon. If the user disabled newtab Top Sites, the newtab parameter will be ignored.
         * Optional.
         */
        newtab?: boolean;
      }

      /**
       * The entry type, either <code>url</code> for a normal page link, or <code>search</code> for a search shortcut.
       */
      type MostVisitedURLTypeEnum = "url" | "search";

      interface Static {
        /**
         * Gets a list of top sites.
         *
         * @param options Optional.
         */
        get(options?: GetOptionsType): Promise<MostVisitedURL[]>;
      }
    }

    /**
     * Namespace: browser.trial
     */
    namespace Trial {
      interface Static {
        ml: Ml.Static;
      }
    }

    /**
     * Namespace: browser.types
     */
    namespace Types {
      /**
       * The scope of the Setting. One of<ul><li><var>regular</var>: setting for the regular profile (which is inherited by the
       * incognito profile if not overridden elsewhere),</li><li><var>regular_only</var>: setting for the regular profile only
       * (not inherited by the incognito profile),</li><li><var>incognito_persistent</var>: setting for the incognito profile
       * that survives browser restarts (overrides regular preferences),</li><li><var>incognito_session_only</var>
       * : setting for the incognito profile that can only be set during an incognito session and is deleted when the incognito
       * session ends (overrides regular and incognito_persistent preferences).</li></ul> Only <var>regular</var>
       * is supported by Firefox at this time.
       */
      type SettingScope =
        | "regular"
        | "regular_only"
        | "incognito_persistent"
        | "incognito_session_only";

      /**
       * One of<ul><li><var>not_controllable</var>: cannot be controlled by any extension</li><li><var>
       * controlled_by_other_extensions</var>: controlled by extensions with higher precedence</li><li><var>
       * controllable_by_this_extension</var>: can be controlled by this extension</li><li><var>controlled_by_this_extension</var>
       * : controlled by this extension</li></ul>
       */
      type LevelOfControl =
        | "not_controllable"
        | "controlled_by_other_extensions"
        | "controllable_by_this_extension"
        | "controlled_by_this_extension";

      interface Setting {
        /**
         * Gets the value of a setting.
         *
         * @param details Which setting to consider.
         */
        get(
          details: SettingGetDetailsType
        ): Promise<SettingGetCallbackDetailsType>;

        /**
         * Sets the value of a setting.
         *
         * @param details Which setting to change.
         * @returns Called at the completion of the set operation.
         */
        set(details: SettingSetDetailsType): Promise<void>;

        /**
         * Clears the setting, restoring any default value.
         *
         * @param details Which setting to clear.
         * @returns Called at the completion of the clear operation.
         */
        clear(details: SettingClearDetailsType): Promise<void>;

        /**
         * Fired after the setting changes.
         */
        onChange: Events.Event<(details: SettingOnChangeDetailsType) => void>;
      }

      interface SettingOnChangeDetailsType {
        /**
         * The value of the setting after the change.
         */
        value: unknown;

        /**
         * The level of control of the setting.
         */
        levelOfControl: Browser.Types.LevelOfControl;

        /**
         * Whether the value that has changed is specific to the incognito session.<br/>This property will <em>only</em>
         * be present if the user has enabled the extension in incognito mode.
         * Optional.
         */
        incognitoSpecific?: boolean;
      }

      /**
       * Which setting to consider.
       */
      interface SettingGetDetailsType {
        /**
         * Whether to return the value that applies to the incognito session (default false).
         * Optional.
         */
        incognito?: boolean;
      }

      /**
       * Details of the currently effective value.
       */
      interface SettingGetCallbackDetailsType {
        /**
         * The value of the setting.
         */
        value: unknown;

        /**
         * The level of control of the setting.
         */
        levelOfControl: Browser.Types.LevelOfControl;

        /**
         * Whether the effective value is specific to the incognito session.<br/>This property will <em>only</em>
         * be present if the <var>incognito</var> property in the <var>details</var> parameter of <code>get()</code> was true.
         * Optional.
         */
        incognitoSpecific?: boolean;
      }

      /**
       * Which setting to change.
       */
      interface SettingSetDetailsType {
        /**
         * The value of the setting. <br/>Note that every setting has a specific value type, which is described together with the
         * setting. An extension should <em>not</em> set a value of a different type.
         */
        value: unknown;

        /**
         * Where to set the setting (default: regular).
         * Optional.
         */
        scope?: Browser.Types.SettingScope;
      }

      /**
       * Which setting to clear.
       */
      interface SettingClearDetailsType {
        /**
         * Where to clear the setting (default: regular).
         * Optional.
         */
        scope?: Browser.Types.SettingScope;
      }

      interface Static {
        [s: string]: unknown;
      }
    }

    /**
     * Namespace: browser.userScripts
     */
    namespace UserScripts {
      /**
       * Details of a user script
       */
      interface UserScriptOptions {
        /**
         * The list of JS files to inject
         */
        js: Browser.ExtensionTypes.ExtensionFileOrCode[];

        /**
         * An opaque user script metadata value
         * Optional.
         */
        scriptMetadata?: Browser.ExtensionTypes.PlainJSONValue;

        matches: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        excludeMatches?: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        includeGlobs?: string[];

        /**
         * Optional.
         */
        excludeGlobs?: string[];

        /**
         * If allFrames is <code>true</code>, implies that the JavaScript should be injected into all frames of current page.
         * By default, it's <code>false</code> and is only injected into the top frame.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * If matchAboutBlank is true, then the code is also injected in about:blank and about:srcdoc frames if your extension has
         * access to its parent document. Code cannot be inserted in top-level about:-frames. By default it is <code>false</code>.
         * Optional.
         */
        matchAboutBlank?: boolean;

        /**
         * The soonest that the JavaScript will be injected into the tab. Defaults to "document_idle".
         * Optional.
         */
        runAt?: Browser.ExtensionTypes.RunAt;

        /**
         * limit the set of matched tabs to those that belong to the given cookie store id
         * Optional.
         */
        cookieStoreId?: string[] | string;
      }

      /**
       * An object that represents a user script registered programmatically
       */
      interface RegisteredUserScript {
        /**
         * The ID of the user script specified in the API call. This property must not start with a '_' as it's reserved as a
         * prefix for generated script IDs.
         */
        id: string;

        /**
         * If allFrames is <code>true</code>, implies that the JavaScript should be injected into all frames of current page.
         * By default, it's <code>false</code> and is only injected into the top frame.
         * Optional.
         */
        allFrames?: boolean;

        /**
         * The list of ScriptSource objects defining sources of scripts to be injected into matching pages.
         */
        js: ScriptSource[];

        /**
         * At least one of matches or includeGlobs should be non-empty. The script runs in documents whose URL match either pattern.
         * Optional.
         */
        matches?: Browser.Manifest.MatchPattern[];

        /**
         * Optional.
         */
        excludeMatches?: Browser.Manifest.MatchPattern[];

        /**
         * At least one of matches or includeGlobs should be non-empty. The script runs in documents whose URL match either pattern.
         * Optional.
         */
        includeGlobs?: string[];

        /**
         * Optional.
         */
        excludeGlobs?: string[];

        /**
         * The soonest that the JavaScript will be injected into the tab. Defaults to "document_idle".
         * Optional.
         */
        runAt?: Browser.ExtensionTypes.RunAt;

        /**
         * The JavaScript script for a script to execute within. Defaults to "USER_SCRIPT".
         * Optional.
         */
        world?: ExecutionWorld;

        /**
         * If specified, specifies a specific user script world ID to execute in. Only valid if `world` is omitted or is
         * `USER_SCRIPT`. If `worldId` is omitted, the script will execute in the default user script world ("").
         * Values with leading underscores (`_`) are reserved. The maximum length is 256.
         * Optional.
         */
        worldId?: string;
      }

      /**
       * The JavaScript world for a script to execute within. <code>USER_SCRIPT</code> is the default execution environment of
       * user scripts, <code>MAIN</code> is the web page's execution environment.
       */
      type ExecutionWorld = "MAIN" | "USER_SCRIPT";

      /**
       * Optional filter to use with getScripts() and unregister().
       */
      interface UserScriptFilter {
        /**
         * Optional.
         */
        ids?: string[];
      }

      /**
       * Object with file xor code property. Equivalent to the ExtensionFileOrCode, except the file remains a relative URL.
       */
      type ScriptSource = ScriptSourceC1Type | ScriptSourceC2Type;

      /**
       * The configuration of a USER_SCRIPT world.
       */
      interface WorldProperties {
        /**
         * The identifier of the world. Values with leading underscores (`_`) are reserved. The maximum length is 256.
         * Defaults to the default USER_SCRIPT world ("").
         * Optional.
         */
        worldId?: string;

        /**
         * The world's Content Security Policy. Defaults to the CSP of regular content scripts,
         * which prohibits dynamic code execution such as eval.
         * Optional.
         */
        csp?: string;

        /**
         * Whether the runtime.sendMessage and runtime.connect methods are exposed. Defaults to not exposing these messaging APIs.
         * Optional.
         */
        messaging?: boolean;
      }

      /**
       * An object that represents a user script registered programmatically
       */
      interface RegisterCallbackLegacyRegisteredUserScriptType {
        /**
         * Unregister a user script registered programmatically
         */
        unregister(): Promise<void>;
      }

      interface UpdateScriptsItemType extends Omit<RegisteredUserScript, "js"> {
        /**
         * Optional.
         */
        js?: ScriptSource[];
      }

      interface ScriptSourceC1Type {
        /**
         * The path of the JavaScript file to inject relative to the extension's root directory.
         */
        file: string;
      }

      interface ScriptSourceC2Type {
        code: string;
      }

      interface Static {
        /**
         * Register a user script programmatically given its $(ref:userScripts.UserScriptOptions),
         * and resolves to an object with the unregister() function
         */
        register(
          userScriptOptions: UserScriptOptions
        ): Promise<RegisterCallbackLegacyRegisteredUserScriptType>;

        /**
         * Registers one or more user scripts for this extension.
         *
         * @param scripts List of user scripts to be registered.
         */
        register(scripts: RegisteredUserScript[]): void;

        /**
         * Updates one or more user scripts for this extension.
         *
         * @param scripts List of user scripts to be updated.
         */
        update(scripts: UpdateScriptsItemType[]): void;

        /**
         * Unregisters all dynamically-registered user scripts for this extension.
         *
         * @param filter Optional. If specified, this method unregisters only the user scripts that match it.
         */
        unregister(filter?: UserScriptFilter): void;

        /**
         * Returns all dynamically-registered user scripts for this extension.
         *
         * @param filter Optional. If specified, this method returns only the user scripts that match it.
         */
        getScripts(filter?: UserScriptFilter): Promise<RegisteredUserScript[]>;

        /**
         * Configures the environment for scripts running in a USER_SCRIPT world.
         *
         * @param properties The desired configuration for a USER_SCRIPT world.
         */
        configureWorld(properties: WorldProperties): void;

        /**
         * Resets the configuration for a given world. That world will fall back to the default world's configuration.
         *
         * @param worldId Optional. The ID of the USER_SCRIPT world to reset. If omitted or empty,
         * resets the default world's configuration.
         */
        resetWorldConfiguration(worldId?: string): void;

        /**
         * Returns all registered USER_SCRIPT world configurations.
         */
        getWorldConfigurations(): Promise<WorldProperties[]>;
      }
    }

    /**
     * Namespace: browser.webNavigation
     */
    namespace WebNavigation {
      /**
       * Cause of the navigation. The same transition types as defined in the history API are used.
       * These are the same transition types as defined in the $(topic:transition_types)[history API] except with <code>
       * "start_page"</code> in place of <code>"auto_toplevel"</code> (for backwards compatibility).
       */
      type TransitionType =
        | "link"
        | "typed"
        | "auto_bookmark"
        | "auto_subframe"
        | "manual_subframe"
        | "generated"
        | "start_page"
        | "form_submit"
        | "reload"
        | "keyword"
        | "keyword_generated";

      type TransitionQualifier =
        | "client_redirect"
        | "server_redirect"
        | "forward_back"
        | "from_address_bar";

      interface EventUrlFilters {
        url: Browser.Events.UrlFilter[];
      }

      /**
       * Information about the frame to retrieve information about.
       */
      interface GetFrameDetailsType {
        /**
         * The ID of the tab in which the frame is.
         */
        tabId: number;

        /**
         * The ID of the process runs the renderer for this tab.
         * Optional.
         */
        processId?: number;

        /**
         * The ID of the frame in the given tab.
         */
        frameId: number;
      }

      /**
       * Information about the requested frame, null if the specified frame ID and/or tab ID are invalid.
       */
      interface GetFrameCallbackDetailsType {
        /**
         * True if the last navigation in this frame was interrupted by an error, i.e. the onErrorOccurred event fired.
         * Optional.
         */
        errorOccurred?: boolean;

        /**
         * The URL currently associated with this frame, if the frame identified by the frameId existed at one point in the given
         * tab. The fact that an URL is associated with a given frameId does not imply that the corresponding frame still exists.
         */
        url: string;

        /**
         * The ID of the tab in which the frame is.
         */
        tabId: number;

        /**
         * The ID of the frame. 0 indicates that this is the main frame; a positive value indicates the ID of a subframe.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame. Set to -1 of no parent frame exists.
         */
        parentFrameId: number;
      }

      /**
       * Information about the tab to retrieve all frames from.
       */
      interface GetAllFramesDetailsType {
        /**
         * The ID of the tab.
         */
        tabId: number;
      }

      interface GetAllFramesCallbackDetailsItemType {
        /**
         * True if the last navigation in this frame was interrupted by an error, i.e. the onErrorOccurred event fired.
         * Optional.
         */
        errorOccurred?: boolean;

        /**
         * The ID of the tab in which the frame is.
         */
        tabId: number;

        /**
         * The ID of the frame. 0 indicates that this is the main frame; a positive value indicates the ID of a subframe.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame. Set to -1 of no parent frame exists.
         */
        parentFrameId: number;

        /**
         * The URL currently associated with this frame.
         */
        url: string;
      }

      interface OnBeforeNavigateDetailsType {
        /**
         * The ID of the tab in which the navigation is about to occur.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique for a given tab and process.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame. Set to -1 of no parent frame exists.
         */
        parentFrameId: number;

        /**
         * The time when the browser was about to start the navigation, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnCommittedDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * Cause of the navigation.
         */
        transitionType: TransitionType;

        /**
         * A list of transition qualifiers.
         */
        transitionQualifiers: TransitionQualifier[];

        /**
         * The time when the navigation was committed, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnDOMContentLoadedDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * The time when the page's DOM was fully constructed, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnCompletedDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * The time when the document finished loading, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnErrorOccurredDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * The time when the error occurred, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnCreatedNavigationTargetDetailsType {
        /**
         * The ID of the tab in which the navigation is triggered.
         */
        sourceTabId: number;

        /**
         * The ID of the process runs the renderer for the source tab.
         */
        sourceProcessId: number;

        /**
         * The ID of the frame with sourceTabId in which the navigation is triggered. 0 indicates the main frame.
         */
        sourceFrameId: number;

        /**
         * The URL to be opened in the new window.
         */
        url: string;

        /**
         * The ID of the tab in which the url is opened
         */
        tabId: number;

        /**
         * The time when the browser was about to create a new view, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnReferenceFragmentUpdatedDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * Cause of the navigation.
         */
        transitionType: TransitionType;

        /**
         * A list of transition qualifiers.
         */
        transitionQualifiers: TransitionQualifier[];

        /**
         * The time when the navigation was committed, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnTabReplacedDetailsType {
        /**
         * The ID of the tab that was replaced.
         */
        replacedTabId: number;

        /**
         * The ID of the tab that replaced the old tab.
         */
        tabId: number;

        /**
         * The time when the replacement happened, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      interface OnHistoryStateUpdatedDetailsType {
        /**
         * The ID of the tab in which the navigation occurs.
         */
        tabId: number;

        url: string;

        /**
         * 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * Cause of the navigation.
         */
        transitionType: TransitionType;

        /**
         * A list of transition qualifiers.
         */
        transitionQualifiers: TransitionQualifier[];

        /**
         * The time when the navigation was committed, in milliseconds since the epoch.
         */
        timeStamp: number;
      }

      /**
       * Fired when a navigation is about to occur.
       */
      interface OnBeforeNavigateEvent
        extends Events.Event<(details: OnBeforeNavigateDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnBeforeNavigateDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when a navigation is committed. The document (and the resources it refers to, such as images and subframes)
       * might still be downloading, but at least part of the document has been received from the server and the browser has
       * decided to switch to the new document.
       */
      interface OnCommittedEvent
        extends Events.Event<(details: OnCommittedDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnCommittedDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when the page's DOM is fully constructed, but the referenced resources may not finish loading.
       */
      interface OnDOMContentLoadedEvent
        extends Events.Event<(details: OnDOMContentLoadedDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnDOMContentLoadedDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when a document, including the resources it refers to, is completely loaded and initialized.
       */
      interface OnCompletedEvent
        extends Events.Event<(details: OnCompletedDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnCompletedDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when an error occurs and the navigation is aborted. This can happen if either a network error occurred,
       * or the user aborted the navigation.
       */
      interface OnErrorOccurredEvent
        extends Events.Event<(details: OnErrorOccurredDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnErrorOccurredDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when a new window, or a new tab in an existing window, is created to host a navigation.
       */
      interface OnCreatedNavigationTargetEvent
        extends Events.Event<
          (details: OnCreatedNavigationTargetDetailsType) => void
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnCreatedNavigationTargetDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when the reference fragment of a frame was updated. All future events for that frame will use the updated URL.
       */
      interface OnReferenceFragmentUpdatedEvent
        extends Events.Event<
          (details: OnReferenceFragmentUpdatedDetailsType) => void
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnReferenceFragmentUpdatedDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      /**
       * Fired when the frame's history was updated to a new URL. All future events for that frame will use the updated URL.
       */
      interface OnHistoryStateUpdatedEvent
        extends Events.Event<
          (details: OnHistoryStateUpdatedDetailsType) => void
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filters Optional. Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of
         * UrlFilter are ignored for this event.
         */
        addListener(
          callback: (details: OnHistoryStateUpdatedDetailsType) => void,
          filters?: EventUrlFilters
        ): void;
      }

      interface Static {
        /**
         * Retrieves information about the given frame. A frame refers to an &lt;iframe&gt; or a &lt;frame&gt; of a web page and is
         * identified by a tab ID and a frame ID.
         *
         * @param details Information about the frame to retrieve information about.
         */
        getFrame(
          details: GetFrameDetailsType
        ): Promise<GetFrameCallbackDetailsType | null>;

        /**
         * Retrieves information about all frames of a given tab.
         *
         * @param details Information about the tab to retrieve all frames from.
         */
        getAllFrames(
          details: GetAllFramesDetailsType
        ): Promise<GetAllFramesCallbackDetailsItemType[] | null>;

        /**
         * Fired when a navigation is about to occur.
         */
        onBeforeNavigate: OnBeforeNavigateEvent;

        /**
         * Fired when a navigation is committed. The document (and the resources it refers to, such as images and subframes)
         * might still be downloading, but at least part of the document has been received from the server and the browser has
         * decided to switch to the new document.
         */
        onCommitted: OnCommittedEvent;

        /**
         * Fired when the page's DOM is fully constructed, but the referenced resources may not finish loading.
         */
        onDOMContentLoaded: OnDOMContentLoadedEvent;

        /**
         * Fired when a document, including the resources it refers to, is completely loaded and initialized.
         */
        onCompleted: OnCompletedEvent;

        /**
         * Fired when an error occurs and the navigation is aborted. This can happen if either a network error occurred,
         * or the user aborted the navigation.
         */
        onErrorOccurred: OnErrorOccurredEvent;

        /**
         * Fired when a new window, or a new tab in an existing window, is created to host a navigation.
         */
        onCreatedNavigationTarget: OnCreatedNavigationTargetEvent;

        /**
         * Fired when the reference fragment of a frame was updated. All future events for that frame will use the updated URL.
         */
        onReferenceFragmentUpdated: OnReferenceFragmentUpdatedEvent;

        /**
         * Fired when the contents of the tab is replaced by a different (usually previously pre-rendered) tab.
         */
        onTabReplaced: Events.Event<
          (details: OnTabReplacedDetailsType) => void
        >;

        /**
         * Fired when the frame's history was updated to a new URL. All future events for that frame will use the updated URL.
         */
        onHistoryStateUpdated: OnHistoryStateUpdatedEvent;
      }
    }

    /**
     * Namespace: browser.webRequest
     */
    namespace WebRequest {
      type ResourceType =
        | "main_frame"
        | "sub_frame"
        | "stylesheet"
        | "script"
        | "image"
        | "object"
        | "xmlhttprequest"
        | "xslt"
        | "ping"
        | "beacon"
        | "xml_dtd"
        | "font"
        | "media"
        | "websocket"
        | "csp_report"
        | "imageset"
        | "web_manifest"
        | "speculative"
        | "json"
        | "other";

      type OnBeforeRequestOptions = "blocking" | "requestBody" | "extraHeaders";

      type OnBeforeSendHeadersOptions =
        | "requestHeaders"
        | "blocking"
        | "extraHeaders";

      type OnSendHeadersOptions = "requestHeaders" | "extraHeaders";

      type OnHeadersReceivedOptions =
        | "blocking"
        | "responseHeaders"
        | "extraHeaders";

      type OnAuthRequiredOptions =
        | "responseHeaders"
        | "blocking"
        | "asyncBlocking"
        | "extraHeaders";

      type OnResponseStartedOptions = "responseHeaders" | "extraHeaders";

      type OnBeforeRedirectOptions = "responseHeaders" | "extraHeaders";

      type OnCompletedOptions = "responseHeaders" | "extraHeaders";

      /**
       * An object describing filters to apply to webRequest events.
       */
      interface RequestFilter {
        /**
         * A list of URLs or URL patterns. Requests that cannot match any of the URLs will be filtered out.
         */
        urls: string[];

        /**
         * A list of request types. Requests that cannot match any of the types will be filtered out.
         * Optional.
         */
        types?: ResourceType[];

        /**
         * Optional.
         */
        tabId?: number;

        /**
         * Optional.
         */
        windowId?: number;

        /**
         * If provided, requests that do not match the incognito state will be filtered out.
         * Optional.
         */
        incognito?: boolean;
      }

      /**
       * An array of HTTP headers. Each header is represented as a dictionary containing the keys <code>name</code>
       * and either <code>value</code> or <code>binaryValue</code>.
       */
      type HttpHeaders = HttpHeadersItemType[];

      /**
       * Returns value for event handlers that have the 'blocking' extraInfoSpec applied. Allows the event handler to modify
       * network requests.
       */
      interface BlockingResponse {
        /**
         * If true, the request is cancelled. Used in onBeforeRequest, this prevents the request from being sent.
         * Optional.
         */
        cancel?: boolean;

        /**
         * Only used as a response to the onBeforeRequest and onHeadersReceived events. If set,
         * the original request is prevented from being sent/completed and is instead redirected to the given URL.
         * Redirections to non-HTTP schemes such as data: are allowed. Redirects initiated by a redirect action use the original
         * request method for the redirect, with one exception: If the redirect is initiated at the onHeadersReceived stage,
         * then the redirect will be issued using the GET method.
         * Optional.
         */
        redirectUrl?: string;

        /**
         * Only used as a response to the onBeforeRequest event. If set, the original request is prevented from being
         * sent/completed and is instead upgraded to a secure request.  If any extension returns <code>redirectUrl</code>
         * during onBeforeRequest, <code>upgradeToSecure</code> will have no affect.
         * Optional.
         */
        upgradeToSecure?: boolean;

        /**
         * Only used as a response to the onBeforeSendHeaders event. If set, the request is made with these request headers instead.
         * Optional.
         */
        requestHeaders?: HttpHeaders;

        /**
         * Only used as a response to the onHeadersReceived event. If set, the server is assumed to have responded with these
         * response headers instead. Only return <code>responseHeaders</code> if you really want to modify the headers in order to
         * limit the number of conflicts (only one extension may modify <code>responseHeaders</code> for each request).
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * Only used as a response to the onAuthRequired event. If set, the request is made using the supplied credentials.
         * Optional.
         */
        authCredentials?: BlockingResponseAuthCredentialsType;
      }

      /**
       * Contains the certificate properties of the request if it is a secure request.
       */
      interface CertificateInfo {
        subject: string;

        issuer: string;

        /**
         * Contains start and end timestamps.
         */
        validity: CertificateInfoValidityType;

        fingerprint: CertificateInfoFingerprintType;

        serialNumber: string;

        isBuiltInRoot: boolean;

        subjectPublicKeyInfoDigest: CertificateInfoSubjectPublicKeyInfoDigestType;

        /**
         * Optional.
         */
        rawDER?: number[];
      }

      type CertificateTransparencyStatus =
        | "not_applicable"
        | "policy_compliant"
        | "policy_not_enough_scts"
        | "policy_not_diverse_scts";

      type TransportWeaknessReasons = "cipher";

      /**
       * Contains the security properties of the request (ie. SSL/TLS information).
       */
      interface SecurityInfo {
        state: SecurityInfoStateEnum;

        /**
         * Error message if state is "broken"
         * Optional.
         */
        errorMessage?: string;

        /**
         * Protocol version if state is "secure"
         * Optional.
         */
        protocolVersion?: SecurityInfoProtocolVersionEnum;

        /**
         * The cipher suite used in this request if state is "secure".
         * Optional.
         */
        cipherSuite?: string;

        /**
         * The key exchange algorithm used in this request if state is "secure".
         * Optional.
         */
        keaGroupName?: string;

        /**
         * The length (in bits) of the secret key.
         * Optional.
         */
        secretKeyLength?: number;

        /**
         * The signature scheme used in this request if state is "secure".
         * Optional.
         */
        signatureSchemeName?: string;

        /**
         * Certificate data if state is "secure".  Will only contain one entry unless <code>certificateChain</code>
         * is passed as an option.
         */
        certificates: CertificateInfo[];

        /**
         * The type of certificate error that was overridden for this connection, if any.
         * Optional.
         */
        overridableErrorCategory?: SecurityInfoOverridableErrorCategoryEnum;

        /**
         * Optional.
         */
        isExtendedValidation?: boolean;

        /**
         * Certificate transparency compliance per RFC 6962.  See <code>https://www.certificate-transparency.org/what-is-ct</code>
         * for more information.
         * Optional.
         */
        certificateTransparencyStatus?: CertificateTransparencyStatus;

        /**
         * True if host uses Strict Transport Security and state is "secure".
         * Optional.
         */
        hsts?: boolean;

        /**
         * True if host uses Public Key Pinning and state is "secure".
         * Optional.
         */
        hpkp?: string;

        /**
         * list of reasons that cause the request to be considered weak, if state is "weak"
         * Optional.
         */
        weaknessReasons?: TransportWeaknessReasons[];

        /**
         * True if the TLS connection used Encrypted Client Hello.
         * Optional.
         */
        usedEch?: boolean;

        /**
         * True if the TLS connection used Delegated Credentials.
         * Optional.
         */
        usedDelegatedCredentials?: boolean;

        /**
         * True if the TLS connection made OCSP requests.
         * Optional.
         */
        usedOcsp?: boolean;

        /**
         * True if the TLS connection used a privacy-preserving DNS transport like DNS-over-HTTPS.
         * Optional.
         */
        usedPrivateDns?: boolean;
      }

      /**
       * Contains data uploaded in a URL request.
       */
      interface UploadData {
        /**
         * An ArrayBuffer with a copy of the data.
         * Optional.
         */
        bytes?: unknown;

        /**
         * A string with the file's path and name.
         * Optional.
         */
        file?: string;
      }

      /**
       * Tracking flags that match our internal tracking classification
       */
      type UrlClassificationFlags =
        | "fingerprinting"
        | "fingerprinting_content"
        | "cryptomining"
        | "cryptomining_content"
        | "emailtracking"
        | "emailtracking_content"
        | "consentmanager"
        | "tracking"
        | "tracking_ad"
        | "tracking_analytics"
        | "tracking_social"
        | "tracking_content"
        | "any_basic_tracking"
        | "any_strict_tracking"
        | "any_social_tracking";

      /**
       * If the request has been classified this is an array of $(ref:UrlClassificationFlags).
       */
      type UrlClassificationParty = UrlClassificationFlags[];

      interface UrlClassification {
        /**
         * Classification flags if the request has been classified and it is first party.
         */
        firstParty: UrlClassificationParty;

        /**
         * Classification flags if the request has been classified and it or its window hierarchy is third party.
         */
        thirdParty: UrlClassificationParty;
      }

      type OnErrorOccurredOptions = "extraHeaders";

      /**
       * A BlockingResponse or a Promise<BlockingResponse>
       */
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      type BlockingResponseOrPromiseOrVoid =
        | BlockingResponse
        | Promise<BlockingResponse>
        | void;

      /**
       * "uninitialized": The StreamFilter is not fully initialized. No methods may be called until a "start" event has been
       * received.
       * "transferringdata": The underlying channel is currently transferring data, which will be dispatched via "data" events.
       * "finishedtransferringdata": The underlying channel has finished transferring data. Data may still be written via write()
       * calls at this point.
       * "suspended": Data transfer is currently suspended. It may be resumed by a call to resume().
       * Data may still be written via write() calls in this state.
       * "closed": The channel has been closed by a call to close(). No further data wlil be delivered via "data" events,
       * and no further data may be written via write() calls.
       * "disconnected": The channel has been disconnected by a call to disconnect(). All further data will be delivered directly,
       * without passing through the filter. No further events will be dispatched, and no further data may be written by write()
       * calls.
       * "failed": An error has occurred and the channel is disconnected. The `error`, property contains the details of the error.
       */
      type StreamFilterStatus =
        | "uninitialized"
        | "transferringdata"
        | "finishedtransferringdata"
        | "suspended"
        | "closed"
        | "disconnected"
        | "failed";

      /**
       * An interface which allows an extension to intercept, and optionally modify, response data from an HTTP request.
       */
      interface StreamFilter {
        /**
         * Returns the current status of the stream.
         */
        status: StreamFilterStatus;

        /**
         * After an "error" event has been dispatched, this contains a message describing the error.
         */
        error: string;

        /**
         * Creates a stream filter for the given add-on and the given extension ID.
         */
        create(requestId: number, addonId: string): void;

        /**
         * Suspends processing of the request. After this is called, no further data will be delivered until the request is resumed.
         */
        suspend(): void;

        /**
         * Resumes delivery of data for a suspended request.
         */
        resume(): void;

        /**
         * Closes the request. After this is called, no more data may be written to the stream,
         * and no further data will be delivered. This *must* be called after the consumer is finished writing data,
         * unless disconnect() has already been called.
         */
        close(): void;

        /**
         * Disconnects the stream filter from the request. After this is called, no further data will be delivered to the filter,
         * and any unprocessed data will be written directly to the output stream.
         */
        disconnect(): void;

        /**
         * Writes a chunk of data to the output stream. This may not be called before the "start" event has been received.
         */
        write(data: ArrayBuffer | Uint8Array): void;

        /**
         * Dispatched with a StreamFilterDataEvent whenever incoming data is available on the stream.
         * This data will not be delivered to the output stream unless it is explicitly written via a write() call.
         */
        ondata?: (data: StreamFilterEventData) => void;

        /**
         * Dispatched when the stream is opened, and is about to begin delivering data.
         */
        onstart?: (data: StreamFilterEventData) => void;

        /**
         * Dispatched when the stream has closed, and has no more data to deliver. The output stream remains open and writable
         * until close() is called.
         */
        onstop?: (data: StreamFilterEventData) => void;

        /**
         * Dispatched when an error has occurred. No further data may be read or written after this point.
         */
        onerror?: (data: StreamFilterEventData) => void;
      }

      interface StreamFilterEventData {
        /**
         * Contains a chunk of data read from the input stream.
         */
        data: ArrayBuffer;
      }

      interface GetSecurityInfoOptionsType {
        /**
         * Include the entire certificate chain.
         * Optional.
         */
        certificateChain?: boolean;

        /**
         * Include raw certificate data for processing by the extension.
         * Optional.
         */
        rawDER?: boolean;
      }

      interface OnBeforeRequestDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * Contains the HTTP request body data. Only provided if extraInfoSpec contains 'requestBody'.
         * Optional.
         */
        requestBody?: OnBeforeRequestDetailsTypeRequestBodyType;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnBeforeSendHeadersDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The HTTP request headers that are going to be sent out with this request.
         * Optional.
         */
        requestHeaders?: HttpHeaders;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnSendHeadersDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The HTTP request headers that have been sent out with this request.
         * Optional.
         */
        requestHeaders?: HttpHeaders;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnHeadersReceivedDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * HTTP status line of the response or the 'HTTP/0.9 200 OK' string for HTTP/0.9 responses (i.e.,
         * responses that lack a status line).
         */
        statusLine: string;

        /**
         * The HTTP response headers that have been received with this response.
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * Standard HTTP status code returned by the server.
         */
        statusCode: number;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnAuthRequiredDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The authentication scheme, e.g. Basic or Digest.
         */
        scheme: string;

        /**
         * The authentication realm provided by the server, if there is one.
         * Optional.
         */
        realm?: string;

        /**
         * The server requesting authentication.
         */
        challenger: OnAuthRequiredDetailsTypeChallengerType;

        /**
         * True for Proxy-Authenticate, false for WWW-Authenticate.
         */
        isProxy: boolean;

        /**
         * The HTTP response headers that were received along with this response.
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * HTTP status line of the response or the 'HTTP/0.9 200 OK' string for HTTP/0.9 responses (i.e.,
         * responses that lack a status line) or an empty string if there are no headers.
         */
        statusLine: string;

        /**
         * Standard HTTP status code returned by the server.
         */
        statusCode: number;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnResponseStartedDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The server IP address that the request was actually sent to. Note that it may be a literal IPv6 address.
         * Optional.
         */
        ip?: string;

        /**
         * Indicates if this response was fetched from disk cache.
         */
        fromCache: boolean;

        /**
         * Standard HTTP status code returned by the server.
         */
        statusCode: number;

        /**
         * The HTTP response headers that were received along with this response.
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * HTTP status line of the response or the 'HTTP/0.9 200 OK' string for HTTP/0.9 responses (i.e.,
         * responses that lack a status line) or an empty string if there are no headers.
         */
        statusLine: string;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnBeforeRedirectDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The server IP address that the request was actually sent to. Note that it may be a literal IPv6 address.
         * Optional.
         */
        ip?: string;

        /**
         * Indicates if this response was fetched from disk cache.
         */
        fromCache: boolean;

        /**
         * Standard HTTP status code returned by the server.
         */
        statusCode: number;

        /**
         * The new URL.
         */
        redirectUrl: string;

        /**
         * The HTTP response headers that were received along with this redirect.
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * HTTP status line of the response or the 'HTTP/0.9 200 OK' string for HTTP/0.9 responses (i.e.,
         * responses that lack a status line) or an empty string if there are no headers.
         */
        statusLine: string;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnCompletedDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The server IP address that the request was actually sent to. Note that it may be a literal IPv6 address.
         * Optional.
         */
        ip?: string;

        /**
         * Indicates if this response was fetched from disk cache.
         */
        fromCache: boolean;

        /**
         * Standard HTTP status code returned by the server.
         */
        statusCode: number;

        /**
         * The HTTP response headers that were received along with this response.
         * Optional.
         */
        responseHeaders?: HttpHeaders;

        /**
         * HTTP status line of the response or the 'HTTP/0.9 200 OK' string for HTTP/0.9 responses (i.e.,
         * responses that lack a status line) or an empty string if there are no headers.
         */
        statusLine: string;

        /**
         * Tracking classification if the request has been classified.
         */
        urlClassification: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * For http requests, the bytes transferred in the request. Only available in onCompleted.
         */
        requestSize: number;

        /**
         * For http requests, the bytes received in the request. Only available in onCompleted.
         */
        responseSize: number;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface OnErrorOccurredDetailsType {
        /**
         * The ID of the request. Request IDs are unique within a browser session. As a result,
         * they could be used to relate different events of the same request.
         */
        requestId: string;

        url: string;

        /**
         * Standard HTTP method.
         */
        method: string;

        /**
         * The value 0 indicates that the request happens in the main frame; a positive value indicates the ID of a subframe in
         * which the request happens. If the document of a (sub-)frame is loaded (<code>type</code> is <code>main_frame</code>
         * or <code>sub_frame</code>), <code>frameId</code> indicates the ID of this frame, not the ID of the outer frame.
         * Frame IDs are unique within a tab.
         */
        frameId: number;

        /**
         * ID of frame that wraps the frame which sent the request. Set to -1 if no parent frame exists.
         */
        parentFrameId: number;

        /**
         * True for private browsing requests.
         * Optional.
         */
        incognito?: boolean;

        /**
         * The cookie store ID of the contextual identity.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * URL of the resource that triggered this request.
         * Optional.
         */
        originUrl?: string;

        /**
         * URL of the page into which the requested resource will be loaded.
         * Optional.
         */
        documentUrl?: string;

        /**
         * The ID of the tab in which the request takes place. Set to -1 if the request isn't related to a tab.
         */
        tabId: number;

        /**
         * How the requested resource will be used.
         */
        type: ResourceType;

        /**
         * The time when this signal is triggered, in milliseconds since the epoch.
         */
        timeStamp: number;

        /**
         * The server IP address that the request was actually sent to. Note that it may be a literal IPv6 address.
         * Optional.
         */
        ip?: string;

        /**
         * Indicates if this response was fetched from disk cache.
         */
        fromCache: boolean;

        /**
         * The error description. This string is <em>not</em> guaranteed to remain backwards compatible between releases.
         * You must not parse and act based upon its content.
         */
        error: string;

        /**
         * Tracking classification if the request has been classified.
         * Optional.
         */
        urlClassification?: UrlClassification;

        /**
         * Indicates if this request and its content window hierarchy is third party.
         */
        thirdParty: boolean;

        /**
         * URL of the resource that triggered this request (on chrome).
         * Optional.
         */
        initiator?: string;
      }

      interface HttpHeadersItemType {
        /**
         * Name of the HTTP header.
         */
        name: string;

        /**
         * Value of the HTTP header if it can be represented by UTF-8.
         * Optional.
         */
        value?: string;

        /**
         * Value of the HTTP header if it cannot be represented by UTF-8, stored as individual byte values (0..255).
         * Optional.
         */
        binaryValue?: number[];
      }

      /**
       * Only used as a response to the onAuthRequired event. If set, the request is made using the supplied credentials.
       */
      interface BlockingResponseAuthCredentialsType {
        username: string;

        password: string;
      }

      /**
       * Contains start and end timestamps.
       */
      interface CertificateInfoValidityType {
        start: number;

        end: number;
      }

      interface CertificateInfoFingerprintType {
        sha1: string;

        sha256: string;
      }

      interface CertificateInfoSubjectPublicKeyInfoDigestType {
        sha256: string;
      }

      type SecurityInfoStateEnum = "insecure" | "weak" | "broken" | "secure";

      /**
       * Protocol version if state is "secure"
       */
      type SecurityInfoProtocolVersionEnum =
        | "TLSv1"
        | "TLSv1.1"
        | "TLSv1.2"
        | "TLSv1.3"
        | "unknown";

      /**
       * The type of certificate error that was overridden for this connection, if any.
       */
      type SecurityInfoOverridableErrorCategoryEnum =
        | "trust_error"
        | "domain_mismatch"
        | "expired_or_not_yet_valid";

      /**
       * Contains the HTTP request body data. Only provided if extraInfoSpec contains 'requestBody'.
       */
      interface OnBeforeRequestDetailsTypeRequestBodyType {
        /**
         * Errors when obtaining request body data.
         * Optional.
         */
        error?: string;

        /**
         * If the request method is POST and the body is a sequence of key-value pairs encoded in UTF8,
         * encoded as either multipart/form-data, or application/x-www-form-urlencoded, this dictionary is present and for each
         * key contains the list of all values for that key. If the data is of another media type, or if it is malformed,
         * the dictionary is not present. An example value of this dictionary is {'key': ['value1', 'value2']}.
         * Optional.
         */
        formData?: Record<string, string>;

        /**
         * If the request method is PUT or POST, and the body is not already parsed in formData,
         * then the unparsed request body elements are contained in this array.
         * Optional.
         */
        raw?: UploadData[];
      }

      /**
       * The server requesting authentication.
       */
      interface OnAuthRequiredDetailsTypeChallengerType {
        host: string;

        port: number;
      }

      /**
       * Fired when a request is about to occur.
       */
      interface OnBeforeRequestEvent
        extends Events.Event<
          (
            details: OnBeforeRequestDetailsType
          ) => BlockingResponseOrPromiseOrVoid
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (
            details: OnBeforeRequestDetailsType
          ) => BlockingResponseOrPromiseOrVoid,
          filter: RequestFilter,
          extraInfoSpec?: OnBeforeRequestOptions[]
        ): void;
      }

      /**
       * Fired before sending an HTTP request, once the request headers are available. This may occur after a TCP connection is
       * made to the server, but before any HTTP data is sent.
       */
      interface OnBeforeSendHeadersEvent
        extends Events.Event<
          (
            details: OnBeforeSendHeadersDetailsType
          ) => BlockingResponseOrPromiseOrVoid
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (
            details: OnBeforeSendHeadersDetailsType
          ) => BlockingResponseOrPromiseOrVoid,
          filter: RequestFilter,
          extraInfoSpec?: OnBeforeSendHeadersOptions[]
        ): void;
      }

      /**
       * Fired just before a request is going to be sent to the server (modifications of previous onBeforeSendHeaders callbacks
       * are visible by the time onSendHeaders is fired).
       */
      interface OnSendHeadersEvent
        extends Events.Event<(details: OnSendHeadersDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnSendHeadersDetailsType) => void,
          filter: RequestFilter,
          extraInfoSpec?: OnSendHeadersOptions[]
        ): void;
      }

      /**
       * Fired when HTTP response headers of a request have been received.
       */
      interface OnHeadersReceivedEvent
        extends Events.Event<
          (
            details: OnHeadersReceivedDetailsType
          ) => BlockingResponseOrPromiseOrVoid
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (
            details: OnHeadersReceivedDetailsType
          ) => BlockingResponseOrPromiseOrVoid,
          filter: RequestFilter,
          extraInfoSpec?: OnHeadersReceivedOptions[]
        ): void;
      }

      /**
       * Fired when an authentication failure is received. The listener has three options: it can provide authentication
       * credentials, it can cancel the request and display the error page, or it can take no action on the challenge.
       * If bad user credentials are provided, this may be called multiple times for the same request.
       */
      interface OnAuthRequiredEvent
        extends Events.Event<
          (
            details: OnAuthRequiredDetailsType
          ) => BlockingResponseOrPromiseOrVoid
        > {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (
            details: OnAuthRequiredDetailsType
          ) => BlockingResponseOrPromiseOrVoid,
          filter: RequestFilter,
          extraInfoSpec?: OnAuthRequiredOptions[]
        ): void;
      }

      /**
       * Fired when the first byte of the response body is received. For HTTP requests, this means that the status line and
       * response headers are available.
       */
      interface OnResponseStartedEvent
        extends Events.Event<(details: OnResponseStartedDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnResponseStartedDetailsType) => void,
          filter: RequestFilter,
          extraInfoSpec?: OnResponseStartedOptions[]
        ): void;
      }

      /**
       * Fired when a server-initiated redirect is about to occur.
       */
      interface OnBeforeRedirectEvent
        extends Events.Event<(details: OnBeforeRedirectDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnBeforeRedirectDetailsType) => void,
          filter: RequestFilter,
          extraInfoSpec?: OnBeforeRedirectOptions[]
        ): void;
      }

      /**
       * Fired when a request is completed.
       */
      interface OnCompletedEvent
        extends Events.Event<(details: OnCompletedDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnCompletedDetailsType) => void,
          filter: RequestFilter,
          extraInfoSpec?: OnCompletedOptions[]
        ): void;
      }

      /**
       * Fired when an error occurs.
       */
      interface OnErrorOccurredEvent
        extends Events.Event<(details: OnErrorOccurredDetailsType) => void> {
        /**
         * Registers an event listener <em>callback</em> to an event.
         *
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * @param filter A set of filters that restricts the events that will be sent to this listener.
         * @param extraInfoSpec Optional. Array of extra information that should be passed to the listener function.
         */
        addListener(
          callback: (details: OnErrorOccurredDetailsType) => void,
          filter: RequestFilter,
          extraInfoSpec?: OnErrorOccurredOptions[]
        ): void;
      }

      interface Static {
        /**
         * Needs to be called when the behavior of the webRequest handlers has changed to prevent incorrect handling due to caching.
         * This function call is expensive. Don't call it often.
         */
        handlerBehaviorChanged(): Promise<void>;

        /**
         * ...
         */
        filterResponseData(requestId: string): StreamFilter;

        /**
         * Retrieves the security information for the request.  Returns a promise that will resolve to a SecurityInfo object.
         *
         * @param options Optional.
         */
        getSecurityInfo(
          requestId: string,
          options?: GetSecurityInfoOptionsType
        ): Promise<SecurityInfo>;

        /**
         * Fired when a request is about to occur.
         */
        onBeforeRequest: OnBeforeRequestEvent;

        /**
         * Fired before sending an HTTP request, once the request headers are available. This may occur after a TCP connection is
         * made to the server, but before any HTTP data is sent.
         */
        onBeforeSendHeaders: OnBeforeSendHeadersEvent;

        /**
         * Fired just before a request is going to be sent to the server (modifications of previous onBeforeSendHeaders callbacks
         * are visible by the time onSendHeaders is fired).
         */
        onSendHeaders: OnSendHeadersEvent;

        /**
         * Fired when HTTP response headers of a request have been received.
         */
        onHeadersReceived: OnHeadersReceivedEvent;

        /**
         * Fired when an authentication failure is received. The listener has three options: it can provide authentication
         * credentials, it can cancel the request and display the error page, or it can take no action on the challenge.
         * If bad user credentials are provided, this may be called multiple times for the same request.
         */
        onAuthRequired: OnAuthRequiredEvent;

        /**
         * Fired when the first byte of the response body is received. For HTTP requests, this means that the status line and
         * response headers are available.
         */
        onResponseStarted: OnResponseStartedEvent;

        /**
         * Fired when a server-initiated redirect is about to occur.
         */
        onBeforeRedirect: OnBeforeRedirectEvent;

        /**
         * Fired when a request is completed.
         */
        onCompleted: OnCompletedEvent;

        /**
         * Fired when an error occurs.
         */
        onErrorOccurred: OnErrorOccurredEvent;

        /**
         * The maximum number of times that <code>handlerBehaviorChanged</code> can be called per 10 minute sustained interval.
         * <code>handlerBehaviorChanged</code> is an expensive function call that shouldn't be called often.
         */
        MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES: 20;
      }
    }

    /**
     * Namespace: browser.windows
     */
    namespace Windows {
      /**
       * The type of browser window this is. Under some circumstances a Window may not be assigned type property,
       * for example when querying closed windows from the $(ref:sessions) API.
       */
      type WindowType = "normal" | "popup" | "panel" | "app" | "devtools";

      /**
       * The state of this browser window. Under some circumstances a Window may not be assigned state property,
       * for example when querying closed windows from the $(ref:sessions) API.
       */
      type WindowState =
        | "normal"
        | "minimized"
        | "maximized"
        | "fullscreen"
        | "docked";

      interface Window {
        /**
         * The ID of the window. Window IDs are unique within a browser session. Under some circumstances a Window may not be
         * assigned an ID, for example when querying windows using the $(ref:sessions) API, in which case a session ID may be
         * present.
         * Optional.
         */
        id?: number;

        /**
         * Whether the window is currently the focused window.
         */
        focused: boolean;

        /**
         * The offset of the window from the top edge of the screen in pixels. Under some circumstances a Window may not be
         * assigned top property, for example when querying closed windows from the $(ref:sessions) API.
         * Optional.
         */
        top?: number;

        /**
         * The offset of the window from the left edge of the screen in pixels. Under some circumstances a Window may not be
         * assigned left property, for example when querying closed windows from the $(ref:sessions) API.
         * Optional.
         */
        left?: number;

        /**
         * The width of the window, including the frame, in pixels. Under some circumstances a Window may not be assigned width
         * property, for example when querying closed windows from the $(ref:sessions) API.
         * Optional.
         */
        width?: number;

        /**
         * The height of the window, including the frame, in pixels. Under some circumstances a Window may not be assigned height
         * property, for example when querying closed windows from the $(ref:sessions) API.
         * Optional.
         */
        height?: number;

        /**
         * Array of $(ref:tabs.Tab) objects representing the current tabs in the window.
         * Optional.
         */
        tabs?: Browser.Tabs.Tab[];

        /**
         * Whether the window is incognito.
         */
        incognito: boolean;

        /**
         * The type of browser window this is.
         * Optional.
         */
        type?: WindowType;

        /**
         * The state of this browser window.
         * Optional.
         */
        state?: WindowState;

        /**
         * Whether the window is set to be always on top.
         */
        alwaysOnTop: boolean;

        /**
         * The session ID used to uniquely identify a Window obtained from the $(ref:sessions) API.
         * Optional.
         */
        sessionId?: string;

        /**
         * The title of the window. Read-only.
         * Optional.
         */
        title?: string;
      }

      /**
       * Specifies what type of browser window to create. The 'panel' and 'detached_panel' types create a popup unless the
       * '--enable-panels' flag is set.
       */
      type CreateType = "normal" | "popup" | "panel" | "detached_panel";

      /**
       * Specifies whether the $(ref:windows.Window) returned should contain a list of the $(ref:tabs.Tab) objects.
       */
      interface GetInfo {
        /**
         * If true, the $(ref:windows.Window) returned will have a <var>tabs</var> property that contains a list of the $(ref:tabs.
         * Tab) objects. The <code>Tab</code> objects only contain the <code>url</code>, <code>title</code> and <code>
         * favIconUrl</code> properties if the extension's manifest file includes the <code>"tabs"</code> permission.
         * Optional.
         */
        populate?: boolean;
      }

      /**
       * Specifies properties used to filter the $(ref:windows.Window) returned and to determine whether they should contain a
       * list of the $(ref:tabs.Tab) objects.
       */
      interface GetAllGetInfoType extends GetInfo {
        /**
         * If set, the $(ref:windows.Window) returned will be filtered based on its type. If unset the default filter is set to
         * <code>['app', 'normal', 'panel', 'popup']</code>, with <code>'app'</code> and <code>'panel'</code>
         * window types limited to the extension's own windows.
         * Optional.
         */
        windowTypes?: WindowType[];
      }

      interface CreateCreateDataType {
        /**
         * A URL or array of URLs to open as tabs in the window. Fully-qualified URLs must include a scheme (i.e. 'http://www.
         * google.com', not 'www.google.com'). Relative URLs will be relative to the current page within the extension.
         * Defaults to the New Tab Page.
         * Optional.
         */
        url?: string | string[];

        /**
         * The id of the tab for which you want to adopt to the new window.
         * Optional.
         */
        tabId?: number;

        /**
         * The number of pixels to position the new window from the left edge of the screen. If not specified,
         * the new window is offset naturally from the last focused window. This value is ignored for panels.
         * Optional.
         */
        left?: number;

        /**
         * The number of pixels to position the new window from the top edge of the screen. If not specified,
         * the new window is offset naturally from the last focused window. This value is ignored for panels.
         * Optional.
         */
        top?: number;

        /**
         * The width in pixels of the new window, including the frame. If not specified defaults to a natural width.
         * Optional.
         */
        width?: number;

        /**
         * The height in pixels of the new window, including the frame. If not specified defaults to a natural height.
         * Optional.
         */
        height?: number;

        /**
         * If true, the new window will be focused. If false, the new window will be opened in the background and the currently
         * focused window will stay focused. Defaults to true.
         * Optional.
         */
        focused?: boolean;

        /**
         * Whether the new window should be an incognito window.
         * Optional.
         */
        incognito?: boolean;

        /**
         * Specifies what type of browser window to create. The 'panel' and 'detached_panel' types create a popup unless the
         * '--enable-panels' flag is set.
         * Optional.
         */
        type?: CreateType;

        /**
         * The initial state of the window. The 'minimized', 'maximized' and 'fullscreen' states cannot be combined with 'left',
         * 'top', 'width' or 'height'.
         * Optional.
         */
        state?: WindowState;

        /**
         * Allow scripts to close the window.
         * Optional.
         */
        allowScriptsToClose?: boolean;

        /**
         * The CookieStoreId to use for all tabs that were created when the window is opened.
         * Optional.
         */
        cookieStoreId?: string;

        /**
         * A string to add to the beginning of the window title.
         * Optional.
         */
        titlePreface?: string;
      }

      interface UpdateUpdateInfoType {
        /**
         * The offset from the left edge of the screen to move the window to in pixels. This value is ignored for panels.
         * Optional.
         */
        left?: number;

        /**
         * The offset from the top edge of the screen to move the window to in pixels. This value is ignored for panels.
         * Optional.
         */
        top?: number;

        /**
         * The width to resize the window to in pixels. This value is ignored for panels.
         * Optional.
         */
        width?: number;

        /**
         * The height to resize the window to in pixels. This value is ignored for panels.
         * Optional.
         */
        height?: number;

        /**
         * If true, brings the window to the front. If false, brings the next window in the z-order to the front.
         * Optional.
         */
        focused?: boolean;

        /**
         * If true, causes the window to be displayed in a manner that draws the user's attention to the window,
         * without changing the focused window. The effect lasts until the user changes focus to the window.
         * This option has no effect if the window already has focus. Set to false to cancel a previous draw attention request.
         * Optional.
         */
        drawAttention?: boolean;

        /**
         * The new state of the window. The 'minimized', 'maximized' and 'fullscreen' states cannot be combined with 'left', 'top',
         * 'width' or 'height'.
         * Optional.
         */
        state?: WindowState;

        /**
         * A string to add to the beginning of the window title.
         * Optional.
         */
        titlePreface?: string;
      }

      interface Static {
        /**
         * Gets details about a window.
         *
         * @param getInfo Optional.
         */
        get(windowId: number, getInfo?: GetInfo): Promise<Window>;

        /**
         * Gets the $(topic:current-window)[current window].
         *
         * @param getInfo Optional.
         */
        getCurrent(getInfo?: GetInfo): Promise<Window>;

        /**
         * Gets the window that was most recently focused &mdash; typically the window 'on top'.
         *
         * @param getInfo Optional.
         */
        getLastFocused(getInfo?: GetInfo): Promise<Window>;

        /**
         * Gets all windows.
         *
         * @param getInfo Optional. Specifies properties used to filter the $(ref:windows.Window)
         * returned and to determine whether they should contain a list of the $(ref:tabs.Tab) objects.
         */
        getAll(getInfo?: GetAllGetInfoType): Promise<Window[]>;

        /**
         * Creates (opens) a new browser with any optional sizing, position or default URL provided.
         *
         * @param createData Optional.
         */
        create(createData?: CreateCreateDataType): Promise<Window>;

        /**
         * Updates the properties of a window. Specify only the properties that you want to change; unspecified properties will be
         * left unchanged.
         */
        update(
          windowId: number,
          updateInfo: UpdateUpdateInfoType
        ): Promise<Window>;

        /**
         * Removes (closes) a window, and all the tabs inside it.
         */
        remove(windowId: number): Promise<void>;

        /**
         * Fired when a window is created.
         *
         * @param window Details of the window that was created.
         */
        onCreated: Events.Event<(window: Window) => void>;

        /**
         * Fired when a window is removed (closed).
         *
         * @param windowId ID of the removed window.
         */
        onRemoved: Events.Event<(windowId: number) => void>;

        /**
         * Fired when the currently focused window changes. Will be $(ref:windows.WINDOW_ID_NONE)
         * if all browser windows have lost focus. Note: On some Linux window managers, WINDOW_ID_NONE will always be sent
         * immediately preceding a switch from one browser window to another.
         *
         * @param windowId ID of the newly focused window.
         */
        onFocusChanged: Events.Event<(windowId: number) => void>;

        /**
         * The windowId value that represents the absence of a browser window.
         */
        WINDOW_ID_NONE: -1;

        /**
         * The windowId value that represents the $(topic:current-window)[current window].
         */
        WINDOW_ID_CURRENT: -2;
      }
    }

    namespace BrowserSettings {
      namespace ColorManagement {
        interface Static {
          /**
           * This setting controls the mode used for color management and must be a string from $(ref:browserSettings.
           * ColorManagementMode)
           */
          mode: Browser.Types.Setting;

          /**
           * This boolean setting controls whether or not native sRGB color management is used.
           */
          useNativeSRGB: Browser.Types.Setting;

          /**
           * This boolean setting controls whether or not the WebRender compositor is used.
           */
          useWebRenderCompositor: Browser.Types.Setting;
        }
      }
    }

    namespace Devtools {
      namespace InspectedWindow {
        /**
         * A resource within the inspected page, such as a document, a script, or an image.
         */
        interface Resource {
          /**
           * The URL of the resource.
           */
          url: string;
        }

        /**
         * The options parameter can contain one or more options.
         */
        interface EvalOptionsType {
          [s: string]: unknown;
        }

        /**
         * An object providing details if an exception occurred while evaluating the expression.
         */
        interface EvalCallbackExceptionInfoType {
          /**
           * Set if the error occurred on the DevTools side before the expression is evaluated.
           */
          isError: boolean;

          /**
           * Set if the error occurred on the DevTools side before the expression is evaluated.
           */
          code: string;

          /**
           * Set if the error occurred on the DevTools side before the expression is evaluated.
           */
          description: string;

          /**
           * Set if the error occurred on the DevTools side before the expression is evaluated,
           * contains the array of the values that may be substituted into the description string to provide more information about
           * the cause of the error.
           */
          details: unknown[];

          /**
           * Set if the evaluated code produces an unhandled exception.
           */
          isException: boolean;

          /**
           * Set if the evaluated code produces an unhandled exception.
           */
          value: string;
        }

        interface ReloadReloadOptionsType {
          /**
           * When true, the loader will bypass the cache for all inspected page resources loaded before the <code>load</code>
           * event is fired. The effect is similar to pressing Ctrl+Shift+R in the inspected window or within the Developer Tools
           * window.
           * Optional.
           */
          ignoreCache?: boolean;

          /**
           * If specified, the string will override the value of the <code>User-Agent</code> HTTP header that's sent while loading
           * the resources of the inspected page. The string will also override the value of the <code>navigator.userAgent</code>
           * property that's returned to any scripts that are running within the inspected page.
           * Optional.
           */
          userAgent?: string;

          /**
           * If specified, the script will be injected into every frame of the inspected page immediately upon load,
           * before any of the frame's scripts. The script will not be injected after subsequent reloads&mdash;for example,
           * if the user presses Ctrl+R.
           * Optional.
           */
          injectedScript?: string;
        }

        interface Static {
          /**
           * Evaluates a JavaScript expression in the context of the main frame of the inspected page.
           * The expression must evaluate to a JSON-compliant object, otherwise an exception is thrown.
           * The eval function can report either a DevTools-side error or a JavaScript exception that occurs during evaluation.
           * In either case, the <code>result</code> parameter of the callback is <code>undefined</code>.
           * In the case of a DevTools-side error, the <code>isException</code> parameter is non-null and has <code>isError</code>
           * set to true and <code>code</code> set to an error code. In the case of a JavaScript error, <code>isException</code>
           * is set to true and <code>value</code> is set to the string value of thrown object.
           *
           * @param expression An expression to evaluate.
           * @param options Optional. The options parameter can contain one or more options.
           * @returns A function called when evaluation completes.
           */
          eval(
            expression: string,
            options?: EvalOptionsType
          ): Promise<[unknown, EvalCallbackExceptionInfoType]>;

          /**
           * Reloads the inspected page.
           *
           * @param reloadOptions Optional.
           */
          reload(reloadOptions?: ReloadReloadOptionsType): void;

          /**
           * The ID of the tab being inspected. This ID may be used with chrome.tabs.* API.
           */
          tabId: number;
        }
      }
    }

    namespace Devtools {
      namespace Network {
        /**
         * Represents a network request for a document resource (script, image and so on). See HAR Specification for reference.
         */
        interface Request {
          /**
           * Returns content of the response body.
           *
           * @returns A function that receives the response body when the request completes.
           */
          getContent(): Promise<[string, string]>;
        }

        /**
         * A HAR log. See HAR specification for details.
         */
        interface GetHARCallbackHarLogType {
          [s: string]: unknown;
        }

        interface Static {
          /**
           * Returns HAR log that contains all known network requests.
           *
           * @returns A function that receives the HAR log when the request completes.
           */
          getHAR(): Promise<GetHARCallbackHarLogType>;

          /**
           * Fired when a network request is finished and all request data are available.
           *
           * @param request Description of a network request in the form of a HAR entry. See HAR specification for details.
           */
          onRequestFinished: Events.Event<(request: Request) => void>;

          /**
           * Fired when the inspected window navigates to a new page.
           *
           * @param url URL of the new page.
           */
          onNavigated: Events.Event<(url: string) => void>;
        }
      }
    }

    namespace Devtools {
      namespace Panels {
        /**
         * Represents the Elements panel.
         */
        interface ElementsPanel {
          /**
           * Creates a pane within panel's sidebar.
           *
           * @param title Text that is displayed in sidebar caption.
           * @returns A callback invoked when the sidebar is created.
           */
          createSidebarPane(title: string): Promise<ExtensionSidebarPane>;

          /**
           * Fired when an object is selected in the panel.
           */
          onSelectionChanged: Events.Event<() => void>;
        }

        /**
         * Represents the Sources panel.
         */
        interface SourcesPanel {
          [s: string]: unknown;
        }

        /**
         * Represents a panel created by extension.
         */
        interface ExtensionPanel {
          /**
           * Fired when the user switches to the panel.
           *
           * @param window The JavaScript <code>window</code> object of panel's page.
           */
          onShown: Events.Event<(window: Window) => void>;

          /**
           * Fired when the user switches away from the panel.
           */
          onHidden: Events.Event<() => void>;
        }

        /**
         * A sidebar created by the extension.
         */
        interface ExtensionSidebarPane {
          /**
           * Sets an expression that is evaluated within the inspected page. The result is displayed in the sidebar pane.
           *
           * @param expression An expression to be evaluated in context of the inspected page. JavaScript objects and DOM nodes are
           * displayed in an expandable tree similar to the console/watch.
           * @param rootTitle Optional. An optional title for the root of the expression tree.
           * @returns A callback invoked after the sidebar pane is updated with the expression evaluation results.
           */
          setExpression(expression: string, rootTitle?: string): Promise<void>;

          /**
           * Sets a JSON-compliant object to be displayed in the sidebar pane.
           *
           * @param jsonObject An object to be displayed in context of the inspected page. Evaluated in the context of the caller
           * (API client).
           * @param rootTitle Optional. An optional title for the root of the expression tree.
           * @returns A callback invoked after the sidebar is updated with the object.
           */
          setObject(
            jsonObject: string | unknown[] | Record<string, unknown>,
            rootTitle?: string
          ): Promise<void>;

          /**
           * Sets an HTML page to be displayed in the sidebar pane.
           *
           * @param path Relative path of an extension page to display within the sidebar.
           */
          setPage(path: Browser.Manifest.ExtensionURL): Promise<void>;

          /**
           * Fired when the sidebar pane becomes visible as a result of user switching to the panel that hosts it.
           *
           * @param window The JavaScript <code>window</code> object of the sidebar page, if one was set with the <code>setPage()
           * </code> method.
           */
          onShown: Events.Event<(window: Window) => void>;

          /**
           * Fired when the sidebar pane becomes hidden as a result of the user switching away from the panel that hosts the sidebar
           * pane.
           */
          onHidden: Events.Event<() => void>;
        }

        /**
         * A button created by the extension.
         */
        interface Button {
          [s: string]: unknown;
        }

        interface Static {
          /**
           * Creates an extension panel.
           *
           * @param title Title that is displayed next to the extension icon in the Developer Tools toolbar.
           * @param iconPath Path of the panel's icon relative to the extension directory, or an empty string to use the default
           * extension icon as the panel icon.
           * @param pagePath Path of the panel's HTML page relative to the extension directory.
           * @returns A function that is called when the panel is created.
           */
          create(
            title: string,
            iconPath: "" | Browser.Manifest.ExtensionURL,
            pagePath: Browser.Manifest.ExtensionURL
          ): Promise<ExtensionPanel>;

          /**
           * Fired when the devtools theme changes.
           *
           * @param themeName The name of the current devtools theme.
           */
          onThemeChanged: Events.Event<(themeName: string) => void>;

          /**
           * Elements panel.
           */
          elements: ElementsPanel;

          /**
           * Sources panel.
           */
          sources: SourcesPanel;

          /**
           * The name of the current devtools theme.
           */
          themeName: string;
        }
      }
    }

    namespace Privacy {
      namespace Network {
        /**
         * The IP handling policy of WebRTC.
         */
        type IPHandlingPolicy =
          | "default"
          | "default_public_and_private_interfaces"
          | "default_public_interface_only"
          | "disable_non_proxied_udp"
          | "proxy_only";

        /**
         * An object which describes TLS minimum and maximum versions.
         */
        interface tlsVersionRestrictionConfig {
          /**
           * The minimum TLS version supported.
           * Optional.
           */
          minimum?: TlsVersionRestrictionConfigMinimumEnum;

          /**
           * The maximum TLS version supported.
           * Optional.
           */
          maximum?: TlsVersionRestrictionConfigMaximumEnum;
        }

        /**
         * The mode for https-only mode.
         */
        type HTTPSOnlyModeOption = "always" | "private_browsing" | "never";

        /**
         * The minimum TLS version supported.
         */
        type TlsVersionRestrictionConfigMinimumEnum =
          | "TLSv1"
          | "TLSv1.1"
          | "TLSv1.2"
          | "TLSv1.3"
          | "unknown";

        /**
         * The maximum TLS version supported.
         */
        type TlsVersionRestrictionConfigMaximumEnum =
          | "TLSv1"
          | "TLSv1.1"
          | "TLSv1.2"
          | "TLSv1.3"
          | "unknown";

        interface Static {
          /**
           * If enabled, the browser attempts to speed up your web browsing experience by pre-resolving DNS entries,
           * prerendering sites (<code>&lt;link rel='prefetch' ...&gt;</code>), and preemptively opening TCP and SSL connections to
           * servers.  This preference's value is a boolean, defaulting to <code>true</code>.
           */
          networkPredictionEnabled: Browser.Types.Setting;

          /**
           * Allow users to enable and disable RTCPeerConnections (aka WebRTC).
           */
          peerConnectionEnabled: Browser.Types.Setting;

          /**
           * Allow users to specify the media performance/privacy tradeoffs which impacts how WebRTC traffic will be routed and how
           * much local address information is exposed. This preference's value is of type IPHandlingPolicy, defaulting to <code>
           * default</code>.
           */
          webRTCIPHandlingPolicy: Browser.Types.Setting;

          /**
           * This property controls the minimum and maximum TLS versions. This setting's value is an object of
           * $(ref:tlsVersionRestrictionConfig).
           */
          tlsVersionRestriction: Browser.Types.Setting;

          /**
           * Allow users to query the mode for 'HTTPS-Only Mode'. This setting's value is of type HTTPSOnlyModeOption,
           * defaulting to <code>never</code>.
           */
          httpsOnlyMode: Browser.Types.Setting;

          /**
           * Allow users to query the status of 'Global Privacy Control'. This setting's value is of type boolean,
           * defaulting to <code>false</code>.
           */
          globalPrivacyControl: Browser.Types.Setting;
        }
      }
    }

    namespace Privacy {
      namespace Services {
        interface Static {
          /**
           * If enabled, the password manager will ask if you want to save passwords. This preference's value is a boolean,
           * defaulting to <code>true</code>.
           */
          passwordSavingEnabled: Browser.Types.Setting;
        }
      }
    }

    namespace Privacy {
      namespace Websites {
        /**
         * The mode for tracking protection.
         */
        type TrackingProtectionModeOption =
          | "always"
          | "never"
          | "private_browsing";

        /**
         * The settings for cookies.
         */
        interface CookieConfig {
          /**
           * The type of cookies to allow.
           * Optional.
           */
          behavior?: CookieConfigBehaviorEnum;
        }

        /**
         * The type of cookies to allow.
         */
        type CookieConfigBehaviorEnum =
          | "allow_all"
          | "reject_all"
          | "reject_third_party"
          | "allow_visited"
          | "reject_trackers"
          | "reject_trackers_and_partition_foreign";

        interface Static {
          /**
           * If enabled, the browser sends auditing pings when requested by a website (<code>&lt;a ping&gt;</code>).
           * The value of this preference is of type boolean, and the default value is <code>true</code>.
           */
          hyperlinkAuditingEnabled: Browser.Types.Setting;

          /**
           * If enabled, the browser sends <code>referer</code> headers with your requests. Yes,
           * the name of this preference doesn't match the misspelled header. No, we're not going to change it.
           * The value of this preference is of type boolean, and the default value is <code>true</code>.
           */
          referrersEnabled: Browser.Types.Setting;

          /**
           * If enabled, the browser attempts to appear similar to other users by reporting generic information to websites.
           * This can prevent websites from uniquely identifying users. Examples of data that is spoofed include number of CPU cores,
           * precision of JavaScript timers, the local timezone, and disabling features such as GamePad support,
           * and the WebSpeech and Navigator APIs. The value of this preference is of type boolean, and the default value is <code>
           * false</code>.
           */
          resistFingerprinting: Browser.Types.Setting;

          /**
           * If enabled, the browser will associate all data (including cookies, HSTS data, cached images, and more)
           * for any third party domains with the domain in the address bar. This prevents third party trackers from using directly
           * stored information to identify you across different websites, but may break websites where you login with a third party
           * account (such as a Facebook or Google login.) The value of this preference is of type boolean,
           * and the default value is <code>false</code>.
           */
          firstPartyIsolate: Browser.Types.Setting;

          /**
           * Allow users to specify the mode for tracking protection. This setting's value is of type TrackingProtectionModeOption,
           * defaulting to <code>private_browsing_only</code>.
           */
          trackingProtectionMode: Browser.Types.Setting;

          /**
           * Allow users to specify the default settings for allowing cookies, as well as whether all cookies should be created as
           * non-persistent cookies. This setting's value is of type CookieConfig.
           */
          cookieConfig: Browser.Types.Setting;
        }
      }
    }

    namespace Trial {
      namespace Ml {
        interface CreateEngineRequest {
          [s: string]: unknown;
        }

        interface RunEngineRequest {
          [s: string]: unknown;
        }

        /**
         * Object containing the data, see https://firefox-source-docs.mozilla.org/toolkit/components/ml/notifications.html
         */
        interface OnProgressProgressDataType {
          [s: string]: unknown;
        }

        interface Static {
          /**
           * Prepare the inference engine
           */
          createEngine(CreateEngineRequest: CreateEngineRequest): void;

          /**
           * Call the inference engine
           */
          runEngine(RunEngineRequest: RunEngineRequest): void;

          /**
           * Delete the models the extension downloaded.
           */
          deleteCachedModels(): void;

          /**
           * Events from the inference engine.
           *
           * @param progressData Object containing the data, see https://firefox-source-docs.mozilla.
           * org/toolkit/components/ml/notifications.html
           */
          onProgress: Events.Event<
            (progressData: OnProgressProgressDataType) => void
          >;
        }
      }
    }

    interface Browser {
      /**
       * Monitor extension activity
       *
       * Permissions: "activityLog"
       */
      activityLog: ActivityLog.Static;

      /**
       * Permissions: "alarms"
       */
      alarms: Alarms.Static;

      /**
       * Use the <code>browser.bookmarks</code> API to create, organize, and otherwise manipulate bookmarks.
       * Also see $(topic:override)[Override Pages], which you can use to create a custom Bookmark Manager page.
       *
       * Permissions: "bookmarks"
       */
      bookmarks: Bookmarks.Static;

      /**
       * Use browser actions to put icons in the main browser toolbar, to the right of the address bar. In addition to its icon,
       * a browser action can also have a tooltip, a badge, and a popup.
       *
       * Permissions: "manifest:action", "manifest:browser_action"
       */
      action: Action.Static;

      /**
       * Permissions: "manifest:action", "manifest:browser_action"
       */
      browserAction: BrowserAction.Static;

      /**
       * Use the <code>browser.browserSettings</code> API to control global settings of the browser.
       *
       * Permissions: "browserSettings"
       */
      browserSettings: BrowserSettings.Static;

      /**
       * Use the <code>chrome.browsingData</code> API to remove browsing data from a user's local profile.
       *
       * Permissions: "browsingData"
       */
      browsingData: BrowsingData.Static;

      /**
       * This API provides the ability detect the captive portal state of the users connection.
       *
       * Permissions: "captivePortal"
       */
      captivePortal: CaptivePortal.Static;

      /**
       * Offers the ability to write to the clipboard. Reading is not supported because the clipboard can already be read through
       * the standard web platform APIs.
       *
       * Permissions: "clipboardWrite"
       */
      clipboard: Clipboard.Static;

      /**
       * Use the commands API to add keyboard shortcuts that trigger actions in your extension, for example,
       * an action to open the browser action or send a command to the xtension.
       *
       * Permissions: "manifest:commands"
       */
      commands: Commands.Static;

      contentScripts: ContentScripts.Static;

      /**
       * Use the <code>browser.contextualIdentities</code> API to query and modify contextual identity, also called as containers.
       *
       * Permissions: "contextualIdentities"
       */
      contextualIdentities: ContextualIdentities.Static;

      /**
       * Use the <code>browser.cookies</code> API to query and modify cookies, and to be notified when they change.
       *
       * Permissions: "cookies"
       */
      cookies: Cookies.Static;

      /**
       * Use the <code>chrome.declarativeContent</code> API to take actions depending on the content of a page,
       * without requiring permission to read the page's content.
       */
      declarativeContent: DeclarativeContent.Static;

      /**
       * Use the declarativeNetRequest API to block or modify network requests by specifying declarative rules.
       *
       * Permissions: "declarativeNetRequest", "declarativeNetRequestWithHostAccess"
       */
      declarativeNetRequest: DeclarativeNetRequest.Static;

      /**
       * Permissions: "manifest:devtools_page"
       */
      devtools: Devtools.Static;

      /**
       * Asynchronous DNS API
       *
       * Permissions: "dns"
       */
      dns: Dns.Static;

      /**
       * Permissions: "downloads"
       */
      downloads: Downloads.Static;

      /**
       * The <code>chrome.events</code> namespace contains common types used by APIs dispatching events to notify you when
       * something interesting happens.
       */
      events: Events.Static;

      experiments: Experiments.Static;

      /**
       * The <code>browser.extensionTypes</code> API contains type declarations for WebExtensions.
       */
      extensionTypes: ExtensionTypes.Static;

      /**
       * The <code>browser.extension</code> API has utilities that can be used by any extension page.
       * It includes support for exchanging messages between an extension and its content scripts or between extensions,
       * as described in detail in $(topic:messaging)[Message Passing].
       */
      extension: Extension.Static;

      /**
       * Use the <code>browser.find</code> API to interact with the browser's <code>Find</code> interface.
       *
       * Permissions: "find"
       */
      find: Find.Static;

      /**
       * Exposes the browser's profiler.
       *
       * Permissions: "geckoProfiler"
       */
      geckoProfiler: GeckoProfiler.Static;

      /**
       * Use the <code>browser.history</code> API to interact with the browser's record of visited pages. You can add, remove,
       * and query for URLs in the browser's history. To override the history page with your own version, see $(topic:override)
       * [Override Pages].
       *
       * Permissions: "history"
       */
      history: History.Static;

      /**
       * Use the <code>browser.i18n</code> infrastructure to implement internationalization across your whole app or extension.
       */
      i18n: I18n.Static;

      /**
       * Use the chrome.identity API to get OAuth2 access tokens.
       *
       * Permissions: "identity"
       */
      identity: Identity.Static;

      /**
       * Use the <code>browser.idle</code> API to detect when the machine's idle state changes.
       *
       * Permissions: "idle"
       */
      idle: Idle.Static;

      /**
       * The <code>browser.management</code> API provides ways to manage the list of extensions that are installed and running.
       */
      management: Management.Static;

      /**
       * Permissions: -
       */
      manifest: Manifest.Static;

      /**
       * Use the browser.contextMenus API to add items to the browser's context menu. You can choose what types of objects your
       * context menu additions apply to, such as images, hyperlinks, and pages.
       *
       * Permissions: "contextMenus"
       */
      contextMenus: ContextMenus.Static;

      /**
       * Use the browser.menus API to add items to the browser's menus. You can choose what types of objects your context menu
       * additions apply to, such as images, hyperlinks, and pages.
       *
       * Permissions: "menus"
       */
      menus: Menus.Static;

      /**
       * This API provides the ability to determine the status of and detect changes in the network connection.
       * This API can only be used in privileged extensions.
       *
       * Permissions: "networkStatus"
       */
      networkStatus: NetworkStatus.Static;

      /**
       * Normandy Study API
       *
       * Permissions: "normandyAddonStudy"
       */
      normandyAddonStudy: NormandyAddonStudy.Static;

      /**
       * Permissions: "notifications"
       */
      notifications: Notifications.Static;

      /**
       * The omnibox API allows you to register a keyword with Firefox's address bar.
       *
       * Permissions: "manifest:omnibox"
       */
      omnibox: Omnibox.Static;

      /**
       * Use the <code>browser.pageAction</code> API to put icons inside the address bar. Page actions represent actions that can
       * be taken on the current page, but that aren't applicable to all pages.
       *
       * Permissions: "manifest:page_action"
       */
      pageAction: PageAction.Static;

      permissions: Permissions.Static;

      /**
       * PKCS#11 module management API
       *
       * Permissions: "pkcs11"
       */
      pkcs11: Pkcs11.Static;

      /**
       * Permissions: "privacy"
       */
      privacy: Privacy.Static;

      /**
       * Provides access to global proxy settings for Firefox and proxy event listeners to handle dynamic proxy implementations.
       *
       * Permissions: "proxy"
       */
      proxy: Proxy.Static;

      /**
       * Use the <code>browser.runtime</code> API to retrieve the background page, return details about the manifest,
       * and listen for and respond to events in the app or extension lifecycle. You can also use this API to convert the
       * relative path of URLs to fully-qualified URLs.
       */
      runtime: Runtime.Static;

      /**
       * Use the scripting API to execute script in different contexts.
       *
       * Permissions: "scripting"
       */
      scripting: Scripting.Static;

      /**
       * Use browser.search to interact with search engines.
       *
       * Permissions: "search"
       */
      search: Search.Static;

      /**
       * Use the <code>chrome.sessions</code> API to query and restore tabs and windows from a browsing session.
       *
       * Permissions: "sessions"
       */
      sessions: Sessions.Static;

      /**
       * Use sidebar actions to add a sidebar to Firefox.
       *
       * Permissions: "manifest:sidebar_action"
       */
      sidebarAction: SidebarAction.Static;

      /**
       * Use the <code>browser.storage</code> API to store, retrieve, and track changes to user data.
       *
       * Permissions: "storage"
       */
      storage: Storage.Static;

      /**
       * Use the browser.tabGroups API to interact with the browser's tab grouping system. You can use this API to modify,
       * and rearrange tab groups.
       *
       * Permissions: "tabGroups"
       */
      tabGroups: TabGroups.Static;

      /**
       * Use the <code>browser.tabs</code> API to interact with the browser's tab system. You can use this API to create, modify,
       * and rearrange tabs in the browser.
       */
      tabs: Tabs.Static;

      /**
       * The theme API allows customizing of visual elements of the browser.
       */
      theme: Theme.Static;

      /**
       * Use the chrome.topSites API to access the top sites that are displayed on the new tab page.
       *
       * Permissions: "topSites"
       */
      topSites: TopSites.Static;

      /**
       * Permissions: "trialML"
       */
      trial: Trial.Static;

      /**
       * Contains types used by other schemas.
       */
      types: Types.Static;

      /**
       * Permissions: "manifest:user_scripts", "userScripts"
       */
      userScripts: UserScripts.Static;

      /**
       * Use the <code>browser.webNavigation</code> API to receive notifications about the status of navigation requests
       * in-flight.
       *
       * Permissions: "webNavigation"
       */
      webNavigation: WebNavigation.Static;

      /**
       * Use the <code>browser.webRequest</code> API to observe and analyze traffic and to intercept, block,
       * or modify requests in-flight.
       *
       * Permissions: "webRequest"
       */
      webRequest: WebRequest.Static;

      /**
       * Use the <code>browser.windows</code> API to interact with browser windows. You can use this API to create, modify,
       * and rearrange windows in the browser.
       */
      windows: Windows.Static;
    }
  }
}

export {};
