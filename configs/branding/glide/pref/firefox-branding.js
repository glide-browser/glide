/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pref("startup.homepage_override_url", "https://glide-browser.app/whatsnew?v=%VERSION%");
pref("startup.homepage_welcome_url", "https://glide-browser.app/welcome/");
pref("startup.homepage_welcome_url.additional", "https://glide-browser.app/privacy-policy/");

// The number of days a binary is permitted to be old
// without checking for an update.  This assumes that
// app.update.checkInstallTime is true.
pref("app.update.checkInstallTime.days", 63);

// Give the user x seconds to react before showing the big UI. default=192 hours
pref("app.update.promptWaitTime", 691200);
// app.update.url.manual: URL user can browse to manually if for some reason
// all update installation attempts fail.
// app.update.url.details: a default value for the "More information about this
// update" link supplied in the "An update is available" page of the update
// wizard.
pref("app.update.url.manual", "https://glide-browser.app/download/");
pref("app.update.url.details", "https://glide-browser.app/release-notes/latest/");
pref("app.releaseNotesURL", "https://glide-browser.app/whatsnew/");
pref("app.releaseNotesURL.aboutDialog", "https://www.glide-browser.app/release-notes/%VERSION%/");
pref("app.releaseNotesURL.prompt", "https://glide-browser.app/release-notes/%VERSION%/");

// Number of usages of the web console.
// If this is less than 5, then pasting code into the web console is disabled
pref("devtools.selfxss.count", 5);
