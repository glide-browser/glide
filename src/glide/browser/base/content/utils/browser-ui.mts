/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const { css } = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");

/*
 * Contains CSS snippets for manipulating the Browser UI.
 * Obtained from here: https://github.com/MrOtherGuy/firefox-csshacks
 */

export const autohide_tabstoolbar_v2 = css`
  /* Source file https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/autohide_tabstoolbar_v2.css made available under Mozilla Public License v. 2.0
    See the above repository for updates as well as full license text. */

  /* Requires Firefox 133 */

  :root {
    --uc-tabs-hide-animation-duration: 48ms;
    --uc-tabs-hide-animation-delay: 200ms;
    /* Modification keeping the default behavior and setting a custom collapse width */
    --uc-tab-collapsed-width: var(--tab-collapsed-width);
  }

  @media -moz-pref("sidebar.verticalTabs") {
    #sidebar-main {
      overflow: visible !important;
      max-width: var(--uc-tab-collapsed-width) !important;
      z-index: var(--browser-area-z-index-toolbox-while-animating);
      transition: z-index 0s linear var(--uc-tabs-hide-duration);
      background: inherit;
    }
    sidebar-main {
      --tab-pinned-horizontal-count: 5; /* This needs to match whatever is used in sidebar-main.css - currently 5 */
      background: inherit;
      overflow: hidden;
      min-width: var(--uc-tab-collapsed-width);
      transition: min-width var(--uc-tabs-hide-animation-duration) ease-out
        var(--uc-tabs-hide-animation-delay);
      border-inline: 0.01px solid var(--chrome-content-separator-color);
      border-inline-width: 0 0.01px;
      &:is([sidebar-positionend], [positionend]) {
        transition-property: min-width, transform;
        border-inline-width: 0.01px 0;
      }
    }
    :where(#navigator-toolbox[movingtab] + #browser > #sidebar-main)
      > sidebar-main[expanded],
    sidebar-main[expanded]:hover {
      min-width: calc(
        var(--tab-pinned-horizontal-count) *
          var(--tab-pinned-min-width-expanded) + 2 *
          var(--tab-pinned-container-margin-inline-expanded) + 1px
      );
      transition-delay: 0ms !important;
      &:is([sidebar-positionend], [positionend]) {
        transform: translateX(calc(var(--tab-collapsed-width) - 100%));
      }
    }
    #sidebar-wrapper {
      background: inherit;
    }
  }
  @media not -moz-pref("sidebar.verticalTabs") {
    :root:not([customizing], [chromehidden~="menubar"])
      #navigator-toolbox:has(> :is(#toolbar-menubar, #TabsToolbar):hover),
    :root:not([customizing], [chromehidden~="menubar"]) #TabsToolbar {
      margin-bottom: calc(
        0px - 2 * var(--tab-block-margin) - var(--tab-min-height)
      );
    }
    #toolbar-menubar:is([autohide=""], [autohide="true"])
      + #TabsToolbar:not(:hover) {
      -moz-window-dragging: no-drag !important;
    }
    #toolbar-menubar:is([autohide=""], [autohide="true"])
      + #TabsToolbar:not(:hover, [customizing])::before {
      content: "";
      display: flex;
      position: absolute;
      height: 6px;
      width: 100vw;
      visibility: visible;
    }
    #navigator-toolbox {
      transition: margin-bottom var(--uc-tabs-hide-animation-duration) ease-out
        var(--uc-tabs-hide-animation-delay) !important;
      --browser-area-z-index-toolbox: 3;
    }
    #TabsToolbar:not([customizing]) {
      visibility: hidden;
      position: relative;
      z-index: 1;
      transition:
        visibility 0ms linear var(--uc-tabs-hide-animation-delay),
        margin-bottom var(--uc-tabs-hide-animation-duration) ease-out
          var(--uc-tabs-hide-animation-delay) !important;
    }
    #mainPopupSet:has(
        > #tab-group-editor > [panelopen],
        > #tabgroup-preview-panel[panelopen]
      )
      ~ #navigator-toolbox,
    #navigator-toolbox:has(> :is(#toolbar-menubar, #TabsToolbar):hover),
    #navigator-toolbox[movingtab] {
      transition-delay: 0s !important;
      margin-bottom: calc(
        0px - 2 * var(--tab-block-margin) - var(--tab-min-height)
      );
      > #TabsToolbar {
        visibility: visible;
        margin-bottom: 0px;
        transition-delay: 0ms, 0ms !important;
      }
    }
    @media -moz-pref("userchrome.autohidetabs.show-while-inactive.enabled") {
      #navigator-toolbox:-moz-window-inactive {
        margin-bottom: calc(
          0px - 2 * var(--tab-block-margin) - var(--tab-min-height)
        );
        > #TabsToolbar {
          visibility: visible;
          margin-bottom: 0px;
        }
      }
    }
    /* These rules make sure that height of tabs toolbar doesn't exceed tab-min-height */
    #tabbrowser-tabs:not([secondarytext-unsupported]) .tab-label-container {
      max-height: var(--tab-min-height);
    }
    .tab-label {
      line-height: 20px !important;
    }
    :root[uidensity="compact"] .tab-label {
      line-height: 18px !important;
    }
  }
`;

export const hide_tabs_toolbar_v2 = css`
  /* Source file https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/hide_tabs_toolbar_v2.css made available under Mozilla Public License v. 2.0
  See the above repository for updates as well as full license text. */

  /* This requires Firefox 133+ to work */

  @media -moz-pref("sidebar.verticalTabs") {
    #sidebar-launcher-splitter,
    #sidebar-main {
      visibility: collapse;
    }
  }
  @media -moz-pref("userchrome.force-window-controls-on-left.enabled") {
    #nav-bar > .titlebar-buttonbox-container {
      order: -1 !important;
      > .titlebar-buttonbox {
        flex-direction: row-reverse;
      }
    }
  }
  @media not -moz-pref("sidebar.verticalTabs") {
    #TabsToolbar:not([customizing]) {
      visibility: collapse;
    }
    :root[sizemode="fullscreen"] #nav-bar > .titlebar-buttonbox-container {
      display: flex !important;
    }
    :root[customtitlebar]
      #toolbar-menubar:is([autohide=""], [autohide="true"])
      ~ #nav-bar {
      > .titlebar-buttonbox-container {
        display: flex !important;
      }
      :root[sizemode="normal"] & {
        > .titlebar-spacer {
          display: flex !important;
        }
      }
      :root[sizemode="maximized"] & {
        > .titlebar-spacer[type="post-tabs"] {
          display: flex !important;
        }
        @media -moz-pref("userchrome.force-window-controls-on-left.enabled"),
          (-moz-gtk-csd-reversed-placement),
          (-moz-platform: macos) {
          > .titlebar-spacer[type="post-tabs"] {
            display: none !important;
          }
          > .titlebar-spacer[type="pre-tabs"] {
            display: flex !important;
          }
        }
      }
    }
  }
`;
