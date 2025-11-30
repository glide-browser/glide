{% meta description="Using Glide's commandline for executing excmds, switching tabs, and creating custom pickers." %}{% /meta %}

# CommandLine

Glide provides a commandline for executing [excmds](./excmds.md), [switching tabs](#tab-switcher), and as an [arbitrary picker](#custom-options).

Press `:` in `normal` mode to open the commandline, you can then start typing to filter the displayed options, select a specific option with `<Up>` / `<Down>`, and press `<Enter>` to execute the selected option.

You can press `<Esc>` to close the commandline.

## Tab switcher

Glide provides a tab switcher through the commandline that can be activated by pressing `<leader><leader>` in `normal` mode, or typing `tab` + `<space>` while the commandline is open.

In this view, all tabs in the current window will be shown, selecting a tab will switch to it. You can also _delete_ the selected tab with `<C-d>`.

## Custom options

You can use the commandline as a picker by providing your own options to `glide.commandline.show()`.

For example:

```typescript
glide.commandline.show({
  options: ["foo", "bar", "baz"].map((label) => ({
    label,
    execute() {
      console.log(`label ${label} was selected`);
    },
  })),
});
```

When `options` are provided, they _replace_ the default excmds and tabs. Input fuzzy-filters against `option.label` and `option.description`.

You can also customise how each option is displayed by providing a `render()` function on each `option` that returns a `HTMLElement`:

```typescript {% check="false" %}
{
  label: bookmark.title,
  render() {
    return DOM.create_element("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
      children: [
        DOM.create_element("span", [bookmark.title]),
        DOM.create_element("span", [bookmark.url!], {
          style: { color: "#777", fontSize: "0.9em" },
        }),
      ],
    });
  },
};
```

See the [bookmarks picker](#bookmarks-picker) for a more complete example.

## Autocmds

### `CommandLineExit`

This autocmd is fired whenever the commandline UI is closed, regardless of whether a command was executed or if it was just closed without taking any action.

```ts
glide.autocmds.create("CommandLineExit", () => {
  // ...
});
```

## Default key mappings

These key mappings apply in `command` mode, while the commandline is focused.

| Key       | Action                        |
| --------- | ----------------------------- |
| `<Enter>` | Close the commandline         |
| `<Tab>`   | Focus the next completion     |
| `<S-Tab>` | Focus the previous completion |
| `<Down>`  | Focus the next completion     |
| `<Up>`    | Focus the previous completion |
| `<Enter>` | Accept the focused completion |
| `<C-d>`   | Delete the focused completion |

## Excmds

| Excmd                     | Action                           |
| ------------------------- | -------------------------------- |
| `:commandline_show`       | Show the commandline UI          |
| `:commandline_toggle`     | Toggle the commandline UI on/off |
| `:commandline_focus_next` | Focus the next completion        |
| `:commandline_focus_back` | Focus the previous completion    |
| `:commandline_accept`     | Accept the focused commandline   |
| `:commandline_delete`     | Delete the focused completion    |

## Examples

### Bookmarks picker

This example shows how you could create a custom bookmarks picker that displays the 10 most recent bookmarks, and either creates a new tab with the selected entry, or switches to the corresponding tab if it already exists.

```ts
glide.keymaps.set("normal", "<leader>o", async () => {
  const bookmarks = await browser.bookmarks.getRecent(10);

  glide.commandline.show({
    title: "bookmarks",
    options: bookmarks.map((bookmark) => ({
      label: bookmark.title,
      async execute() {
        const tab = await glide.tabs.get_first({
          url: bookmark.url,
        });
        if (tab) {
          await browser.tabs.update(tab.id, {
            active: true,
          });
        } else {
          await browser.tabs.create({
            active: true,
            url: bookmark.url,
          });
        }
      },
    })),
  });
}, { description: "Open the bookmarks picker" });
```
