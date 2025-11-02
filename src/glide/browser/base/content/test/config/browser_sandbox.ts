// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

/* oxlint-disable unbound-method */

"use strict";

declare var document: Document & { documentElement: HTMLElement };
declare var performance: Performance;

declare global {
  interface GlideGlobals {
    sandbox_tests?: ({ message: string; success: boolean })[];
    sandbox_pollution_test?: {
      sandbox_object_polluted: boolean;
      sandbox_array_polluted: boolean;
      sandbox_string_polluted: boolean;
      sandbox_number_polluted: boolean;
      sandbox_date_polluted: boolean;
      sandbox_function_polluted: boolean;
      sandbox_map_polluted: boolean;
      sandbox_set_polluted: boolean;
      sandbox_proto_chain_polluted: boolean;
      sandbox_constructor_polluted: boolean;
    };
    value?: any;
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
          } catch {
            return true;
          }
        })(),
      },
    ];
  });

  for (const test of glide.g.sandbox_tests!) {
    ok(test.success, test.message);
  }
});

add_task(async function test_config_cannot_pollute_browser_prototypes() {
  const original_object_to_string = Object.prototype.toString;
  const original_array_push = Array.prototype.push;
  const original_string_includes = String.prototype.includes;
  const original_number_to_fixed = Number.prototype.toFixed;
  const original_date_get_time = Date.prototype.getTime;
  const original_function_call = Function.prototype.call;
  const original_map_set = Map.prototype.set;
  const original_set_add = Set.prototype.add;

  await GlideTestUtils.reload_config(function _() {
    // Attempt various prototype pollution attacks
    // @ts-expect-error
    Object.prototype.polluted = "polluted";
    Object.prototype.toString = function() {
      return "polluted";
    };

    // @ts-expect-error
    Array.prototype.polluted = "polluted";
    // @ts-expect-error
    Array.prototype.push = function() {
      return "polluted";
    };

    // @ts-expect-error
    String.prototype.polluted = "polluted";
    String.prototype.includes = function() {
      return true;
    };

    // @ts-expect-error
    Number.prototype.polluted = "polluted";
    Number.prototype.toFixed = function() {
      return "polluted";
    };

    // @ts-expect-error
    Date.prototype.polluted = "polluted";
    Date.prototype.getTime = function() {
      return 0;
    };

    // @ts-expect-error
    Function.prototype.polluted = "polluted";
    Function.prototype.call = function() {
      return "polluted";
    };

    // @ts-expect-error
    Map.prototype.polluted = "polluted";
    // @ts-expect-error
    Map.prototype.set = function() {
      return "polluted";
    };

    // @ts-expect-error
    Set.prototype.polluted = "polluted";
    // @ts-expect-error
    Set.prototype.add = function() {
      return "polluted";
    };

    const obj: any = {};
    obj.__proto__.proto_chain_polluted = "polluted";
    obj.constructor.prototype.constructor_polluted = "polluted";

    glide.g.sandbox_pollution_test = {
      sandbox_object_polluted: Object.prototype.hasOwnProperty("polluted"),
      sandbox_array_polluted: Array.prototype.hasOwnProperty("polluted"),
      sandbox_string_polluted: String.prototype.hasOwnProperty("polluted"),
      sandbox_number_polluted: Number.prototype.hasOwnProperty("polluted"),
      sandbox_date_polluted: Date.prototype.hasOwnProperty("polluted"),
      sandbox_function_polluted: Function.prototype.hasOwnProperty("polluted"),
      sandbox_map_polluted: Map.prototype.hasOwnProperty("polluted"),
      sandbox_set_polluted: Set.prototype.hasOwnProperty("polluted"),
      sandbox_proto_chain_polluted: (obj as any).__proto__.hasOwnProperty("proto_chain_polluted"),
      sandbox_constructor_polluted: obj.constructor.prototype.hasOwnProperty("constructor_polluted"),
    };
  });

  // Verify prototypes in main browser process remain unpolluted
  ok(!Object.prototype.hasOwnProperty("polluted"), "Object.prototype should not be polluted");
  ok(!Array.prototype.hasOwnProperty("polluted"), "Array.prototype should not be polluted");
  ok(!String.prototype.hasOwnProperty("polluted"), "String.prototype should not be polluted");
  ok(!Number.prototype.hasOwnProperty("polluted"), "Number.prototype should not be polluted");
  ok(!Date.prototype.hasOwnProperty("polluted"), "Date.prototype should not be polluted");
  ok(!Function.prototype.hasOwnProperty("polluted"), "Function.prototype should not be polluted");
  ok(!Map.prototype.hasOwnProperty("polluted"), "Map.prototype should not be polluted");
  ok(!Set.prototype.hasOwnProperty("polluted"), "Set.prototype should not be polluted");

  // Verify prototype methods remain unchanged
  is(Object.prototype.toString, original_object_to_string, "Object.prototype.toString should be original");
  is(Array.prototype.push, original_array_push, "Array.prototype.push should be original");
  is(String.prototype.includes, original_string_includes, "String.prototype.includes should be original");
  is(Number.prototype.toFixed, original_number_to_fixed, "Number.prototype.toFixed should be original");
  is(Date.prototype.getTime, original_date_get_time, "Date.prototype.getTime should be original");
  is(Function.prototype.call, original_function_call, "Function.prototype.call should be original");
  is(Map.prototype.set, original_map_set, "Map.prototype.set should be original");
  is(Set.prototype.add, original_set_add, "Set.prototype.add should be original");

  // Verify __proto__ and constructor pollution doesn't leak
  const test_obj: any = {};
  ok(!test_obj.__proto__.hasOwnProperty("proto_chain_polluted"), "Prototype chain pollution should not leak");
  ok(!test_obj.constructor.prototype.hasOwnProperty("constructor_polluted"), "Constructor pollution should not leak");

  // Test that built-in functionality still works correctly
  is({}.toString(), "[object Object]", "Object toString should work normally");
  is([1, 2].push(3), 3, "Array push should work normally");
  is("hello".includes("ell"), true, "String includes should work normally");
  is((3.14159).toFixed(2), "3.14", "Number toFixed should work normally");
  Assert.greater(new Date().getTime(), 0, "Date getTime should work normally");
  is(Function.prototype.call.call(() => "test", undefined), "test", "Function call should work normally");

  // Verify pollution occurred within the sandbox (demonstrating isolation)
  const sandbox_tests = glide.g.sandbox_pollution_test!;
  ok(sandbox_tests.sandbox_object_polluted, "Object.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_array_polluted, "Array.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_string_polluted, "String.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_number_polluted, "Number.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_date_polluted, "Date.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_function_polluted, "Function.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_map_polluted, "Map.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_set_polluted, "Set.prototype was polluted in sandbox");
  ok(sandbox_tests.sandbox_proto_chain_polluted, "Proto chain was polluted in sandbox");
  ok(sandbox_tests.sandbox_constructor_polluted, "Constructor was polluted in sandbox");
});

add_task(async function test_basic_elements_are_copied_to_the_sandbox() {
  const mirror = GlideBrowser.config_sandbox.document;

  ok(mirror.getElementById("glide-toolbar-mode-button"), "glide mode indicator should be copied");
  ok(mirror.getElementById("main-window"), "top-level element should be copied");
  ok(mirror.getElementById("cmd_closeWindow"), "commands should be copied");
});

add_task(async function test_basic_elements_are_copied_to_the_browser() {
  const mirror = GlideBrowser.config_sandbox.document;

  ok(mirror.getElementById("which-key"), "glide which key ui should be copied");
});

add_task(async function test_page_visibility_signal_exists() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      glide.g.value = document.visibilityState;
    });
  });

  await glide.keys.send("~");
  await sleep_frames(1);

  // note: we may want to force this to be `visible` in the future, this test is just
  //       to verify when that changes.
  is(glide.g.value, "hidden");
});

add_task(async function test_setTimeout() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      setTimeout(() => {
        glide.g.value = "from setTimeout";
      }, 1);
    });
  });

  await glide.keys.send("~");
  await sleep_frames(10);

  is(glide.g.value, "from setTimeout");
});

add_task(async function test_requestAnimationFrame() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      requestAnimationFrame(() => {
        glide.g.value = "from requestAnimationFrame";
      });
    });
  });

  await glide.keys.send("~");
  await sleep_frames(10);

  is(glide.g.value, "from requestAnimationFrame");
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

  await glide.keys.send("~");
  await sleep_frames(10);

  is(glide.g.value, 1, "setInterval ticked at least once and then cleared");
});

add_task(async function test_queueMicrotask() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      queueMicrotask(() => {
        glide.g.value = "from queueMicrotask";
      });
    });
  });

  await glide.keys.send("~");
  await sleep_frames(1);

  is(glide.g.value, "from queueMicrotask");
});

add_task(async function test_requestIdleCallback_with_timeout() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", async () => {
      requestIdleCallback(() => {
        glide.g.value = "from requestIdleCallback";
      }, { timeout: 100 });
    });
  });

  await glide.keys.send("~");
  await sleep_frames(20);

  is(glide.g.value, "from requestIdleCallback");
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

  await glide.keys.send("~");
  await sleep_frames(2);

  const { t0, t1, inc } = glide.g.value;
  Assert.greaterOrEqual(t1, t0, "monotonic, non-decreasing");
  Assert.greaterOrEqual(inc, 0, "non-negative delta");
});

add_task(async function test_all_elements_are_copied() {
  const mirror = GlideBrowser.config_sandbox.document;

  const missing: string[] = [];

  // intentionally not mirrored
  const exclude = new Set(["script", "browser"]);

  for (const element of all_elements(document)) {
    const node_name = element.nodeName.toLowerCase();
    if (exclude.has(node_name)) {
      continue;
    }

    const xpath = element.generateXPath().replaceAll("xhtml:", "").replaceAll("xul:", "");
    const parent_missing = missing.some((prefix) => xpath.startsWith(prefix));
    if (parent_missing) {
      continue;
    }

    const result = mirror.evaluate(xpath, mirror.documentElement!, null, XPathResult.FIRST_ORDERED_NODE_TYPE);

    if (element.id === "swipe-nav-icon") {
      // for some reason just this particular svg is not included, not sure why
      todo_is(Boolean(result.singleNodeValue), true, xpath);
    } else {
      ok(result.singleNodeValue, xpath);
    }

    if (!result.singleNodeValue) {
      missing.push(xpath);
    }
  }
});

function* all_elements(root: Document | ShadowRoot): Generator<HTMLElement> {
  for (const element of root.querySelectorAll("*")) {
    yield element as HTMLElement;
  }
}

add_task(async function test_correct_realm_instances() {
  await GlideTestUtils.reload_config(function _() {
    glide.keymaps.set("normal", "~", () => {
      glide.g.value = {
        ["glide.ctx.url"]: glide.ctx.url instanceof URL,
      };
    });
  });

  await keys("~");

  const checks = await until(() => glide.g.value);
  for (const [name, result] of Object.entries(checks)) {
    ok(result, `${name} is created in the correct realm`);
  }
});
