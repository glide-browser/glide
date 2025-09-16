// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document & { documentElement: HTMLElement };

declare global {
  interface GlideGlobals {
    sandbox_tests?: ({ message: string; success: boolean })[];
  }
}

// TODO: more tests

add_task(async function test_chrome_window_not_accessible() {
  await GlideTestUtils.reload_config(function _() {
    glide.g.sandbox_tests = [
      { message: "document.defaultView should not be a chrome window", success: !document.defaultView?.isChromeWindow },
      {
        message: "Range() should not be attached to a chrome window",
        success: new Range().startContainer.ownerDocument?.defaultView == null,
      },
      {
        message: "Text() should not be attached to a chrome window",
        success: !new Text().ownerDocument?.defaultView?.isChromeWindow,
      },
      {
        message: "Text().ownerDocument should be attached to the document",
        success: new Text().ownerDocument === document,
      },
      {
        message: "navigator.constructor eval should be blocked",
        success: (() => {
          try {
            navigator.constructor.constructor("return globalThis")();
            return false;
          } catch (_) {
            return true;
          }
        })(),
      },
    ];
  });

  for (const test of GlideBrowser.api.g.sandbox_tests!) {
    ok(test.success, test.message);
  }
});
