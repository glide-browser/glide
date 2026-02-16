# Keys

> [!NOTE]
> For a mostly-complete list of the default key mappings, see [default keymappings](./index.md#default-keymappings), or execute `:map` or `:whichkey`.

{% html %}
<br>
{% /html %}

You can define key mappings in Glide using the same [syntax](#syntax) as in vim, e.g. `<leader>t`, the [config](config.md) looks like this:

```typescript
glide.keymaps.set("normal", "<leader>r", "config_reload");
```

Here, each argument corresponds to:

1. The mode the keymap should apply in.
2. The key sequence to activate it.
3. The [excmd](excmds.md) to run when activated. (note this can also just be a function)

You can also specify multiple modes at once using an array:

```typescript {% check="false" %}
glide.keymaps.set(["normal", "visual"], "<leader>r", "...");
```

Instead of an excmd, you can pass a function directly:

```typescript
glide.keymaps.set("normal", "<leader>r", () => {
  glide.hints.show();
});
```

You can also _delete_ existing keymaps:

```typescript
glide.keymaps.del("normal", "f");
```

## Key codes

By default, Glide matches keymaps from the [`KeyboardEvent.key`](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key) property*, which corresponds to the key that would be inserted into a text editor if you typed it directly.
However this can be undesirable if you have multiple keyboard layouts, or a non-english keyboard layout as you would have to add a separate key mapping for each keyboard layout you use.

In that case, you can [configure](api.md#glide.o.keymaps_use_physical_layout) Glide to use the [`KeyboardEvent.code`](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code) property instead, which corresponds to the _physical_ key that you pressed, regardless of any software layout.

```typescript
glide.o.keyboard_layout = "qwerty";
glide.o.keymaps_use_physical_layout = "force";
```

Note that Glide needs a way to map the key code to the corresponding key string in mappings. For example, what should pressing `Shift` + [`Digit2`](https://developer.mozilla.org/docs/Web/API/UI_Events/Keyboard_event_code_values#code_values_on_linux_x11:~:text=0x000B,-%22Digit2) be matched against?
The answer can change depending on your specific keyboard. On a US keyboard with a qwerty layout you would expect it to match against keymaps using `@`, but on a German keyboard it should be `"`.

The default keyboard layout is US qwerty. If you use a different layout, see the [`ts:glide.o.keyboard_layouts`](api.md#glide.o.keyboard_layouts) option.

> [!NOTE]
> By default, on macOS, Glide resolves keymaps from the `code` property when the `Option` key is pressed to avoid surprising behaviour with [diacritics](https://support.apple.com/guide/mac-help/mh27474/mac#:~:text=Use%20key%20combinations).
>
> If this is undesirable, set the [`ts:glide.o.keymaps_use_physical_layout`](api.md#glide.o.keymaps_use_physical_layout) property to `"never"`.

## Syntax

1. Key combinations are case-sensitive, `<C-a>` and `<C-A>` are treated differently.
2. Modifiers are case-sensitive, `<C-a>` is allowed but `<c-a>` is not (yet).
3. Modifiers are **not** order-sensitive and can be specified in any order. `<D-S-a>` and `<S-D-a>` are equivalent.
4. Regular characters (a-z, 0-9) don't need to be wrapped in angle brackets unless they're combined with modifiers, e.g. `<C-a>`.
5. Special keys must always be wrapped in angle backets, and can be combined with modifiers, e.g. `<leader>` and `<D-leader>`.

### Modifier keys

Modifiers are added as prefixes inside angle brackets and combined with a key using a `-`.

- `<C->` - Control key
- `<S->` - Shift key
- `<A->` or `<M->` - Alt/Meta key
- `<D->` - Command key (macOS)

e.g.

- `<C-a>` - Control + a
- `<S-Tab>` - Shift + Tab
- `<C-S-v>` - Control + Shift + v
- `<D-s>` - Command + s (macOS)

### Special keys

Special keys are wrapped in angle brackets `<>`. For example:

- `<CR>` or `<Enter>` - Enter/Return key
- `<BS>` or `<Backspace>` - Backspace key
- `<Space>` - Space bar
- `<Esc>` or `<Escape>` - Escape key
- `<Tab>` - Tab key
- `<Del>` or `<Delete>` - Delete key
- `<Up>`, `<Down>`, `<Left>`, `<Right>` - Arrow keys
- `<Home>` - Home key
- `<End>` - End key
- `<PageUp>` - Page Up key
- `<PageDown>` - Page Down key
- `<F1>` through `<F12>` - Function keys

### Alias keys

Some keys have aliases to help disambiguate syntax:

- `<Bar>` - Vertical bar `|`
- `<Bslash>` - Backslash `\`
- `<lt>` - Less than `<`

For example, `<lt>` is needed in _some_ cases so that `<` can be used alongside modifier keys.

- `<` -> valid, `<` by itself
- `<D->` -> invalid
- `<D-lt>` -> valid, `Command` + `<`
