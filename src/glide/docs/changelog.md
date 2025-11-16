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

# 0.1.54a

Page navigation keys (`h`, `j`, `k`, `l`, `<C-u>`, `<C-d>`, `gg`, and `G`) are now translated into equivalent standard keys:

- `hjkl` to arrow keys
- `<C-u>` to `<PageUp>`
- `<C-d>` to `<PageDown>`
- `gg` to `<D-Up>` on macOS, and `<C-Home>` on Linux
- `G` to `<D-Down>` on macOS, and `<C-End>` on Linux

For example, when you press `j`, Glide will now send an `<ArrowDown>` event to the web page.

This change was made for a couple reasons:

1. We get to leverage Firefox's smooth scrolling implementation.
2. The aforementioned keys are now more likely to _just work_ as you'd expect.
   Scrolling in PDFs now works; websites with their own scrolling behaviour will now work, as long as they support standard navigation keys.

#### Website key events {% id="0.1.54a-website-key-events" %}

There is a notable behaviour change here now that navigation keys send key events to the web page; websites can now intercept those key events and function differently. This may or may not be desirable depending on the website you are using.

If this behaviour is worse for you, please open a [discussion](https://github.com/glide-browser/glide/discussions), and if needed you can revert to the previous implementation with:

```typescript
glide.o.scroll_implementation = "legacy";
```

> [!TIP]
> This behaviour can be worse when custom elements are focused, e.g. YouTube videos as `j` will turn the volume down when you really want to scroll the page.
>
> In these cases you can try pressing `<C-,>` first to move focus off of that element.

### Smooth scrolling {% id="0.1.54a-smooth-scrolling" %}

Smooth scrolling is now supported, and enabled by default.

If you want to keep instant scrolling you can use this config:

```typescript
glide.prefs.set("general.smoothScroll", false);
```

Note that this also changes the scroll behaviour when using arrow keys directly.

### Changes {% id="0.1.54a-changes" %}

- Bumped Firefox from 145.0b6 to 146.0b3
- Added `I` motion support
- Added `<C-,>` to move focus out of the currently active element
- Added `:copy` excmd for smoother integration with excmds like `:profile_dir`
- Added support for removing browser styles with [`glide.styles.remove()`](api.md#glide.styles.remove)
- Added opt-in support for hinting elements with `click` listeners
  - See [#110](https://github.com/glide-browser/glide/discussions/110) for more information
- Added [`glide.ctx.version`](api.md#glide.ctx.version) for accessing the current Glide version
- Added [`glide.ctx.firefox_version`](api.md#glide.ctx.firefox_version) for accessing the Firefox version that Glide is based off of
- Added opt-in JPEG XL support
  - Thanks to [@SED4906](https://github.com/SED4906) for the contribution!
- Removed relative path limitations in [`glide.unstable.include()`](api.md#glide.unstable.include), you can now pass absolute paths
- Fixed scrolling while editable elments are focused, e.g. `<C-d>` will now actually scroll the page down.
- Fixed `path:org.mozilla` references in DBus names on Linux, we now use `path:app.glide_browser` instead
  - Thanks [@thomascft](https://github.com/thomascft) for the contribution!
- Fixed a case where Glide would automatically exit `ignore` mode when switching tabs
- Fixed keymappings conflicting with browser UI modals, e.g. `<D-q>` on macOS / `<C-S-w>` on Linux
- Updated `:clear` to also dismiss app menu notifications, e.g. the "New update available" notification
- Disabled more AI prefs
- We now store the previous Glide versions you've used in the profile directory

# 0.1.53a

### Addons API {% id="0.1.53a-addons-api" %}

You can now install addons directly from the Glide config:

```typescript {% copy=false %}
glide.addons.install(
  "https://addons.mozilla.org/firefox/downloads/file/4598854/ublock_origin-1.67.0.xpi",
);
```

This will install the [uBlock Origin](https://addons.mozilla.org/en-GB/firefox/addon/ublock-origin) addon, if it isn't _already_ installed. If you want to install the addon even if it's installed already, use `glide.addons.install('...', { force: true })`.

`glide.addons.install()` expects a URL for an [XPI](https://file-extensions.com/docs/xpi) file, you can obtain the XPI URL from an [addons.mozilla.org](https://addons.mozilla.org) page by right clicking on "Add to Firefox", and selecting "Copy link".

### Styles API {% id="0.1.53a-addons-api" %}

You can now easily inject custom CSS into the browser UI directly from the Glide config:

```typescript
glide.styles.add(css`
  #TabsToolbar {
    visibility: collapse !important;
  }
`);
```

This particular example hides the horizontal native tabs toolbar, but you can customise essentialy anything in the browser UI with this method.

Note that prior to this release you could inject custom CSS yourself but it was slower and would be persisted between config reloads.

{% details %} {% slot "summary" %}Old API
{% /slot %}

```typescript
glide.autocmds.create("WindowLoaded", () => {
  document.head!.appendChild(DOM.create_element("style", {
    textContent: css`
      #TabsToolbar {
        visibility: collapse !important;
      }
    `,
  }));
});
```

{% /details %}

### Changes {% id="0.1.53a-changes" %}

- Bumped Firefox from 144.0b9 to 145.0b6
- [Enabled](https://github.com/glide-browser/glide/discussions/10) WebAuthn on macOS
- Added [`glide.addons.install()`](api.md#glide.addons.install)
- Added [`glide.addons.list()`](api.md#glide.addons.list)
- Added [`glide.styles.add()`](api.md#glide.styles.add)
- Added [`glide.o.hint_chars`](api.md#glide.o.hint_chars)
- [Fixed](https://github.com/glide-browser/glide/discussions/76) the source tarball, it now includes hidden files
- Fixed hint label generation so that keymaps defined in `hint` mode do not conflict with labels
  - Thank you to [@jacobzim-stl](https://github.com/jacobzim-stl) for the contribution!
- Fixed [missing](https://github.com/glide-browser/glide/discussions/71) hints for elements across shadow roots
- Fixed `glide.ctx.url` so that it is constructed in the correct JS realm
- [Fixed](https://github.com/glide-browser/glide/issues/8) the commandline stealing focus even after it was closed

# 0.1.52a

- Bumped Firefox from 144.0b8 to 144.0b9.
- Fixed synthesizing special keys, e.g. `glide.keys.send("<down>")`.
- Fixed the font family for hints, it now falls back to monospace instead of serif.
- Fixed locale fetching, you can now download locales other than en-US in the settings page.
- Fixed incorrect "new update" notification under certain conditions.
- Fixed passing arguments to custom excmds from the commandline.
- Fixed some web extension method return types to indicate a `Promise` is returned.
- Fixed tab commandline not always focusing the first tab.
- Enabled loading unsigned extensions when the `path:xpinstall.signatures.required` pref is set.
- Enabled WebAuthn on Linux.
- Enabled access to missing Web Extension APIs, `tabGroups`, `activityLog`, `geckoProfiler`, and `networkStatus`.
  - N.B. these APIs haven't all been tested fully yet, so they may not work as expected. Prior to this release, you could not use them at all.
- Added `glide.tabs.query()` as an alias to `browser.tabs.query()` for better discoverability.
  - Thank you [@roceb](https://github.com/roceb) for the contribution!
- Added keymaps to the commandline UI, so you can easily identify what commands are mapped to.
  - Thank you to [@jacobzim-stl](https://github.com/jacobzim-stl) for the contribution!
- Disabled the AI chat button in the context menu.

# 0.1.51a

### Breaking changes {% id="0.1.51a-breaking-changes" %}

On Linux, the `<C-l>` and `<C-h>` mappings, to go backwards and forwards in history, have been changed to `<A-l>` and `<A-h>` respectively.

This change was made to prevent a conflict with the default `<C-l>` keymap in Firefox that focuses the address bar.

### Changes {% id="0.1.51a-changes" %}

- Bumped Firefox from 144.0b5 to 144.0b8.
- Fixed keymap autocompletion for `glide.keymaps.del()`.
- Fixed bad handling of invalid `focusin` events.
- Added `<C-[>` in `insert`, `visual`, and `op-pending` mode to switch back to `normal` mode.

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
