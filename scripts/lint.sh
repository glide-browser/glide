#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."
tsc_path=$(realpath node_modules/.bin/tsc)

pnpm tsc

echo "============ checking bundled config types ============"

cd src/glide/browser/base/content/test/config/types && exec "$tsc_path"
