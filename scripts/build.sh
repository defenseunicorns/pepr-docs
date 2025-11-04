#!/bin/bash
set -e

# In CI, use CORE env var directly (set by workflow)
# Locally, load from .env file if it exists
if [ -z "$CI" ] && [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Check if CORE is set
if [ -z "$CORE" ]; then
  echo "Error: CORE environment variable is not set"
  echo ""
  echo "Please create a .env file with:"
  echo "  CORE=/path/to/pepr"
  echo ""
  echo "Or set the environment variable directly:"
  echo "  export CORE=/path/to/pepr"
  exit 1
fi

# Ensure required directories exist
mkdir -p src/content/docs
mkdir -p src/content/versions

# Run the build
node build/index.mjs --core "$CORE" --site ./src/content/docs
