#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm i

mkdir -p bundled
./scripts/bundle.sh
./scripts/generate-types.sh

../tsn scripts/build-docs.mts
npx -y pagefind --site docs/dist
