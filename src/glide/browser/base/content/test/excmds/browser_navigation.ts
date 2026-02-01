// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

declare var content: TestContent;

const html = String.raw;
const INPUT_TEST_FILE = "http://mochi.test:8888/browser/glide/browser/base/content/test/mode/input_test.html";

add_task(async function test_go_next() {
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await go_next(
      html`
        <a href='#first'>nextcorrupted</a>
        <a href='#second'>next page</a>
      `,
      "#second",
      "should find exact matches",
    );

    await go_next(
      html`
        <a href='#first'>&gt;&gt;</a>
      `,
      "#first",
      "should match against non-word patterns",
    );

    await go_next(
      html`
        <a href='#first'>lorem ipsum next</a>
        <a href='#second'>next!</a>
      `,
      "#second",
      "should favour matches with fewer words",
    );

    await go_next(
      html`
        <link rel='next' href='#first'>
      `,
      "#first",
      "should find link relation in header",
    );

    await go_next(
      html`
        <link rel='next' href='#first'>
        <a href='#second'>next</a>
      `,
      "#first",
      "should favour link relation to text matching",
    );

    await go_next(
      html`
        <link rel='Next' href='#first'>
      `,
      "#first",
      "should match mixed case link relation",
    );

    await go_next(
      html`
        <a title='Next page' href='#first'>unhelpful text</a>
      `,
      "#first",
      "should match against the title attribute",
    );

    await go_next(
      html`
        <a aria-label='Next page' href='#first'>unhelpful text</a>
      `,
      "#first",
      "should match against the aria-label attribute",
    );
  });
});

add_task(async function test_go_prev() {
  // note: just tests some basic cases because the more complicated ones are tested in `test_go_next`
  //       and we don't need to retest them here because the implementation uses the same underlying
  //       function.
  await BrowserTestUtils.withNewTab(INPUT_TEST_FILE, async _ => {
    await go_prev(
      html`
        <a href='#first'>prevcorrupted</a>
        <a href='#second'>prev page</a>
      `,
      "#second",
      "should find exact matches",
    );

    await go_prev(
      html`
        <a href='#first'>&lt;&lt;</a>
      `,
      "#first",
      "should match against non-word patterns",
    );

    await go_prev(
      html`
        <a href='#first'>lorem ipsum prev</a>
        <a href='#second'>prev!</a>
      `,
      "#second",
      "should favour matches with fewer words",
    );
  });
});

const go_next = (html: string, expected_hash: string, name: string) =>
  _expect_hash_change(html, expected_hash, name, "]]");

const go_prev = (html: string, expected_hash: string, name: string) =>
  _expect_hash_change(html, expected_hash, name, "[[");

async function _expect_hash_change(html: string, expected_hash: string, name: string, keyseq: string) {
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [html], async (html) => {
    content.document!.body!.innerHTML = html;
  });
  await sleep_frames(5);

  const url = glide.ctx.url;

  await keys(keyseq);

  await until(() => glide.ctx.url.toString() !== url.toString(), `waiting for url to change - ${name}`);

  is(glide.ctx.url.hash, expected_hash, name);

  // cleanup
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.window.location.hash = "";
  });
}
