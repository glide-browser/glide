#!/bin/bash

# Temporary script to make sure that the update MAR URLs can actually be fetched by the client.
#
# Will be redundant when the repo is public.

# Script to update all update.xml files to use GitHub API asset URLs instead of release download URLs
# This ensures proper authentication and access control for release assets

set -euo pipefail

cd "$(dirname "$0")/../.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get asset ID from GitHub API
get_asset_id() {
    local release_tag="$1"
    local filename="$2"
    
    echo -e "${YELLOW}Fetching asset ID for ${filename} in release ${release_tag}...${NC}" >&2
    
    # First try the published release endpoint
    echo -e "${YELLOW}Trying published release endpoint...${NC}" >&2
    local asset_id=""
    if gh api -H "Accept: application/vnd.github+json" "/repos/glide-browser/glide/releases/tags/${release_tag}" >/dev/null 2>&1; then
        asset_id=$(gh api \
            -H "Accept: application/vnd.github+json" \
            "/repos/glide-browser/glide/releases/tags/${release_tag}" \
            --jq ".assets[] | select(.name == \"${filename}\") | .id" 2>/dev/null || echo "")
    fi
    
    # Check if we got a valid numeric asset ID
    if [[ "$asset_id" =~ ^[0-9]+$ ]]; then
        echo -e "${GREEN}Found asset ID: ${asset_id}${NC}" >&2
        echo "$asset_id"
        return 0
    fi
    
    # If that fails, try to find it in all releases (including drafts)
    echo -e "${YELLOW}Release not found as published, checking all releases (including drafts)...${NC}" >&2
    
    # Debug: List all releases to see what's available
    echo -e "${YELLOW}Available releases:${NC}" >&2
    gh api "/repos/glide-browser/glide/releases" --jq '.[] | {tag_name, draft, prerelease, name}' >&2
    
    # Try to find the release by tag in all releases
    local release_data=""
    if gh api "/repos/glide-browser/glide/releases" >/dev/null 2>&1; then
        release_data=$(gh api \
            -H "Accept: application/vnd.github+json" \
            "/repos/glide-browser/glide/releases" \
            --jq ".[] | select(.tag_name == \"${release_tag}\")" 2>/dev/null || echo "")
    fi
    
    if [ -n "$release_data" ] && [ "$release_data" != "null" ]; then
        echo -e "${YELLOW}Found release with tag ${release_tag}, checking assets...${NC}" >&2
        # List available assets for debugging
        echo -e "${YELLOW}Available assets in this release:${NC}" >&2
        echo "$release_data" | jq '.assets[] | {name, id}' >&2
        
        # Get the asset ID
        asset_id=$(echo "$release_data" | jq -r ".assets[] | select(.name == \"${filename}\") | .id" 2>/dev/null || echo "")
        
        # Check if we got a valid numeric asset ID
        if [[ "$asset_id" =~ ^[0-9]+$ ]]; then
            echo -e "${GREEN}Found asset ID: ${asset_id}${NC}" >&2
            echo "$asset_id"
            return 0
        fi
    else
        echo -e "${RED}No release found with tag ${release_tag}${NC}" >&2
    fi
    
    echo -e "${RED}Warning: Could not find asset ID for ${filename} in release ${release_tag}${NC}" >&2
    return 1
}

# Function to process a single update.xml file
process_update_xml() {
    local xml_file="$1"
    local temp_file="${xml_file}.tmp"
    local changed=false
    local has_errors=false
    
    echo -e "${GREEN}Processing: ${xml_file}${NC}"
    
    # Create a copy for processing
    cp "$xml_file" "$temp_file"
    
    # Use grep to find all GitHub release download URLs more reliably
    # Pattern: https://github.com/glide-browser/glide/releases/download/VERSION/FILENAME
    local urls
    urls=$(grep -o 'https://github\.com/glide-browser/glide/releases/download/[^"'\''[:space:]]*' "$xml_file" || true)
    
    if [ -z "$urls" ]; then
        echo -e "  ${YELLOW}No GitHub release URLs found${NC}"
        rm -f "$temp_file"
        return 0
    fi
    
    while IFS= read -r full_url; do
        if [ -z "$full_url" ]; then
            continue
        fi
        
        # Extract release tag and filename from URL
        if [[ $full_url =~ https://github\.com/glide-browser/glide/releases/download/([^/]+)/(.+)$ ]]; then
            local release_tag="${BASH_REMATCH[1]}"
            local filename="${BASH_REMATCH[2]}"
            
            echo -e "  Found URL: ${full_url}"
            echo -e "  Release: ${release_tag}, File: ${filename}"
            
            # Get the asset ID
            local asset_id_result
            asset_id_result=$(get_asset_id "$release_tag" "$filename")
            local get_asset_exit_code=$?
            
            if [ $get_asset_exit_code -eq 0 ] && [[ "$asset_id_result" =~ ^[0-9]+$ ]]; then
                local api_url="https://api.github.com/repos/glide-browser/glide/releases/assets/${asset_id_result}"
                echo -e "  ${GREEN}Replacing with: ${api_url}${NC}"
                
                # Escape special characters for sed
                local escaped_url=$(printf '%s\n' "$full_url" | sed 's/[[\.*^$()+?{|]/\\&/g')
                
                # Replace the URL in the temp file
                sed -i.bak "s|${escaped_url}|${api_url}|g" "$temp_file"
                changed=true
            else
                echo -e "  ${RED}Failed to get asset ID for ${filename} in release ${release_tag}${NC}"
                if [ -n "$asset_id_result" ]; then
                    echo -e "  ${RED}Error details: ${asset_id_result}${NC}"
                fi
                has_errors=true
            fi
            
            echo
        else
            echo -e "  ${RED}Could not parse URL: ${full_url}${NC}"
            has_errors=true
        fi
    done <<< "$urls"
    
    # Check for errors
    if [ "$has_errors" = true ]; then
        rm -f "$temp_file" "${temp_file}.bak"
        echo -e "${RED}✗ Failed to process ${xml_file} due to errors${NC}"
        return 1
    fi
    
    # If changes were made, replace the original file
    if [ "$changed" = true ]; then
        mv "$temp_file" "$xml_file"
        rm -f "${temp_file}.bak"
        echo -e "${GREEN}✓ Updated ${xml_file}${NC}"
    else
        rm -f "$temp_file" "${temp_file}.bak"
        echo -e "${YELLOW}No changes needed for ${xml_file}${NC}"
    fi
    
    echo "----------------------------------------"
    return 0
}

# Main execution
main() {
    if [ -z "${1:-}" ]; then
        echo "You must provide a path"
        exit 1
    fi

    CHECK_DIR="$1"
    echo -e "${GREEN}Starting update.xml URL replacement...${NC}"
    echo "========================================"
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: gh CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}Error: Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
        exit 1
    fi
    
    # Find all update.xml files
    echo -e "${YELLOW}Searching for update.xml files...${NC}"
    
    # Using find to locate all update.xml files
    xml_files=()
    while IFS= read -r -d '' file; do
        xml_files+=("$file")
    done < <(find "$CHECK_DIR" -name "update.xml" -type f -print0)
    
    if [ ${#xml_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}No update.xml files found.${NC}"
        exit 0
    fi
    
    echo -e "${GREEN}Found ${#xml_files[@]} update.xml file(s)${NC}"
    echo
    
    # Process each file
    local overall_success=true
    for xml_file in "${xml_files[@]}"; do
        if ! process_update_xml "$xml_file"; then
            overall_success=false
        fi
    done
    
    echo
    if [ "$overall_success" = true ]; then
        echo -e "${GREEN}✓ All update.xml files processed successfully!${NC}"
    else
        echo -e "${RED}✗ Some files failed to process. Check the errors above.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@"
