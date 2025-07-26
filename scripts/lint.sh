#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

pnpm tsc

# note: run `pnpm fix:license` to autofix most cases
pnpm check:license

pnpm fmt:check
