# Config

Glide supports configuration through a [TypeScript](#config-evaluation) file.

You can setup the config file with `:config_init home`, which will create a config file at `path:~/.config/glide/glide.ts` and some boilerplate files so that the TypeScript LSP will work.

Then you can run `:config_reload` and `:config_edit` to open the config file in your default editor.

See the [API reference](api.md) for all of the available APIs in the config file or the [Cookbook](cookbook.md) for examples of common things you might want to do.

## File resolution

Glide will resolve the config file by searching for a `path:glide.ts` file in the following directories in order:

1. The current working directory
2. The profile directory
3. `path:$XDG_CONFIG_HOME/glide/` or `path:~/.config/glide/` if `$XDG_CONFIG_HOME` is not set.

Glide will only consider the _first_ config file that matches and will not load any further.

## Config evaluation

The config file source is converted to JS through type stripping with [ts-blank-space](https://bloomberg.github.io/ts-blank-space/). This means you can only use syntax that is [erasable](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#the---erasablesyntaxonly-option).

It is also executed in the main browser process inside a sandbox with its own [Realm](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#realms).

## Importing types

Glide does not currently support importing runtime code from other `path:.ts` / `path:.js` files from within the config, but you _can_ import types, e.g.

```typescript
import type { SetNonNullable } from "type-fest";
```

As these imports will be stripped when the config is evaluated.

## Types

If a config directory is resolved, Glide will automatically create & update a `path:glide.d.ts` file in that directory. This file contains all of the type definitions for the config file, including the main `glide` variable & the web extension `browser` APIs.

To make sure TypeScript can recognise these types, you can either include a [reference](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) to it in the config file itself, e.g.

```typescript
/// <reference path="./glide.d.ts" />
```

or specify it in your `path:tsconfig.json`, e.g.

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "types": ["./glide.d.ts"]
    // ...
  }
}
```

> [!NOTE]
> The `path:glide.d.ts` file should **not** be edited manually, any changes will be reverted when Glide is restarted.

## Recommended tsconfig

This is a minimal `path:tsconfig.json` file with some recommended defaults for Glide usage in particular.

The most important parts are

- the `lib` section, as that defines the builtins that are available
- the `types` section, as that ensures TS can [resolve](#types) the config types

Every other part can be more freely customised.

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "exclude": [
    "node_modules"
  ],
  "compilerOptions": {
    "lib": ["DOM", "ES2022"],
    "types": ["./glide.d.ts"],
    "target": "ES2024",
    "module": "nodenext",
    "moduleDetection": "force",
    "allowJs": true,
    "noEmit": true,

    /**
     * type checking rules.
     */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "skipLibCheck": true,
    "noErrorTruncation": true,
    "allowImportingTsExtensions": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```
