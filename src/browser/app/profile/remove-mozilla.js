// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// Disable Mozilla-specific UI features
pref("browser.preferences.moreFromMozilla", false, locked);
pref("browser.contentblocking.report.show_mobile_app", false, locked);

// Disable recommeneded add-ons
pref("extensions.getAddons.showPane", false);
pref("extensions.htmlaboutaddons.recommendations.enabled", false);
pref("browser.discovery.enabled", false);
pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons", false); // contextual recommendations
