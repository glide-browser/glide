# Autocmds

Auto commands let you register functions that will be automatically invoked when a certain event happens within Glide.

Suppose you want to define a key mapping to navigate directly from a GitHub repository to the `Issues` page, first
you'd define a function to update the current URL:

```typescript
async function github_go_to_issues() {
  const url = glide.ctx.url;
  const parts = url.pathname.split("/").filter(Boolean);
  assert(
    parts.length >= 2,
    `Path does not look like github.com/$org/$repo`,
  );

  url.pathname = `/${parts[0]}/${parts[1]}/issues`;
  await browser.tabs.update({ url: url.toString() });
}
```

And then define an autocmd that sets a keymap for the current buffer

```typescript {% check="false" %}
glide.autocmds.create("UrlEnter", {
  hostname: "github.com",
}, async () => {
  glide.buf.keymaps.set(
    "normal",
    "<leader>gi",
    github_go_to_issues,
  );
});
```

There are many other [things](cookbook.md) you can accomplish with autocmds.

# Reference

Autocmds can be created with:

```typescript {% check="false" %}
glide.autocmds.create(event, pattern, callback);
```

Some autocmds do not require a pattern and can be called with just:

```typescript {% check="false" %}
glide.autocmds.create(event, callback);
```

## ConfigLoaded

Fired when the config is first loaded _and_ on every subsequent reload.

```typescript
glide.autocmds.create("ConfigLoaded", () => {
  //
});
```

## WindowLoaded

Fired when Glide is _first_ started.

```typescript
glide.autocmds.create("WindowLoaded", () => {
  //
});
```

## UrlEnter

Fired when the focused URL changes, which can happen under the following circumstances:

- switching tabs
- navigating back/forward through history
- clicking a link or doing anything else that would change the URL in the current tab

The `pattern` is either a `RegExp` that matches against the entire URL, or an object with `{ hostname: string }`.

The callback can also `return` a function that will be called when _another_ `UrlEnter` event would be fired.

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, () => {
  //
});
```

Callback arguments:

```typescript {% highlight_prefix="interface x " %}
{
  tab_id: number;
  url: string;
}
```

## ModeChanged

Fired when the mode changes.

The `pattern` is matched against `ts:old_mode:new_mode`. You can also use `*` as a placeholder
to match _any_ mode.

For example, to define an autocmd that will be fired every time hint mode is entered: `"*:hint"`

or when hint mode is left: `"hint:*"`

or transitioning from hint to insert: `"hint:insert"`

or for just any mode: `"*"`

```typescript
glide.autocmds.create(
  "ModeChanged",
  "*",
  ({ old_mode, new_mode }) => {
    //
  },
);
```

Callback arguments:

```typescript {% highlight_prefix="interface x " %}
{
  readonly old_mode: GlideMode | null;
  readonly new_mode: GlideMode;
}
```

## KeyStateChanged

Fired whenever the key sequence changes, which can happen under four circumstances:

1. A key is pressed that matches a key mapping.
2. A key is pressed that is _part_ of a key mapping.
3. A key is pressed that cancels a previous partial key mapping sequence.
4. A partial key mapping is cancelled (see [glide.o.mapping_timeout](api.md#glide.o.mapping_timeout))

For example, with

```typescript {% check="false" %}
glide.keymaps.set("normal", "gt", "...");
```

Pressing `g` will fire with `{ sequence: ["g"], partial: true }`, then either:

- Pressing `t` would fire `{ sequence: ["g", "t"], partial: false }`
- Pressing any other key would fire `{ sequence: [], partial: false }`

Note that this is _not_ fired for consecutive key presses for keys that don't correspond to mappings,
as the key state has not changed.

```typescript
glide.autocmds.create(
  "KeyStateChanged",
  ({ mode, sequence, partial }) => {
    //
  },
);
```

Callback arguments:

```typescript {% highlight_prefix="interface x " %}
{
  readonly mode: GlideMode;
  readonly sequence: string[];
  readonly partial: boolean;
}
```
