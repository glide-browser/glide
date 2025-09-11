#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm pagefind --site src/glide/docs/dist
