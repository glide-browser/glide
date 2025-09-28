{% styles %}
#changelog {
padding-top: unset !important;
margin-top: unset !important;
margin-bottom: unset !important;
}
article h1 {
font-size: revert !important;
padding-top: revert !important;
margin-top: 30px !important;
margin-bottom: revert !important;
}
article li {
padding: 0.3em;
}
{% /styles %}

# Changelog

# 0.1.50a

- Added `glide.fs.stat()`.
- Added `glide.env.get()`, `glide.env.set()`, and `glide.env.delete()`. This is particularly useful for configuring your `PATH` on macOS.
- Added some missing types to the API docs.
- Bumped Firefox from 144.0b5 to 144.0b6.
- Fixed mappings with shift and multiiple modifiers, e.g. `cmd+shift+c` now works.
- Fixed the native messaging runtime path, previously the paths were the Firefox defaults now:
  - macOS system: `/Library/Application Support/Glide Browser`
  - macOS user: `~/Library/Application Support/Glide Browser`
  - Linux system: `/usr/lib64/glide-browser` (or `/usr/lib/glide-browser`)
  - Linux user: `path:~/.glide-browser`
- Removed support for the `browser` API inside the hints content callbacks, e.g. `glide.hints.show({ pick: () => ... })`.
  This was the only place it was accessible and allowing access to the `browser` API from the content frame has security implications
  that need to be investigated further.

# 0.1.49a

- Fixed a case where dev tools autocomplete could stop working
- Changed `glide.ctx.url` from a `string` to a `URL`
- Bumped Firefox from 144.0b3 to 144.0b5

# 0.1.48a

- Updated the recommended tsconfig to more accurately reflect reality
- Added support for setting attributes using `DOM.create_element()`
- Added `ts:glide.fs.write(path, contents)`
- Added `window` to the config sandbox
- Cleaned up the `document` mirror in the config sandbox
  - `html:<browser>` and `html:<scripts>` elements are no longer included
  - Fixed race conditions when mutating the `document`
  - Added many missing elements

# 0.1.47a

- Fixed a case where the browser toolbox devtools could crash
- Fixed issues with certain functions not being callable in the config, e.g. `ts:setTimeout()`
- Prevented timers from being throttled, namely `ts:setTimeout()`, `ts:setInterval()` and `ts:requestIdleCallback()`
- Fixed `ts:requestAnimationFrame()` never firing
- Added `ts:glide.fs.exists(path)`
- Upated Firefox from `path:144.0b1` to `path:144.0b3`

# 0.1.46a

- Added `ts:glide.fs.read(path, encoding)`
- Added `ts:glide.process.spawn(command, args, opts)`
- Added `ts:glide.process.execute(command, args, opts)`

# 0.1.45a

This release fixes a regression with the document mirror causing a crash when multiple windows are opened.

# 0.1.44a

This release restructures how the config sandbox is evaluated. Previously, it was possible to access the internal `Document` and `ChromeWindow` that Firefox uses to render the browser UI itself.
This is useful for accessing DOM APIs, e.g. `URL`, and allowing you to modify the UI in any way you want, however it introduces security concerns as _all_ of the Glide and Firefox internals can be accessed directly, effectively nullifying the sandbox.

Now, we create a hidden `Window` and a `Document` that is a bi-directional mirror of the internal browser UI `Document`. This lets you modify the `Document` however you'd like using standard DOM APIs while maintaining isolation from the internals.

Firefox has been bumped from `path:143.0b9` to `path:144.0b1`, the Firefox release notes can be found [here](https://www.firefox.com/en-US/firefox/143.0/releasenotes/).

# 0.1.43a

This release is mostly minor docs changes and an internal rehaul of the build system.

# 0.1.42a

Initial public release!
