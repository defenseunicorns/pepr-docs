#!/bin/bash
set -e

# In CI, use CORE and EXAMPLES env vars directly (set by workflow)
# Locally, load from .env file if it exists
if [ -z "$CI" ] && [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Check if required environment variables are set
if [ -z "$CORE" ] || [ -z "$EXAMPLES" ]; then
  echo "Error: Required environment variables not set"
  echo ""
  [ -z "$CORE" ] && echo "  Missing: CORE"
  [ -z "$EXAMPLES" ] && echo "  Missing: EXAMPLES"
  echo ""
  echo "Please create a .env file with:"
  echo "  CORE=/path/to/pepr"
  echo "  EXAMPLES=/path/to/pepr-excellent-examples"
  echo ""
  echo "Or set the environment variables directly:"
  echo "  export CORE=/path/to/pepr"
  echo "  export EXAMPLES=/path/to/pepr-excellent-examples"
  exit 1
fi

CORE=$(realpath "$CORE")
EXAMPLES=$(realpath "$EXAMPLES")

# Ensure required directories exist
mkdir -p src/content/docs
mkdir -p src/content/versions

# Run the build with both repositories
node scripts/index.mjs --core "$CORE" --examples "$EXAMPLES" --site ./src/content/docs
