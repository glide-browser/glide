# Extensions

Glide lets you access the [web extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs) `browser` API directly in the [config](config.md) file.

For example, you could define a [key mapping](keys.md) to update the UI theme:

```typescript
glide.keymaps.set("normal", "<leader>a", async () => {
  await browser.theme.update({
    colors: { frame: "#50abd3" },
  });
});
```

## Differences

While the `browser` object Glide provides is _mostly_ compatible with the [standard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs) API, there
are some differences:

- all method calls return a `ts:Promise<T>`.
- some APIs are not supported, e.g. `browser.runtime.connect()` and any other `Port` API.

## Availability

Currently, the `browser` API has similar restrictions to standard web extensions where it will not function on certain protected pages such as `about:config` or `addons.mozilla.org`. This will be fixed in the future.
