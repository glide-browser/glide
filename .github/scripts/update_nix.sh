#!/usr/bin/env bash
# edit version in package.nix
sed -i "s/version = \".*\"/version = \"$VERSION\"/" package.nix

#x86 linux
RELEASE_LINK="https://github.com/glide-browser/glide/releases/download/$VERSION/glide.linux-x86_64.tar.xz"
NEW_HASH=$(nix hash to-sri --type sha256 $(nix-prefetch-url "$RELEASE_LINK"))
SANITIZE_HASH=$(sed -e 's/[&\\/]/\\&/g; s/$/\\/' -e '$s/\\$//' <<<"$NEW_HASH")
sed -zi "s/sha256 = \".*\"/sha256 = \"${SANITIZE_HASH}\"/1m" package.nix

#aarch64 linux
RELEASE_LINK="https://github.com/glide-browser/glide/releases/download/$VERSION/glide.linux-aarch64.tar.xz"
NEW_HASH=$(nix hash to-sri --type sha256 $(nix-prefetch-url "$RELEASE_LINK"))
SANITIZE_HASH=$(sed -e 's/[&\\/]/\\&/g; s/$/\\/' -e '$s/\\$//' <<<"$NEW_HASH")
sed -zi "s/sha256 = \".*\"/sha256 = \"${SANITIZE_HASH}\"/2m" package.nix

#x86 macos
RELEASE_LINK="https://github.com/glide-browser/glide/releases/download/$VERSION/glide.macos-x86_64.dmg"
NEW_HASH=$(nix hash to-sri --type sha256 $(nix-prefetch-url "$RELEASE_LINK"))
SANITIZE_HASH=$(sed -e 's/[&\\/]/\\&/g; s/$/\\/' -e '$s/\\$//' <<<"$NEW_HASH")
sed -zi "s/sha256 = \".*\"/sha256 = \"${SANITIZE_HASH}\"/3m" package.nix

#aarch64 macos
RELEASE_LINK="https://github.com/glide-browser/glide/releases/download/$VERSION/glide.macos-aarch64.dmg"
NEW_HASH=$(nix hash to-sri --type sha256 $(nix-prefetch-url "$RELEASE_LINK"))
SANITIZE_HASH=$(sed -e 's/[&\\/]/\\&/g; s/$/\\/' -e '$s/\\$//' <<<"$NEW_HASH")
sed -zi "s/sha256 = \".*\"/sha256 = \"${SANITIZE_HASH}\"/4m" package.nix

if [ -z "$GITHUB_OUTPUT" ]; then
  echo $(cat package.nix) >>$GITHUB_OUTPUT
else
  cat package.nix
fi
