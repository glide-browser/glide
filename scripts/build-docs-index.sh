#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

npx -y pagefind --site src/glide/docs/dist
