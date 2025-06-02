{% styles %}
h1, h2, h3, h4, h5 {
font-size: revert !important;
}
{% /styles %}
# `glide` {% id="glide" %}

*The* interface to the Glide API.

All
## `glide.ctx` {% id="glide.ctx" %}

### `glide.ctx.url: string` {% id="glide.ctx.url" %}

The URL of the currently focused tab.



## `glide.o: glide.Options` {% id="glide.o" %}

Set browser-wide options.

## `glide.bo: Partial<glide.Options>` {% id="glide.bo" %}

Set buffer specific options.

## `glide.prefs` {% id="glide.prefs" %}

API for managing user preferences, this is an alternative to `prefs.js` for easier integration with other Glide features.

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
## `glide.g: GlideGlobals` {% id="glide.g" %}

Equivalent to `vim.g`.

You can also store arbitrary data here in a typesafe fashion with:
```ts
declare global {
  interface GlideGlobals {
    my_prop?: boolean;
  }
}

glide.g.my_prop = true
```

## `glide.tabs` {% id="glide.tabs" %}


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
## `glide.excmds` {% id="glide.excmds" %}


{% api-heading id="glide.excmds.execute" %}
glide.excmds.execute(cmd): Promise<void>
{% /api-heading %}


Execute an excmd, this is the same as typing `:cmd --args`.
## `glide.content` {% id="glide.content" %}


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
await glide.content.execute(
  set_body_border_style,
  { tab_id, args: ["20px dotted pink"] }
)
```

Note: all `args` must be JSON serialisable.
## `glide.keymaps` {% id="glide.keymaps" %}


{% api-heading id="glide.keymaps.set" %}
glide.keymaps.set(modes, lhs, rhs, opts?): void
{% /api-heading %}



{% api-heading id="glide.keymaps.del" %}
glide.keymaps.del(modes, lhs, opts?): void
{% /api-heading %}


Remove the mapping of {lhs} for the {modes} where the map command applies.

The mapping may remain defined for other modes where it applies.
## `glide.hints` {% id="glide.hints" %}


{% api-heading id="glide.hints.activate" %}
glide.hints.activate(opts?): void
{% /api-heading %}


Active and show hints for "clickable" elements in the content frame.

An optional `action()` function can be passed that will be invoked when
a hint is selected.
## `glide.buf` {% id="glide.buf" %}

### `glide.buf.keymaps` {% id="glide.buf.keymaps" %}


{% api-heading id="glide.buf.keymaps.set" %}
glide.buf.keymaps.set(modes, lhs, rhs, opts?): void
{% /api-heading %}



{% api-heading id="glide.buf.keymaps.del" %}
glide.buf.keymaps.del(modes, lhs, opts?): void
{% /api-heading %}


Remove the mapping of {lhs} for the {modes} where the map command applies.

The mapping may remain defined for other modes where it applies.
## `glide.keys` {% id="glide.keys" %}


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
