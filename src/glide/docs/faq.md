# Frequently asked questions

{% details heading=true %} {% slot "summary" %}Why Firefox?
{% /slot %}

At the time of writing, there are no viable alternatives that are not _just_ Chromium.

Building on Chromium would be an uphill battle fighting against changes that Google makes to purely benefit itself, like the manifest v2 removal.

No matter what you think of Mozilla's leadership, Firefox has stayed the most true to FOSS and Mozilla are held to much higher standards than their competitors.

side note: Ladybird is very promising and I hope their project is a success!

{% /details %}

{% details heading=true %} {% slot "summary" %}Why not X extension?
{% /slot %}

Existing extensions do cover a lot of Glide's features - for example, [Tridactyl](https://github.com/tridactyl/tridactyl) is a major source of inspiration for this browser.

However any extension that wants to offer the same level of flexibility that Glide does will always be fighting an uphill [battle](https://github.com/tridactyl/tridactyl/issues/1800) and won't always have access to all the APIs needed as Firefox restricts the kinds of documents extensions can operate on, e.g. extensions cannot run on addons.mozilla.org without hacky workarounds.

While these restrictions are generally reasonable (you wouldn't want a malicious extension to disable deletion of itself) it makes it impossible to deliver a consistent, deeply integrated experience. Building a Firefox fork means we control the full stack and removes the extension constraints while retaining Firefox’s security model. 

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

The [Extensions API](extensions-api.md) documents the available web extensions APIs.

{% /details %}
