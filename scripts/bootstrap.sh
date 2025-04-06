#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm i

mkdir -p src/glide/bundled
./scripts/bundle.sh
./scripts/generate-types.sh

pnpm build:docs
pnpm build:docs:index
