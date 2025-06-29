{% styles %}
h1, h2 {
font-size: revert !important;
}
{% /styles %}

# `glide` {% id="glide" %}


## • `glide.ctx` {% id="glide.ctx" %}

### `glide.ctx.mode: GlideMode` {% id="glide.ctx.mode" %}

The currently active mode.

### `glide.ctx.url: string` {% id="glide.ctx.url" %}


### `glide.ctx.os` {% id="glide.ctx.os" %}

The operating system Glide is running on.

{% api-heading id="glide.ctx.is_editing" %}
glide.ctx.is_editing(): Promise<boolean>
{% /api-heading %}


Whether or not the currently focused element is editable.

This includes but is not limited to `<textarea>`, `<input>`, `contenteditable=true`.
## • `glide.o: glide.Options` {% id="glide.o" %}

Set browser-wide options.

### `glide.o.yank_highlight: glide.RGBString` {% id="glide.o.yank_highlight" %}

Color used to briefly highlight text when it's yanked.


### `glide.o.yank_highlight_time: number` {% id="glide.o.yank_highlight_time" %}

How long, in milliseconds, to highlight the selection for when it's yanked.


## • `glide.bo: Partial<glide.Options>` {% id="glide.bo" %}

Set buffer specific options.

This has the exact same API as `glide.o`.

## • `glide.prefs` {% id="glide.prefs" %}


{% api-heading id="glide.prefs.set" %}
glide.prefs.set(name, value): void
{% /api-heading %}


Set a preference. This is an alternative to `prefs.js` / [`about:config`](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
that all customisation can be represented in a single `glide.ts` file.

**warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling `glide.pref()` in callbacks
             will result in the pref being properly applied everywhere.

**warning**: there is also no guarantee that these settings will be applied when first loaded, sometimes a restart is required.

{% api-heading id="glide.prefs.get" %}
glide.prefs.get(name): string | number | boolean | undefined
{% /api-heading %}


Get the value of a pref.

If the pref is not defined, then `undefined` is returned.

{% api-heading id="glide.prefs.clear" %}
glide.prefs.clear(name): void
{% /api-heading %}


Reset the pref value back to its default.
## • `glide.g: GlideGlobals` {% id="glide.g" %}

Equivalent to `vim.g`.

You can also store arbitrary data here in a typesafe fashion with:
```ts
declare global {
  interface GlideGlobals {
    my_prop?: boolean;
  }
}
```

## • `glide.tabs` {% id="glide.tabs" %}


{% api-heading id="glide.tabs.active" %}
glide.tabs.active(): Promise<glide.TabWithID>
{% /api-heading %}


Returns the active tab for the currently focused window.

This is equivalent to:
```ts
const tab = await browser.tabs.query({
  active: true,
  currentWindow: true,
})[0];
```
But with additional error handling for invalid states.
## • `glide.excmds` {% id="glide.excmds" %}


{% api-heading id="glide.excmds.execute" %}
glide.excmds.execute(cmd): Promise<void>
{% /api-heading %}


Execute an excmd, this is the same as typing `:cmd --args`.

{% api-heading id="glide.excmds.create" %}
glide.excmds.create(info, fn): Excmd
{% /api-heading %}


Create a new excmd.
## • `glide.content` {% id="glide.content" %}


{% api-heading id="glide.content.execute" %}
glide.content.execute(func, opts): Promise<ReturnType<F>>
{% /api-heading %}


Execute a function in the content process for the given tab.

The given function will be stringified before being sent across processes, which
means it **cannot** capture any outside variables.

If you need to pass some context into the function, use `args`, e.g.

```ts
function set_body_border_style(css: string) {
 document.body.style.setProperty('border', css)
}
await glide.content.execute(set_body_border_style, { tab_id, args: ["20px dotted pink"] })
```

Note: all `args` must be JSON serialisable.
## • `glide.keymaps` {% id="glide.keymaps" %}


{% api-heading id="glide.keymaps.set" %}
glide.keymaps.set(modes, lhs, rhs, opts?): void
{% /api-heading %}



{% api-heading id="glide.keymaps.del" %}
glide.keymaps.del(modes, lhs, opts?): void
{% /api-heading %}


Remove the mapping of {lhs} for the {modes} where the map command applies.

The mapping may remain defined for other modes where it applies.
## • `glide.hints` {% id="glide.hints" %}


{% api-heading id="glide.hints.show" %}
glide.hints.show(opts?): void
{% /api-heading %}


Find and show hints for "clickable" elements in the content frame.

An optional `action()` function can be passed that will be invoked when
a hint is selected.
## • `glide.buf` {% id="glide.buf" %}

### `glide.buf.keymaps` {% id="glide.buf.keymaps" %}


{% api-heading id="glide.buf.keymaps.set" %}
glide.buf.keymaps.set(modes, lhs, rhs, opts?): void
{% /api-heading %}



{% api-heading id="glide.buf.keymaps.del" %}
glide.buf.keymaps.del(modes, lhs, opts?): void
{% /api-heading %}


Remove the mapping of {lhs} for the {modes} where the map command applies.

The mapping may remain defined for other modes where it applies.
## • `glide.keys` {% id="glide.keys" %}


{% api-heading id="glide.keys.send" %}
glide.keys.send(keyseq): Promise<void>
{% /api-heading %}


Send a key sequence to the browser, simulating physical key presses.

The key sequence can include multiple regular keys, special keys, and modifiers.

For example:

```ts
// Send a simple key sequence, each char is sent separately
await glide.keys.send("hello");

// Send with modifiers, results in two events
// - { ctrlKey: true, key: 'a' }
// - { ctrlKey: true, key: 'c' }
await glide.keys.send("<C-a><C-c>");
```

{% api-heading id="glide.keys.next" %}
glide.keys.next(): Promise<glide.KeyEvent>
{% /api-heading %}


Returns a `Promise` that resolves to a `{@link glide.KeyEvent}`.

This blocks other input events from being processed until the promise resolves.

Note: there can only be one `Promise` registered at any given time.

{% api-heading id="glide.keys.next_str" %}
glide.keys.next_str(): Promise<string>
{% /api-heading %}


Returns a `Promise` that resolves to a string representation of the last input event.

This blocks other input events from being processed until the promise resolves.

## • `glide.modes` {% id="glide.modes" %}


{% api-heading id="glide.modes.register" %}
glide.modes.register(mode, opts): void
{% /api-heading %}


Register a custom `mode`.

**note**: you must *also* register it as a type like so:

```typescript
declare global {
  interface GlideModes {
    leap: "leap";
  }
}
glide.modes.register('leap', { caret: 'normal' })
```
# `Types` {% id="types" style="margin-top: 3em !important" %}

## • `glide.RGBString: '#${string}'` {% id="glide.RGBString" %}
