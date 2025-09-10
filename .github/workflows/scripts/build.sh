#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS"
npm ci
        
# Build docs with proper error handling
echo "Starting documentation generation..."
node build/index.mjs --core "$CORE" --site ./src/content/docs > /tmp/build.log 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Documentation build failed"
  tail -20 /tmp/build.log
  exit 1
fi
echo "Documentation generation completed."

echo "Starting Astro build..."
npm run build > /tmp/astro.log 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Astro build failed"
  tail -20 /tmp/astro.log
  exit 1
fi
echo "Astro build completed."

echo "Build completed successfully!"