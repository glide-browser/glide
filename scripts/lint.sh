#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

echo "==> Checking types"
pnpm tsc

echo "==> Checking license comments"
# note: run `pnpm fix:license` to autofix most cases
pnpm check:license

echo "==> Checking formatting"
pnpm fmt:check

# check github workflows
if command -v zizmor &> /dev/null; then
    echo "==> Running zizmor"
    zizmor .
else
    # we run zizmor in a separate action in CI
    if [ -n "$CI" ]; then
        echo -e "zizmor command not found; github workflow lints cannot be ran"
        echo -e ""
        echo -e "please install it from https://docs.zizmor.sh/installation/"
    fi
fi
