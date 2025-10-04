// NOTE: these types are only available in test files.

declare global {
  // from `testing/mochitest/browser-test.js`
  interface BoundTestTask {
    skip(val?: boolean): void;
    only(): void;
  }

  function info(message: string): void;

  /**
   * Synthesize a key event sequence.
   *
   * This is the same as `glide.keys.send()`.
   */
  function keys<const Keys>(keyseq: $keymapcompletions.T<Keys>): Promise<void>;

  function is(a: unknown, b: unknown, name?: string): void;
  function todo_is(a: unknown, b: unknown, name?: string): void;
  /**
   * Like `is()` but compares by stringifying to JSON first.
   */
  function isjson(a: unknown, b: unknown, name?: string): void;
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
}

export {};
