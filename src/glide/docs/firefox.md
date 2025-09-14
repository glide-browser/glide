# Firefox

Glide extends and heavily builds on top of Firefox but for the most part Glide is purely additional; however there are some key changes that have been made to the base Firefox build:

1. All AI features are disabled by default
2. [Betterfox](https://github.com/yokoffing/Betterfox) is included by default
3. `path:userChrome.css` & `path:userContent.css` customisation is enabled by default
4. Newtab shortcuts are disabled by default (`path:browser.newtabpage.activity-stream.feeds.topsites`)
5. `<space>` is mapped to the `<leader>` key, not scroll down - [`glide.g.mapleader`](api.md#glide.g.mapleader)
6. Updates are not automatically installed, when new versions are available - you will be _prompted_ to install them
7. Taskbar [badges](https://connect.mozilla.org/t5/ideas/disable-profile-badge/idc-p/101744) are disabled by default, you can re-enable them with the `path:glide.firefox.taskbar.badge.enabled` pref.

## Version

Glide generally targets the [Firefox beta channel](https://whattrainisitnow.com/release/?version=beta). This is purely for decreased maintenance burden as it is easier to deal with frequent smaller updates, than less frequent but larger updates.

In the future, Glide may be based off of [Firefox release](https://whattrainisitnow.com/release/?version=release) instead.

> [!TIP]
> You can check the firefox version in your active installation by navigating to `about:support`.
