#!/usr/bin/env bash

set -eux

cd "$(dirname "$0")/.."

pnpm tsc:browser

pnpm tsc:config

pnpm tsc:scripts
