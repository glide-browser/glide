#!/bin/bash

set -eux

required_vars=(
  "ARTIFACT_URL"
  "ARTIFACT_NAME"
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

# the artifact url when copied from the github UI will look like:
#   https://github.com/OWNER/REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID
if [[ "$ARTIFACT_URL" =~ ^https://github.com/([^/]+)/([^/]+)/actions/runs/([0-9]+)/artifacts/([0-9]+)$ ]]; then
  REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  RUN_ID="${BASH_REMATCH[3]}"
  ARTIFACT_ID="${BASH_REMATCH[4]}"
else
  echo "Invalid artifact URL format: $ARTIFACT_URL"
  echo "Expected: https://github.com/OWNER/REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME" --dir "$TEMP_DIR"

cp "$TEMP_DIR/$ARTIFACT_NAME" "$OUTPUT_FILE"

echo "Successfully downloaded $ARTIFACT_NAME to $OUTPUT_FILE"
