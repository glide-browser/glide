#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm i

pnpm glider download

./scripts/bundle.sh
./scripts/generate-types.sh

pnpm build:ts
pnpm build:docs
pnpm build:docs:index
pnpm build:js

pnpm glider set brand glide
pnpm glider import
pnpm dev:once
pnpm build:types
