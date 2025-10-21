#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS" || exit
npm ci

# Ensure required directories exist
mkdir -p src/content/docs
mkdir -p src/content/versions

# Build docs with proper error handling
echo "Starting documentation generation..."
node build/index.mjs --core "$CORE" --site ./src/content/docs 2>&1 | tee /tmp/build.log
BUILD_EXIT_CODE=${PIPESTATUS[0]}
if [ "$BUILD_EXIT_CODE" -ne 0 ]; then
  echo "Error: Documentation build failed with exit code: $BUILD_EXIT_CODE"
  echo "Last 100 lines of build log:"
  tail -100 /tmp/build.log
  exit 1
fi
echo "Documentation generation completed."

# Astro build is handled by the documentation generator

echo "Build completed successfully!"