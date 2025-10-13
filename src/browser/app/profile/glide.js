// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
pref("browser.newtabpage.activity-stream.feeds.topsites", false);

// disable automatic updates by default, as depending on what you do,
// it can be somewhat likely that updates will break parts of your config
// (e.g. firefox browser dom updates)
pref("app.update.auto", false);

// disable AI by default
pref("browser.ml.enable", false);
pref("browser.ml.chat.menu", false);
pref("browser.ml.chat.enabled", false);
pref("browser.ml.chat.sidebar", false);
pref("browser.ml.chat.shortcuts", false);
pref("browser.ml.chat.shortcuts.custom", false);
pref("browser.tabs.groups.smart.enabled", false);

// extensions
// these should be the same as browser/app/profile/firefox.js, but with the app version replaced with FIREFOX_VERSION
pref("extensions.update.url", "https://versioncheck.addons.mozilla.org/update/VersionCheck.php?reqVersion=%REQ_VERSION%&id=%ITEM_ID%&version=%ITEM_VERSION%&maxAppVersion=%ITEM_MAXAPPVERSION%&status=%ITEM_STATUS%&appID=%APP_ID%&appVersion=%FIREFOX_VERSION%&appOS=%APP_OS%&appABI=%APP_ABI%&locale=%APP_LOCALE%&currentAppVersion=%FIREFOX_VERSION%&updateType=%UPDATE_TYPE%&compatMode=%COMPATIBILITY_MODE%");
pref("extensions.update.background.url", "https://versioncheck-bg.addons.mozilla.org/update/VersionCheck.php?reqVersion=%REQ_VERSION%&id=%ITEM_ID%&version=%ITEM_VERSION%&maxAppVersion=%ITEM_MAXAPPVERSION%&status=%ITEM_STATUS%&appID=%APP_ID%&appVersion=%FIREFOX_VERSION%&appOS=%APP_OS%&appABI=%APP_ABI%&locale=%APP_LOCALE%&currentAppVersion=%FIREFOX_VERSION%&updateType=%UPDATE_TYPE%&compatMode=%COMPATIBILITY_MODE%");
pref("extensions.getAddons.langpacks.url", "https://services.addons.mozilla.org/api/v4/addons/language-tools/?app=firefox&type=language&appversion=%PLATFORMVERSION%");

#include remove-mozilla.js
#include betterfox.js

pref("browser.aboutwelcome.enabled", true);
