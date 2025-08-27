# Frequently asked questions

{% details heading=true %} {% slot "summary" %}Who is Glide not for?
{% /slot %}

Glide is probably not for you if:

- You want everything to be configurable through a GUI
- You value stability over all else (Glide is very early in its life)
- You would not feel comfortable running a new browser that is maintained by a single person
- You do not like Firefox

{% /details %}

{% details heading=true %} {% slot "summary" %}Why Firefox?
{% /slot %}

At the time of writing, there are no viable alternatives that are not _just_ Chromium.

Building on Chromium would be an uphill battle fighting against changes that Google makes to purely benefit itself, like the manifest v2 removal.

No matter what you think of Mozilla's leadership, Firefox has stayed the most true to FOSS principles and Mozilla are held to much higher standards than their competitors.

side note: Ladybird is very promising and I hope their project is a success!

{% /details %}

{% details heading=true %} {% slot "summary" %}What parts of Firefox have been changed?
{% /slot %}

See [Firefox](firefox.md) for information on how Firefox has been integrated within Glide.

{% /details %}

{% details heading=true %} {% slot "summary" %}Why not X extension?
{% /slot %}

Existing extensions do cover a lot of Glide's features - for example, [Tridactyl](https://github.com/tridactyl/tridactyl) is a major source of inspiration for this browser.

However any extension that wants to offer the same level of flexibility that Glide does will always be fighting an uphill [battle](https://github.com/tridactyl/tridactyl/issues/1800) and won't always have access to all the APIs needed as Firefox restricts the kinds of documents extensions can operate on, e.g. extensions cannot run on addons.mozilla.org without hacky workarounds.

While these restrictions are generally reasonable (you wouldn't want a malicious extension to disable deletion of itself) it makes it impossible for an extension like this to deliver a consistent, deeply integrated experience. Building a Firefox fork means we control the full stack and removes the extension constraints while retaining Firefox’s security model.

Additionally, an example of a feature that Glide has that is infeasible to implement within a web extension is custom caret styles where we render a block (█) caret in `normal` mode and a standard (|) caret in `insert` mode.

{% /details %}

{% details heading=true %} {% slot "summary" %}Why can't I play DRM content?
{% /slot %}

DRM is a walled garden and [blocked for open source browsers](https://blog.samuelmaddock.com/posts/google-widevine-blocked-my-browser/), at the least the kind not ran by a large organisation.

Additionally, a widevine license would be prohibitively expensive, even if we would be accepted.

This is also a matter of principle, you should reconsider if it's worth using services that require DRM and proprietary software. See [deffective by design](https://www.defectivebydesign.org/).

{% /details %}

{% details heading=true %} {% slot "summary" %}How do I configure X?
{% /slot %}

The [cookbook](cookbook.md) has some example snippets for common operations.

The [API reference](api.md) includes all of the Glide APIs available in the config.

The [Extensions API](extensions.md) documents the available web extensions APIs.

{% /details %}

{% details heading=true %} {% slot "summary" %}A Glide keymapping conflicts with a keymapping on a website, what do I do?
{% /slot %}

As there are almost zero default keymappings in `insert` mode, you can press `i` + the key + `<Esc>`.

Alternatively, if the above workaround is annoying, you could either enter `insert` mode automatically when the specific site is focused:

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, async () => {
  await glide.excmds.execute("mode_change insert");
});
```

Or delete the specific keymapping(s) that conflict:

```typescript
glide.autocmds.create("UrlEnter", {
  hostname: "example.com",
}, () => {
  glide.buf.keymaps.del("normal", "x");
  // ...
});
```

{% /details %}

{% details heading=true %} {% slot "summary" %}How do I view logs from the config?
{% /slot %}

The easiest way to see the logs is to execute `:repl`, which will spawn a [Browser Toolbox](https://firefox-source-docs.mozilla.org/devtools-user/browser_toolbox/index.html) window with just the console.

Right now, this will also include *all* the logs from the main browser process, so if you have a lot of tabs open it will be quite noisy.

You can filter the logs down to just the config by clicking on `Filter output` (or pressing `<C-f>` on Linux or `<M-f>` on MacOS) and entering `path:glide.ts` or `path:.ts` (as there are currently no other TS files in the firefox build).

{% /details %}
