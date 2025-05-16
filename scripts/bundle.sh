#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("ts-blank-space"))')" \
  > src/glide/bundled/ts-blank-space.mjs

pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("@markdoc/markdoc"))')" \
  > src/glide/bundled/markdoc.mjs

# TODO(glide): only bundle the themes + languages we need
pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("shiki"))')" \
  > src/glide/bundled/shiki.mjs

prettier_path=$(dirname $(node -e 'console.log(require.resolve("prettier"))'))
cp "$prettier_path/standalone.mjs" src/glide/bundled/prettier.mjs
cp "$prettier_path/plugins/html.mjs" src/glide/bundled/prettier-html.mjs

pnpm dts-bundle-generator \
  src/glide/browser/base/content/bundled.d.ts \
  -o src/glide/browser/base/content/dist/api-bundled.d.ts \
  --inline-declare-global \
  --project tsconfig.bundled.json
