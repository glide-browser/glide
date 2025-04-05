declare namespace TestUtils {
    function executeSoon(callbackFn: any): void;
    function waitForTick(): Promise<any>;
    /**
     * Waits for a console message matching the specified check function to be
     * observed.
     *
     * @param {function} checkFn [optional]
     *        Called with the message as its argument, should return true if the
     *        notification is the expected one, or false if it should be ignored
     *        and listening should continue.
     *
     * @note Because this function is intended for testing, any error in checkFn
     *       will cause the returned promise to be rejected instead of waiting for
     *       the next notification, since this is probably a bug in the test.
     *
     * @return {Promise}
     * @resolves The message from the observed notification.
     */
    function consoleMessageObserved(checkFn: Function): Promise<any>;
    /**
     * Listens for any console messages (logged via console.*) and returns them
     * when the returned function is called.
     *
     * @returns {function}
     *   Returns an async function that when called will wait for a tick, then stop
     *   listening to any more console messages and finally will return the
     *   messages that have been received.
     */
    function listenForConsoleMessages(): Function;
    /**
     * Waits for the specified topic to be observed.
     *
     * @param {string} topic
     *        The topic to observe.
     * @param {function} checkFn [optional]
     *        Called with (subject, data) as arguments, should return true if the
     *        notification is the expected one, or false if it should be ignored
     *        and listening should continue. If not specified, the first
     *        notification for the specified topic resolves the returned promise.
     *
     * @note Because this function is intended for testing, any error in checkFn
     *       will cause the returned promise to be rejected instead of waiting for
     *       the next notification, since this is probably a bug in the test.
     *
     * @return {Promise}
     * @resolves The array [subject, data] from the observed notification.
     */
    function topicObserved(topic: string, checkFn: Function): Promise<any>;
    /**
     * Waits for the specified preference to be change.
     *
     * @param {string} prefName
     *        The pref to observe.
     * @param {function} checkFn [optional]
     *        Called with the new preference value as argument, should return true if the
     *        notification is the expected one, or false if it should be ignored
     *        and listening should continue. If not specified, the first
     *        notification for the specified topic resolves the returned promise.
     *
     * @note Because this function is intended for testing, any error in checkFn
     *       will cause the returned promise to be rejected instead of waiting for
     *       the next notification, since this is probably a bug in the test.
     *
     * @return {Promise}
     * @resolves The value of the preference.
     */
    function waitForPrefChange(prefName: string, checkFn: Function): Promise<any>;
    /**
     * Takes a screenshot of an area and returns it as a data URL.
     *
     * @param eltOrRect {Element|Rect}
     *        The DOM node or rect ({left, top, width, height}) to screenshot.
     * @param win {Window}
     *        The current window.
     */
    function screenshotArea(eltOrRect: Element | Rect, win: Window): any;
    /**
     * Will poll a condition function until it returns true.
     *
     * @param condition
     *        A condition function that must return true or false. If the
     *        condition ever throws, this function fails and rejects the
     *        returned promise. The function can be an async function.
     * @param msg
     *        A message used to describe the condition being waited for.
     *        This message will be used to reject the promise should the
     *        wait fail. It is also used to add a profiler marker.
     * @param interval
     *        The time interval to poll the condition function. Defaults
     *        to 100ms.
     * @param maxTries
     *        The number of times to poll before giving up and rejecting
     *        if the condition has not yet returned true. Defaults to 50
     *        (~5 seconds for 100ms intervals)
     * @return Promise
     *        Resolves with the return value of the condition function.
     *        Rejects if timeout is exceeded or condition ever throws.
     *
     * NOTE: This is intentionally not using setInterval, using setTimeout
     * instead. setInterval is not promise-safe.
     */
    function waitForCondition(condition: any, msg: any, interval?: number, maxTries?: number): Promise<any>;
    function shuffle(array: any): any[];
    function assertPackagedBuild(): void;
}
