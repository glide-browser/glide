# Contributing

To build Glide you must have [`pnpm`](https://pnpm.io/) installed.

You must also verify that your system has the dependencies that Firefox requires:
- [MacOS](https://firefox-source-docs.mozilla.org/setup/macos_build.html)
- [Linux](https://firefox-source-docs.mozilla.org/setup/linux_build.html)
- [Windows](https://firefox-source-docs.mozilla.org/setup/windows_build.html)
- [Windows WSL](https://firefox-source-docs.mozilla.org/setup/windows_wsl_build.html)

After cloning the repository

```bash
git clone https://github.com/glide-browser/glide
```

you can setup your local repo with:

```bash
pnpm install
pnpm bootstrap
```

This will download a copy of the Firefox source code to the `engine/` directory, bundle Glide's dependencies, build the docs, and apply all of our patches to the Firefox source code.

To actually build Glide, you can run:

```bash
pnpm build
```

> [!IMPORTANT]
> This can take quite a long time, a fresh build takes ~30 mins on an M4 Max.

Once you have Glide compiled, you can luanch it with:

```bash
pnpm launch
```

> [!TIP]
> There are lots of arguments you can pass here, run `pnpm launch --help` for the full list.

## Working on Glide

You should *always* have a terminal open running our file watcher:

```bash
pnpm dev --watch
```

This handles:
- Compiling TS files to JS
- Rebuilding docs
- Copying source files to the Firefox `engine/` directory

If you have the watcher running, you should hardly ever have to explicitly rebuild.
