// NOTE: these types are only available in test files.

declare global {
  // from `testing/mochitest/browser-test.js`
  interface BoundTestTask {
    skip(val?: boolean): void;
    only(): void;
  }

  interface GlideTestWaiter<V = unknown> {
    is(value: V, name?: string): Promise<void>;
    isnot(value: unknown, name?: string): Promise<void>;
    isjson(value: V, name?: string): Promise<void>;

    ok(name?: string): Promise<void>;
    notok(name?: string): Promise<void>;
  }

  /**
   * Returns an object wrapping the given function so that it can be repeatedly called until
   * a certain condition is met.
   *
   * This checks the condition every 10ms, up to 500 times.
   */
  function waiter<V>(getter: () => V): GlideTestWaiter<V extends Promise<infer U> ? U : V>;

  /**
   * Returns a promise that will resolve when the given function returns a truthy value.
   *
   * This checks the function every 10ms, up to 500 times.
   */
  function until<R>(check: () => R | undefined | null, name?: string): Promise<R>;

  function info(message: string): void;

  /**
   * Synthesize a key event sequence.
   *
   * This is the same as `glide.keys.send()`.
   */
  function keys<const Keys>(keyseq: $keymapcompletions.T<Keys>): Promise<void>;

  function wait_for_mode(modde: GlideMode, name?: string): Promise<void>;

  function is<V>(a: V, b: NoInfer<V>, name?: string): void;
  function todo_is(a: unknown, b: unknown, name?: string): void;
  /**
   * Like `is()` but compares by stringifying to JSON first.
   */
  function isjson<V>(a: V, b: NoInfer<V>, name?: string): void;
  function isnot(a: unknown, b: unknown, name?: string): void;
  function ok(a: unknown, name?: string): asserts a;
  function notok(
    a: unknown,
    name?: string,
  ): asserts a is false | 0 | 0n | "" | null | undefined;
  function add_task(fn: (() => void) | (() => Promise<void>)): BoundTestTask;
  function add_setup(fn: (() => void) | (() => Promise<void>)): void;

  function sleep_frames(count: number): Promise<void>;
  function sleep_forever(): Promise<void>;

  var GlideTestUtils: typeof import("../src/glide/browser/base/content/GlideTestUtils.sys.mts").GlideTestUtils;

  var Assert: import("../engine/testing/modules/Assert.sys.mjs").Assert;
  var SpecialPowers: import("../engine/testing/specialpowers/content/SpecialPowersChild.sys.mjs").SpecialPowersChild;
  var BrowserTestUtils:
    typeof import("../engine/testing/mochitest/BrowserTestUtils/BrowserTestUtils.sys.mjs").BrowserTestUtils;

  /**
   * This is only available inside `SpecialPowers.spawn()` callbacks.
   */
  var ContentTaskUtils:
    typeof import("../engine/testing/specialpowers/content/ContentTaskUtils.sys.mjs").ContentTaskUtils;
}

export {};
