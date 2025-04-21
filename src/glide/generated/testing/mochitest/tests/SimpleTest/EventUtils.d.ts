declare namespace EventUtils {
function _EU_isMac(aWindow?: Window & typeof globalThis): boolean;
function _EU_isWin(aWindow?: Window & typeof globalThis): boolean;
function _EU_isLinux(aWindow?: Window & typeof globalThis): boolean;
function _EU_isAndroid(aWindow?: Window & typeof globalThis): boolean;
function _EU_maybeWrap(o: any): any;
function _EU_maybeUnwrap(o: any): any;
function _EU_getPlatform(): "unknown" | "linux" | "android" | "windows" | "mac";
function _EU_roundDevicePixels(aMaybeFractionalPixels: any): number;
/**
 * promiseElementReadyForUserInput() dispatches mousemove events to aElement
 * and waits one of them for a while.  Then, returns "resolved" state when it's
 * successfully received.  Otherwise, if it couldn't receive mousemove event on
 * it, this throws an exception.  So, aElement must be an element which is
 * assumed non-collapsed visible element in the window.
 *
 * This is useful if you need to synthesize mouse events via the main process
 * but your test cannot check whether the element is now in APZ to deliver
 * a user input event.
 */
function promiseElementReadyForUserInput(aElement: any, aWindow?: Window & typeof globalThis, aLogFunc?: any): Promise<void>;
function getElement(id: any): any;
function computeButton(aEvent: any): any;
function computeButtons(aEvent: any, utils: any): any;
/**
 * Send a mouse event to the node aTarget (aTarget can be an id, or an
 * actual node) . The "event" passed in to aEvent is just a JavaScript
 * object with the properties set that the real mouse event object should
 * have. This includes the type of the mouse event. Pretty much all those
 * properties are optional.
 * E.g. to send an click event to the node with id 'node' you might do this:
 *
 * ``sendMouseEvent({type:'click'}, 'node');``
 */
function sendMouseEvent(aEvent: any, aTarget: any, aWindow: any): any;
function isHidden(aElement: any): boolean;
/**
 * Send a drag event to the node aTarget (aTarget can be an id, or an
 * actual node) . The "event" passed in to aEvent is just a JavaScript
 * object with the properties set that the real drag event object should
 * have. This includes the type of the drag event.
 */
function sendDragEvent(aEvent: any, aTarget: any, aWindow?: Window & typeof globalThis): any;
/**
 * Send the char aChar to the focused element.  This method handles casing of
 * chars (sends the right charcode, and sends a shift key for uppercase chars).
 * No other modifiers are handled at this point.
 *
 * For now this method only works for ASCII characters and emulates the shift
 * key state on US keyboard layout.
 */
function sendChar(aChar: any, aWindow: any): void;
/**
 * Send the string aStr to the focused element.
 *
 * For now this method only works for ASCII characters and emulates the shift
 * key state on US keyboard layout.
 */
function sendString(aStr: any, aWindow: any): void;
/**
 * Send the non-character key aKey to the focused node.
 * The name of the key should be the part that comes after ``DOM_VK_`` in the
 * KeyEvent constant name for this key.
 * No modifiers are handled at this point.
 */
function sendKey(aKey: any, aWindow: any): void;
/**
 * Parse the key modifier flags from aEvent. Used to share code between
 * synthesizeMouse and synthesizeKey.
 */
function _parseModifiers(aEvent: any, aWindow?: Window & typeof globalThis): number;
/**
 * Synthesize a mouse event on a target. The actual client point is determined
 * by taking the aTarget's client box and offseting it by aOffsetX and
 * aOffsetY. This allows mouse clicks to be simulated by calling this method.
 *
 * aEvent is an object which may contain the properties:
 *   `shiftKey`, `ctrlKey`, `altKey`, `metaKey`, `accessKey`, `clickCount`,
 *   `button`, `type`.
 *   For valid `type`s see nsIDOMWindowUtils' `sendMouseEvent`.
 *
 * If the type is specified, an mouse event of that type is fired. Otherwise,
 * a mousedown followed by a mouseup is performed.
 *
 * aWindow is optional, and defaults to the current window object.
 *
 * Returns whether the event had preventDefault() called on it.
 */
function synthesizeMouse(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aWindow: any): boolean;
/**
 * Synthesize one or more touches on aTarget. aTarget can be either Element
 * or Array of Elements.  aOffsetX, aOffsetY, aEvent.id, aEvent.rx, aEvent.ry,
 * aEvent.angle, aEvent.force, aEvent.tiltX, aEvent.tiltY and aEvent.twist can
 * be either Number or Array of Numbers (can be mixed).  If you specify array
 * to synthesize a multi-touch, you need to specify same length arrays.  If
 * you don't specify array to them, same values (or computed default values for
 * aEvent.id) are used for all touches.
 *
 * @param {Element | Element[]} aTarget The target element which you specify
 * relative offset from its top-left.
 * @param {Number | Number[]} aOffsetX The relative offset from left of aTarget.
 * @param {Number | Number[]} aOffsetY The relative offset from top of aTarget.
 * @param {Object} aEvent
 * type: The touch event type.  If undefined, "touchstart" and "touchend" will
 * be synthesized at same point.
 *
 * id: The touch id.  If you don't specify this, default touch id will be used
 * for first touch and further touch ids are the values incremented from the
 * first id.
 *
 * rx, ry: The radii of the touch.
 *
 * angle: The angle in degree.
 *
 * force: The force of the touch.  If the type is "touchend", this should be 0.
 * If unspecified, this is default to 0 for "touchend"  or 1 for the others.
 *
 * tiltX, tiltY: The tilt of the touch.
 *
 * twist: The twist of the touch.
 * @param {Window} aWindow Default to `window`.
 * @returns true if and only if aEvent.type is specified and default of the
 * event is prevented.
 */
function synthesizeTouch(aTarget: Element | Element[], aOffsetX: number | number[], aOffsetY: number | number[], aEvent?: any, aWindow?: Window): any;
/**
 * Return the drag service.  Note that if we're in the headless mode, this
 * may return null because the service may be never instantiated (e.g., on
 * Linux).
 */
function getDragService(): any;
/**
 * End drag session if there is.
 *
 * TODO: This should synthesize "drop" if necessary.
 *
 * @param left          X offset in the viewport
 * @param top           Y offset in the viewport
 * @param aEvent        The event data, the modifiers are applied to the
 *                      "dragend" event.
 * @param aWindow       The window.
 * @return              true if handled.  In this case, the caller should not
 *                      synthesize DOM events basically.
 */
function _maybeEndDragSession(left: any, top: any, aEvent: any, aWindow: any): boolean;
function _maybeSynthesizeDragOver(left: any, top: any, aEvent: any, aWindow: any): boolean;
function synthesizeMouseAtPoint(left: any, top: any, aEvent: any, aWindow?: Window & typeof globalThis): boolean;
/**
 * Synthesize one or more touches at the points. aLeft, aTop, aEvent.id,
 * aEvent.rx, aEvent.ry, aEvent.angle, aEvent.force, aEvent.tiltX, aEvent.tiltY
 * and aEvent.twist can be either Number or Array of Numbers (can be mixed).
 * If you specify array to synthesize a multi-touch, you need to specify same
 * length arrays.  If you don't specify array to them, same values are used for
 * all touches.
 *
 * @param {Element | Element[]} aTarget The target element which you specify
 * relative offset from its top-left.
 * @param {Number | Number[]} aOffsetX The relative offset from left of aTarget.
 * @param {Number | Number[]} aOffsetY The relative offset from top of aTarget.
 * @param {Object} aEvent
 * type: The touch event type.  If undefined, "touchstart" and "touchend" will
 * be synthesized at same point.
 *
 * id: The touch id.  If you don't specify this, default touch id will be used
 * for first touch and further touch ids are the values incremented from the
 * first id.
 *
 * rx, ry: The radii of the touch.
 *
 * angle: The angle in degree.
 *
 * force: The force of the touch.  If the type is "touchend", this should be 0.
 * If unspecified, this is default to 0 for "touchend"  or 1 for the others.
 *
 * tiltX, tiltY: The tilt of the touch.
 *
 * twist: The twist of the touch.
 * @param {Window} aWindow Default to `window`.
 * @returns true if and only if aEvent.type is specified and default of the
 * event is prevented.
 */
function synthesizeTouchAtPoint(aLeft: any, aTop: any, aEvent?: any, aWindow?: Window): any;
function synthesizeMouseAtCenter(aTarget: any, aEvent: any, aWindow: any): boolean;
function synthesizeTouchAtCenter(aTarget: any, aEvent?: {}, aWindow?: Window & typeof globalThis): void;
/**
 * Synthesize a wheel event without flush layout at a particular point in
 * aWindow.
 *
 * aEvent is an object which may contain the properties:
 *   shiftKey, ctrlKey, altKey, metaKey, accessKey, deltaX, deltaY, deltaZ,
 *   deltaMode, lineOrPageDeltaX, lineOrPageDeltaY, isMomentum,
 *   isNoLineOrPageDelta, isCustomizedByPrefs, expectedOverflowDeltaX,
 *   expectedOverflowDeltaY
 *
 * deltaMode must be defined, others are ok even if undefined.
 *
 * expectedOverflowDeltaX and expectedOverflowDeltaY take integer value.  The
 * value is just checked as 0 or positive or negative.
 *
 * aWindow is optional, and defaults to the current window object.
 */
function synthesizeWheelAtPoint(aLeft: any, aTop: any, aEvent: any, aWindow?: Window & typeof globalThis): void;
/**
 * Synthesize a wheel event on a target. The actual client point is determined
 * by taking the aTarget's client box and offseting it by aOffsetX and
 * aOffsetY.
 *
 * aEvent is an object which may contain the properties:
 *   shiftKey, ctrlKey, altKey, metaKey, accessKey, deltaX, deltaY, deltaZ,
 *   deltaMode, lineOrPageDeltaX, lineOrPageDeltaY, isMomentum,
 *   isNoLineOrPageDelta, isCustomizedByPrefs, expectedOverflowDeltaX,
 *   expectedOverflowDeltaY
 *
 * deltaMode must be defined, others are ok even if undefined.
 *
 * expectedOverflowDeltaX and expectedOverflowDeltaY take integer value.  The
 * value is just checked as 0 or positive or negative.
 *
 * aWindow is optional, and defaults to the current window object.
 */
function synthesizeWheel(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aWindow: any): void;
function _sendWheelAndPaint(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aCallback: any, aFlushMode?: number, aWindow?: Window & typeof globalThis): void;
/**
 * This is a wrapper around synthesizeWheel that waits for the wheel event
 * to be dispatched and for the subsequent layout/paints to be flushed.
 *
 * This requires including paint_listener.js. Tests must call
 * DOMWindowUtils.restoreNormalRefresh() before finishing, if they use this
 * function.
 *
 * If no callback is provided, the caller is assumed to have its own method of
 * determining scroll completion and the refresh driver is not automatically
 * restored.
 */
function sendWheelAndPaint(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aCallback: any, aWindow?: Window & typeof globalThis): void;
/**
 * Similar to sendWheelAndPaint but without flushing layout for obtaining
 * ``aTarget`` position in ``aWindow`` before sending the wheel event.
 * ``aOffsetX`` and ``aOffsetY`` should be offsets against aWindow.
 */
function sendWheelAndPaintNoFlush(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aCallback: any, aWindow?: Window & typeof globalThis): void;
function synthesizeNativeTapAtCenter(aTarget: any, aLongTap?: boolean, aCallback?: any, aWindow?: Window & typeof globalThis): void;
function synthesizeNativeTap(aTarget: any, aOffsetX: any, aOffsetY: any, aLongTap?: boolean, aCallback?: any, aWindow?: Window & typeof globalThis): void;
/**
 * Similar to synthesizeMouse but generates a native widget level event
 * (so will actually move the "real" mouse cursor etc. Be careful because
 * this can impact later code as well! (e.g. with hover states etc.)
 *
 * @description There are 3 mutually exclusive ways of indicating the location of the
 * mouse event: set ``atCenter``, or pass ``offsetX`` and ``offsetY``,
 * or pass ``screenX`` and ``screenY``. Do not attempt to mix these.
 *
 * @param {object} aParams
 * @param {string} aParams.type "click", "mousedown", "mouseup" or "mousemove"
 * @param {Element} aParams.target Origin of offsetX and offsetY, must be an element
 * @param {Boolean} [aParams.atCenter]
 *        Instead of offsetX/Y, synthesize the event at center of `target`.
 * @param {Number} [aParams.offsetX]
 *        X offset in `target` (in CSS pixels if `scale` is "screenPixelsPerCSSPixel")
 * @param {Number} [aParams.offsetY]
 *        Y offset in `target` (in CSS pixels if `scale` is "screenPixelsPerCSSPixel")
 * @param {Number} [aParams.screenX]
 *        X offset in screen (in CSS pixels if `scale` is "screenPixelsPerCSSPixel"),
 *        Neither offsetX/Y nor atCenter must be set if this is set.
 * @param {Number} [aParams.screenY]
 *        Y offset in screen (in CSS pixels if `scale` is "screenPixelsPerCSSPixel"),
 *        Neither offsetX/Y nor atCenter must be set if this is set.
 * @param {String} [aParams.scale="screenPixelsPerCSSPixel"]
 *        If scale is "screenPixelsPerCSSPixel", devicePixelRatio will be used.
 *        If scale is "inScreenPixels", clientX/Y nor scaleX/Y are not adjusted with screenPixelsPerCSSPixel.
 * @param {Number} [aParams.button=0]
 *        Defaults to 0, if "click", "mousedown", "mouseup", set same value as DOM MouseEvent.button
 * @param {Object} [aParams.modifiers={}]
 *        Active modifiers, see `_parseNativeModifiers`
 * @param {Window} [aParams.win=window]
 *        The window to use its utils. Defaults to the window in which EventUtils.js is running.
 * @param {Element} [aParams.elementOnWidget=target]
 *        Defaults to target. If element under the point is in another widget from target's widget,
 *        e.g., when it's in a XUL <panel>, specify this.
 */
function synthesizeNativeMouseEvent(aParams: {
    type: string;
    target: Element;
    atCenter?: boolean;
    offsetX?: number;
    offsetY?: number;
    screenX?: number;
    screenY?: number;
    scale?: string;
    button?: number;
    modifiers?: any;
    win?: Window;
    elementOnWidget?: Element;
}, aCallback?: any): void;
function promiseNativeMouseEvent(aParams: any): Promise<any>;
function synthesizeNativeMouseEventAndWaitForEvent(aParams: any, aCallback: any): void;
function promiseNativeMouseEventAndWaitForEvent(aParams: any): Promise<any>;
/**
 * This is a wrapper around synthesizeNativeMouseEvent that waits for the mouse
 * event to be dispatched to the target content.
 *
 * This API is supposed to be used in those test cases that synthesize some
 * input events to chrome process and have some checks in content.
 */
function synthesizeAndWaitNativeMouseMove(aTarget: any, aOffsetX: any, aOffsetY: any, aCallback: any, aWindow?: Window & typeof globalThis): any;
/**
 * Synthesize a key event. It is targeted at whatever would be targeted by an
 * actual keypress by the user, typically the focused element.
 *
 * @param {String} aKey
 *        Should be either:
 *
 *        - key value (recommended).  If you specify a non-printable key name,
 *          prepend the ``KEY_`` prefix.  Otherwise, specifying a printable key, the
 *          key value should be specified.
 *
 *        - keyCode name starting with ``VK_`` (e.g., ``VK_RETURN``).  This is available
 *          only for compatibility with legacy API.  Don't use this with new tests.
 *
 * @param {Object} [aEvent]
 *        Optional event object with more specifics about the key event to
 *        synthesize.
 * @param {String} [aEvent.code]
 *        If you don't specify this explicitly, it'll be guessed from aKey
 *        of US keyboard layout.  Note that this value may be different
 *        between browsers.  For example, "Insert" is never set only on
 *        macOS since actual key operation won't cause this code value.
 *        In such case, the value becomes empty string.
 *        If you need to emulate non-US keyboard layout or virtual keyboard
 *        which doesn't emulate hardware key input, you should set this value
 *        to empty string explicitly.
 * @param {Number} [aEvent.repeat]
 *        If you emulate auto-repeat, you should set the count of repeat.
 *        This method will automatically synthesize keydown (and keypress).
 * @param {boolean} [aEvent.ctrlKey]
 *        Customise the `ctrlKey` modifier.
 * @param {boolean} [aEvent.shiftKey]
 *        Customise the `shiftKey` modifier.
 * @param {*} [aEvent.location]
 *        If you want to specify this, you can specify this explicitly.
 *        However, if you don't specify this value, it will be computed
 *        from code value.
 * @param {String} [aEvent.type]
 *        Basically, you shouldn't specify this.  Then, this function will
 *        synthesize keydown (, keypress) and keyup.
 *        If keydown is specified, this only fires keydown (and keypress if
 *        it should be fired).
 *        If keyup is specified, this only fires keyup.
 * @param {Number} [aEvent.keyCode]
 *        Must be 0 - 255 (0xFF). If this is specified explicitly,
 *        .keyCode value is initialized with this value.
 * @param {Window} [aWindow]
 *        Is optional and defaults to the current window object.
 * @param {Function} [aCallback]
 *        Is optional and can be used to receive notifications from TIP.
 *
 * @description
 * ``accelKey``, ``altKey``, ``altGraphKey``, ``ctrlKey``, ``capsLockKey``,
 * ``fnKey``, ``fnLockKey``, ``numLockKey``, ``metaKey``, ``scrollLockKey``,
 * ``shiftKey``, ``symbolKey``, ``symbolLockKey``
 * Basically, you shouldn't use these attributes.  nsITextInputProcessor
 * manages modifier key state when you synthesize modifier key events.
 * However, if some of these attributes are true, this function activates
 * the modifiers only during dispatching the key events.
 * Note that if some of these values are false, they are ignored (i.e.,
 * not inactivated with this function).
 *
 */
function synthesizeKey(aKey: string, aEvent?: {
    code?: string;
    repeat?: number;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    location?: any;
    type?: string;
    keyCode?: number;
}, aWindow?: Window, aCallback?: Function): void;
/**
 * This is a wrapper around synthesizeKey that waits for the key event to be
 * dispatched to the target content. It returns a promise which is resolved
 * when the content receives the key event.
 *
 * This API is supposed to be used in those test cases that synthesize some
 * input events to chrome process and have some checks in content.
 */
function synthesizeAndWaitKey(aKey: any, aEvent: any, aWindow: Window & typeof globalThis, checkBeforeSynthesize: any, checkAfterSynthesize: any): any;
function _parseNativeModifiers(aModifiers: any, aWindow?: Window & typeof globalThis): number;
/**
 * synthesizeNativeKey() dispatches native key event on active window.
 * This is implemented only on Windows and Mac. Note that this function
 * dispatches the key event asynchronously and returns immediately. If a
 * callback function is provided, the callback will be called upon
 * completion of the key dispatch.
 *
 * @param aKeyboardLayout       One of KEYBOARD_LAYOUT_* defined above.
 * @param aNativeKeyCode        A native keycode value defined in
 *                              NativeKeyCodes.js.
 * @param aModifiers            Modifier keys.  If no modifire key is pressed,
 *                              this must be {}.  Otherwise, one or more items
 *                              referred in _parseNativeModifiers() must be
 *                              true.
 * @param aChars                Specify characters which should be generated
 *                              by the key event.
 * @param aUnmodifiedChars      Specify characters of unmodified (except Shift)
 *                              aChar value.
 * @param aCallback             If provided, this callback will be invoked
 *                              once the native keys have been processed
 *                              by Gecko. Will never be called if this
 *                              function returns false.
 * @return                      True if this function succeed dispatching
 *                              native key event.  Otherwise, false.
 */
function synthesizeNativeKey(aKeyboardLayout: any, aNativeKeyCode: any, aModifiers: any, aChars: any, aUnmodifiedChars: any, aCallback: any, aWindow?: Window & typeof globalThis): boolean;
/**
 * Indicate that an event with an original target of aExpectedTarget and
 * a type of aExpectedEvent is expected to be fired, or not expected to
 * be fired.
 */
function _expectEvent(aExpectedTarget: any, aExpectedEvent: any, aTestName: any): (event: any) => void;
/**
 * Check if the event was fired or not. The event handler aEventHandler
 * will be removed.
 */
function _checkExpectedEvent(aExpectedTarget: any, aExpectedEvent: any, aEventHandler: any, aTestName: any): void;
/**
 * Similar to synthesizeMouse except that a test is performed to see if an
 * event is fired at the right target as a result.
 *
 * aExpectedTarget - the expected originalTarget of the event.
 * aExpectedEvent - the expected type of the event, such as 'select'.
 * aTestName - the test name when outputing results
 *
 * To test that an event is not fired, use an expected type preceded by an
 * exclamation mark, such as '!select'. This might be used to test that a
 * click on a disabled element doesn't fire certain events for instance.
 *
 * aWindow is optional, and defaults to the current window object.
 */
function synthesizeMouseExpectEvent(aTarget: any, aOffsetX: any, aOffsetY: any, aEvent: any, aExpectedTarget: any, aExpectedEvent: any, aTestName: any, aWindow: any): void;
/**
 * Similar to synthesizeKey except that a test is performed to see if an
 * event is fired at the right target as a result.
 *
 * aExpectedTarget - the expected originalTarget of the event.
 * aExpectedEvent - the expected type of the event, such as 'select'.
 * aTestName - the test name when outputing results
 *
 * To test that an event is not fired, use an expected type preceded by an
 * exclamation mark, such as '!select'.
 *
 * aWindow is optional, and defaults to the current window object.
 */
function synthesizeKeyExpectEvent(key: any, aEvent: any, aExpectedTarget: any, aExpectedEvent: any, aTestName: any, aWindow: any): void;
function disableNonTestMouseEvents(aDisable: any): void;
function _getDOMWindowUtils(aWindow?: Window & typeof globalThis): any;
function _defineConstant(name: any, value: any): void;
function _getTIP(aWindow: any, aCallback: any): any;
function _getKeyboardEvent(aWindow?: Window & typeof globalThis): any;
function _guessKeyNameFromKeyCode(aKeyCode: any, aWindow?: Window & typeof globalThis): "Alt" | "AltGraph" | "Control" | "Meta" | "Shift" | "NumLock" | "ScrollLock" | "Cancel" | "Help" | "Backspace" | "Tab" | "Clear" | "Enter" | "Pause" | "Eisu" | "Escape" | "Convert" | "NonConvert" | "Accept" | "ModeChange" | "PageUp" | "PageDown" | "End" | "Home" | "ArrowLeft" | "ArrowUp" | "ArrowRight" | "ArrowDown" | "Select" | "Print" | "Execute" | "PrintScreen" | "Insert" | "Delete" | "OS" | "ContextMenu" | "Standby" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" | "F13" | "F14" | "F15" | "F16" | "F17" | "F18" | "F19" | "F20" | "F21" | "F22" | "F23" | "F24" | "AudioVolumeMute" | "AudioVolumeDown" | "AudioVolumeUp" | "Process" | "Attn" | "CrSel" | "ExSel" | "EraseEof" | "Play" | "Unidentified";
function _createKeyboardEventDictionary(aKey: any, aKeyEvent: any, aTIP?: any, aWindow?: Window & typeof globalThis): {
    dictionary: any;
    flags: number;
};
function _emulateToActivateModifiers(aTIP: any, aKeyEvent: any, aWindow?: Window & typeof globalThis): {
    normal: {
        key: string;
        attr: string;
    }[];
    lockable: {
        key: string;
        attr: string;
    }[];
};
function _emulateToInactivateModifiers(aTIP: any, aModifiers: any, aWindow?: Window & typeof globalThis): void;
/**
 * Synthesize a composition event and keydown event and keyup events unless
 * you prevent to dispatch them explicitly (see aEvent.key's explanation).
 *
 * Note that you shouldn't call this with "compositionstart" unless you need to
 * test compositionstart event which is NOT followed by compositionupdate
 * event immediately.  Typically, native IME starts composition with
 * a pair of keydown and keyup event and dispatch compositionstart and
 * compositionupdate (and non-standard text event) between them.  So, in most
 * cases, you should call synthesizeCompositionChange() directly.
 * If you call this with compositionstart, keyup event will be fired
 * immediately after compositionstart.  In other words, you should use
 * "compositionstart" only when you need to emulate IME which just starts
 * composition with compositionstart event but does not send composing text to
 * us until committing the composition.  This is behavior of some Chinese IMEs.
 *
 * @param aEvent               The composition event information.  This must
 *                             have |type| member.  The value must be
 *                             "compositionstart", "compositionend",
 *                             "compositioncommitasis" or "compositioncommit".
 *
 *                             And also this may have |data| and |locale| which
 *                             would be used for the value of each property of
 *                             the composition event.  Note that the |data| is
 *                             ignored if the event type is "compositionstart"
 *                             or "compositioncommitasis".
 *
 *                             If |key| is undefined, "keydown" and "keyup"
 *                             events which are marked as "processed by IME"
 *                             are dispatched.  If |key| is not null, "keydown"
 *                             and/or "keyup" events are dispatched (if the
 *                             |key.type| is specified as "keydown", only
 *                             "keydown" event is dispatched).  Otherwise,
 *                             i.e., if |key| is null, neither "keydown" nor
 *                             "keyup" event is dispatched.
 *
 *                             If |key.doNotMarkKeydownAsProcessed| is not true,
 *                             key value and keyCode value of "keydown" event
 *                             will be set to "Process" and DOM_VK_PROCESSKEY.
 *                             If |key.markKeyupAsProcessed| is true,
 *                             key value and keyCode value of "keyup" event
 *                             will be set to "Process" and DOM_VK_PROCESSKEY.
 * @param aWindow              Optional (If null, current |window| will be used)
 * @param aCallback            Optional (If non-null, use the callback for
 *                             receiving notifications to IME)
 */
function synthesizeComposition(aEvent: any, aWindow: Window & typeof globalThis, aCallback: any): void;
/**
 * Synthesize eCompositionChange event which causes a DOM text event, may
 * cause compositionupdate event, and causes keydown event and keyup event
 * unless you prevent to dispatch them explicitly (see aEvent.key's
 * explanation).
 *
 * Note that if you call this when there is no composition, compositionstart
 * event will be fired automatically.  This is better than you use
 * synthesizeComposition("compositionstart") in most cases.  See the
 * explanation of synthesizeComposition().
 *
 * @param aEvent   The compositionchange event's information, this has
 *                 |composition| and |caret| members.  |composition| has
 *                 |string| and |clauses| members.  |clauses| must be array
 *                 object.  Each object has |length| and |attr|.  And |caret|
 *                 has |start| and |length|.  See the following tree image.
 *
 *                 aEvent
 *                   +-- composition
 *                   |     +-- string
 *                   |     +-- clauses[]
 *                   |           +-- length
 *                   |           +-- attr
 *                   +-- caret
 *                   |     +-- start
 *                   |     +-- length
 *                   +-- key
 *
 *                 Set the composition string to |composition.string|.  Set its
 *                 clauses information to the |clauses| array.
 *
 *                 When it's composing, set the each clauses' length to the
 *                 |composition.clauses[n].length|.  The sum of the all length
 *                 values must be same as the length of |composition.string|.
 *                 Set nsICompositionStringSynthesizer.ATTR_* to the
 *                 |composition.clauses[n].attr|.
 *
 *                 When it's not composing, set 0 to the
 *                 |composition.clauses[0].length| and
 *                 |composition.clauses[0].attr|.
 *
 *                 Set caret position to the |caret.start|. It's offset from
 *                 the start of the composition string.  Set caret length to
 *                 |caret.length|.  If it's larger than 0, it should be wide
 *                 caret.  However, current nsEditor doesn't support wide
 *                 caret, therefore, you should always set 0 now.
 *
 *                 If |key| is undefined, "keydown" and "keyup" events which
 *                 are marked as "processed by IME" are dispatched.  If |key|
 *                 is not null, "keydown" and/or "keyup" events are dispatched
 *                 (if the |key.type| is specified as "keydown", only "keydown"
 *                 event is dispatched).  Otherwise, i.e., if |key| is null,
 *                 neither "keydown" nor "keyup" event is dispatched.
 *                 If |key.doNotMarkKeydownAsProcessed| is not true, key value
 *                 and keyCode value of "keydown" event will be set to
 *                 "Process" and DOM_VK_PROCESSKEY.
 *                 If |key.markKeyupAsProcessed| is true key value and keyCode
 *                 value of "keyup" event will be set to "Process" and
 *                 DOM_VK_PROCESSKEY.
 *
 * @param aWindow  Optional (If null, current |window| will be used)
 * @param aCallback     Optional (If non-null, use the callback for receiving
 *                      notifications to IME)
 */
function synthesizeCompositionChange(aEvent: any, aWindow: Window & typeof globalThis, aCallback: any): void;
/**
 * Synthesize a query text content event.
 *
 * @param aOffset  The character offset.  0 means the first character in the
 *                 selection root.
 * @param aLength  The length of getting text.  If the length is too long,
 *                 the extra length is ignored.
 * @param aIsRelative   Optional (If true, aOffset is relative to start of
 *                      composition if there is, or start of selection.)
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQueryTextContent(aOffset: any, aLength: any, aIsRelative: any, aWindow: any): any;
/**
 * Synthesize a query selected text event.
 *
 * @param aSelectionType    Optional, one of QUERY_CONTENT_FLAG_SELECTION_*.
 *                          If null, QUERY_CONTENT_FLAG_SELECTION_NORMAL will
 *                          be used.
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQuerySelectedText(aSelectionType: any, aWindow: any): any;
/**
 * Synthesize a query caret rect event.
 *
 * @param aOffset  The caret offset.  0 means left side of the first character
 *                 in the selection root.
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQueryCaretRect(aOffset: any, aWindow: any): any;
/**
 * Synthesize a selection set event.
 *
 * @param aOffset  The character offset.  0 means the first character in the
 *                 selection root.
 * @param aLength  The length of the text.  If the length is too long,
 *                 the extra length is ignored.
 * @param aReverse If true, the selection is from |aOffset + aLength| to
 *                 |aOffset|.  Otherwise, from |aOffset| to |aOffset + aLength|.
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         True, if succeeded.  Otherwise false.
 */
function synthesizeSelectionSet(aOffset: any, aLength: any, aReverse: any, aWindow?: Window & typeof globalThis): Promise<any>;
/**
 * Synthesize a query text rect event.
 *
 * @param aOffset  The character offset.  0 means the first character in the
 *                 selection root.
 * @param aLength  The length of the text.  If the length is too long,
 *                 the extra length is ignored.
 * @param aIsRelative   Optional (If true, aOffset is relative to start of
 *                      composition if there is, or start of selection.)
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQueryTextRect(aOffset: any, aLength: any, aIsRelative: any, aWindow: any): any;
/**
 * Synthesize a query text rect array event.
 *
 * @param aOffset  The character offset.  0 means the first character in the
 *                 selection root.
 * @param aLength  The length of the text.  If the length is too long,
 *                 the extra length is ignored.
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQueryTextRectArray(aOffset: any, aLength: any, aWindow: any): any;
/**
 * Synthesize a query editor rect event.
 *
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeQueryEditorRect(aWindow: any): any;
/**
 * Synthesize a character at point event.
 *
 * @param aX, aY   The offset in the client area of the DOM window.
 * @param aWindow  Optional (If null, current |window| will be used)
 * @return         An nsIQueryContentEventResult object.  If this failed,
 *                 the result might be null.
 */
function synthesizeCharAtPoint(aX: any, aY: any, aWindow: any): any;
/**
 * INTERNAL USE ONLY
 * Create an event object to pass to sendDragEvent.
 *
 * @param aType          The string represents drag event type.
 * @param aDestElement   The element to fire the drag event, used to calculate
 *                       screenX/Y and clientX/Y.
 * @param aDestWindow    Optional; Defaults to the current window object.
 * @param aDataTransfer  dataTransfer for current drag session.
 * @param aDragEvent     The object contains properties to override the event
 *                       object
 * @return               An object to pass to sendDragEvent.
 */
function createDragEventObject(aType: any, aDestElement: any, aDestWindow: any, aDataTransfer: any, aDragEvent: any): any;
/**
 * Emulate a event sequence of dragstart, dragenter, and dragover.
 *
 * @param {Element} aSrcElement
 *        The element to use to start the drag.
 * @param {Element} aDestElement
 *        The element to fire the dragover, dragenter events
 * @param {Array}   aDragData
 *        The data to supply for the data transfer.
 *        This data is in the format:
 *
 *        [
 *          [
 *            {"type": value, "data": value },
 *            ...,
 *          ],
 *          ...
 *        ]
 *
 *        Pass null to avoid modifying dataTransfer.
 * @param {String} [aDropEffect="move"]
 *        The drop effect to set during the dragstart event, or 'move' if omitted.
 * @param {Window} [aWindow=window]
 *        The window in which the drag happens. Defaults to the window in which
 *        EventUtils.js is loaded.
 * @param {Window} [aDestWindow=aWindow]
 *        Used when aDestElement is in a different window than aSrcElement.
 *        Default is to match ``aWindow``.
 * @param {Object} [aDragEvent={}]
 *        Defaults to empty object. Overwrites an object passed to sendDragEvent.
 * @return {Array}
 *        A two element array, where the first element is the value returned
 *        from sendDragEvent for dragover event, and the second element is the
 *        dataTransfer for the current drag session.
 */
function synthesizeDragOver(aSrcElement: Element, aDestElement: Element, aDragData: any[], aDropEffect?: string, aWindow?: Window, aDestWindow?: Window, aDragEvent?: any): any[];
/**
 * Emulate the drop event and mouseup event.
 * This should be called after synthesizeDragOver.
 *
 * @param {*} aResult
 *        The first element of the array returned from ``synthesizeDragOver``.
 * @param {DataTransfer} aDataTransfer
 *        The second element of the array returned from ``synthesizeDragOver``.
 * @param {Element} aDestElement
 *        The element on which to fire the drop event.
 * @param {Window} [aDestWindow=window]
 *        The window in which the drop happens. Defaults to the window in which
 *        EventUtils.js is loaded.
 * @param {Object} [aDragEvent={}]
 *        Defaults to empty object. Overwrites an object passed to sendDragEvent.
 * @return {String}
 *        "none" if aResult is true, ``aDataTransfer.dropEffect`` otherwise.
 */
function synthesizeDropAfterDragOver(aResult: any, aDataTransfer: DataTransfer, aDestElement: Element, aDestWindow?: Window, aDragEvent?: any): string;
/**
 * Emulate a drag and drop by emulating a dragstart and firing events dragenter,
 * dragover, and drop.
 *
 * @param {Element} aSrcElement
 *        The element to use to start the drag.
 * @param {Element} aDestElement
 *        The element to fire the dragover, dragenter events
 * @param {Array}   aDragData
 *        The data to supply for the data transfer.
 *        This data is in the format:
 *
 *            [
 *              [
 *                {"type": value, "data": value },
 *                ...,
 *              ],
 *              ...
 *            ]
 *
 *        Pass null to avoid modifying dataTransfer.
 * @param {String} [aDropEffect="move"]
 *        The drop effect to set during the dragstart event, or 'move' if omitted..
 * @param {Window} [aWindow=window]
 *        The window in which the drag happens. Defaults to the window in which
 *        EventUtils.js is loaded.
 * @param {Window} [aDestWindow=aWindow]
 *        Used when aDestElement is in a different window than aSrcElement.
 *        Default is to match ``aWindow``.
 * @param {Object} [aDragEvent={}]
 *        Defaults to empty object. Overwrites an object passed to sendDragEvent.
 * @return {String}
 *        The drop effect that was desired.
 */
function synthesizeDrop(aSrcElement: Element, aDestElement: Element, aDragData: any[], aDropEffect?: string, aWindow?: Window, aDestWindow?: Window, aDragEvent?: any): string;
function _getFlattenedTreeParentNode(aNode: any): any;
function _getInclusiveFlattenedTreeParentElement(aNode: any): any;
function _nodeIsFlattenedTreeDescendantOf(aPossibleDescendant: any, aPossibleAncestor: any): boolean;
function _computeSrcElementFromSrcSelection(aSrcSelection: any): any;
/**
 * Emulate a drag and drop by emulating a dragstart by mousedown and mousemove,
 * and firing events dragenter, dragover, drop, and dragend.
 * This does not modify dataTransfer and tries to emulate the plain drag and
 * drop as much as possible, compared to synthesizeDrop.
 * Note that if synthesized dragstart is canceled, this throws an exception
 * because in such case, Gecko does not start drag session.
 *
 * @param {Object} aParams
 * @param {Event} aParams.dragEvent
 *                The DnD events will be generated with modifiers specified with this.
 * @param {Element} aParams.srcElement
 *                The element to start dragging.  If srcSelection is
 *                set, this is computed for element at focus node.
 * @param {Selection|null} aParams.srcSelection
 *                The selection to start to drag, set null if srcElement is set.
 * @param {Element|null} aParams.destElement
 *                The element to drop on. Pass null to emulate a drop on an invalid target.
 * @param {Number} aParams.srcX
 *                The initial x coordinate inside srcElement or ignored if srcSelection is set.
 * @param {Number} aParams.srcY
 *                The initial y coordinate inside srcElement or ignored if srcSelection is set.
 * @param {Number} aParams.stepX
 *                The x-axis step for mousemove inside srcElement
 * @param {Number} aParams.stepY
 *                The y-axis step for mousemove inside srcElement
 * @param {Number} aParams.finalX
 *                The final x coordinate inside srcElement
 * @param {Number} aParams.finalY
 *                The final x coordinate inside srcElement
 * @param {any} aParams.id
 *                The pointer event id
 * @param {Window} aParams.srcWindow
 *                The window for dispatching event on srcElement, defaults to the current window object.
 * @param {Window} aParams.destWindow
 *                The window for dispatching event on destElement, defaults to the current window object.
 * @param {Boolean} aParams.expectCancelDragStart
 *                Set to true if the test cancels "dragstart"
 * @param {Boolean} aParams.expectSrcElementDisconnected
 *                Set to true if srcElement will be disconnected and
 *                "dragend" event won't be fired.
 * @param {Function} aParams.logFunc
 *                Set function which takes one argument if you need to log rect of target.  E.g., `console.log`.
 */
function synthesizePlainDragAndDrop(aParams: {
    dragEvent: Event;
    srcElement: Element;
    srcSelection: Selection | null;
    destElement: Element | null;
    srcX: number;
    srcY: number;
    stepX: number;
    stepY: number;
    finalX: number;
    finalY: number;
    id: any;
    srcWindow: Window;
    destWindow: Window;
    expectCancelDragStart: boolean;
    expectSrcElementDisconnected: boolean;
    logFunc: Function;
}): Promise<void>;
function _checkDataTransferItems(aDataTransfer: any, aExpectedDragData: any): any;
/**
 * This callback type is used with ``synthesizePlainDragAndCancel()``.
 * It should compare ``actualData`` and ``expectedData`` and return
 * true if the two should be considered equal, false otherwise.
 *
 * @callback eqTest
 * @param {*} actualData
 * @param {*} expectedData
 * @return {boolean}
 */
/**
 * synthesizePlainDragAndCancel() synthesizes drag start with
 * synthesizePlainDragAndDrop(), but always cancel it with preventing default
 * of "dragstart".  Additionally, this checks whether the dataTransfer of
 * "dragstart" event has only expected items.
 *
 * @param {Object} aParams
 *        The params which is set to the argument of ``synthesizePlainDragAndDrop()``.
 * @param {Array} aExpectedDataTransferItems
 *        All expected dataTransfer items.
 *        This data is in the format:
 *
 *        [
 *          [
 *            {"type": value, "data": value, eqTest: function}
 *            ...,
 *          ],
 *          ...
 *        ]
 *
 *        This can also be null.
 *        You can optionally provide ``eqTest`` {@type eqTest} if the
 *        comparison to the expected data transfer items can't be done
 *        with x == y;
 * @return {boolean}
 *        true if aExpectedDataTransferItems matches with
 *        DragEvent.dataTransfer of "dragstart" event.
 *        Otherwise, the dataTransfer object (may be null) or
 *        thrown exception, NOT false.  Therefore, you shouldn't
 *        use.
 */
function synthesizePlainDragAndCancel(aParams: any, aExpectedDataTransferItems: any[]): boolean;
/**
 * Emulate a drag and drop by generating a dragstart from mousedown and mousemove,
 * then firing events dragover and drop (or dragleave if expectDragLeave is set).
 * This does not modify dataTransfer and tries to emulate the plain drag and
 * drop as much as possible, compared to synthesizeDrop and
 * synthesizePlainDragAndDrop.  MockDragService is used in place of the native
 * nsIDragService implementation.  All coordinates are in client space.
 *
 * @param {Object} aParams
 * @param {Window} aParams.sourceBrowsingCxt
 *                The BrowsingContext (possibly remote) that contains
 *                srcElement.
 * @param {Window} aParams.targetBrowsingCxt
 *                The BrowsingContext (possibly remote) that contains
 *                targetElement.  Default is sourceBrowsingCxt.
 * @param {Element} aParams.srcElement
 *                The element to drag.
 * @param {Element|null} aParams.targetElement
 *                The element to drop on.
 * @param {Number} aParams.step
 *                The 2D step for mousemoves
 * @param {Boolean} aParams.expectCancelDragStart
 *                Set to true if srcElement is set up to cancel "dragstart"
 * @param {Number} aParams.cancel
 *                The 2D coord the mouse is moved to as the last step if
 *                expectCancelDragStart is set
 * @param {Boolean} aParams.expectSrcElementDisconnected
 *                Set to true if srcElement will be disconnected and
 *                "dragend" event won't be fired.
 * @param {Boolean} aParams.expectDragLeave
 *                Set to true if the drop event will be converted to a
 *                dragleave before it is sent (e.g. it was rejected by a
 *                content analysis check).
 * @param {Boolean} aParams.expectNoDragEvents
 *                Set to true if no mouse or drag events should be received
 *                on the source or target.
 * @param {Boolean} aParams.expectNoDragTargetEvents
 *                Set to true if the drag should be blocked from sending
 *                events to the target.
 * @param {Boolean} aParams.dropPromise
 *                A promise that the caller will resolve before we check
 *                that the drop has happened.  Default is a pre-resolved
 *                promise.
 * @param {String} aParms.contextLabel
 *                Label that will appear in each output message.  Useful to
 *                distinguish between concurrent calls.  Default is none.
 * @param {Boolean} aParams.throwOnExtraMessage
 *                Throw an exception in child process when an unexpected
 *                event is received.  Used for debugging.  Default is false.
 * @param {Function} aParams.record
 *                Four-parameter function that logs the results of a remote
 *                assertion.  The parameters are (condition, message, ignored,
 *                stack).  This is the type of the mochitest report function.
 * @param {Function} aParams.info
 *                One-parameter info logging function.  Default is console.log.
 *                This is the type of the mochitest info function.
 * @param {Object} aParams.dragController
 *                MockDragController that the function should use.  This
 *                function will automatically generate one if none is given.
 */
function synthesizeMockDragAndDrop(aParams: {
    sourceBrowsingCxt: Window;
    targetBrowsingCxt: Window;
    srcElement: Element;
    targetElement: Element | null;
    step: number;
    expectCancelDragStart: boolean;
    cancel: number;
    expectSrcElementDisconnected: boolean;
    expectDragLeave: boolean;
    expectNoDragEvents: boolean;
    expectNoDragTargetEvents: boolean;
    dropPromise: boolean;
}): Promise<void>;
function $(id: any): any;
namespace _FlushModes {
    let FLUSH: number;
    let NOFLUSH: number;
}
namespace KEYBOARD_LAYOUT_ARABIC {
    let name: string;
    let Mac: number;
    let Win: number;
    let hasAltGrOnWin: boolean;
}
namespace KEYBOARD_LAYOUT_ARABIC_PC {
    let name_1: string;
    export { name_1 as name };
    let Mac_1: number;
    export { Mac_1 as Mac };
    let Win_1: any;
    export { Win_1 as Win };
    let hasAltGrOnWin_1: boolean;
    export { hasAltGrOnWin_1 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_BRAZILIAN_ABNT {
    let name_2: string;
    export { name_2 as name };
    let Mac_2: any;
    export { Mac_2 as Mac };
    let Win_2: number;
    export { Win_2 as Win };
    let hasAltGrOnWin_2: boolean;
    export { hasAltGrOnWin_2 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_DVORAK_QWERTY {
    let name_3: string;
    export { name_3 as name };
    let Mac_3: number;
    export { Mac_3 as Mac };
    let Win_3: any;
    export { Win_3 as Win };
    let hasAltGrOnWin_3: boolean;
    export { hasAltGrOnWin_3 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_EN_US {
    let name_4: string;
    export { name_4 as name };
    let Mac_4: number;
    export { Mac_4 as Mac };
    let Win_4: number;
    export { Win_4 as Win };
    let hasAltGrOnWin_4: boolean;
    export { hasAltGrOnWin_4 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_FRENCH {
    let name_5: string;
    export { name_5 as name };
    let Mac_5: number;
    export { Mac_5 as Mac };
    let Win_5: number;
    export { Win_5 as Win };
    let hasAltGrOnWin_5: boolean;
    export { hasAltGrOnWin_5 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_FRENCH_PC {
    let name_6: string;
    export { name_6 as name };
    let Mac_6: number;
    export { Mac_6 as Mac };
    let Win_6: number;
    export { Win_6 as Win };
    let hasAltGrOnWin_6: boolean;
    export { hasAltGrOnWin_6 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_GREEK {
    let name_7: string;
    export { name_7 as name };
    let Mac_7: number;
    export { Mac_7 as Mac };
    let Win_7: number;
    export { Win_7 as Win };
    let hasAltGrOnWin_7: boolean;
    export { hasAltGrOnWin_7 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_GERMAN {
    let name_8: string;
    export { name_8 as name };
    let Mac_8: number;
    export { Mac_8 as Mac };
    let Win_8: number;
    export { Win_8 as Win };
    let hasAltGrOnWin_8: boolean;
    export { hasAltGrOnWin_8 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_HEBREW {
    let name_9: string;
    export { name_9 as name };
    let Mac_9: number;
    export { Mac_9 as Mac };
    let Win_9: number;
    export { Win_9 as Win };
    let hasAltGrOnWin_9: boolean;
    export { hasAltGrOnWin_9 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_JAPANESE {
    let name_10: string;
    export { name_10 as name };
    let Mac_10: any;
    export { Mac_10 as Mac };
    let Win_10: number;
    export { Win_10 as Win };
    let hasAltGrOnWin_10: boolean;
    export { hasAltGrOnWin_10 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_KHMER {
    let name_11: string;
    export { name_11 as name };
    let Mac_11: any;
    export { Mac_11 as Mac };
    let Win_11: number;
    export { Win_11 as Win };
    let hasAltGrOnWin_11: boolean;
    export { hasAltGrOnWin_11 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_LITHUANIAN {
    let name_12: string;
    export { name_12 as name };
    let Mac_12: number;
    export { Mac_12 as Mac };
    let Win_12: number;
    export { Win_12 as Win };
    let hasAltGrOnWin_12: boolean;
    export { hasAltGrOnWin_12 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_NORWEGIAN {
    let name_13: string;
    export { name_13 as name };
    let Mac_13: number;
    export { Mac_13 as Mac };
    let Win_13: number;
    export { Win_13 as Win };
    let hasAltGrOnWin_13: boolean;
    export { hasAltGrOnWin_13 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_RUSSIAN {
    let name_14: string;
    export { name_14 as name };
    let Mac_14: any;
    export { Mac_14 as Mac };
    let Win_14: number;
    export { Win_14 as Win };
    let hasAltGrOnWin_14: boolean;
    export { hasAltGrOnWin_14 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_RUSSIAN_MNEMONIC {
    let name_15: string;
    export { name_15 as name };
    let Mac_15: any;
    export { Mac_15 as Mac };
    let Win_15: number;
    export { Win_15 as Win };
    let hasAltGrOnWin_15: boolean;
    export { hasAltGrOnWin_15 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_SPANISH {
    let name_16: string;
    export { name_16 as name };
    let Mac_16: number;
    export { Mac_16 as Mac };
    let Win_16: number;
    export { Win_16 as Win };
    let hasAltGrOnWin_16: boolean;
    export { hasAltGrOnWin_16 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_SWEDISH {
    let name_17: string;
    export { name_17 as name };
    let Mac_17: number;
    export { Mac_17 as Mac };
    let Win_17: number;
    export { Win_17 as Win };
    let hasAltGrOnWin_17: boolean;
    export { hasAltGrOnWin_17 as hasAltGrOnWin };
}
namespace KEYBOARD_LAYOUT_THAI {
    let name_18: string;
    export { name_18 as name };
    let Mac_18: number;
    export { Mac_18 as Mac };
    let Win_18: number;
    export { Win_18 as Win };
    let hasAltGrOnWin_18: boolean;
    export { hasAltGrOnWin_18 as hasAltGrOnWin };
}
var _gSeenEvent: boolean;
const COMPOSITION_ATTR_RAW_CLAUSE: any;
const COMPOSITION_ATTR_SELECTED_RAW_CLAUSE: any;
const COMPOSITION_ATTR_CONVERTED_CLAUSE: any;
const COMPOSITION_ATTR_SELECTED_CLAUSE: any;
var TIPMap: WeakMap<object, any>;
const QUERY_CONTENT_FLAG_USE_NATIVE_LINE_BREAK: 0;
const QUERY_CONTENT_FLAG_USE_XP_LINE_BREAK: 1;
const QUERY_CONTENT_FLAG_SELECTION_NORMAL: 0;
const QUERY_CONTENT_FLAG_SELECTION_SPELLCHECK: 2;
const QUERY_CONTENT_FLAG_SELECTION_IME_RAWINPUT: 4;
const QUERY_CONTENT_FLAG_SELECTION_IME_SELECTEDRAWTEXT: 8;
const QUERY_CONTENT_FLAG_SELECTION_IME_CONVERTEDTEXT: 16;
const QUERY_CONTENT_FLAG_SELECTION_IME_SELECTEDCONVERTEDTEXT: 32;
const QUERY_CONTENT_FLAG_SELECTION_ACCESSIBILITY: 64;
const QUERY_CONTENT_FLAG_SELECTION_FIND: 128;
const QUERY_CONTENT_FLAG_SELECTION_URLSECONDARY: 256;
const QUERY_CONTENT_FLAG_SELECTION_URLSTRIKEOUT: 512;
const QUERY_CONTENT_FLAG_OFFSET_RELATIVE_TO_INSERTION_POINT: 1024;
const SELECTION_SET_FLAG_USE_NATIVE_LINE_BREAK: 0;
const SELECTION_SET_FLAG_USE_XP_LINE_BREAK: 1;
const SELECTION_SET_FLAG_REVERSE: 2;
class EventCounter {
    constructor(aTarget: any, aType: any, aOptions?: {});
    target: any;
    type: any;
    options: {};
    eventCount: number;
    handleEvent: () => void;
    unregister(): void;
    get count(): number;
}
/**
 * This callback type is used with ``synthesizePlainDragAndCancel()``.
 * It should compare ``actualData`` and ``expectedData`` and return
 * true if the two should be considered equal, false otherwise.
 */
type eqTest = (actualData: any, expectedData: any) => boolean;
}
