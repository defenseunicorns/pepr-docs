#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS"
npm ci
        
# Build docs with proper error handling
echo "Starting documentation generation..."
node build/index.mjs --core "$CORE" --site ./src/content/docs > /tmp/build.log 2>&1
BUILD_EXIT_CODE=$?
if [ $BUILD_EXIT_CODE -ne 0 ]; then
  echo "Error: Documentation build failed with exit code: $BUILD_EXIT_CODE"
  echo "Full build log:"
  cat /tmp/build.log
  exit 1
fi
echo "Documentation generation completed."

# Astro build is handled by the documentation generator

echo "Build completed successfully!"