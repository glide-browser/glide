#!/usr/bin/env bash

# generate `.d.ts` files from source JS files
#
# this is mainly intended for just symbol discovery through LSPs as
# it will end up generating a lot of `any`s

set -e

cd "$(dirname "$0")/.."

rm -rf src/glide/generated

pnpm tsc \
  --declaration \
  --allowJs \
  --emitDeclarationOnly \
  --outDir src/glide/generated \
  ./engine/testing/mochitest/tests/SimpleTest/EventUtils.js \
  ./engine/testing/modules/TestUtils.sys.mjs \
  ./engine/browser/base/content/browser-commands.js

# our `.d.ts` files are intended to define global types so we can't use `export`
sed -i '' 's/export namespace TestUtils {/declare namespace TestUtils {/' src/glide/generated/testing/modules/TestUtils.sys.d.mts

# add a namespace to properly emulate runtime behaviour
sed -i '' '1i\
declare namespace EventUtils {
' src/glide/generated/testing/mochitest/tests/SimpleTest/EventUtils.d.ts
echo -e "}" >> src/glide/generated/testing/mochitest/tests/SimpleTest/EventUtils.d.ts

mkdir -p src/glide/generated/@types
cp engine/tools/@types/lib.gecko.dom.d.ts src/glide/generated/@types/lib.gecko.dom.d.ts
cp engine/tools/@types/lib.gecko.xpcom.d.ts src/glide/generated/@types/lib.gecko.xpcom.d.ts
cp engine/tools/@types/lib.gecko.tweaks.d.ts src/glide/generated/@types/lib.gecko.tweaks.d.ts
cp engine/tools/@types/lib.gecko.services.d.ts src/glide/generated/@types/lib.gecko.services.d.ts
