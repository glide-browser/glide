# Cookbook

Modular config examples you can copy and adapt.

{% details heading=true %} {% slot "summary" %}Set a pref for a specific website
{% /slot %}

```typescript
glide.prefs.set("privacy.resistFingerprinting", true);

glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, () => {
  glide.buf.prefs.set(
    "privacy.resistFingerprinting",
    false,
  );
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Ignore keymappings for a specific website
{% /slot %}

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, async () => {
  await glide.excmds.execute("mode_change ignore");
  return () => glide.excmds.execute("mode_change normal");
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Override a keymap for a specific website
{% /slot %}

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, async () => {
  glide.buf.keymaps.set(
    "normal",
    "f",
    "hint --include=\"svg\"",
  );
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Delete a keymap for a specific website
{% /slot %}

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, async () => {
  glide.buf.keymaps.del("normal", "f");
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Split the config into multiple files
{% /slot %}

```typescript
// glide.ts
glide.unstable.include("opts.glide.ts");

// opts.glide.ts
glide.g.mapleader = "~";
glide.o.which_key_delay = 500;
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Map one key to another key
{% /slot %}

```typescript
glide.keymaps.set("normal", ";", "keys :");
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Text macros
{% /slot %}

```typescript
glide.keymaps.set("normal", "<leader>ts", async () => {
  await glide.keys.send("i"); // switch to insert mode
  await glide.keys.send("¯\\_(ツ)_/¯"); // "type" the keys
  await glide.keys.send("<esc>"); // exit insert mode
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Keymap for switching to a tab
{% /slot %}

```typescript
glide.keymaps.set("normal", "gt", async () => {
  const tab = await glide.tabs.get_first({
    url: "example.com",
  });
  assert(tab && tab.id);
  await browser.tabs.update(tab.id, { active: true });
}, { description: "[g]o to example.com" });
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Custom keymappings for navigating the command line
{% /slot %}

```typescript
glide.keymaps.set(
  "command",
  "<c-j>",
  "commandline_focus_next",
);
glide.keymaps.set(
  "command",
  "<c-k>",
  "commandline_focus_back",
);
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Hide builtin tabs
{% /slot %}

```typescript
glide.styles.add(css`
  #TabsToolbar {
    visibility: collapse !important;
  }
`);
```

{% /details %}

{% details heading=true %} {% slot "summary" %}Set a custom homepage
{% /slot %}

```typescript
glide.prefs.set(
  "browser.startup.homepage",
  "https://example.com",
);
```

{% /details %}
