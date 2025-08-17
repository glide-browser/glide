# Config

Glide supports configuration through a [TypeScript](https://www.typescriptlang.org/) file that is type stripped with [ts-blank-space](https://github.com/bloomberg/ts-blank-space). Note this means you can only use syntax that is [erasable](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#the---erasablesyntaxonly-option).

Glide will resolve the config file by searching for a `bash:glide.ts` file in the following directories in order:

1. The current working directory
2. The profile directory
3. `bash:$XDG_CONFIG_HOME/glide/`
4. `bash:~/.config/glide/`

Glide will only consider the _first_ config file that matches and will not load any further.

See the [API reference](api.md) for all of the available APIs in the config file.

> [!TIP]
> You can initialise a config directory with `:config_init`.

## Types

If a config directory is resolved, Glide will automatically create & update a `bash:glide.d.ts` file in that directory. This file contains all of the type definitions for the config file, including the main `glide` variable & the web extension `browser` APIs.

To make sure TypeScript can recognise these types, you can either include a [reference](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) to it in the config file itself, e.g.

```typescript
/// <reference path="./glide.d.ts" />
```

or specify it in your `bash:tsconfig.json`, e.g.

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
> The `glide.d.ts` file should **not** be edited manually, any changes will be reverted when Glide is restarted.

## Recommended tsconfig

This is a minimal `bash:tsconfig.json` file with some recommended defaults for Glide usage in particular.

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

## Importing types

Glide does not currently support importing runtime code from other (T|J)S files from within the config, but you _can_ import types, e.g.

```typescript
import type { SetNonNullable } from "type-fest";
```

As these imports will be stripped when the config is evaluated.
