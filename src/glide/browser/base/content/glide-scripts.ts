// @ts-nocheck

import("chrome://glide/content/browser.mjs").then(({ GlideBrowser }) => {
  window.GlideBrowser = GlideBrowser;
});

import("chrome://glide/content/browser-commands.mjs").then(
  ({ GlideCommands }) => {
    window.GlideCommands = GlideCommands;
  }
);

import("chrome://glide/content/browser-excmds.mjs").then(({ GlideExcmds }) => {
  window.GlideExcmds = GlideExcmds;
});

import("chrome://glide/content/browser-excmds-registry.mjs").then(
  ({ GLIDE_EXCOMMANDS }) => {
    window.GLIDE_EXCOMMANDS = GLIDE_EXCOMMANDS;
  }
);
