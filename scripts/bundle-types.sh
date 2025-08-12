#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm dts-bundle-generator \
  src/glide/browser/base/content/bundled.d.ts \
  -o src/glide/browser/base/content/dist/bundled.compiled.d.ts \
  --inline-declare-global \
  --project tsconfig.bundled.json
