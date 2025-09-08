# Contributing

To build Glide you must have [`pnpm`](https://pnpm.io/) installed.

You must also verify that your system has the dependencies that Firefox requires:

- [MacOS](https://firefox-source-docs.mozilla.org/setup/macos_build.html)
- [Linux](https://firefox-source-docs.mozilla.org/setup/linux_build.html)
- [Windows](https://firefox-source-docs.mozilla.org/setup/windows_build.html)
- [Windows WSL](https://firefox-source-docs.mozilla.org/setup/windows_wsl_build.html)

After cloning the repository

```bash
git clone https://github.com/glide-browser/glide
```

you can setup your local repo with:

```bash
pnpm install
pnpm bootstrap
```

This will download a copy of the Firefox source code to the `path:engine/` directory, bundle Glide's dependencies, build the docs, and apply all of our patches to the Firefox source code.

To actually build Glide, you can run:

```bash
pnpm build
```

> [!IMPORTANT]
> This can take quite a long time, a fresh build takes ~30 mins on an M4 Max.

Once you have Glide compiled, you can luanch it with:

```bash
pnpm launch
```

> [!TIP]
> There are lots of arguments you can pass here, run `pnpm launch --help` for the full list.

## Editor setup

Glide uses [dprint](https://dprint.dev/) for formatting, if you have not used dprint before, it is recommended you install and [configure](https://dprint.dev/install/#editor-extensions) it.

Alternatively, you can run auto-formatting with:

```bash
pnpm fmt
```

## Getting acclimated

Glide inherits a lot of concepts from Firefox, for a quick primer:

1. The main way to interact with the Firefox build system is through the [`mach`](https://firefox-source-docs.mozilla.org/mach/usage.html) CLI, accessible through `pnpm mach`.
2. Tests are written using [mochitest](https://firefox-source-docs.mozilla.org/testing/browser-chrome/index.html) and can be invoked with `pnpm mach test glide`. More details [here](#tests).
3. Files are included in the Firefox build through [JAR Manifests](https://firefox-source-docs.mozilla.org/build/buildsystem/jar-manifests.html).
4. All interaction with web content is centralised to a single [JS Actor](#js-actors) that we define, [`GlideHandlerChild`](/src/glide/browser/actors/GlideHandlerChild.sys.mts).
5. JS imports must use Firefox's [`ChromeUtils.importESModule()`](https://firefox-source-docs.mozilla.org/jsloader/system-modules.html), types can be imported with `import type { .. } from '...'`.

Primer on Glide specific concepts:

1. TypeScript files are converted to JS by stripping all TS syntax with [ts-blank-space](https://github.com/bloomberg/ts-blank-space) and stored in a relative `path:./dist/` directory.

- Note this means you cannot use any TS syntax that has a runtime effect, e.g. `enum`

2. We use [Glider](#glider) to patch the Firefox source code
3. Development practically requires running an FS watcher, see below.

## Working on Glide

You should _always_ have a terminal open running our file watcher:

```bash
pnpm dev
```

This handles:

- Compiling TS files to JS
- Rebuilding docs
- Copying source files to the Firefox `path:engine/` directory

If you have the watcher running, you should hardly ever have to explicitly rebuild.

### Tests

Tests are written using [mochitest](https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html) and located in [`path:src/glide/browser/base/content/test/`](/src/glide/browser/base/content/test/).

You can run all Glide's tests with:

```bash
pnpm test
# or
pnpm mach test glide
```

By default, tests run in a full browser window, however this means that you cannot do anything else while the tests are running. Instead, you can run tests in the background with:

```bash
pnpm test --headless
```

When adding a new test file, you must include it in the `path:browser.toml` file for that test directory, for example:

```toml
[DEFAULT]
support-files = []

["dist/browser_my_test.js"]
```

You must point to the `path:dist/*.js` file instead of the `path:.ts` file as Firefox's test runner does not yet support directly running TS files.

The typical naming convention is `path:browser_$name.ts` but you can choose to use a different name.

A typical test file looks like this:

```typescript
"use strict";

add_task(async function test_my_test_name() {
  // test
});
```

If you're familiar with Jest, or anything like it, mochitest works a little differently as there is no `expect()` API, instead the following assertion functions are provided:

```typescript
function is(a: unknown, b: unknown, name?: string): void;
function isnot(a: unknown, b: unknown, name?: string): void;

// expect the comparison to fail
function todo_is(
  a: unknown,
  b: unknown,
  name?: string,
): void;

// Like `is()` but compares by stringifying to JSON first.
function isjson(
  a: unknown,
  b: unknown,
  name?: string,
): void;

// Like `is()` but expects a truthy value
function ok(a: unknown, name?: string): asserts a;
function notok(a: unknown, name?: string): void;
```

You can filter the test functions that are ran in a _single_ file with `.only()` or `.skip()`

```typescript
add_task(...).skip();
add_task(...).only();
```

Unfortunately, you cannot yet tell mochitest to run only a specific test file, but you can filter by directory, e.g.

```bash
pnpm mach test glide/browser/base/content/test/config/
```

### Docs

The docs pages are written in Markdown and located in the [`path:src/glide/docs/`](/src/glide/docs) directory. The markdown is then converted to HTML using a custom [Markdoc](https://markdoc.dev/) integration in [`path:src/glide/browser/base/content/docs.mts`](/src/glide/browser/base/content/docs.mts).

Syntax highlighting is performed by [Shiki](https://shiki.style/) with a custom version of the [Tokyo Night](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-themes/themes/tokyo-night.json) theme.

Glide also ships with a builtin file watcher to automatically reload the rendered docs if they're opened with a `path:file://` URI, you can enable it with:

```typescript
glide.prefs.set("glide.dev.reload_files", true);
```

And the following pref is required for the search index to work:

```typescript
glide.prefs.set(
  "security.fileuri.strict_origin_policy",
  false,
);
```

And then open a URI like this:

```
file:///path-to-glide-directory/src/glide/docs/dist/contributing.html
```

> [!TIP]
> You do not actually need to build Glide from scratch to update the docs!
>
> You can also run _just_ the .md -> .html build step in watch mode with `pnpm dev:docs`.

### Debugging Hints

When debugging hints, the hint popups will disappear when you try to inspect them with the [Browser Toolbox](https://firefox-source-docs.mozilla.org/devtools-user/browser_toolbox/index.html). To prevent this, you can disable popup auto-hide in the Browser Toolbox, see the [Firefox docs](https://firefox-source-docs.mozilla.org/devtools-user/browser_toolbox/index.html#debugging-popups) for how to do so.

Now, hints will only be cleared once activated or when `<Esc>` is pressed.

## Concepts

### Glider

Glide makes use of [Glider](https://github.com/glide-browser/glider) to apply patches to the Firefox source code.

Glider is part of a long chain of forks starting from [Melon](https://github.com/pulse-browser/browser) making it easier to apply patches to Firefox.

However, Glider is just one part of how we patch Firefox. The [dev watcher](#working-on-glide) will also copy files into the Firefox source tree as they're changed. We do this because Firefox has builtin security measures that, reasonably, disallow reading symlinks to files _outside_ of the firefox source directory while in the content process. This means we can't rely on just setting up symlinks.

### TypeScript build system

We take a quite non-standard approach to shipping TS files where an FS watcher strips all of the TS syntax and replaces it with spaces before writing it to a relative `path:./dist/$name.js` file.

This is for a couple reasons:

- Integrating TS directly into the Firefox build system is hard
- A strong belief that TS should just be JS + types
- Replacing types with spaces means we do not need sourcemaps

### JS Actors

To interact with web content Glide uses a single [JSWindowActor](https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html), [`path:GlideHandlerChild.sys.mts`](/src/glide/browser/actors/GlideHandlerChild.sys.mts).

All of the code in `path:GlideHandlerChild.sys.mts` is ran _outside_ of the main process and communicates with the main process by sending messages.

Messages are typed and sent through the `.send_async_message(name, args?)` method on either the parent actor or the child actor. Messages that the parent actor (main process) can send to the child are defined in [`path:GlideHandlerParent.sys.mts::ParentMessages`](/src/glide/browser/actors/GlideHandlerParent.sys.mts), and messages that the child actor can send are defined in [`path:GlideHandlerChild.sys.mts::ChildMessages`](/src/glide/browser/actors/GlideHandlerChild.sys.mts).

Typical usage from the main process looks like this:

```typescript
GlideBrowser.get_focused_actor().send_async_message(
  "Glide::ReplaceChar",
  {
    character: "a",
  },
);
```
