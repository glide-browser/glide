#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

mkdir -p src/glide/bundled

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

pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("fast-check"))')" \
  > src/glide/bundled/fast-check.mjs

# TODO(glide): only bundle the themes + languages we need
pnpm esbuild \
  --format=esm \
  --minify \
  --bundle "$(node -e 'console.log(require.resolve("shiki"))')" \
  > src/glide/bundled/shiki.mjs

./scripts/bundle-types.sh
