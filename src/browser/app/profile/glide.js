// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
pref("browser.newtabpage.activity-stream.feeds.topsites", false);

// disable automatic updates by default, as depending on what you do,
// it can be somewhat likely that updates will break parts of your config
// (e.g. firefox browser dom updates)
pref("app.update.auto", false);

// disable webauthn until apple grants us access to the entitlement
pref("security.webauth.webauthn", false);
pref("security.webauth.webauthn_enable_softtoken", false);
pref("security.webauth.webauthn_enable_usbtoken", false);
pref("security.webauthn.enable_conditional_mediation", false);
pref("security.webauthn.ctap2", false);
pref("security.webauthn.enable_conditional_mediation", false);
pref("security.webauthn.enable_json_serialization_methods", false);
pref("security.webauthn.enable_macos_passkeys", false);
pref("security.webauthn.show_ms_settings_link", false);
pref("security.webauthn.webauthn_enable_android_fido2.residentkey", false);

// disable AI by default
pref("browser.ml.chat.enabled", false);
pref("browser.ml.chat.shortcuts", false);
pref("browser.ml.chat.shortcuts.custom", false);
pref("browser.ml.chat.sidebar", false);
pref("browser.ml.enable", false);
pref("browser.tabs.groups.smart.enabled", false);

#include remove-mozilla.js
#include betterfox.js
