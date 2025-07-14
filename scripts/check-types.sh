#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm tsc:browser

(set +x; echo "============ checking node.js script types ============")
pnpm tsc:scripts

(set +x; echo "============ bundling config types         ============")
./scripts/bundle-types.sh

(set +x; echo "============ checking bundled config types ============")
pnpm tsc:config
