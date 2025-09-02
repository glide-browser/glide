{% styles %}
h1, h2 {
font-size: revert !important;
}

.index {
border: var(--border-thickness) solid var(--text-color);
padding: calc(var(--line-height) - var(--border-thickness)) 1ch;
margin-bottom: var(--line-height);
}

.index a {
text-decoration: none;
}
{% /styles %}

> [!IMPORTANT]
> These reference docs are not complete yet, some symbols and types are missing completely.
>
> For a full reference, see the [types](./config.md#types) file that Glide generates.

{% html %}

<br>
<details class="index">
  <summary>Index</summary>
{% /html %}

[`glide.ctx`](#glide.ctx)\
[`glide.ctx.mode`](#glide.ctx.mode)\
[`glide.ctx.url`](#glide.ctx.url)\
[`glide.ctx.os`](#glide.ctx.os)\
[`glide.ctx.is_editing()`](#glide.ctx.is_editing)\
[`glide.o`](#glide.o)\
[`glide.o.mapping_timeout`](#glide.o.mapping_timeout)\
[`glide.o.yank_highlight`](#glide.o.yank_highlight)\
[`glide.o.yank_highlight_time`](#glide.o.yank_highlight_time)\
[`glide.o.which_key_delay`](#glide.o.which_key_delay)\
[`glide.o.jumplist_max_entries`](#glide.o.jumplist_max_entries)\
[`glide.o.hint_size`](#glide.o.hint_size)\
[`glide.bo`](#glide.bo)\
[`glide.options`](#glide.options)\
[`glide.options.get()`](#glide.options.get)\
[`glide.prefs`](#glide.prefs)\
[`glide.prefs.set()`](#glide.prefs.set)\
[`glide.prefs.get()`](#glide.prefs.get)\
[`glide.prefs.clear()`](#glide.prefs.clear)\
[`glide.g`](#glide.g)\
[`glide.g.mapleader`](#glide.g.mapleader)\
[`glide.tabs`](#glide.tabs)\
[`glide.tabs.active()`](#glide.tabs.active)\
[`glide.tabs.get_first()`](#glide.tabs.get_first)\
[`glide.excmds`](#glide.excmds)\
[`glide.excmds.execute()`](#glide.excmds.execute)\
[`glide.excmds.create()`](#glide.excmds.create)\
[`glide.content`](#glide.content)\
[`glide.content.execute()`](#glide.content.execute)\
[`glide.keymaps`](#glide.keymaps)\
[`glide.keymaps.set()`](#glide.keymaps.set)\
[`glide.keymaps.del()`](#glide.keymaps.del)\
[`glide.keymaps.list()`](#glide.keymaps.list)\
[`glide.hints`](#glide.hints)\
[`glide.hints.show()`](#glide.hints.show)\
[`glide.buf`](#glide.buf)\
[`glide.buf.prefs`](#glide.buf.prefs)\
[`glide.buf.prefs.set()`](#glide.buf.prefs.set)\
[`glide.buf.keymaps`](#glide.buf.keymaps)\
[`glide.buf.keymaps.set()`](#glide.buf.keymaps.set)\
[`glide.buf.keymaps.del()`](#glide.buf.keymaps.del)\
[`glide.keys`](#glide.keys)\
[`glide.keys.send()`](#glide.keys.send)\
[`glide.keys.next()`](#glide.keys.next)\
[`glide.keys.next_passthrough()`](#glide.keys.next_passthrough)\
[`glide.keys.next_str()`](#glide.keys.next_str)\
[`glide.keys.parse()`](#glide.keys.parse)\
[`glide.unstable`](#glide.unstable)\
[`glide.unstable.include()`](#glide.unstable.include)\
[`glide.messengers`](#glide.messengers)\
[`glide.messengers.create()`](#glide.messengers.create)\
[`glide.modes`](#glide.modes)\
[`glide.modes.register()`](#glide.modes.register)\
[`glide.RGBString`](#glide.RGBString)\
[`glide.HintLocation`](#glide.HintLocation)\
[`DOM.create_element()`](#DOM.create_element)

{% html %}

</details>
{% /html %}

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

This includes but is not limited to `html:<textarea>`, `html:<input>`, `contenteditable=true`.

## • `glide.o: glide.Options` {% id="glide.o" %}

Set browser-wide options.

### `glide.o.mapping_timeout: number` {% id="glide.o.mapping_timeout" %}

How long to wait until cancelling a partial keymapping execution.

For example, `glide.keymaps.set('insert', 'jj', 'mode_change normal')`, after
pressing `j` once, this option determines how long the delay should be until
the `j` key is considered fully pressed and the mapping sequence is reset.

note: this only applies in insert mode.

`ts:@default 200`

### `glide.o.yank_highlight: glide.RGBString` {% id="glide.o.yank_highlight" %}

Color used to briefly highlight text when it's yanked.

`ts:@example "#ff6b35" // Orange highlight`

`ts:@default "#edc73b"`

### `glide.o.yank_highlight_time: number` {% id="glide.o.yank_highlight_time" %}

How long, in milliseconds, to highlight the selection for when it's yanked.

`ts:@default 150`

### `glide.o.which_key_delay: number` {% id="glide.o.which_key_delay" %}

The delay, in milliseconds, before showing the which key UI.

`ts:@default 300`

### `glide.o.jumplist_max_entries: number` {% id="glide.o.jumplist_max_entries" %}

The maximum number of entries to include in the jumplist, i.e.
how far back in history will the jumplist store.

`ts:@default 100`

### `glide.o.hint_size: string` {% id="glide.o.hint_size" %}

The font size of the hint label, directly corresponds to the
[font-size](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size) property.

`ts:@default "11px"`

## • `glide.bo: Partial<glide.Options>` {% id="glide.bo" %}

Set buffer specific options.

This has the exact same API as {% link href="#glide.o" class="go-to-def" %} `ts:glide.o`{% /link %}.

## • `glide.options` {% id="glide.options" %}

{% api-heading id="glide.options.get" %}
glide.options.get(name): glide.Options[Name]
{% /api-heading %}

Returns either a buffer-specific option, or the global version. In that order

## • `glide.prefs` {% id="glide.prefs" %}

{% api-heading id="glide.prefs.set" %}
glide.prefs.set(name, value): void
{% /api-heading %}

Set a preference. This is an alternative to `prefs.js` / [`about:config`](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
that all customisation can be represented in a single `glide.ts` file.

**warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling {% link href="#glide.prefs.set" class="go-to-def" %} `ts:glide.prefs.set`{% /link %} in callbacks
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
glide.g.my_prop = true;
```

### `glide.g.mapleader: string` {% id="glide.g.mapleader" %}

The key notation that any `<leader>` mapping matches against.

For example, a mapping defined with `<leader>r` would be matched when Space + r is pressed.

`ts:@default "<Space>"`

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

{% api-heading id="glide.tabs.get_first" %}
glide.tabs.get_first(query): Promise<Browser.Tabs.Tab | undefined>
{% /api-heading %}

Find the first tab matching the given query filter.

This is the same API as [browser.tabs.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/get),
but returns the first tab instead of an Array.

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
  document.body.style.setProperty("border", css);
}
await glide.content.execute(set_body_border_style, {
  tab_id,
  args: ["20px dotted pink"],
});
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

{% api-heading id="glide.keymaps.list" %}
glide.keymaps.list(modes?): glide.Keymap[]
{% /api-heading %}

List all global key mappings.

If a key mapping is defined for multiple modes, multiple entries
will be returned for each mode.

## • `glide.hints` {% id="glide.hints" %}

{% api-heading id="glide.hints.show" %}
glide.hints.show(opts?): void
{% /api-heading %}

Find and show hints for "clickable" elements in the content frame.

An optional `action()` function can be passed that will be invoked when
a hint is selected.

## • `glide.buf` {% id="glide.buf" %}

### `glide.buf.prefs` {% id="glide.buf.prefs" %}

{% api-heading id="glide.buf.prefs.set" %}
glide.buf.prefs.set(name, value): void
{% /api-heading %}

Set a preference for the current buffer. When navigating to a new buffer, the pref will be reset
to the previous value.

See {% link href="#glide.prefs.set" class="go-to-def" %} `ts:glide.prefs.set`{% /link %} for more information.

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
glide.keys.send(keyseq, opts?): Promise<void>
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

Returns a `Promise` that resolves to a {% link href="#glide.KeyEvent" class="go-to-def" %} `ts:glide.KeyEvent`{% /link %} when the next key is pressed.

This also prevents the key input from being processed further and does _not_ invoke any associated mappings.

If you _want_ to inspect keys without preventing any default behaviour, you can use {% link href="#glide.keys.next_passthrough" class="go-to-def" %} `ts:glide.keys.next_passthrough`{% /link %}.

Note: there can only be one `Promise` registered at any given time.

Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
until another key is pressed, e.g. `<C-a>`.

{% api-heading id="glide.keys.next_passthrough" %}
glide.keys.next_passthrough(): Promise<glide.KeyEvent>
{% /api-heading %}

Returns a `Promise` that resolves to a {% link href="#glide.KeyEvent" class="go-to-def" %} `ts:glide.KeyEvent`{% /link %} when the next key is pressed.

Unlike {% link href="#glide.keys.next" class="go-to-def" %} `ts:glide.keys.next`{% /link %}, this does not prevent key events from passing through into their original behaviour.

Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
until another key is pressed, e.g. `<C-a>`.

{% api-heading id="glide.keys.next_str" %}
glide.keys.next_str(): Promise<string>
{% /api-heading %}

Returns a `Promise` that resolves to a string representation of the key, when the next key is pressed.

This also prevents the key input from being processed further and does _not_ invoke any associated mappings.

If you _want_ to inspect keys without preventing any default behaviour, you can use {% link href="#glide.keys.next_passthrough" class="go-to-def" %} `ts:glide.keys.next_passthrough`{% /link %}.

Note: there can only be one `Promise` registered at any given time.

Note: this does not include modifier keys by themselves, e.g. just pressing ctrl will not resolve
until another key is pressed, e.g. `<C-a>`.

`ts:@example 'd'`

`ts:@example '<C-l>'`

{% api-heading id="glide.keys.parse" %}
glide.keys.parse(key_notation): glide.KeyNotation
{% /api-heading %}

Parse a single key notation into a structured object.

This normalises special keys to be consistent but otherwise the
parsed object only containers modifiers that were in the input string.

Shifted keys are _not_ special cased, the returned key is whatever was given
in in the input.

`ts:@example "<Space>" -> { key: "<Space>" }`

`ts:@example "H" -> { key: "H" }`

`ts:@example "<S-h>" -> { key: "h", shift: true }`

`ts:@example "<S-H>" -> { key: "H", shift: true }`

`ts:@example "<C-S-a>" -> { key: "A", shift: true, ctrl: true }`

`ts:@example "<M-a>" -> { key: "a", meta: true }`

## • `glide.unstable` {% id="glide.unstable" %}

{% api-heading id="glide.unstable.include" %}
glide.unstable.include(path): Promise<void>
{% /api-heading %}

Include another file as part of your config. The given file is evluated as if it
was just another Glide config file.

**note**: this only supports files that are directly relative to your config file,
for example, `ts:"shared.glide.ts"` or `ts:"shared/glide.ts"` would work but
`ts:"../shared/glide.ts"` will not.

**note**: this function cannot be called from inside a file that has been included
itself, i.e. nested {% link href="#glide.unstable.include" class="go-to-def" %} `ts:glide.unstable.include`{% /link %} calls are not supported.

`ts:@example glide.unstable.include("shared.glide.ts")`

## • `glide.messengers` {% id="glide.messengers" %}

{% api-heading id="glide.messengers.create" %}
glide.messengers.create(receiver): glide.ParentMessenger<Messages>
{% /api-heading %}

Create a {% link href="#glide.ParentMessenger" class="go-to-def" %} `ts:glide.ParentMessenger`{% /link %} that can be used to communicate with the content process.

Communication is currently uni-directional, the content process can communicate with the main
process, but not the other way around.

Sending and receiving messages is type safe & determined from the type variable passed to this function.
e.g. in the example below, the only message that can be sent is `my_message`.

```typescript
// create a messenger and pass in the callback that will be invoked
// when `messenger.send()` is called below
const messenger = glide.messengers.create<
  { my_message: null }
>((message) => {
  switch (message.name) {
    case "my_message": {
      // ...
      break;
    }
  }
});

glide.keymaps.set("normal", "gt", ({ tab_id }) => {
  // note the `messenger.content.execute()` function intead of
  // the typical `glide.content.execute()` function.
  messenger.content.execute((messenger) => {
    document.addEventListener("focusin", (event) => {
      if (event.target.id === "my-element") {
        messenger.send("my_message");
      }
    });
  }, { tab_id });
});
```

## • `glide.modes` {% id="glide.modes" %}

{% api-heading id="glide.modes.register" %}
glide.modes.register(mode, opts): void
{% /api-heading %}

Register a custom `mode`.

**note**: you must _also_ register it as a type like so:

```typescript
declare global {
  interface GlideModes {
    leap: "leap";
  }
}
glide.modes.register("leap", { caret: "normal" });
```

# `Types` {% id="types" style="margin-top: 3em !important" %}

## • `glide.RGBString: '#${string}'` {% id="glide.RGBString" %}

## • `glide.HintLocation: "content" | "browser-ui"` {% id="glide.HintLocation" %}

# `DOM` {% id="DOM" %}

Helper functions for interacting with the DOM.

**note**: this is currently only available in the main process, for
updating the browser UI itself. it is not available in
content processes.

{% api-heading id="DOM.create_element" %}
DOM.create_element(tag_name, props?): TagName extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TagName] : HTMLElement
{% /api-heading %}

Wrapper over `document.createElement()` providing a more ergonomic API.

Element properties that can be assigned directly can be provided as props:

```ts
DOM.create_element("img", { src: "..." });
```

You can also pass a `children` property, which will use `.replaceChildren()`:

```ts
DOM.create_element("div", {
  children: [
    "text content",
    DOM.create_element("img", { alt: "hint" }),
  ],
});
```
