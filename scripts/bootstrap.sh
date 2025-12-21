#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

if [[ ! " $* " =~ " --offline " ]]; then
  pnpm i
  pnpm firefox:download
fi

./scripts/bundle.sh
./scripts/generate-types.sh

pnpm build:ts
pnpm build:docs:html
pnpm build:docs:index
pnpm build:js

pnpm firefox:patch
pnpm dev:once
pnpm build:types

# Create an empty config file to avoid loading the global user config.
touch src/glide.ts
