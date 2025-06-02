# `glide` {% id="glide" %}

The foo API.

---

## `glide.bo` {% id="glide.bo" class="" %}

---

## `glide.bo.yank_highlight: glide.RGBString` {% id="glide.bo.yank_highlight" class="" %}

Color used to briefly highlight text when it's yanked.

@example "#ff6b35" // Orange highlight

@default "#edc73b"

---

## `glide.bo.yank_highlight_time: number` {% id="glide.bo.yank_highlight_time" class="" %}

How long, in milliseconds, to highlight the selection for when it's yanked.

@default 150

<!-- {% api-heading id="glide.bo" %} -->
<!-- glide.prefs.set( -->
<!--   /** -->
<!--    * The docs for this param -->
<!--    */ -->
<!--   name: string, -->
<!---->
<!--   /** -->
<!--    * The docs for the other param -->
<!--    */ -->
<!--   value: string | number | boolean -->
<!-- ): void -->
<!-- {% /api-heading %} -->

---

## `glide.prefs` {% id="glide.prefs" %}

API for managing user preferences, similar to `prefs.js` but provides easier integration with other Glide features.

<!-- TODO: list out methods here? -->

---

{% api-heading id="glide.prefs.set" %}
glide.prefs.set(
  /**
   * The docs for this param
   */
  name: string,

  /**
   * The docs for the other param
   */
  value: string | number | boolean
): void
{% /api-heading %}

Set a preference. This is an alternative to `prefs.js` / [about:config](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
that all customisation can be represented in a single `glide.ts` file.

**warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling `glide.pref()` in callbacks
            will result in the pref being properly applied everywhere.

**warning**: there is also no guarantee that these settings will be applied when first loaded, sometimes a restart is required.

Note: these settings are intended for experienced users, changing them can have serious effects on your browser’s stability, security and performance.

---

foo

bar

bar

bar

bar

bar

bar

bar

bar

bar

bar

bar

bar

bar

### `glide.prefs.set(name: string, value: string | number | boolean): void` {% id="glide.prefs.set" %}

Set a preference. This is an alternative to `prefs.js` / [about:config](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) so
that all customisation can be represented in a single `glide.ts` file.

**warning**: this function is expected to be called at the top-level of your config, there is no guarantee that calling `glide.pref()` in callbacks
            will result in the pref being properly applied everywhere.

**warning**: there is also no guarantee that these settings will be applied when first loaded, sometimes a restart is required.

Note: these settings are intended for experienced users, changing them can have serious effects on your browser’s stability, security and performance.

---

### `glide.prefs.get(name)` {% id="glide.prefs.get" %}

Get the value of a pref.

If the pref is not defined, then `undefined` is returned.

# Types

{% html %}
<h3 id="GlideMode" class="invisible-header"></h3>
{% /html %}


```ts
type GlideMode =
  | "normal"
  | "insert"
  | "visual"
  | "op-pending"
  | "ignore"
  | "hint";
```
