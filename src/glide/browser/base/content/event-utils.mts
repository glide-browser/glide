// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import type { SetRequired } from "type-fest";
import type { GlideMappingEvent } from "./utils/keys.mts";

const Keys = ChromeUtils.importESModule("chrome://glide/content/utils/keys.mjs");
const { assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");

/**
 * Take a given key sequence and synthesize events for each keyn,
 *
 * e.g. `ab<C-d>` will fire three different events, a, b, and ctrl+c
 */
export async function synthesize_keyseq(
  keyseq: string,
  opts?: glide.KeySendOptions,
) {
  for (let keyn of Keys.split(keyseq).map(Keys.normalize)) {
    // sleep one frame as Firefox cannot process key events in parallel
    // so if this was called inside a keymap callback, firefox will still
    // be handling the previous key event
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    if (keyn === "<leader>") {
      keyn = GlideBrowser.api.g.mapleader;
    }

    const event = Keys.parse_modifiers(keyn);
    if (event.key !== " " && event.is_special) {
      event.key = `KEY_${event.key}`;
    }

    firefox_synthesizeKey(event.key, event, window, opts);
  }
}

// ------------------------------------------------------------------------------------
//
// everything below is copied from `testing/mochitest/tests/SimpleTest/EventUtils.js`
// and adapted as little as possible to our use case.
//
// ------------------------------------------------------------------------------------
function firefox_synthesizeKey(
  aKey: string,
  aEvent: GlideMappingEvent | undefined = undefined,
  aWindow: Window = window,
  opts?: glide.KeySendOptions,
) {
  const event = aEvent === undefined || aEvent === null ? {} : aEvent;
  let dispatchKeydown = !("type" in event) || event.type === "keydown" || !event.type;
  const dispatchKeyup = !("type" in event) || event.type === "keyup" || !event.type;

  if (dispatchKeydown && aKey == "KEY_Escape") {
    let eventForKeydown = Object.assign({}, JSON.parse(JSON.stringify(event)));
    // @ts-ignore
    eventForKeydown.type = "keydown";
    if (
      _maybeEndDragSession(
        // TODO: We should set the last dragover point instead
        0,
        0,
        eventForKeydown,
        aWindow,
      )
    ) {
      if (!dispatchKeyup) {
        return;
      }
      // We don't need to dispatch only keydown event because it's consumed by
      // the drag session.
      dispatchKeydown = false;
    }
  }

  var TIP = _getTIP(aWindow);
  if (!TIP) {
    return;
  }
  var KeyboardEvent = _getKeyboardEvent(aWindow);
  var modifiers = _emulateToActivateModifiers(TIP, event, aWindow);
  var keyEventDict = _createKeyboardEventDictionary(
    aKey,
    // @ts-ignore
    event,
    TIP,
    aWindow,
  );
  var keyEvent = new KeyboardEvent("", keyEventDict.dictionary);

  if (opts?.skip_mappings) {
    GlideBrowser.register_keyevent_passthrough(keyEvent);
  }

  try {
    if (dispatchKeydown) {
      TIP.keydown(keyEvent, keyEventDict.flags);
      // @ts-ignore
      if ("repeat" in event && event.repeat > 1) {
        keyEventDict.dictionary.repeat = true;
        var repeatedKeyEvent = new KeyboardEvent("", keyEventDict.dictionary);
        // @ts-ignore
        for (var i = 1; i < event.repeat; i++) {
          TIP.keydown(repeatedKeyEvent, keyEventDict.flags);
        }
      }
    }
    if (dispatchKeyup) {
      TIP.keyup(keyEvent, keyEventDict.flags);
    }
  } finally {
    _emulateToInactivateModifiers(TIP, modifiers, aWindow);
  }
}

var TIPMap = new WeakMap();

function _getTIP(aWindow: Window): nsITextInputProcessor | null {
  if (!aWindow) {
    aWindow = window;
  }
  var tip: nsITextInputProcessor | null;
  if (TIPMap.has(aWindow)) {
    tip = TIPMap.get(aWindow);
  } else {
    tip = Cc["@mozilla.org/text-input-processor;1"]!.createInstance(Ci.nsITextInputProcessor);
    TIPMap.set(aWindow, tip);
  }

  // this "for tests" looks suspicious, but at the time of writing this appears
  // to just fallback to using the default callback and is named like this as in
  // standard Firefox development, you should never use this.
  if (!tip!.beginInputTransactionForTests(aWindow as mozIDOMWindow)) {
    tip = null;
    TIPMap.delete(aWindow);
  }
  return tip;
}

function _getKeyboardEvent(aWindow: Window = window): typeof KeyboardEvent {
  if (typeof KeyboardEvent != "undefined") {
    try {
      // See if the object can be instantiated; sometimes this yields
      // 'TypeError: can't access dead object' or 'KeyboardEvent is not a constructor'.
      new KeyboardEvent("", {});
      return KeyboardEvent;
    } catch {}
  }
  if (typeof content != "undefined" && "KeyboardEvent" in content) {
    return content.KeyboardEvent;
  }
  // @ts-ignore
  return aWindow.KeyboardEvent;
}

function _emulateToActivateModifiers(
  aTIP: nsITextInputProcessor,
  aKeyEvent: any,
  aWindow = window,
) {
  if (!aKeyEvent) {
    return null;
  }
  var KeyboardEvent = _getKeyboardEvent(aWindow);

  var modifiers = {
    normal: [
      { key: "Alt", attr: "altKey" },
      { key: "AltGraph", attr: "altGraphKey" },
      { key: "Control", attr: "ctrlKey" },
      { key: "Fn", attr: "fnKey" },
      { key: "Meta", attr: "metaKey" },
      { key: "Shift", attr: "shiftKey" },
      { key: "Symbol", attr: "symbolKey" },
      { key: _EU_isMac(aWindow) ? "Meta" : "Control", attr: "accelKey" },
    ],
    lockable: [
      { key: "CapsLock", attr: "capsLockKey" },
      { key: "FnLock", attr: "fnLockKey" },
      { key: "NumLock", attr: "numLockKey" },
      { key: "ScrollLock", attr: "scrollLockKey" },
      { key: "SymbolLock", attr: "symbolLockKey" },
    ],
  };

  for (let i = 0; i < modifiers.normal.length; i++) {
    if (!aKeyEvent[modifiers.normal[i]!.attr]) {
      continue;
    }
    if (aTIP.getModifierState(modifiers.normal[i]!.key)) {
      continue; // already activated.
    }
    let event = new KeyboardEvent("", { key: modifiers.normal[i]!.key });
    aTIP.keydown(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
    // @ts-ignore
    modifiers.normal[i]!.activated = true;
  }
  for (let i = 0; i < modifiers.lockable.length; i++) {
    if (!aKeyEvent[modifiers.lockable[i]!.attr]) {
      continue;
    }
    if (aTIP.getModifierState(modifiers.lockable[i]!.key)) {
      continue; // already activated.
    }
    let event = new KeyboardEvent("", { key: modifiers.lockable[i]!.key });
    aTIP.keydown(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
    aTIP.keyup(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
    // @ts-ignore
    modifiers.lockable[i]!.activated = true;
  }
  return modifiers;
}

function _emulateToInactivateModifiers(
  aTIP: nsITextInputProcessor,
  aModifiers: any,
  aWindow = window,
) {
  if (!aModifiers) {
    return;
  }
  var KeyboardEvent = _getKeyboardEvent(aWindow);
  for (let i = 0; i < aModifiers.normal.length; i++) {
    if (!aModifiers.normal[i].activated) {
      continue;
    }
    let event = new KeyboardEvent("", { key: aModifiers.normal[i].key });
    aTIP.keyup(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
  }
  for (let i = 0; i < aModifiers.lockable.length; i++) {
    if (!aModifiers.lockable[i].activated) {
      continue;
    }
    if (!aTIP.getModifierState(aModifiers.lockable[i].key)) {
      continue; // who already inactivated this?
    }
    let event = new KeyboardEvent("", { key: aModifiers.lockable[i].key });
    aTIP.keydown(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
    aTIP.keyup(event, aTIP.KEY_NON_PRINTABLE_KEY! | aTIP.KEY_DONT_DISPATCH_MODIFIER_KEY_EVENT!);
  }
}

const _EU_OS = ChromeUtils.importESModule(
  // @ts-ignore
  "resource://gre/modules/AppConstants.sys.mjs",
  // @ts-ignore
).platform;

function _EU_isMac(aWindow = window) {
  if (_EU_OS) {
    return _EU_OS == "macosx";
  }
  if (aWindow) {
    try {
      return aWindow.navigator.platform.indexOf("Mac") > -1;
    } catch {}
  }
  return navigator.platform.indexOf("Mac") > -1;
}

function _maybeEndDragSession(
  _left: any,
  _top: any,
  aEvent: any,
  aWindow: Window,
) {
  let utils = aWindow.windowUtils;
  const dragSession = utils.dragSession;
  if (!dragSession) {
    return false;
  }
  // FIXME: If dragSession.dragAction is not
  // nsIDragService.DRAGDROP_ACTION_NONE nor aEvent.type is not `keydown`, we
  // need to synthesize a "drop" event or call setDragEndPointForTests here to
  // set proper left/top to `dragend` event.
  try {
    dragSession.endDragSession(false, _parseModifiers(aEvent, aWindow));
  } catch {}
  return true;
}

/**
 * Parse the key modifier flags from aEvent. Used to share code between
 * synthesizeMouse and synthesizeKey.
 */
function _parseModifiers(aEvent: any, aWindow = window) {
  var nsIDOMWindowUtils = Ci.nsIDOMWindowUtils;
  var mval = 0;
  if (aEvent.shiftKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_SHIFT;
  }
  if (aEvent.ctrlKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_CONTROL;
  }
  if (aEvent.altKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_ALT;
  }
  if (aEvent.metaKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_META;
  }
  if (aEvent.accelKey) {
    mval |= _EU_isMac(aWindow)
      ? nsIDOMWindowUtils.MODIFIER_META
      : nsIDOMWindowUtils.MODIFIER_CONTROL;
  }
  if (aEvent.altGrKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_ALTGRAPH;
  }
  if (aEvent.capsLockKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_CAPSLOCK;
  }
  if (aEvent.fnKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_FN;
  }
  if (aEvent.fnLockKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_FNLOCK;
  }
  if (aEvent.numLockKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_NUMLOCK;
  }
  if (aEvent.scrollLockKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_SCROLLLOCK;
  }
  if (aEvent.symbolKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_SYMBOL;
  }
  if (aEvent.symbolLockKey) {
    mval |= nsIDOMWindowUtils.MODIFIER_SYMBOLLOCK;
  }

  return mval;
}

function _createKeyboardEventDictionary(
  aKey: string,
  aKeyEvent: SetRequired<KeyboardEventInit, "keyCode">,
  aTIP: nsITextInputProcessor | null = null,
  aWindow = window,
) {
  var result = { dictionary: null as any, flags: 0 };
  var keyCodeIsDefined = "keyCode" in aKeyEvent;
  var keyCode = keyCodeIsDefined && aKeyEvent.keyCode >= 0 && aKeyEvent.keyCode <= 255
    ? aKeyEvent.keyCode
    : 0;
  var keyName = "Unidentified";
  var code = aKeyEvent.code;
  if (!aTIP) {
    aTIP = assert_present(_getTIP(aWindow));
  }
  if (aKey.indexOf("KEY_") == 0) {
    keyName = aKey.substr("KEY_".length);
    result.flags |= Ci.nsITextInputProcessor.KEY_NON_PRINTABLE_KEY;
    if (code === undefined) {
      code = aTIP.computeCodeValueOfNonPrintableKey(keyName, aKeyEvent.location);
    }
  } else if (aKey.indexOf("VK_") == 0) {
    // @ts-expect-error
    keyCode = _getKeyboardEvent(aWindow)["DOM_" + aKey];
    if (!keyCode) {
      throw new Error("Unknown key: " + aKey);
    }
    keyName = _guessKeyNameFromKeyCode(keyCode, aWindow);
    result.flags |= Ci.nsITextInputProcessor.KEY_NON_PRINTABLE_KEY;
    if (code === undefined) {
      code = aTIP.computeCodeValueOfNonPrintableKey(keyName, aKeyEvent.location);
    }
  } else if (aKey != "") {
    keyName = aKey;
    if (!keyCodeIsDefined) {
      keyCode = aTIP.guessKeyCodeValueOfPrintableKeyInUSEnglishKeyboardLayout(aKey, aKeyEvent.location);
    }
    if (!keyCode) {
      result.flags |= Ci.nsITextInputProcessor.KEY_KEEP_KEYCODE_ZERO;
    }
    result.flags |= Ci.nsITextInputProcessor.KEY_FORCE_PRINTABLE_KEY;
    if (code === undefined) {
      code = aTIP.guessCodeValueOfPrintableKeyInUSEnglishKeyboardLayout(keyName, aKeyEvent.location);
    }
  }
  var locationIsDefined = "location" in aKeyEvent;
  if (locationIsDefined && aKeyEvent.location === 0) {
    result.flags |= Ci.nsITextInputProcessor.KEY_KEEP_KEY_LOCATION_STANDARD;
  }
  // @ts-ignore
  if (aKeyEvent.doNotMarkKeydownAsProcessed) {
    result.flags |= Ci.nsITextInputProcessor.KEY_DONT_MARK_KEYDOWN_AS_PROCESSED;
  }
  // @ts-ignore
  if (aKeyEvent.markKeyupAsProcessed) {
    result.flags |= Ci.nsITextInputProcessor.KEY_MARK_KEYUP_AS_PROCESSED;
  }
  result.dictionary = {
    key: keyName,
    code,
    location: locationIsDefined ? aKeyEvent.location : 0,
    repeat: "repeat" in aKeyEvent ? aKeyEvent.repeat === true : false,
    keyCode,
  };
  return result;
}

// eslint-disable-next-line complexity
function _guessKeyNameFromKeyCode(aKeyCode: number, aWindow: Window = window) {
  var KeyboardEvent = _getKeyboardEvent(aWindow);
  switch (aKeyCode) {
    case KeyboardEvent.DOM_VK_CANCEL:
      return "Cancel";
    case KeyboardEvent.DOM_VK_HELP:
      return "Help";
    case KeyboardEvent.DOM_VK_BACK_SPACE:
      return "Backspace";
    case KeyboardEvent.DOM_VK_TAB:
      return "Tab";
    case KeyboardEvent.DOM_VK_CLEAR:
      return "Clear";
    case KeyboardEvent.DOM_VK_RETURN:
      return "Enter";
    case KeyboardEvent.DOM_VK_SHIFT:
      return "Shift";
    case KeyboardEvent.DOM_VK_CONTROL:
      return "Control";
    case KeyboardEvent.DOM_VK_ALT:
      return "Alt";
    case KeyboardEvent.DOM_VK_PAUSE:
      return "Pause";
    case KeyboardEvent.DOM_VK_EISU:
      return "Eisu";
    case KeyboardEvent.DOM_VK_ESCAPE:
      return "Escape";
    case KeyboardEvent.DOM_VK_CONVERT:
      return "Convert";
    case KeyboardEvent.DOM_VK_NONCONVERT:
      return "NonConvert";
    case KeyboardEvent.DOM_VK_ACCEPT:
      return "Accept";
    case KeyboardEvent.DOM_VK_MODECHANGE:
      return "ModeChange";
    case KeyboardEvent.DOM_VK_PAGE_UP:
      return "PageUp";
    case KeyboardEvent.DOM_VK_PAGE_DOWN:
      return "PageDown";
    case KeyboardEvent.DOM_VK_END:
      return "End";
    case KeyboardEvent.DOM_VK_HOME:
      return "Home";
    case KeyboardEvent.DOM_VK_LEFT:
      return "ArrowLeft";
    case KeyboardEvent.DOM_VK_UP:
      return "ArrowUp";
    case KeyboardEvent.DOM_VK_RIGHT:
      return "ArrowRight";
    case KeyboardEvent.DOM_VK_DOWN:
      return "ArrowDown";
    case KeyboardEvent.DOM_VK_SELECT:
      return "Select";
    case KeyboardEvent.DOM_VK_PRINT:
      return "Print";
    case KeyboardEvent.DOM_VK_EXECUTE:
      return "Execute";
    case KeyboardEvent.DOM_VK_PRINTSCREEN:
      return "PrintScreen";
    case KeyboardEvent.DOM_VK_INSERT:
      return "Insert";
    case KeyboardEvent.DOM_VK_DELETE:
      return "Delete";
    case KeyboardEvent.DOM_VK_WIN:
      return "OS";
    case KeyboardEvent.DOM_VK_CONTEXT_MENU:
      return "ContextMenu";
    case KeyboardEvent.DOM_VK_SLEEP:
      return "Standby";
    case KeyboardEvent.DOM_VK_F1:
      return "F1";
    case KeyboardEvent.DOM_VK_F2:
      return "F2";
    case KeyboardEvent.DOM_VK_F3:
      return "F3";
    case KeyboardEvent.DOM_VK_F4:
      return "F4";
    case KeyboardEvent.DOM_VK_F5:
      return "F5";
    case KeyboardEvent.DOM_VK_F6:
      return "F6";
    case KeyboardEvent.DOM_VK_F7:
      return "F7";
    case KeyboardEvent.DOM_VK_F8:
      return "F8";
    case KeyboardEvent.DOM_VK_F9:
      return "F9";
    case KeyboardEvent.DOM_VK_F10:
      return "F10";
    case KeyboardEvent.DOM_VK_F11:
      return "F11";
    case KeyboardEvent.DOM_VK_F12:
      return "F12";
    case KeyboardEvent.DOM_VK_F13:
      return "F13";
    case KeyboardEvent.DOM_VK_F14:
      return "F14";
    case KeyboardEvent.DOM_VK_F15:
      return "F15";
    case KeyboardEvent.DOM_VK_F16:
      return "F16";
    case KeyboardEvent.DOM_VK_F17:
      return "F17";
    case KeyboardEvent.DOM_VK_F18:
      return "F18";
    case KeyboardEvent.DOM_VK_F19:
      return "F19";
    case KeyboardEvent.DOM_VK_F20:
      return "F20";
    case KeyboardEvent.DOM_VK_F21:
      return "F21";
    case KeyboardEvent.DOM_VK_F22:
      return "F22";
    case KeyboardEvent.DOM_VK_F23:
      return "F23";
    case KeyboardEvent.DOM_VK_F24:
      return "F24";
    case KeyboardEvent.DOM_VK_NUM_LOCK:
      return "NumLock";
    case KeyboardEvent.DOM_VK_SCROLL_LOCK:
      return "ScrollLock";
    case KeyboardEvent.DOM_VK_VOLUME_MUTE:
      return "AudioVolumeMute";
    case KeyboardEvent.DOM_VK_VOLUME_DOWN:
      return "AudioVolumeDown";
    case KeyboardEvent.DOM_VK_VOLUME_UP:
      return "AudioVolumeUp";
    case KeyboardEvent.DOM_VK_META:
      return "Meta";
    case KeyboardEvent.DOM_VK_ALTGR:
      return "AltGraph";
    case KeyboardEvent.DOM_VK_PROCESSKEY:
      return "Process";
    case KeyboardEvent.DOM_VK_ATTN:
      return "Attn";
    case KeyboardEvent.DOM_VK_CRSEL:
      return "CrSel";
    case KeyboardEvent.DOM_VK_EXSEL:
      return "ExSel";
    case KeyboardEvent.DOM_VK_EREOF:
      return "EraseEof";
    case KeyboardEvent.DOM_VK_PLAY:
      return "Play";
    default:
      return "Unidentified";
  }
}
