#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$REPO_ROOT/.repos"

PEPR_CORE_REPO="https://github.com/defenseunicorns/pepr.git"
PEPR_EXAMPLES_REPO="https://github.com/defenseunicorns/pepr-excellent-examples.git"

# Clone or update the pepr repository in .repos/
if [ -z "$CORE" ]; then
  mkdir -p "$CACHE_DIR"
  if [ -d "$CACHE_DIR/pepr/.git" ]; then
    echo "Updating cached pepr clone..."
    git -C "$CACHE_DIR/pepr" fetch --tags --quiet
    git -C "$CACHE_DIR/pepr" pull --quiet
  else
    echo "Cloning pepr repository (first-time setup)..."
    git clone "$PEPR_CORE_REPO" "$CACHE_DIR/pepr"
  fi
  CORE="$CACHE_DIR/pepr"
fi

# Clone or update the pepr-excellent-examples repository in .repos/
if [ -z "$EXAMPLES" ]; then
  mkdir -p "$CACHE_DIR"
  if [ -d "$CACHE_DIR/pepr-excellent-examples/.git" ]; then
    echo "Updating cached pepr-excellent-examples clone..."
    git -C "$CACHE_DIR/pepr-excellent-examples" pull --quiet
  else
    echo "Cloning pepr-excellent-examples repository (first-time setup)..."
    git clone --depth 1 "$PEPR_EXAMPLES_REPO" "$CACHE_DIR/pepr-excellent-examples"
  fi
  EXAMPLES="$CACHE_DIR/pepr-excellent-examples"
fi

CORE=$(realpath "$CORE")
EXAMPLES=$(realpath "$EXAMPLES")

# Ensure required directories exist
mkdir -p src/content/docs
mkdir -p src/content/versions

# Run the build with both repositories
node scripts/index.mjs --core "$CORE" --examples "$EXAMPLES" --site ./src/content/docs
