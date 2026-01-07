#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm tsc:browser

(set +x; echo "============ checking node.js script types ============")
pnpm tsc:scripts

(set +x; echo "============ bundling config types         ============")
pnpm tsn scripts/bundle-types.mts

(set +x; echo "============ checking bundled config types ============")
pnpm tsc:config

(set +x; echo "============ checking docs example types   ============")
pnpm tsc:docs
