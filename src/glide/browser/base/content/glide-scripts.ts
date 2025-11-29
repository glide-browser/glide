// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// On MacOS, Firefox loads *two* top-level windows, one with the standard `browser.xhtml` frame
// that is loaded on every platform and a separate hidden window:
//
// https://github.com/mozilla-firefox/firefox/blob/main/browser/base/content/hiddenWindowMac.xhtml
//
// I'm not quite sure *why* this happens, but disabling loading of our JS code in the hidden frame
// doesn't seem to have any negative consequences yet.
//
// N.B. We disable it to avoid confusing duplicative logs / behaviour.

if (!window.location.toString().endsWith("hiddenWindowMac.xhtml")) {
  void import("chrome://glide/content/browser.mjs").then(({ GlideBrowser }) => {
    window.GlideBrowser = GlideBrowser;
  });

  void import("chrome://glide/content/browser-hints.mjs").then(({ GlideHints }) => {
    window.GlideHints = GlideHints;
  });

  void import("chrome://glide/content/browser-excmds.mjs").then(({ GlideExcmds }) => {
    window.GlideExcmds = GlideExcmds;
  });

  void import("chrome://glide/content/browser-excmds-registry.mjs").then(({ GLIDE_EXCOMMANDS }) => {
    // @ts-expect-error TS doesn't recognise that window.GLIDE_EXCOMMANDS is defined
    window.GLIDE_EXCOMMANDS = GLIDE_EXCOMMANDS;
  });
}
