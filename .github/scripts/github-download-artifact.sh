#!/bin/bash

set -eux

required_vars=(
  "TAG"
  "ASSET_NAME"
  "OUTPUT_FILE"
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

GITHUB_TOKEN="${GITHUB_TOKEN}"
OWNER="glide-browser"
REPO="glide"

RELEASE_DATA=$(gh release view ${TAG:-latest} --json assets,body,name,tagName,url)

ASSET_ID=$(echo "$RELEASE_DATA" | jq -r ".assets[] | select(.name==\"$ASSET_NAME\") | .id")

if [ -z "$ASSET_ID" ] || [ "$ASSET_ID" = "null" ]; then
  echo "Asset not found: $ASSET_NAME"
  exit 1
fi

curl -L \
  -H "Accept: application/octet-stream" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$OWNER/$REPO/releases/assets/$ASSET_ID" \
  -o "$OUTPUT_FILE"

echo "Downloaded $ASSET_NAME to $OUTPUT_FILE"
