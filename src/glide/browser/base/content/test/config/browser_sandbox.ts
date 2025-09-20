// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var document: Document & { documentElement: HTMLElement };
declare var performance: Performance;

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

add_task(async function test_basic_elements_are_copied() {
  const mirror = GlideBrowser.config_sandbox.document;

  // TODO
  notok(mirror.getElementById("glide-toolbar-mode-button"), "glide mode indicator should be copied");
  ok(mirror.getElementById("main-window"), "top-level element should be copied");
  ok(mirror.getElementById("cmd_closeWindow"), "commands should be copied");
});

add_task(async function test_page_visibility_signal_exists() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.g.value = document.visibilityState;
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(1);

  // note: we may want to force this to be `visible` in the future, this test is just
  //       to verify when that changes.
  is(GlideBrowser.api.g.value, "hidden");
});

add_task(async function test_setTimeout() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      setTimeout(() => {
        glide.g.value = "from setTimeout";
      }, 1);
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(10);

  is(GlideBrowser.api.g.value, "from setTimeout");
});

add_task(async function test_requestAnimationFrame() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      requestAnimationFrame(() => {
        glide.g.value = "from requestAnimationFrame";
      });
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(10);

  is(GlideBrowser.api.g.value, "from requestAnimationFrame");
});

add_task(async function test_setInterval() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const id = setInterval(() => {
        glide.g.value = (glide.g.value || 0) + 1;
        clearInterval(id);
      }, 1);
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(10);

  is(GlideBrowser.api.g.value, 1, "setInterval ticked at least once and then cleared");
});

add_task(async function test_queueMicrotask() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      queueMicrotask(() => {
        glide.g.value = "from queueMicrotask";
      });
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(1);

  is(GlideBrowser.api.g.value, "from queueMicrotask");
});

add_task(async function test_requestIdleCallback_with_timeout() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      requestIdleCallback(() => {
        glide.g.value = "from requestIdleCallback";
      }, { timeout: 100 });
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(20);

  is(GlideBrowser.api.g.value, "from requestIdleCallback");
});

add_task(async function test_performance_now_monotonicity() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      const t0 = performance.now();

      // busy loop a couple ms to ensure an increase without relying on timers.
      const target = t0 + 3;
      while (performance.now() < target) {}

      const t1 = performance.now();
      glide.g.value = { t0, t1, inc: t1 - t0 };
    });
  });

  await GlideBrowser.api.keys.send("~");
  await sleep_frames(2);

  const { t0, t1, inc } = GlideBrowser.api.g.value;
  ok(t1 >= t0, "monotonic, non-decreasing");
  ok(inc >= 0, "non-negative delta");
});
