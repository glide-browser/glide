// @ts-nocheck

import("chrome://glide/content/browser.mjs").then(({ GlideBrowser }) => {
  window.GlideBrowser = GlideBrowser;
});

import("chrome://glide/content/browser-commands.mjs").then(
  ({ GlideCommands }) => {
    window.GlideCommands = GlideCommands;
  }
);

import("chrome://glide/content/browser-excmds.mjs").then(
  ({ GlideExcmds, GLIDE_EXCOMMANDS }) => {
    window.GlideExcmds = GlideExcmds;
    window.GLIDE_EXCOMMANDS = GLIDE_EXCOMMANDS;
  }
);
