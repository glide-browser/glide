# Autocmds

Auto commands let you register functions that will be automatically invoked when a certain event happens.

<!-- TODO: is this too how-to-guide-y?? -->
<!-- TODO: needs to mention url enter explicitly before the example?? -->

Suppose you want to define a key mapping to navigate directly from a GitHub repository to the `Issues` page, first
you'd define a function to update the current URL:

```typescript
async function github_go_to_issues() {
  const url = new URL(glide.ctx.url);

  const parts = url.pathname.split("/").filter(Boolean);
  assert(parts.length > 2, `Path does not look like github.com/$org/$repo`);

  url.pathname = `/${parts[0]}/${parts[1]}/issues`;
  await browser.tabs.update({ url: url.toString() });
}
```

And then define an autocmd that sets a keymap for the current buffer

```typescript
glide.autocmd.create("UrlEnter", /github\.com/, async () => {
  glide.buf.keymaps.set("normal", "gi", github_go_to_issues);
});
```
