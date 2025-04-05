// NOTE: these types are only available in test files.

declare global {
  // from `testing/mochitest/browser-test.js`
  interface BoundTestTask {
    skip(val?: boolean): void;
    only(): void;
  }

  function info(message: string): void;

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
    name?: string
  ): asserts a is false | 0 | 0n | "" | null | undefined;
  function add_task(fn: (() => void) | (() => Promise<void>)): BoundTestTask;
  function add_setup(fn: (() => void) | (() => Promise<void>)): void;

  async function sleep_frames(count: number);
  async function sleep_forever();

  declare var GlideTestUtils: typeof import("../browser/base/content/GlideTestUtils.sys.mts").GlideTestUtils;

  declare var Assert: import("../../testing/modules/Assert.sys.mjs").Assert;
  declare var SpecialPowers: import("../../testing/specialpowers/content/SpecialPowersChild.sys.mjs").SpecialPowersChild;
  declare var BrowserTestUtils: typeof import("../../testing/mochitest/BrowserTestUtils/BrowserTestUtils.sys.mjs").BrowserTestUtils;
}

export {};
