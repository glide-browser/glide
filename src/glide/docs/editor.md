# Editor

Glide provides builtin keymappings for editing text. These keymappings generally follow the same model as [vim](https://www.vim.org/), however there are _many_ missing mappings. Glide also intentionally diverges from the keymappings in vim so that we can provide a better web browsing experience.

For example, `f` in normal mode in Glide is mapped to `hint` (see [Hints](./hints.md)) while in vim, you can use it to jump forward to a specific character. The reasoning for this particular case is that navigating pages will be a much more common task than jumping to a specific character while editing text.

Note that in the cases where we intentionally diverge, we generally do still intend to provide a way to enable the vim functionality if desired.

## Intentional differences with vim

- The jumplist does not incorporate textual changes, it is purely for jumping through the tab history
- `f` is mapped to `hint`
- The default `<leader>` key is `<space>`
- `<C-u>` and `<C-d>` will currently scroll the document, not move the cursor up/down.
