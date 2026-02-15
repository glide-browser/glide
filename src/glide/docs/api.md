<!--
  This file is auto-generated from `pnpm build:docs:api` and `scripts/build-api-reference.mts`.

  Do not edit it manually! Any changes will be lost.
-->

{% meta title="API" %}{% /meta %}
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
{% toc selector="h1[id], h2[id]" /%}

> [!IMPORTANT]
> These reference docs are not complete yet, some symbols and types are missing completely.
>
> For a full reference, see the [types](./config.md#types) file that Glide generates.

> [!NOTE]
> Glide also exposes the `browser` [Web Extensions API](extensions.md),
> the browser UI [`document`](config.md#browser-ui),
> and the browser UI [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window).

{% html %}

<br>
<details class="index">
  <summary>Index</summary>
{% /html %}

[`glide.ctx`](#glide.ctx)\
[`glide.ctx.mode`](#glide.ctx.mode)\
[`glide.ctx.version`](#glide.ctx.version)\
[`glide.ctx.firefox_version`](#glide.ctx.firefox_version)\
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
[`glide.o.hint_chars`](#glide.o.hint_chars)\
[`glide.o.hint_label_generator`](#glide.o.hint_label_generator)\
[`glide.o.switch_mode_on_focus`](#glide.o.switch_mode_on_focus)\
[`glide.o.scroll_implementation`](#glide.o.scroll_implementation)\
[`glide.o.native_tabs`](#glide.o.native_tabs)\
[`glide.o.newtab_url`](#glide.o.newtab_url)\
[`glide.o.go_next_patterns`](#glide.o.go_next_patterns)\
[`glide.o.go_previous_patterns`](#glide.o.go_previous_patterns)\
[`glide.bo`](#glide.bo)\
[`glide.options`](#glide.options)\
[`glide.options.get()`](#glide.options.get)\
[`glide.env`](#glide.env)\
[`glide.env.get()`](#glide.env.get)\
[`glide.env.set()`](#glide.env.set)\
[`glide.env.delete()`](#glide.env.delete)\
[`glide.process`](#glide.process)\
[`glide.process.spawn()`](#glide.process.spawn)\
[`glide.process.execute()`](#glide.process.execute)\
[`glide.autocmds`](#glide.autocmds)\
[`glide.autocmds.remove()`](#glide.autocmds.remove)\
[`glide.styles`](#glide.styles)\
[`glide.styles.add()`](#glide.styles.add)\
[`glide.styles.remove()`](#glide.styles.remove)\
[`glide.styles.has()`](#glide.styles.has)\
[`glide.styles.get()`](#glide.styles.get)\
[`glide.prefs`](#glide.prefs)\
[`glide.prefs.set()`](#glide.prefs.set)\
[`glide.prefs.get()`](#glide.prefs.get)\
[`glide.prefs.clear()`](#glide.prefs.clear)\
[`glide.prefs.scoped()`](#glide.prefs.scoped)\
[`glide.g`](#glide.g)\
[`glide.g.mapleader`](#glide.g.mapleader)\
[`glide.tabs`](#glide.tabs)\
[`glide.tabs.active()`](#glide.tabs.active)\
[`glide.tabs.get_first()`](#glide.tabs.get_first)\
[`glide.tabs.query()`](#glide.tabs.query)\
[`glide.tabs.unload()`](#glide.tabs.unload)\
[`glide.commandline`](#glide.commandline)\
[`glide.commandline.show()`](#glide.commandline.show)\
[`glide.commandline.is_active()`](#glide.commandline.is_active)\
[`glide.excmds`](#glide.excmds)\
[`glide.excmds.execute()`](#glide.excmds.execute)\
[`glide.excmds.create()`](#glide.excmds.create)\
[`glide.content`](#glide.content)\
[`glide.content.fn()`](#glide.content.fn)\
[`glide.content.execute()`](#glide.content.execute)\
[`glide.keymaps`](#glide.keymaps)\
[`glide.keymaps.set()`](#glide.keymaps.set)\
[`glide.keymaps.del()`](#glide.keymaps.del)\
[`glide.keymaps.list()`](#glide.keymaps.list)\
[`glide.hints`](#glide.hints)\
[`glide.hints.show()`](#glide.hints.show)\
[`glide.hints.label_generators`](#glide.hints.label_generators)\
[`glide.hints.label_generators.prefix_free`](#glide.hints.label_generators.prefix_free)\
[`glide.hints.label_generators.numeric`](#glide.hints.label_generators.numeric)\
[`glide.findbar`](#glide.findbar)\
[`glide.findbar.open()`](#glide.findbar.open)\
[`glide.findbar.next_match()`](#glide.findbar.next_match)\
[`glide.findbar.previous_match()`](#glide.findbar.previous_match)\
[`glide.findbar.close()`](#glide.findbar.close)\
[`glide.findbar.is_open()`](#glide.findbar.is_open)\
[`glide.findbar.is_focused()`](#glide.findbar.is_focused)\
[`glide.buf`](#glide.buf)\
[`glide.buf.prefs`](#glide.buf.prefs)\
[`glide.buf.prefs.set()`](#glide.buf.prefs.set)\
[`glide.buf.keymaps`](#glide.buf.keymaps)\
[`glide.buf.keymaps.set()`](#glide.buf.keymaps.set)\
[`glide.buf.keymaps.del()`](#glide.buf.keymaps.del)\
[`glide.addons`](#glide.addons)\
[`glide.addons.install()`](#glide.addons.install)\
[`glide.addons.list()`](#glide.addons.list)\
[`glide.search_engines`](#glide.search_engines)\
[`glide.search_engines.add()`](#glide.search_engines.add)\
[`glide.keys`](#glide.keys)\
[`glide.keys.send()`](#glide.keys.send)\
[`glide.keys.next()`](#glide.keys.next)\
[`glide.keys.next_passthrough()`](#glide.keys.next_passthrough)\
[`glide.keys.next_str()`](#glide.keys.next_str)\
[`glide.keys.parse()`](#glide.keys.parse)\
[`glide.include()`](#glide.include)\
[`glide.unstable`](#glide.unstable)\
[`glide.unstable.split_views`](#glide.unstable.split_views)\
[`glide.unstable.split_views.create()`](#glide.unstable.split_views.create)\
[`glide.unstable.split_views.get()`](#glide.unstable.split_views.get)\
[`glide.unstable.split_views.separate()`](#glide.unstable.split_views.separate)\
[`glide.unstable.split_views.has_split_view()`](#glide.unstable.split_views.has_split_view)\
[`glide.path`](#glide.path)\
[`glide.path.cwd`](#glide.path.cwd)\
[`glide.path.home_dir`](#glide.path.home_dir)\
[`glide.path.temp_dir`](#glide.path.temp_dir)\
[`glide.path.profile_dir`](#glide.path.profile_dir)\
[`glide.path.join()`](#glide.path.join)\
[`glide.fs`](#glide.fs)\
[`glide.fs.read()`](#glide.fs.read)\
[`glide.fs.write()`](#glide.fs.write)\
[`glide.fs.exists()`](#glide.fs.exists)\
[`glide.fs.stat()`](#glide.fs.stat)\
[`glide.fs.mkdir()`](#glide.fs.mkdir)\
[`glide.messengers`](#glide.messengers)\
[`glide.messengers.create()`](#glide.messengers.create)\
[`glide.modes`](#glide.modes)\
[`glide.modes.register()`](#glide.modes.register)\
[`glide.modes.list()`](#glide.modes.list)\
[`glide.SpawnOptions`](#glide.SpawnOptions)\
[`glide.Process`](#glide.Process)\
[`glide.ProcessReadStream`](#glide.ProcessReadStream)\
[`glide.CompletedProcess`](#glide.CompletedProcess)\
[`glide.ProcessStdinPipe`](#glide.ProcessStdinPipe)\
[`glide.RGBString`](#glide.RGBString)\
[`glide.TabWithID`](#glide.TabWithID)\
[`glide.ScopedPrefs`](#glide.ScopedPrefs)\
[`glide.AddonInstallOptions`](#glide.AddonInstallOptions)\
[`glide.Addon`](#glide.Addon)\
[`glide.AddonInstall`](#glide.AddonInstall)\
[`glide.AddonType`](#glide.AddonType)\
[`glide.KeyEvent`](#glide.KeyEvent)\
[`glide.KeySendOptions`](#glide.KeySendOptions)\
[`glide.KeymapCallback`](#glide.KeymapCallback)\
[`glide.KeymapContentCallback`](#glide.KeymapContentCallback)\
[`glide.KeymapCallbackProps`](#glide.KeymapCallbackProps)\
[`glide.HintLabelGenerator`](#glide.HintLabelGenerator)\
[`glide.HintLabelGeneratorProps`](#glide.HintLabelGeneratorProps)\
[`glide.HintPicker`](#glide.HintPicker)\
[`glide.HintPickerProps`](#glide.HintPickerProps)\
[`glide.HintLocation`](#glide.HintLocation)\
[`glide.HintAction`](#glide.HintAction)\
[`glide.HintActionProps`](#glide.HintActionProps)\
[`glide.FindbarOpenOpts`](#glide.FindbarOpenOpts)\
[`glide.SplitViewCreateOpts`](#glide.SplitViewCreateOpts)\
[`glide.SplitView`](#glide.SplitView)\
[`glide.KeyNotation`](#glide.KeyNotation)\
[`glide.Keymap`](#glide.Keymap)\
[`glide.KeymapOpts`](#glide.KeymapOpts)\
[`glide.KeymapDeleteOpts`](#glide.KeymapDeleteOpts)\
[`glide.CommandLineShowOpts`](#glide.CommandLineShowOpts)\
[`glide.CommandLineCustomOption`](#glide.CommandLineCustomOption)\
[`glide.FileInfo`](#glide.FileInfo)\
[`DOM.create_element()`](#DOM.create_element)\
[`DOM.listeners`](#DOM.listeners)\
[`DOM.listeners.has()`](#DOM.listeners.has)

{% html %}

</details>
{% /html %}

# `glide` {% id="glide" %}

## • `glide.ctx` {% id="glide.ctx" %}

### `glide.ctx.mode: GlideMode` {% id="glide.ctx.mode" %}

The currently active mode.

### `glide.ctx.version: string` {% id="glide.ctx.version" %}

The current glide version.

`ts:@example "0.1.53a"`

### `glide.ctx.firefox_version: string` {% id="glide.ctx.firefox_version" %}

The firefox version that glide is based on.

`ts:@example "145.0b6"`

### `glide.ctx.url: URL` {% id="glide.ctx.url" %}

The URL of the currently focused tab.

### `glide.ctx.os` {% id="glide.ctx.os" %}

The operating system Glide is running on.

{% api-heading id="glide.ctx.is_editing" %}
glide.ctx.is_editing(): Promise<boolean>
{% /api-heading %}

Whether or not the currently focused element is editable.

This includes but is not limited to `html:<textarea>`, `html:<input>`, `contenteditable=true`.

## • `glide.o: GlideOptions` {% id="glide.o" %}

Set browser-wide options.

You can define your own options by declaration merging `GlideOptions`:

```typescript
declare global {
  interface GlideOptions {
    my_custom_option?: boolean;
  }
}
```

### `glide.o.mapping_timeout: number` {% id="glide.o.mapping_timeout" %}

How long to wait until cancelling a partial keymapping execution.

For example, `glide.keymaps.set('insert', 'jj', 'mode_change normal')`, after
pressing `j` once, this option determines how long the delay should be until
the `j` key is considered fully pressed and the mapping sequence is reset.

note: this only applies in insert mode.

`ts:@default 200`

### `glide.o.yank_highlight: glide.RGBString` {% id="glide.o.yank_highlight" %}

Color used to briefly highlight text when it's yanked.

`ts:@example "#ff6b35"        // Orange highlight`

`ts:@example "rgb(255, 0, 0)" // Red highlight`

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

### `glide.o.hint_chars: string` {% id="glide.o.hint_chars" %}

The characters to include in hint labels.

`ts:@default "hjklasdfgyuiopqwertnmzxcvb"`

### `glide.o.hint_label_generator: glide.HintLabelGenerator` {% id="glide.o.hint_label_generator" %}

A function to produce labels for the given hints. You can provide
your own function or use an included one:

- {% link href="#glide.hints.label_generators.prefix_free" class="go-to-def" %} `ts:glide.hints.label_generators.prefix_free`{% /link %}; this is the
  default.

- {% link href="#glide.hints.label_generators.numeric" class="go-to-def" %} `ts:glide.hints.label_generators.numeric`{% /link %}

For example:

```typescript
glide.o.hint_label_generator = ({ hints }) =>
  Array.from({ length: hints.length }, (_, i) => String(i));
```

Or using data from the hinted elements through `content.execute()`:

```typescript
glide.hints.show({
  async label_generator({ content }) {
    const texts = await content.execute((element) =>
      element.textContent
    );
    return texts.map((text) =>
      text.trim().toLowerCase().slice(0, 2)
    );
  },
});
```

note: the above example is a very naive implementation and will result in issues if there are multiple
elements that start with the same text.

### `glide.o.switch_mode_on_focus: boolean` {% id="glide.o.switch_mode_on_focus" %}

Determines if the current mode will change when certain element types are focused.

For example, if `true` then Glide will automatically switch to `insert` mode when an editable element is focused.

This can be useful for staying in the same mode while switching tabs.

`ts:@default true`

### `glide.o.scroll_implementation` {% id="glide.o.scroll_implementation" %}

Configure the strategy for implementing scrolling, this affects the
`h`, `j`, `k`, `l`,`<C-u>`, `<C-d>`, `G`, and `gg` mappings.

This is exposed as the current `keys` implementation can result in non-ideal behaviour if a website overrides arrow key events.

This will be removed in the future when the kinks with the `keys` implementation are ironed out.

`ts:@default "keys"`

### `glide.o.native_tabs` {% id="glide.o.native_tabs" %}

Configure the behavior of the native tab bar.

- `show`
- `hide`
- `autohide` (animated) shows the bar when the cursor is hovering over its default position

This works for both horizontal and vertical tabs.

For **vertical** tabs, the default collapsed width can be adjusted like this:

```typescript
glide.o.native_tabs = "autohide";
// fully collapse vertical tabs
glide.styles.add(css`
  :root {
    --uc-tab-collapsed-width: 2px;
  }
`);
```

See [firefox-csshacks](https://mrotherguy.github.io/firefox-csshacks/?file=autohide_tabstoolbar_v2.css) for more information.

**warning**: `autohide` does not work on MacOS at the moment.

`ts:@default "show"`

### `glide.o.newtab_url: string` {% id="glide.o.newtab_url" %}

The URL to load when a new tab is created.

This may be a local file (e.g. `"file:///path/to/page.html"`) or
any other URL, e.g. `"https://example.com"`.

`ts:@default "about:newtab"`

### `glide.o.go_next_patterns` {% id="glide.o.go_next_patterns" %}

The element text patterns to search for in the `:go_next` excmd.

For example, with the default patterns, `html:<button>next page</button>` would be matched.

`ts:@default ["next", "more", "newer", ">", ">", "›", "→", "»", "≫", ">>"]`

### `glide.o.go_previous_patterns` {% id="glide.o.go_previous_patterns" %}

The element text patterns to search for in the `:go_previous` excmd.

For example, with the default patterns, `html:<button>previous page</button>` would be matched.

`ts:@default ["prev", "previous", "back", "older", "<", "‹", "←", "«", "≪", "<<"]`

## • `glide.bo: Partial<glide.Options>` {% id="glide.bo" %}

Set buffer specific options.

This has the exact same API as {% link href="#glide.o" class="go-to-def" %} `ts:glide.o`{% /link %}.

## • `glide.options` {% id="glide.options" %}

{% api-heading id="glide.options.get" %}
glide.options.get(name): glide.Options[Name]
{% /api-heading %}

Returns either a buffer-specific option, or the global version. In that order

## • `glide.env` {% id="glide.env" %}

{% api-heading id="glide.env.get" %}
glide.env.get(name): string | null
{% /api-heading %}

Get the value of an environment variable.

If it does not exist `null` is returned.

{% api-heading id="glide.env.set" %}
glide.env.set(name, value): void
{% /api-heading %}

Set the value of an environment variable.

{% api-heading id="glide.env.delete" %}
glide.env.delete(name): string | null
{% /api-heading %}

Remove an environment variable.

Does _not_ error if the environment variable did not already exist.

Returns the value of the deleted environment variable, if it did not exist `null` is returned.

## • `glide.process` {% id="glide.process" %}

{% api-heading id="glide.process.spawn" %}
glide.process.spawn(command, args?, opts?): Promise<glide.Process>
{% /api-heading %}

Spawn a new process. The given `command` can either be the name of a binary in the `PATH`
or an absolute path to a binary file.

If the process exits with a non-zero code, an error will be thrown, you can disable this check with `{ check_exit_code: false }`.

```ts
const proc = await glide.process.spawn("kitty", [
  "nvim",
  "glide.ts",
], { cwd: "~/.dotfiles/glide" });
console.log("opened kitty with pid", proc.pid);
```

**note**: on macOS, the `PATH` environment variable is likely not set to what you'd expect, as applications do not inherit your shell environment.
you can update it with `glide.env.set("PATH", "/usr/bin:/usr/.local/bin")`.

{% api-heading id="glide.process.execute" %}
glide.process.execute(command, args?, opts?): Promise<glide.CompletedProcess>
{% /api-heading %}

Spawn a new process and wait for it to exit.

See {% link href="#glide.process.spawn" class="go-to-def" %} `ts:glide.process.spawn`{% /link %} for more information.

## • `glide.autocmds` {% id="glide.autocmds" %}

{% api-heading id="glide.autocmds.remove" %}
glide.autocmds.remove(event, callback): boolean
{% /api-heading %}

Remove a previously created autocmd.

e.g. to create an autocmd that is only invoked once:

```typescript
glide.autocmds.create(
  "UrlEnter",
  /url/,
  function autocmd() {
    // ... do things
    glide.autocmds.remove("UrlEnter", autocmd);
  },
);
```

If the given event/callback does not correspond to any previously created autocmds, then `false` is returned.

## • `glide.styles` {% id="glide.styles" %}

{% api-heading id="glide.styles.add" %}
glide.styles.add(styles, opts?): void
{% /api-heading %}

Add custom CSS styles to the browser UI.

```typescript
glide.styles.add(css`
  #TabsToolbar {
    visibility: collapse !important;
  }
`);
```

If you want to remove the styles later on, you can pass an ID with `ts:glide.styles.add(..., { id: 'my-id'}`, and then
remove it with `ts:glide.styles.remove('my-id')`.

{% api-heading id="glide.styles.remove" %}
glide.styles.remove(id): boolean
{% /api-heading %}

Remove custom CSS that has previously been added.

```typescript
glide.styles.add(
  css`
  #TabsToolbar {
    visibility: collapse !important;
  }
`,
  { id: "disable-tab-bar" },
);
// ...
glide.styles.remove("disable-tab-bar");
```

If the given ID does not correspond to any previously registered styles, then `false` is returned.

{% api-heading id="glide.styles.has" %}
glide.styles.has(id): boolean
{% /api-heading %}

Returns whether or not custom CSS has been registered with the given `id`.

{% api-heading id="glide.styles.get" %}
glide.styles.get(id): string | undefined
{% /api-heading %}

Returns the CSS string for the given `id`, or `undefined` if no styles have been registered with that ID.

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

{% api-heading id="glide.prefs.scoped" %}
glide.prefs.scoped(): glide.ScopedPrefs
{% /api-heading %}

Helper for temporarily setting prefs.

You **must** assign this with the `using` keyword, e.g. `using prefs = glide.prefs.scoped()`.

_temporary_ is determined by the lifetime of the return value, e.g.

```typescript
{
  using prefs = glide.prefs.scoped();
  prefs.set("foo", true);
  // .... for the rest of this block `foo` is set to `true`
}

// ... now outside the block, `foo` is set to its previous value
```

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

{% api-heading id="glide.tabs.query" %}
glide.tabs.query(query): Promise<Browser.Tabs.Tab[]>
{% /api-heading %}

Gets all tabs that have the specified properties, or all tabs if no properties are specified.

This is the same API as [browser.tabs.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query),

{% api-heading id="glide.tabs.unload" %}
glide.tabs.unload(...tabs): Promise<void>
{% /api-heading %}

Unload[0] the given tabs.

Note that you _cannot_ unload the currently active tab, if you try to do so, an error will be thrown.

[0]: https://support.mozilla.org/kb/unload-tabs-reduce-memory-usage-firefox

## • `glide.commandline` {% id="glide.commandline" %}

{% api-heading id="glide.commandline.show" %}
glide.commandline.show(opts?): Promise<void>
{% /api-heading %}

Show the commandline UI.

By default this will list all excmds, but you can specify your own options, e.g.

```typescript
glide.commandline.show({
  title: "my options",
  options: ["option 1", "option 2", "option 3"].map((
    label,
  ) => ({
    label,
    execute() {
      console.log(`label ${label} was selected`);
    },
  })),
});
```

{% api-heading id="glide.commandline.is_active" %}
glide.commandline.is_active(): boolean
{% /api-heading %}

If the commandline is open and focused.

## • `glide.excmds` {% id="glide.excmds" %}

{% api-heading id="glide.excmds.execute" %}
glide.excmds.execute(cmd): Promise<void>
{% /api-heading %}

Execute an excmd, this is the same as typing `:cmd --args`.

{% api-heading id="glide.excmds.create" %}
glide.excmds.create(info, fn): Excmd
{% /api-heading %}

Create a new excmd.

e.g.

```typescript
const cmd = glide.excmds.create({
  name: "my_excmd",
  description: "...",
}, () => {
  // ...
});
declare global {
  interface ExcmdRegistry {
    my_excmd: typeof cmd;
  }
}
```

## • `glide.content` {% id="glide.content" %}

{% api-heading id="glide.content.fn" %}
glide.content.fn(wrapped): glide.ContentFunction<F>
{% /api-heading %}

Mark a function so that it will be executed in the content process instead of the main proces.

This is useful for APIs that are typically executed in the main process, for example:

```typescript
glide.excmds.create(
  { name: "focus_page" },
  glide.content.fn(() => {
    document.body!.focus();
  }),
);
```

{% api-heading id="glide.content.execute" %}
glide.content.execute(func, opts): Promise<Return>
{% /api-heading %}

Execute a function in the content process for the given tab.

```ts
await glide.content.execute(() => {
  document.body!.appendChild(DOM.create_element("p", [
    "this will show up at the bottom of the page!",
  ]));
}, { tab_id: await glide.tabs.active() });
```

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

### `glide.hints.label_generators` {% id="glide.hints.label_generators" %}

#### `glide.hints.label_generators.prefix_free: glide.HintLabelGenerator` {% id="glide.hints.label_generators.prefix_free" %}

Use with {% link href="#glide.o.hint_label_generator" class="go-to-def" %} `ts:glide.o.hint_label_generator`{% /link %} to generate
prefix-free combinations of the characters in
{% link href="#glide.o.hint_chars" class="go-to-def" %} `ts:glide.o.hint_chars`{% /link %}.

#### `glide.hints.label_generators.numeric: glide.HintLabelGenerator` {% id="glide.hints.label_generators.numeric" %}

Use with {% link href="#glide.o.hint_label_generator" class="go-to-def" %} `ts:glide.o.hint_label_generator`{% /link %} to generate
sequential numeric labels, starting at `1` and counting up.
Ignores {% link href="#glide.o.hint_chars" class="go-to-def" %} `ts:glide.o.hint_chars`{% /link %}.

## • `glide.findbar` {% id="glide.findbar" %}

APIs for interacting with the native [findbar](https://support.mozilla.org/kb/search-contents-current-page-text-or-links).

{% api-heading id="glide.findbar.open" %}
glide.findbar.open(opts?): Promise<void>
{% /api-heading %}

Open the findbar.

This can also be used to update the findbar options if it is already open.

{% api-heading id="glide.findbar.next_match" %}
glide.findbar.next_match(): Promise<void>
{% /api-heading %}

Select the next match for the findbar query.

If the findbar is not currently open, then it is opened with the last searched query.

{% api-heading id="glide.findbar.previous_match" %}
glide.findbar.previous_match(): Promise<void>
{% /api-heading %}

Select the previous match for the findbar query.

If the findbar is not currently open, then it is opened with the last searched query.

{% api-heading id="glide.findbar.close" %}
glide.findbar.close(): Promise<void>
{% /api-heading %}

Close the findbar. Does nothing if the findbar is already closed.

{% api-heading id="glide.findbar.is_open" %}
glide.findbar.is_open(): boolean
{% /api-heading %}

If the findbar UI is currently visible.

{% api-heading id="glide.findbar.is_focused" %}
glide.findbar.is_focused(): boolean
{% /api-heading %}

If the findbar UI is currently visible _and_ focused.

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

## • `glide.addons` {% id="glide.addons" %}

{% api-heading id="glide.addons.install" %}
glide.addons.install(xpi_url, opts?): Promise<glide.AddonInstall>
{% /api-heading %}

Installs an addon from the given XPI URL if that addon has _not_ already been installed.

If you want to ensure the addon is reinstalled, pass `{ force: true }`.

You can obtain an XPI URL from [addons.mozilla.org](https://addons.mozilla.org) by finding
the extension you'd like to install, right clicking on "Add to Firefox" and selecting "Copy link".

{% api-heading id="glide.addons.list" %}
glide.addons.list(types?): Promise<glide.Addon[]>
{% /api-heading %}

List all installed addons.

The returned addons can be filtered by type, for example to only return extensions:

```typescript
await glide.addons.list("extension");
```

## • `glide.search_engines` {% id="glide.search_engines" %}

{% api-heading id="glide.search_engines.add" %}
glide.search_engines.add(props): Promise<void>
{% /api-heading %}

Adds or updates a custom search engine.

The format matches `chrome_settings_overrides.search_provider` [0] from WebExtension manifests.

The `search_url` must contain `{searchTerms}` as a placeholder for the search query.

```typescript
glide.search_engines.add({
  name: "Discogs",
  keyword: "disc",
  search_url:
    "https://www.discogs.com/search/?q={searchTerms}",
  favicon_url: "https://www.discogs.com/favicon.ico",
});
```

**note**: search engines you add are not removed when this call is removed, you will need to manually remove them
using `about:preferences#search` for now.

**note**: not all properties in the `chrome_settings_overrides.search_provider` manifest are supported, as they are not all
supported by Firefox, e.g. `instant_url`, and `image_url`.

[0]: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides#search_provider

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

{% api-heading id="glide.include" %}
glide.include(path): Promise<void>
{% /api-heading %}

Include another file as part of your config. The given file is evluated as if it
was just another Glide config file.

`ts:@example glide.include("shared.glide.ts")`

## • `glide.unstable` {% id="glide.unstable" %}

### `glide.unstable.split_views` {% id="glide.unstable.split_views" %}

Manage tab split views.

**note**: split views are experimental in Firefox, there _will_ be bugs.

{% api-heading id="glide.unstable.split_views.create" %}
glide.unstable.split_views.create(tabs, opts?): glide.SplitView
{% /api-heading %}

Start a split view with the given tabs.

At least 2 tabs must be passed.

**note**: this will not work if one of the given tabs is _pinned_.

{% api-heading id="glide.unstable.split_views.get" %}
glide.unstable.split_views.get(tab): glide.SplitView | null
{% /api-heading %}

Given a tab, tab ID, or a splitview ID, return the corresponding split view.

{% api-heading id="glide.unstable.split_views.separate" %}
glide.unstable.split_views.separate(tab): void
{% /api-heading %}

Revert a tab in a split view to a normal tab.

If the given tab is _not_ in a split view, then an error is thrown.

{% api-heading id="glide.unstable.split_views.has_split_view" %}
glide.unstable.split_views.has_split_view(tab): boolean
{% /api-heading %}

Whether or not the given tab is in a split view.

## • `glide.path` {% id="glide.path" %}

### `glide.path.cwd` {% id="glide.path.cwd" %}

### `glide.path.home_dir` {% id="glide.path.home_dir" %}

### `glide.path.temp_dir` {% id="glide.path.temp_dir" %}

### `glide.path.profile_dir` {% id="glide.path.profile_dir" %}

{% api-heading id="glide.path.join" %}
glide.path.join(...parts): string
{% /api-heading %}

Join all arguments together and normalize the resulting path.

Throws an error on non-relative paths.

## • `glide.fs` {% id="glide.fs" %}

{% api-heading id="glide.fs.read" %}
glide.fs.read(path, encoding): Promise<string>
{% /api-heading %}

Read the file at the given path.

Relative paths are resolved relative to the config directory, if no config directory is defined then relative
paths are not allowed.

The `encoding` must currently be set to `"utf8"` as that is the only supported encoding.

`ts:@example await glide.fs.read("github.css", "utf8");`

{% api-heading id="glide.fs.write" %}
glide.fs.write(path, contents): Promise<void>
{% /api-heading %}

Write to the file at the given path.

Relative paths are resolved relative to the config directory, if no config directory is defined then relative
paths are not allowed.

If the path has parent directories that do not exist, they will be created.

The `contents` are written in utf8.

`ts:@example await glide.fs.write("github.css", ".copilot { display: none !important }");`

{% api-heading id="glide.fs.exists" %}
glide.fs.exists(path): Promise<boolean>
{% /api-heading %}

Determine if the given path exists.

Relative paths are resolved relative to the config directory, if no config directory is defined then relative
paths are not allowed.

`ts:@example await glide.fs.exists(\`${glide.path.home_dir}/.config/foo\`);`

{% api-heading id="glide.fs.stat" %}
glide.fs.stat(path): Promise<glide.FileInfo>
{% /api-heading %}

Obtain information about a file, such as size, modification dates, etc.

Relative paths are resolved relative to the config directory, if no config directory is defined then relative
paths are not allowed.

```ts
const stat = await glide.fs.stat("userChrome.css");
stat.last_modified; // 1758835015092
stat.type; // "file"
```

{% api-heading id="glide.fs.mkdir" %}
glide.fs.mkdir(path, props?): Promise<void>
{% /api-heading %}

Create a new directory at the given `path`.

Parent directories are created by default, if desired you can turn this off with
`ts:glide.fs.mkdir('...', { parents: false })`.

By default this will _not_ error if the `path` already exists, if you would like it
to do so, pass `ts:glide.fs.mkdir('...', { exists_ok: false })`

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
glide.modes.register("leap", { caret: "block" });
```

{% api-heading id="glide.modes.list" %}
glide.modes.list(): GlideMode[]
{% /api-heading %}

List all registered modes.

# `Types` {% id="types" style="margin-top: 3em !important" %}

## • `glide.SpawnOptions` {% id="glide.SpawnOptions" %}

```typescript {% highlight_prefix="type x = {" %}
cwd?: string;
env?: Record<string, string | null>;
extend_env?: boolean;
success_codes?: number[];
/**
 * If `false`, do not throw an error for non-zero exit codes.
 *
 * @default true
 */
check_exit_code?: boolean;
/**
 * Control where the stderr output is sent.
 *
 * If `"pipe"` then sterr is accessible through `process.stderr`.
 * If `"stdout"` then sterr is mixed with stdout and accessible through `process.stdout`.
 *
 * @default "pipe"
 */
stderr?: "pipe" | "stdout";
```

## • `glide.Process` {% id="glide.Process" %}

```typescript {% highlight_prefix="type x = {" %}
pid: number;
/**
 * The process exit code.
 *
 * `null` if it has not exited yet.
 */
exit_code: number | null;
/**
 * A `ReadableStream` of `string`s from the stdout pipe with helpers for processing the output.
 */
stdout: glide.ProcessReadStream;
/**
 * A `ReadableStream` of `string`s from the stderr pipe with helpers for processing the output.
 *
 * This is `null` if the `stderr: 'stdout'` option was set as the pipe will be forwarded
 * to `stdout` instead.
 */
stderr: glide.ProcessReadStream | null;
/**
 * Write to the process's stdin pipe.
 */
stdin: glide.ProcessStdinPipe;
/**
 * Wait for the process to exit.
 */
wait(): Promise<glide.CompletedProcess>;
/**
 * Kill the process.
 *
 * On platforms which support it, the process will be sent a `SIGTERM` signal immediately,
 * so that it has a chance to terminate gracefully, and a `SIGKILL` signal if it hasn't exited
 * within `timeout` milliseconds.
 *
 * @param {integer} [timeout=300]
 *        A timeout, in milliseconds, after which the process will be forcibly killed.
 */
kill(timeout?: number): Promise<glide.CompletedProcess>;
```

## • `glide.ProcessReadStream` {% id="glide.ProcessReadStream" %}

```typescript {% highlight_prefix="type x = " %}
ReadableStream<string> & {
    /**
     * When `await`ed returns all of the text in the stream.
     *
     * When iterated, yields each text chunk in the stream as it comes in.
     */
    text(): Promise<string> & {
        [Symbol.asyncIterator](): AsyncIterator<string>;
    };
    /**
     * When `await`ed returns an array of lines.
     *
     * When iterated, yields each line in the stream as it comes in.
     */
    lines(): Promise<string[]> & {
        [Symbol.asyncIterator](): AsyncIterator<string>;
    };
}
```

## • `glide.CompletedProcess` {% id="glide.CompletedProcess" %}

Represents a process that has exited.

```typescript {% highlight_prefix="type x = " %}
glide.Process & {
    exit_code: number;
}
```

## • `glide.ProcessStdinPipe` {% id="glide.ProcessStdinPipe" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * Write data to the process's stdin.
 *
 * Accepts either a string (which will be UTF-8 encoded) or
 * a binary array (e.g. ArrayBuffer, Uint8Array etc).
 *
 * **warning**: you *must* call `.close()` once you are done writing,
 *              otherwise the process will never exit.
 */
write(data: string | ArrayBuffer | glide.TypedArray): Promise<void>;
/**
 * Close the stdin pipe, signaling EOF to the process.
 *
 * By default, waits for any pending writes to complete before closing.
 * Pass `{ force: true }` to close immediately without waiting.
 */
close(opts?: {
    force?: boolean;
}): Promise<void>;
```

## • `glide.RGBString: '#${string}` | `rgb(${string})'` {% id="glide.RGBString" %}

## • `glide.TabWithID` {% id="glide.TabWithID" %}

A web extension tab that is guaranteed to have the `ts:id` property present.

```typescript {% highlight_prefix="type x = " %}
Omit<Browser.Tabs.Tab, "id"> & {
    id: number;
}
```

## • `glide.ScopedPrefs` {% id="glide.ScopedPrefs" %}

```typescript {% highlight_prefix="type x = " %}
Omit<(typeof glide.prefs), "scoped"> & {
  [Symbol.dispose](): void;,
};
```

## • `glide.AddonInstallOptions` {% id="glide.AddonInstallOptions" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * If `true`, always install the given addon, even if it is already installed.
 *
 * @default false
 */
force?: boolean;
/**
 * If the addon will be enabled in private browsing mode.
 *
 * @default false
 */
private_browsing_allowed?: boolean;
```

## • `glide.Addon` {% id="glide.Addon" %}

```typescript {% highlight_prefix="type x = {" %}
readonly id: string;
readonly name: string;
readonly description: string;
readonly version: string;
readonly active: boolean;
readonly source_uri: URL | null;
readonly private_browsing_allowed: boolean;
readonly type: "extension" | "plugin" | "theme" | "locale" | "dictionary" | "sitepermission" | "mlmodel";
uninstall(): Promise<void>;
/**
 * Reload the addon.
 *
 * This is similar to uninstalling / reinstalling, but less destructive.
 */
reload(): Promise<void>;
```

## • `glide.AddonInstall` {% id="glide.AddonInstall" %}

```typescript {% highlight_prefix="type x = " %}
glide.Addon & {
    cached: boolean;
}
```

## • `glide.AddonType` {% id="glide.AddonType" %}

```typescript {% highlight_prefix="type x = " %}
"extension" | "theme" | "locale" | "dictionary"
  | "sitepermission";
```

## • `glide.KeyEvent` {% id="glide.KeyEvent" %}

```typescript {% highlight_prefix="type x = " %}
KeyboardEvent & {
    /**
     * The vim notation of the KeyEvent, e.g.
     *
     * `{ ctrlKey: true, key: 's' }` -> `'<C-s>'`
     */
    glide_key: string;
}
```

## • `glide.KeySendOptions` {% id="glide.KeySendOptions" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * Send the key event(s) directly through to the builtin Firefox
 * input handler and skip all of the mappings defined in Glide.
 */
skip_mappings?: boolean;
```

## • `glide.KeymapCallback` {% id="glide.KeymapCallback" %}

```typescript {% highlight_prefix="type x = " %}
(props: glide.KeymapCallbackProps) => void
```

## • `glide.KeymapContentCallback` {% id="glide.KeymapContentCallback" %}

```typescript {% highlight_prefix="type x = " %}
glide.ContentFunction<() => void>;
```

## • `glide.KeymapCallbackProps` {% id="glide.KeymapCallbackProps" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * The tab that the callback is being executed in.
 */
tab_id: number;
```

## • `glide.HintLabelGenerator` {% id="glide.HintLabelGenerator" %}

```typescript {% highlight_prefix="type x = " %}
(ctx: HintLabelGeneratorProps) => string[] | Promise<string[]>
```

## • `glide.HintLabelGeneratorProps` {% id="glide.HintLabelGeneratorProps" %}

````typescript {% highlight_prefix="type x = {" %}
hints: glide.Hint[];
content: {
    /**
     * Executes the given callback in the content process to extract properties
     * from the all elements that are being hinted.
     *
     * For example:
     * ```typescript
     * const texts = await content.map((target) => target.textContent);
     * ```
     */
    map<R>(cb: (target: HTMLElement, index: number) => R | Promise<R>): Promise<Awaited<R>[]>;
};
````

## • `glide.HintPicker` {% id="glide.HintPicker" %}

```typescript {% highlight_prefix="type x = " %}
(props: glide.HintPickerProps) => glide.Hint[] | Promise<glide.Hint[]>
```

## • `glide.HintPickerProps` {% id="glide.HintPickerProps" %}

````typescript {% highlight_prefix="type x = {" %}
hints: glide.Hint[];
content: {
    /**
     * Executes the given callback in the content process to extract properties
     * from the all elements that are being hinted.
     *
     * For example:
     * ```typescript
     * const areas = await content.map((element) => element.offsetWidth * element.offsetHeight);
     * ```
     */
    map<R>(cb: (target: HTMLElement, index: number) => R | Promise<R>): Promise<Awaited<R>[]>;
};
````

## • `glide.HintLocation: "content" | "browser-ui"` {% id="glide.HintLocation" %}

## • `glide.HintAction: "click" | "newtab-click" | ((props: glide.HintActionProps) => Promise<void> | void)` {% id="glide.HintAction" %}

## • `glide.HintActionProps` {% id="glide.HintActionProps" %}

````typescript {% highlight_prefix="type x = {" %}
/**
 * The resolved hint that is being executed.
 */
hint: glide.ResolvedHint;
content: {
    /**
     * Execute the given callback in the content process to extract properties
     * from the hint element.
     *
     * For example:
     * ```typescript
     * const href = await content.execute((target) => target.href);
     * ```
     */
    execute<R>(cb: (target: HTMLElement) => R | Promise<R>): Promise<R extends Promise<infer U> ? U : R>;
};
````

## • `glide.FindbarOpenOpts` {% id="glide.FindbarOpenOpts" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * Search for the given string.
 *
 * When not specified, the findbar opens with the most recently used search query. To open the findbar
 * with an empty query, pass an empty string `""`.
 */
query?: string;
/**
 * The findbar can be opened in 3 different "modes":
 *
 * - "links"    : the findbar will only show results for links, pressing enter will click the link
 * - "typeahead": the findbar will exit as soon as you press enter
 * - "normal"   : the classic experience
 *
 * @default "normal"
 */
mode?: "normal" | "typeahead" | "links";
/**
 * Highlight all terms that match the search you've entered
 *
 * When not specified, this retains whatever value was last set—either through the API or by manually
 * toggling the highlight button in the findbar.
 */
highlight_all?: boolean | undefined;
/**
 * Make searches case-sensitive.
 *
 * Normally if you search for "search phrase", instances of "Search Phrase" on the page will also be found.
 *
 * If this is set to `false`, only instances of the phrase exactly as you've typed it will be found.
 *
 * When not specified, this retains whatever value was last set—either through the API or by manually
 * toggling the casing button in the findbar.
 */
match_casing?: boolean | undefined;
/**
 * When this option is `true` the search will distinguish between accented letters and their base letters.
 *
 * For example, the search for "résumé" will not find a match for "resume".
 *
 * When not specified, this retains whatever value was last set—either through the API or by manually
 * toggling the diacritics button in the findbar.
 */
match_diacritics?: boolean | undefined;
/**
 * This highlights only entire words that match your search.
 *
 * When not specified, this retains whatever value was last set—either through the API or by manually
 * toggling the whole words button in the findbar.
 */
whole_words?: boolean | undefined;
```

## • `glide.SplitViewCreateOpts` {% id="glide.SplitViewCreateOpts" %}

```typescript {% highlight_prefix="type x = {" %}
id?: string;
```

## • `glide.SplitView` {% id="glide.SplitView" %}

```typescript {% highlight_prefix="type x = {" %}
id: string;
tabs: Browser.Tabs.Tab[];
```

## • `glide.KeyNotation` {% id="glide.KeyNotation" %}

```typescript {% highlight_prefix="type x = {" %}
/**
 * @example <leader>
 * @example h
 * @example j
 * @example K
 * @example L
 * @example <Tab>
 */
key: string;

// modifiers
alt: boolean;
ctrl: boolean;
meta: boolean;
shift: boolean;
```

## • `glide.Keymap` {% id="glide.Keymap" %}

```typescript {% highlight_prefix="type x = {" %}
sequence: string[];
lhs: string;
rhs: glide.ExcmdValue;
description: string | undefined;
mode: GlideMode;
```

## • `glide.KeymapOpts` {% id="glide.KeymapOpts" %}

```typescript {% highlight_prefix="type x = {" %}
description?: string | undefined;
/**
 * If `true`, applies the mapping for the current buffer instead of globally.
 *
 * @default {false}
 */
buffer?: boolean;
/**
 * If true, the key sequence will be displayed even after the mapping is executed.
 *
 * This is useful for mappings that are conceptually chained but are not *actually*, e.g. `diw`.
 *
 * @default false
 */
retain_key_display?: boolean;
```

## • `glide.KeymapDeleteOpts` {% id="glide.KeymapDeleteOpts" %}

```typescript {% highlight_prefix="type x = " %}
Pick<glide.KeymapOpts, "buffer">;
```

## • `glide.CommandLineShowOpts` {% id="glide.CommandLineShowOpts" %}

````typescript {% highlight_prefix="type x = {" %}
/**
 * Fill the commandline with this input by default.
 */
input?: string;
/**
 * Configure the text shown at the top of the commandline.
 *
 * This is *only* used when `options` are provided.
 *
 * If `options` are given and this is not, then it defaults to `"options"`.
 */
title?: string;
/**
 * Replace the default commandline options.
 *
 * For example:
 *
 * ```typescript
 * ["option 1", "option 2", "option 3"].map((label) => ({
 *   label,
 *   execute() {
 *     console.log(`label ${label} was selected`);
 *   },
 * })),
 * ```
 */
options?: glide.CommandLineCustomOption[];
````

## • `glide.CommandLineCustomOption` {% id="glide.CommandLineCustomOption" %}

````typescript {% highlight_prefix="type x = {" %}
/** Primary text shown for this option. */
label: string;
/** Optional secondary text rendered next to the label. */
description?: string;
/**
 * Optional callback used to display this option in the UI.
 *
 * If provided, this _replaces_ the default rendering, which is placing `label` / `description` in two columns.
 *
 * @example
 * ```typescript
 * render() {
 *   return DOM.create_element("div", {
 *     style: { display: "flex", alignItems: "center", gap: "8px" },
 *     children: [bookmark.title],
 *   });
 * }
 * ```
 */
render?(): HTMLElement;
/**
 * Optional callback used to determine if this option matches the input entered in the commandline.
 *
 * This is called every time the input changes.
 *
 * `null` can be returned to defer to the default matcher.
 *
 * @example
 * ```typescript
 * matches({ input }) {
 *   return my_fuzzy_matcher(input, [bookmark.title]);
 * }
 * ```
 */
matches?(props: {
    input: string;
}): boolean | null;
/**
 * Callback that is invoked when `<enter>` is pressed while this option is focused.
 *
 * The `input` corresponds to the text entered in the commandline.
 */
execute(props: {
    input: string;
}): void;
````

## • `glide.FileInfo` {% id="glide.FileInfo" %}

```typescript {% highlight_prefix="type x = {" %}
type: "file" | "directory" | null;
permissions: number | undefined;
last_accessed: number | undefined;
last_modified: number | undefined;
creation_time: number | undefined;
path: string | undefined;
size: number | undefined;
```

# `DOM` {% id="DOM" %}

Helper functions for interacting with the DOM.

**note**: this is currently only available in the main process, for
updating the browser UI itself. it is not available in
content processes.

{% api-heading id="DOM.create_element" %}
DOM.create_element(tag_name, props_or_children?, props?): TagName extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TagName] : HTMLElement
{% /api-heading %}

Wrapper over `document.createElement()` providing a more ergonomic API.

Element properties that can be assigned directly can be provided as props:

```ts
DOM.create_element("img", { src: "..." });
```

You can also pass a `children` array, or property, which will use `.replaceChildren()`:

```ts
DOM.create_element("div", [
  "text content",
  DOM.create_element("img", { alt: "hint" }),
]);
// or
DOM.create_element("div", {
  children: [
    "text content",
    DOM.create_element("img", { alt: "hint" }),
  ],
});
```

## • `DOM.listeners` {% id="DOM.listeners" %}

{% api-heading id="DOM.listeners.has" %}
DOM.listeners.has(target, type): boolean
{% /api-heading %}

Returns true if a event target has any listener for the given type.

```typescript
DOM.listeners.has(element, "click");
```
