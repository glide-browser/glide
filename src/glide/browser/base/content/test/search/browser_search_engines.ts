// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENGINE_NAME = "Glide Test Engine";

function defer_engine_cleanup() {
  return {
    async [Symbol.asyncDispose]() {
      const engine = Services.search.getEngineByName(ENGINE_NAME);
      if (engine) {
        await Services.search.removeEngine(engine);
      }
    },
  };
}

async function focus_address_bar() {
  if (glide.ctx.os === "macosx") {
    await keys("<D-l>");
  } else {
    await keys("<C-l>");
  }
}

add_task(async function test_add_search_engine() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        keyword: "@test",
        search_url: "https://example.com/search?q={searchTerms}",
        suggest_url: "https://example.com/suggest?q={searchTerms}",
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");
  is(engine.name, ENGINE_NAME);
  ok(engine.aliases.includes("@test"), "Keyword was set");

  const submission = engine.getSubmission("test", "application/x-suggestions+json");
  ok(submission, "Suggest URL is configured");
  Assert.stringContains(submission.uri.spec, "suggest", "Suggest URL is correct");

  await focus_address_bar();
  await keys("@test<space>wow");
  await sleep_frames(10);
  await keys("<CR>");

  await waiter(() => glide.ctx.url.toString()).is("https://example.com/search?q=wow");
});

add_task(async function test_add_search_engine_with_multiple_keywords() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        search_url: "https://example.com/search?q={searchTerms}",
        keyword: ["@first", "@second", "@third"],
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");
  ok(engine.aliases.includes("@first"), "First keyword was set");
  ok(engine.aliases.includes("@second"), "Second keyword was set");
  ok(engine.aliases.includes("@third"), "Third keyword was set");

  for (const alias of ["first", "second", "third"]) {
    await sleep_frames(2);

    using __ = await GlideTestUtils.new_tab();

    await focus_address_bar();
    await keys(`@${alias}<CR>${alias}`);
    await sleep_frames(10);
    await keys("<CR>");
    await waiter(() => glide.ctx.url.toString()).is(
      `https://example.com/search?q=${alias}`,
      `${alias} can be used to search with the custom engine`,
    );
  }
});

add_task(async function test_search_engine_default() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        keyword: "@test",
        search_url: "https://example.com/search?q={searchTerms}",
        is_default: true,
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");

  await focus_address_bar();
  await keys("foo<CR>");

  await waiter(() => glide.ctx.url.toString()).is("https://example.com/search?q=foo");
});

add_task(async function test_search_engine_post_method() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        keyword: "@post",
        search_url: "https://example.com/search",
        search_url_post_params: "q={searchTerms}&format=json",
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");

  const url = (engine.wrappedJSObject as any).getURLOfType("text/html");
  is(url.method, "POST", "Should use POST method");

  const submission = engine.getSubmission("test");
  ok(submission.postData, "Should have POST data");

  const stream = Cc["@mozilla.org/scriptableinputstream;1"]!.createInstance(Ci.nsIScriptableInputStream);
  stream.init(submission.postData!);
  is(
    stream.read(submission.postData!.available()),
    "q=test&format=json",
    "POST body should contain search terms and params",
  );
});

add_task(async function test_repeated_add_updates_existing_engine() {
  await using _ = defer_engine_cleanup();

  // ------------- initial configuration
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        keyword: "@old",
        search_url: "https://old.example.com/search?q={searchTerms}",
        suggest_url: "https://old.example.com/suggest?q={searchTerms}",
      });
      glide.g.value = 1;
    });
  });
  await waiter(() => glide.g.value).is(1);

  var engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");
  ok(engine.aliases.includes("@old"), "Initial keyword was set");
  is(engine.getSubmission("test").uri.spec, "https://old.example.com/search?q=test", "Initial search URL is correct");

  // ------------- update the engine
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        keyword: ["@new", "@also"],
        search_url: "https://new.example.com/search?q={searchTerms}",
        suggest_url: "https://new.example.com/suggest?q={searchTerms}",
      });
      glide.g.value = 2;
    });
  });
  await waiter(() => glide.g.value).is(2);

  var engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine still exists");
  ok(engine.aliases.includes("@new"), "New keyword was set");
  ok(engine.aliases.includes("@also"), "Additional keyword was set");
  ok(!engine.aliases.includes("@old"), "Old keyword was removed");
  is(engine.getSubmission("test").uri.spec, "https://new.example.com/search?q=test", "Search URL was updated");
  Assert.stringContains(
    engine.getSubmission("test", "application/x-suggestions+json").uri.spec,
    "new.example.com",
    "Suggest URL was updated",
  );
});

add_task(async function test_search_url_get_params() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        search_url: "https://example.com/search",
        search_url_get_params: "q={searchTerms}&format=json&lang=en",
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");

  const url = (engine.wrappedJSObject as any).getURLOfType("text/html");
  is(url.method, "GET", "Should use GET method");
  is(
    engine.getSubmission("test").uri.spec,
    "https://example.com/search?q=test&format=json&lang=en",
    "GET params should be appended to URL",
  );
});

add_task(async function test_update_from_get_to_post_params() {
  await using _ = defer_engine_cleanup();

  // ------------- start with GET params
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        search_url: "https://example.com/search",
        search_url_get_params: "q={searchTerms}",
      });
      glide.g.value = 1;
    });
  });
  await waiter(() => glide.g.value).is(1);

  var engine = Services.search.getEngineByName(ENGINE_NAME);
  var url = (engine.wrappedJSObject as any).getURLOfType("text/html");
  is(url.method, "GET", "Initially should use GET method");
  ok(!engine.getSubmission("test").postData, "Initially should have no POST data");

  // ------------- update to POST params
  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        search_url: "https://example.com/search",
        search_url_post_params: "q={searchTerms}&via=post",
      });
      glide.g.value = 2;
    });
  });
  await waiter(() => glide.g.value).is(2);

  var engine = Services.search.getEngineByName(ENGINE_NAME);
  var url = (engine.wrappedJSObject as any).getURLOfType("text/html");
  is(url.method, "POST", "After update should use POST method");

  const submission = engine.getSubmission("test");
  ok(submission.postData, "Should have POST data after update");
  const stream = Cc["@mozilla.org/scriptableinputstream;1"]!.createInstance(Ci.nsIScriptableInputStream);
  stream.init(submission.postData!);
  is(stream.read(submission.postData!.available()), "q=test&via=post", "POST body should contain updated params");
});

add_task(async function test_suggest_url_get_params() {
  await using _ = defer_engine_cleanup();

  await GlideTestUtils.reload_config(function _() {
    glide.autocmds.create("ConfigLoaded", async () => {
      await glide.search_engines.add({
        name: "Glide Test Engine",
        search_url: "https://example.com/search?q={searchTerms}",
        suggest_url: "https://example.com/suggest",
        suggest_url_get_params: "q={searchTerms}&type=json",
      });
      glide.g.value = true;
    });
  });

  await waiter(() => glide.g.value).ok();

  const engine = Services.search.getEngineByName(ENGINE_NAME);
  ok(engine, "Engine was added");
  is(
    engine.getSubmission("test", "application/x-suggestions+json").uri.spec,
    "https://example.com/suggest?q=test&type=json",
    "Suggest URL GET params should be appended",
  );
});
