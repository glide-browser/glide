#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("ts-blank-space"))')" \
  > bundled/ts-blank-space.mjs

pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("@markdoc/markdoc"))')" \
  > bundled/markdoc.mjs

# TODO(glide): only bundle the themes + languages we need
pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("shiki"))')" \
  > bundled/shiki.mjs

prettier_path=$(dirname $(node -e 'console.log(require.resolve("prettier"))'))
cp "$prettier_path/standalone.mjs" bundled/prettier.mjs
cp "$prettier_path/plugins/html.mjs" bundled/prettier-html.mjs
