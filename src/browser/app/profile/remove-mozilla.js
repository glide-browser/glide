// Disable Mozilla-specific UI features
pref("browser.preferences.moreFromMozilla", false, locked);
pref("browser.aboutwelcome.enabled", false, locked);
pref("browser.contentblocking.report.show_mobile_app", false, locked);

// Disable recommeneded add-ons
pref("extensions.getAddons.showPane", false);
pref("extensions.htmlaboutaddons.recommendations.enabled", false);
pref("browser.discovery.enabled", false);
pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons", false); // contextual recommendations
