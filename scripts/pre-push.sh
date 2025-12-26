#!/usr/bin/env bash

# Run as many lints as we can without taking up too much time.
# NOTE: we execute directly from node_modules instead of using pnpm or npx because it's about twice as fast to startup.

set -euo pipefail

PATH="node_modules/.bin:$PATH"

oxlint --deny-warnings 2>/dev/null
node --no-warnings --experimental-strip-types scripts/firefox/license-check.mts --quiet
dprint check
tsc -p scripts/tsconfig.json
if command -v zizmor &> /dev/null; then
    zizmor --quiet --no-progress .
fi
