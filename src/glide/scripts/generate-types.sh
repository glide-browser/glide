#!/usr/bin/env bash

# generate `.d.ts` files from source JS files
#
# this is mainly intended for just symbol discovery through LSPs as
# it will end up generating a lot of `any`s

set -e

cd "$(dirname "$0")/.."

rm -rf generated

pnpm tsc \
  --declaration \
  --allowJs \
  --emitDeclarationOnly \
  --outDir generated \
  ../testing/mochitest/tests/SimpleTest/EventUtils.js \
  ../testing/modules/TestUtils.sys.mjs \
  ../browser/base/content/browser-commands.js

# our `.d.ts` files are intended to define global types so we can't use `export`
sed -i '' 's/export namespace TestUtils {/declare namespace TestUtils {/' generated/testing/modules/TestUtils.sys.d.mts

# add a namespace to properly emulate runtime behaviour
sed -i '' '1i\
declare namespace EventUtils {
' generated/testing/mochitest/tests/SimpleTest/EventUtils.d.ts
echo -e "}" >> generated/testing/mochitest/tests/SimpleTest/EventUtils.d.ts

mkdir -p generated/@types
cp ../tools/@types/lib.gecko.dom.d.ts generated/@types/lib.gecko.dom.d.ts
cp ../tools/@types/lib.gecko.xpcom.d.ts generated/@types/lib.gecko.xpcom.d.ts
cp ../tools/@types/lib.gecko.tweaks.d.ts generated/@types/lib.gecko.tweaks.d.ts
cp ../tools/@types/lib.gecko.services.d.ts generated/@types/lib.gecko.services.d.ts
