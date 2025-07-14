#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm tsc:browser

echo "============ checking bundled config types ============"
pnpm tsc:config

echo "============ checking node.js script types ============"
pnpm tsc:scripts
