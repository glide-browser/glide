# Key Mappings

Glide uses the familiar Vim syntax for defining key mappings. If it can be mapped in Vim but not in Glide, that's a bug{% sup %}\[[1](#known-differences-with-vim)\]{% /sup %}.

<!-- TODO: expand more on meta keys -->
<!-- TODO: add a "what keys to map" section-->

## Special keys

Special keys are wrapped in angle brackets `<>`. For example:

- `<CR>` or `<Enter>` - Enter/Return key
- `<BS>` or `<Backspace>` - Backspace key
- `<Space>` - Space bar
- `<Esc>` or `<Escape>` - Escape key
- `<Tab>` - Tab key
- `<Del>` or `<Delete>` - Delete key

## Navigation keys

- `<Up>`, `<Down>`, `<Left>`, `<Right>` - Arrow keys
- `<Home>` - Home key
- `<End>` - End key
- `<PageUp>` - Page Up key
- `<PageDown>` - Page Down key

## Function keys

- `<F1>` through `<F12>` - Function keys

## Modifier keys

Modifiers are added as prefixes inside the angle brackets:

- `<C->` - Control key
- `<S->` - Shift key
- `<A->` or `<M->` - Alt/Meta key
- `<D->` - Command key (macOS)

Examples:

- `<C-a>` - Control + a
- `<S-Tab>` - Shift + Tab
- `<C-S-v>` - Control + Shift + v
- `<D-s>` - Command + s (macOS)

## Special character aliases

Some keys have aliases to help disambiguate syntax:

- `<Bar>` - Vertical bar `|`
- `<Bslash>` - Backslash `\`
- `<lt>` - Less than `<`

For example, `<lt>` is needed in _some_ cases so that `<` can be used alongside modifier keys.

- `<` -> valid, `<` by itself
- `<D->` -> invalid
- `<D-lt>` -> valid, `Command` + `<`

## Notes

1. Key combinations are case-sensitive, `<C-a>` and `<C-A>` are treated differently.

2. Key notations are always normalised. It doesn't matter which order modifiers are specified with, e.g. `<D-S-a>` and `<S-D-a>` are equivalent.

3. Regular characters (a-z, 0-9) don't need to be wrapped in angle brackets unless they're combined with modifiers, e.g. `<C-a>`.

## Known differences with Vim

Not all mappings have been implemented yet:

1. Mouse events, `<MouseMove>`, cannot be mapped.
2. The special plugin key, `<Plug>`, cannot be mapped.
3. The `<Char>` modifier cannot be mapped.

Intentional differences:

1. The script special key, `<SID>`, cannot be mapped. Glide has no concept of scripts.
