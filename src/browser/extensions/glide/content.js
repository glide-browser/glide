/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

console.log("location", location.toString());

browser.runtime.onConnect.addListener(port => {
  console.log(port);
  //
});

browser.runtime.onMessage.addListener((...args) => {
  console.log("onMessage args", args);
});
