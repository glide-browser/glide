#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm tsc:browser

echo "============ checking node.js script types ============"
pnpm tsc:scripts

echo "============ bundling config types         ============"
./scripts/bundle-types.sh

echo "============ checking bundled config types ============"
pnpm tsc:config

