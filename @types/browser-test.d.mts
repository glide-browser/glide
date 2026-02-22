// NOTE: these types are only available in test files.

declare global {
  // from `testing/mochitest/browser-test.js`
  interface BoundTestTask {
    skip(val?: boolean): void;
    only(): void;
  }

  interface GlideTestWaiter<V = unknown> {
    is(value: V, name?: string): Promise<number>;
    isnot(value: unknown, name?: string): Promise<number>;
    isjson(value: V, name?: string): Promise<number>;

    ok(name?: string): Promise<number>;
    notok(name?: string): Promise<number>;
  }

  /**
   * Returns an object wrapping the given function so that it can be repeatedly called until
   * a certain condition is met.
   *
   * This checks the condition every 10ms, up to 500 times.
   *
   * Each function on the returned `GlideTestWaiter` object returns a promise that resolves
   * with the number of frames it took to complete.
   *
   * This is useful for cases where you need to test that something *doesn't* happen. As you can
   * store how long it took to happen originally, and then wait for that number of frames in the
   * negative case.
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
  function keys<const Keys>(
    keyseq: $keymapcompletions.T<Keys>,
    opts?: glide.KeySendOptions & { interval_frames?: number },
  ): Promise<void>;

  function wait_for_mode(modde: GlideMode, name?: string): Promise<void>;

  const write_config: typeof GlideTestUtils["write_config"];
  const reload_config: typeof GlideTestUtils["reload_config"];

  function is<V>(a: V, b: NoInfer<V>, name?: string): void;
  function todo_is(a: unknown, b: unknown, name?: string): void;
  /**
   * Like `is()` but compares by stringifying to JSON first.
   */
  function isjson<V>(a: V, b: NoInfer<V>, name?: string): void;
  function isfuzzy(a: number, b: number, epsilon: number, name?: string): void;
  function isnot(a: unknown, b: unknown, name?: string): void;
  function ok(a: unknown, name?: string): asserts a;
  function notok(
    a: unknown,
    name?: string,
  ): asserts a is false | 0 | 0n | "" | null | undefined;
  function add_task(fn: (() => void) | (() => Promise<void>)): BoundTestTask;
  function add_setup(fn: (() => void) | (() => Promise<void>)): void;
  function registerCleanupFunction(fn: () => void): void;

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
