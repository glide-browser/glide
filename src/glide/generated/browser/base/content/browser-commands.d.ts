declare var kSkipCacheFlags: number;
declare namespace BrowserCommands {
    function back(aEvent: any): void;
    function forward(aEvent: any): void;
    function handleBackspace(): void;
    function handleShiftBackspace(): void;
    function gotoHistoryIndex(aEvent: any): boolean;
    function reloadOrDuplicate(aEvent: any): void;
    function reload(): void;
    function reloadSkipCache(): void;
    function reloadWithFlags(reloadFlags: any): void;
    function stop(): void;
    function home(aEvent: any): void;
    function openTab({ event, url }?: {}): void;
    function openFileWindow(): void;
    function closeTabOrWindow(event: any): void;
    function tryToCloseWindow(event: any): void;
    /**
     * Open the View Source dialog.
     *
     * @param args
     *        An object with the following properties:
     *
     *        URL (required):
     *          A string URL for the page we'd like to view the source of.
     *        browser (optional):
     *          The browser containing the document that we would like to view the
     *          source of. This is required if outerWindowID is passed.
     *        outerWindowID (optional):
     *          The outerWindowID of the content window containing the document that
     *          we want to view the source of. You only need to provide this if you
     *          want to attempt to retrieve the document source from the network
     *          cache.
     *        lineNumber (optional):
     *          The line number to focus on once the source is loaded.
     */
    function viewSourceOfDocument(args: any): Promise<void>;
    /**
     * Opens the View Source dialog for the source loaded in the root
     * top-level document of the browser. This is really just a
     * convenience wrapper around viewSourceOfDocument.
     *
     * @param browser
     *        The browser that we want to load the source of.
     */
    function viewSource(browser: any): void;
    /**
     * @param documentURL URL of the document to view, or null for this window's document
     * @param initialTab name of the initial tab to display, or null for the first tab
     * @param imageElement image to load in the Media Tab of the Page Info window; can be null/omitted
     * @param browsingContext the browsingContext of the frame that we want to view information about; can be null/omitted
     * @param browser the browser containing the document we're interested in inspecting; can be null/omitted
     */
    function pageInfo(documentURL: any, initialTab: any, imageElement: any, browsingContext: any, browser: any): any;
    function fullScreen(): void;
    function downloadsUI(): void;
    function forceEncodingDetection(): void;
}
