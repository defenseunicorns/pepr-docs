#!/bin/bash

CORE=$(realpath "$CORE")
cd "$DOCS"
npm ci
        
# Build docs with proper error handling
echo "Starting documentation generation..."
if ! node build/index.mjs --core "$CORE" --site ./src/content/docs 2>&1 | grep -E "(Error:|Total build time|Build .* skip|versions.*:)" || [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "Error: Documentation build failed"
  exit 1
fi

echo "Documentation generation completed. Starting Astro build..."
if ! npm run build 2>&1 | grep -E "(Error:|build.*Complete|Entry.*404)" || [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "Error: Astro build failed"  
  exit 1
fi

echo "Build completed successfully!"