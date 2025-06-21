#!/usr/bin/env bash

required_vars=(
  "APPLE_DEVELOPER_ID"
  "APPLE_ACCOUNT_ID"
  "APPLE_TEAM_ID"
  "APPLE_APP_ID_PASSWORD"
  "P12_PASSWORD"
  "P12_BASE64"
  "PROVISIONING_PROFILE_BASE64"
  "AARCH64_DMG_PATH"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var+x}" ]]; then
    missing_vars+=("$var")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "The following environment variables must be set:"
  for var in "${missing_vars[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

AARCH64_DMG_PATH=$(realpath $AARCH64_DMG_PATH)

set -eux

cd "$(dirname "$0")/../../"

step() {
  (set +x; echo "=============================== $1 ==============================")
}

export APP_NAME=Glide

cd engine

step "Cleaning up"

rm -rf "./obj-aarch64-apple-darwin/" || true

step "Extracting .app"
mkdir -p ./obj-aarch64-apple-darwin/dist

./mach python -m mozbuild.action.unpack_dmg \
  $AARCH64_DMG_PATH \
  ./obj-aarch64-apple-darwin/dist

step "Setting up credentials"
echo "$P12_BASE64" > cert.txt
base64 --decode -i cert.txt -o glideCert.p12
echo "$P12_PASSWORD" > glidePassword.passwd

rm cert.txt

step "Setting up provisioning profile"

echo "$PROVISIONING_PROFILE_BASE64" | base64 --decode > ./Glide_Browser.provisionprofile
ls -la
cp ./Glide_Browser.provisionprofile "./embedded.provisionprofile"

step "Cleaning extended attrs"
xattr -cr "./obj-aarch64-apple-darwin/dist/Glide.app"

step "Signing .app"
./mach macos-sign -v -r -c "release" -e "production-without-restricted" -a "./obj-aarch64-apple-darwin/dist/Glide.app" --rcodesign-p12-file glideCert.p12 --rcodesign-p12-password-file glidePassword.passwd

step "Creating DMG"
./mach python -m mozbuild.action.make_dmg \
  --volume-name "Glide" \
  --background ./browser/branding/glide/background.png \
  --icon ./browser/branding/glide/firefox.icns \
  --dsstore ./browser/branding/glide/dsstore \
  ./obj-aarch64-apple-darwin/dist/ ./glide-aarch64-temp.dmg

step "Removing credentials"
rm -f ./Glide_Browser.provisionprofile

step "Signing DMG"
hdiutil convert glide-aarch64-temp.dmg -format UDZO -imagekey zlib-level=9 -o glide.macos-aarch64.dmg
codesign --deep -s "$APPLE_DEVELOPER_ID" glide.macos-aarch64.dmg
xcrun notarytool submit "glide.macos-aarch64.dmg" \
  --apple-id "$APPLE_ACCOUNT_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_ID_PASSWORD" \
  --no-s3-acceleration \
  --wait
xcrun stapler staple "glide.macos-aarch64.dmg"
