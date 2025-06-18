// @ts-nocheck

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
  import("chrome://glide/content/browser.mjs").then(({ GlideBrowser }) => {
    window.GlideBrowser = GlideBrowser;
  });

  import("chrome://glide/content/browser-commands.mjs").then(
    ({ GlideCommands }) => {
      window.GlideCommands = GlideCommands;
    }
  );

  import("chrome://glide/content/browser-excmds.mjs").then(
    ({ GlideExcmds }) => {
      window.GlideExcmds = GlideExcmds;
    }
  );

  import("chrome://glide/content/browser-excmds-registry.mjs").then(
    ({ GLIDE_EXCOMMANDS }) => {
      window.GLIDE_EXCOMMANDS = GLIDE_EXCOMMANDS;
    }
  );
}
