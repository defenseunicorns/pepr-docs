#!/bin/bash

CONT_OLD=$(realpath "$SITE")
CONT_NEW=$(realpath "$WORK/content")

echo "Content source: $CONT_NEW"
echo "Content target: $CONT_OLD"
# Verify source content exists
if [ ! -d "$CONT_NEW" ]; then
echo "Error: Source content directory $CONT_NEW does not exist"
exit 1
fi
# Copy latest version content to root docs directory
if [ -d "$CONT_NEW/latest" ]; then
echo "Copying latest content..."

# Create backup of existing content
BACKUP_DIR="$(mktemp -d)"
if [ -d "$CONT_OLD" ]; then
    cp -r "$CONT_OLD" "$BACKUP_DIR/content_backup" || echo "Warning: Could not create backup"
fi

# Safely remove existing content (preserve versioned dirs)
for item in "$CONT_OLD"/*; do
    if [ -e "$item" ] && [[ "$(basename "$item")" != v0.* ]]; then
    rm -rf "$item"
    fi
done

# Copy main content with verification
if cp -r "$CONT_NEW/latest"/* "$CONT_OLD/" 2>/dev/null; then
    echo "Latest content copied successfully"
    rm -rf "$BACKUP_DIR"
else
    echo "Error: Failed to copy latest content, attempting restore"
    if [ -d "$BACKUP_DIR/content_backup" ]; then
    cp -r "$BACKUP_DIR/content_backup"/* "$CONT_OLD/" || echo "Error: Restore failed"
    fi
    rm -rf "$BACKUP_DIR"
    exit 1
fi
else
echo "Warning: No latest content found at $CONT_NEW/latest"
fi

# Copy versioned content dynamically
echo "Discovering available versions..."
if [ -d "$CONT_NEW" ]; then
    declare -A latest_versions

    # Get all versions and sort them properly
    for version_dir in "$CONT_NEW"/v0.*; do
        if [ -d "$version_dir" ]; then
            version=$(basename "$version_dir")
            major_minor=${version%.*}

            # Check if this is the latest version for this major.minor
            if [[ -z "${latest_versions[$major_minor]}" ]]; then
                # First version for this major.minor
                latest_versions["$major_minor"]="$version"
            else
                # Compare versions and keep the higher one
                current_latest="${latest_versions[$major_minor]}"
                if [[ "$(printf '%s\n' "$current_latest" "$version" | sort -V | tail -n1)" == "$version" ]]; then
                    latest_versions["$major_minor"]="$version"
                fi
            fi
        fi
    done

    # Copy only the latest versions, keeping full version numbers
    for major_minor in "${!latest_versions[@]}"; do
        latest_version="${latest_versions[$major_minor]}"
        version_dir="$CONT_NEW/$latest_version"

        echo "Copying $latest_version content to $latest_version (latest for $major_minor series)..."

        # Remove existing version content
        rm -rf "${CONT_OLD:?}/${latest_version:?}" 2>/dev/null || true
        mkdir -p "${CONT_OLD:?}/${latest_version:?}"

        # Copy version content with verification
        if cp -r "$version_dir"/* "$CONT_OLD/$latest_version/" 2>/dev/null; then
            echo "$latest_version content copied successfully"
        else
            echo "Error: Failed to copy $latest_version content"
            exit 1
        fi
    done
else
    echo "Warning: Content source directory not found"
fi

# Update Astro config with discovered versions
echo "Updating Astro configuration..."

# Build the versions array from the discovered latest versions
VERSIONS_ARRAY=""
FIRST=true
for latest_version in $(printf '%s\n' "${latest_versions[@]}" | sort -V); do
    if [ "$FIRST" = true ]; then
    FIRST=false
    VERSIONS_ARRAY="                      { slug: '$latest_version', label: '$latest_version' }"
    else
    VERSIONS_ARRAY="$VERSIONS_ARRAY,\n                      { slug: '$latest_version', label: '$latest_version' }"
    fi
done

# Update astro.config.mjs with new versions
if [ -f "docs/astro.config.mjs" ]; then
# Create backup
cp docs/astro.config.mjs docs/astro.config.mjs.bak

# Use perl for more reliable multiline replacement
perl -i -pe "BEGIN{undef $/;} s/versions: \[.*?\]/versions: [\n$VERSIONS_ARRAY\n                  ]/smg" docs/astro.config.mjs

echo "Updated Astro config with discovered versions"
else
echo "Warning: astro.config.mjs not found"
fi

# Change to docs directory for git operations
cd docs || exit
git config user.name "GitHub Actions"
git config user.email "actions@github.com"
git add --all

if ! git diff-index --quiet HEAD 2>/dev/null; then
echo "Changes detected, committing..."
if git commit -m "Auto-update docs from workflow" 2>/dev/null; then
    if git push origin main 2>/dev/null; then
    echo "Successfully pushed changes"
    else
    echo "Error: Failed to push changes"
    exit 1
    fi
else
    echo "Error: Failed to commit changes"
    exit 1
fi
else
echo "No changes to commit"
fi