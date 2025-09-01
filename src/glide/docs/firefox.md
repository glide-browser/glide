# Firefox

Glide extends and heavily builds on top of Firefox but for the most part Glide is purely additional; however there are some key changes that have been made to the base Firefox build:

1. [Betterfox](https://github.com/yokoffing/Betterfox) is included by default
2. `path:userChrome.css` & `path:userContent.css` customisation is enabled by default
3. Newtab shortcuts are disabled by default (`path:browser.newtabpage.activity-stream.feeds.topsites`)
4. All AI features are disabled by default
5. `<space>` is mapped to the `<leader>` key, not scroll down - [`glide.g.mapleader`](api.md#glide.g.mapleader)

## Version

Glide generally targets the [Firefox beta channel](https://whattrainisitnow.com/release/?version=beta). This is purely for decreased maintenance burden as it is easier to deal with frequent smaller updates, than less frequent but larger updates.

In the future, Glide may be based off of [Firefox release](https://whattrainisitnow.com/release/?version=release) instead.

> [!TIP]
> You can check the firefox version in your active installation by navigating to `about:support`.
