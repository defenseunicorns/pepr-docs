#!/bin/bash

# Run shellcheck on staged shell scripts
# This script validates shell scripts before they are committed

echo "Checking for staged shell scripts..."

# Get list of staged shell scripts
SHELL_SCRIPTS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(sh|bash)$' || true)

if [ -z "$SHELL_SCRIPTS" ]; then
  echo "✓ No shell scripts staged for commit"
  exit 0
fi

echo "Running shellcheck on staged shell scripts..."
echo "$SHELL_SCRIPTS" | while IFS= read -r file; do
  echo "  - $file"
done

# Run shellcheck on all staged shell scripts
if echo "$SHELL_SCRIPTS" | xargs shellcheck; then
  echo "✓ All shell scripts passed shellcheck"
  exit 0
else
  echo ""
  echo "ERROR: shellcheck found issues in staged shell scripts"
  echo "Please fix the issues above before committing"
  exit 1
fi
