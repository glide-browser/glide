// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

declare var content: TestContent;

// defined in head.ts
declare var spinup_gemini_server: (responses: Record<string, string>) => Promise<void>;

registerCleanupFunction(() => {
  glide.prefs.clear("glide.gemini.notified_experimental");
});

async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["glide.gemini.notified_experimental", true],
    ],
  });
}

add_task(async function test_gemini_success_response() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/": "20 text/gemini\r\n# Hello World\r\nWelcome to Gemini!",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Hello World", "Heading matches gemtext content");

    const paragraph = content.document.querySelector("p");
    ok(paragraph);
    is(paragraph.textContent, "Welcome to Gemini!", "Paragraph matches gemtext content");
  });
});

add_task(async function test_gemini_empty_path_adds_trailing_slash() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/": "20 text/gemini\r\n# Trailing Slash\r\nThe empty path resolves to /.",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Trailing Slash", "Empty Gemini paths are normalized to /");
  });
});

add_task(async function test_gemini_not_found() {
  await setup();
  await spinup_gemini_server({});

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/nonexistent");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Permanent failure", "Shows error for 5x status");
  });
});

add_task(async function test_gemini_success_response_decodes_utf8() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/utf8": "20 text/gemini\r\n# H\xc3\xa9llo\r\ncaf\xc3\xa9",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/utf8");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Héllo", "Heading is decoded as UTF-8");

    const paragraph = content.document.querySelector("p");
    ok(paragraph);
    is(paragraph.textContent, "café", "Body text is decoded as UTF-8");
  });
}).skip();

add_task(async function test_gemini_strips_fragments_from_requests() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/fragment": "20 text/gemini\r\n# Fragment\r\nRequests omit URI fragments.",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/fragment#ignored");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Fragment", "Gemini requests are sent without the fragment");
  });
});

add_task(async function test_gemini_quote_text_is_escaped() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/quoted-script": "20 text/gemini\r\n> <script>window.geminiInjected = true</script>",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/quoted-script");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const quote = content.document.querySelector("blockquote p");
    ok(quote);
    is(quote.textContent, "<script>window.geminiInjected = true</script>", "Quoted markup is rendered as literal text");

    is(content.document.querySelector("script"), null, "Quoted markup does not create script elements");
    is((content as any).geminiInjected, undefined, "Quoted markup does not execute scripts in the page");
  });
});

add_task(async function test_gemini_preformatted_blocks_do_not_turn_quotes_into_blockquotes() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/preformatted-quote":
      "20 text/gemini\r\n```\r\n> <script>window.geminiInjected = true</script>\r\n```",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/preformatted-quote");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const pre = content.document.querySelector("pre");
    ok(pre);
    ok(
      pre.textContent?.includes("> <script>window.geminiInjected = true</script>"),
      "Preformatted text keeps the quoted line literal",
    );

    is(content.document.querySelector("blockquote"), null, "Preformatted quoted text is not rendered as a blockquote");
    is(content.document.querySelector("script"), null, "Preformatted markup does not create script elements");
    is((content as any).geminiInjected, undefined, "Preformatted markup does not execute scripts in the page");
  });
});

add_task(async function test_gemini_input_required() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/input-required": "10 Search query\r\n",
  });

  await assert_error_page(
    "gemini://127.0.0.1/input-required",
    "Input required",
    "This Gemini page requires user input, which is not supported yet.",
  );
});

add_task(async function test_gemini_unknown_mime_type() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/html":
      "20 text/html; charset=\"utf-8\"><script>window.geminiInjected = true</script>\r\n<html></html>",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/html");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Unknown mime type", "Unsupported MIME types show an error page");

    const code = content.document.querySelector("code");
    ok(code);
    is(
      code.textContent,
      "text/html; charset=\"utf-8\"><script>window.geminiInjected = true</script>",
      "The unsupported MIME type is displayed as text",
    );

    is(content.document.querySelector("script"), null, "Unsupported MIME metadata does not create script elements");
    is((content as any).geminiInjected, undefined, "Unsupported MIME metadata does not execute scripts");
  });
});

add_task(async function test_gemini_redirect_response() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/redirect": "30 gemini://127.0.0.1/target\r\n",
  });

  using tab = await GlideTestUtils.new_tab("gemini://127.0.0.1/redirect");

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, "Redirect", "3x responses show a redirect page");

    const link = content.document.querySelector("a");
    ok(link);
    is(link.textContent, "gemini://127.0.0.1/target", "Redirect target is shown to the user");
    is(link.getAttribute("href"), "gemini://127.0.0.1/target", "Redirect target link points at the Gemini URL");
  });
});

add_task(async function test_gemini_temporary_failure() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/temporary-failure": "40 Slow down\r\n",
  });

  await assert_error_page("gemini://127.0.0.1/temporary-failure", "Temporary failure", "Server message: Slow down");
});

add_task(async function test_gemini_client_auth_required() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/client-cert": "60 Certificate required\r\n",
  });

  await assert_error_page(
    "gemini://127.0.0.1/client-cert",
    "Client authentication required",
    "Server message: Certificate required",
  );
});

add_task(async function test_gemini_unknown_status_code() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/unknown-status": "99 Unexpected\r\n",
  });

  await assert_error_page(
    "gemini://127.0.0.1/unknown-status",
    "Unknown response",
    "The server returned an unrecognized status code: 99",
  );
});

add_task(async function test_gemini_can_be_disabled() {
  await setup();
  await spinup_gemini_server({
    "gemini://127.0.0.1/": "20 text/gemini\r\n# Hello World\r\nWelcome to Gemini!",
  });

  glide.prefs.set("glide.gemini.enabled", false);

  await assert_error_page(
    "gemini://127.0.0.1/input-required",
    "Connection Failed",
    "Gemini protocol support has been disabled",
  );

  glide.prefs.clear("glide.gemini.enabled");
});

async function assert_error_page(url: string, expected_title: string, expected_text: string) {
  using tab = await GlideTestUtils.new_tab(url);

  await SpecialPowers.spawn(tab.linkedBrowser, [expected_title, expected_text], async (title, text) => {
    const h1 = content.document.querySelector("h1");
    ok(h1);
    is(h1.textContent, title, `Shows the ${title} heading`);

    const body_text = content.document.body?.textContent;
    ok(body_text?.includes(text), `Body includes "${text}"`);
  });
}
