#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS"
npm ci
        
# Build docs with proper error handling
echo "Starting documentation generation..."
if ! node build/index.mjs --core "$CORE" --site ./src/content/docs; then
  echo "Error: Documentation build failed"
  exit 1
fi

echo "Documentation generation completed. Starting Astro build..."
if ! npm run build; then
  echo "Error: Astro build failed"
  exit 1
fi

echo "Build completed successfully!"