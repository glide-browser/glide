#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm i

pnpm firefox:download

./scripts/bundle.sh
./scripts/generate-types.sh

pnpm build:ts
pnpm build:docs:html
pnpm build:docs:index
pnpm build:js

pnpm firefox:patch
pnpm dev:once
pnpm build:types
