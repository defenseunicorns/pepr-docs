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
for version_dir in "$CONT_NEW"/v0.*; do
    if [ -d "$version_dir" ]; then
    version=$(basename "$version_dir")
    echo "Copying $version content..."
    
    # Remove existing version content
    rm -rf "${CONT_OLD:?}/${version:?}" 2>/dev/null || true
    mkdir -p "${CONT_OLD:?}/${version:?}"
    
    # Copy version content with verification
    if cp -r "$version_dir"/* "$CONT_OLD/$version/" 2>/dev/null; then
        echo "$version content copied successfully"
    else
        echo "Error: Failed to copy $version content"
        exit 1
    fi
    fi
done
else
echo "Warning: Content source directory not found"
fi

# Update Astro config with discovered versions
echo "Updating Astro configuration..."

# Discover all version directories and build properly formatted JS array
VERSIONS_ARRAY=""
FIRST=true
for version_dir in "$CONT_OLD"/v0.*; do
if [ -d "$version_dir" ]; then
    version=$(basename "$version_dir")
    if [ "$FIRST" = true ]; then
    FIRST=false
    VERSIONS_ARRAY="                      { slug: '$version', label: '$version' }"
    else
    VERSIONS_ARRAY="$VERSIONS_ARRAY,\n                      { slug: '$version', label: '$version' }"
    fi
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