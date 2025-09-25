#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

if [[ ! " $* " =~ " --offline " ]]; then
  pnpm i

  if [[ " $* " =~ " --tar " ]]; then
    pnpm firefox:download --tar
  else
    pnpm firefox:download
  fi
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
