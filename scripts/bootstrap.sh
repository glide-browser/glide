#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm i

pnpm glider download

./scripts/bundle.sh
./scripts/generate-types.sh

pnpm build:docs
pnpm build:docs:index

pnpm glider import
pnpm dev
pnpm build:types
