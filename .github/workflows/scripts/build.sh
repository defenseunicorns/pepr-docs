#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS"
npm ci
        
# Build docs with proper error handling
echo "Starting documentation generation..."
node build/index.mjs --core "$CORE" --site ./src/content/docs > /tmp/build.log 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Documentation build failed"
  echo "Last 50 lines of build log:"
  tail -50 /tmp/build.log
  exit 1
fi
echo "Documentation generation completed."

# Astro build is handled by the documentation generator

echo "Build completed successfully!"