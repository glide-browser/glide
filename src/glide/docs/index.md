# Glide Docs

Glide is a fork of Firefox focused on deep customizability, keyboard navigation and bringing the best parts of Vim to the browser.

<!-- TODO: compelling yet simple / easy to understand example case of something cool Glide can do -->

```typescript
glide.keymaps.set("normal", "<leader>f", () => {
  if (thing) {
    await do_some_thing(bufn);
  } else {
    await thing.other();
  }
});
```

See the [quickstart](./quickstart.md) for more information.
