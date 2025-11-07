#!/bin/bash

# Validate .gitignore is working correctly
# This script tests that critical build artifacts would be ignored by git
# Prevents accidentally committing node_modules, dist, work, and .astro directories

echo "Validating .gitignore patterns..."

# Test that critical paths would be ignored
if ! git check-ignore -q node_modules/test 2>/dev/null; then
  echo "ERROR: .gitignore broken - node_modules/ not being ignored!"
  exit 1
fi

if ! git check-ignore -q dist/test 2>/dev/null; then
  echo "ERROR: .gitignore broken - dist/ not being ignored!"
  exit 1
fi

if ! git check-ignore -q work/test 2>/dev/null; then
  echo "ERROR: .gitignore broken - work/ not being ignored!"
  exit 1
fi

if ! git check-ignore -q .astro/test 2>/dev/null; then
  echo "ERROR: .gitignore broken - .astro/ not being ignored!"
  exit 1
fi

# Check if any build artifacts are staged for commit
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

if [ -n "$STAGED_FILES" ]; then
  BLOCKED_FILES=""

  while IFS= read -r file; do
    # Check if staged file matches patterns that should be ignored
    if [[ "$file" =~ ^node_modules/ ]] || \
       [[ "$file" =~ ^dist/ ]] || \
       [[ "$file" =~ ^work/ ]] || \
       [[ "$file" =~ ^\.astro/ ]] || \
       [[ "$file" =~ ^src/content/docs/.*\.md$ ]] || \
       [[ "$file" =~ ^src/content/versions/.*\.json$ ]] || \
       [[ "$file" =~ ^public/_redirects$ ]]; then
      BLOCKED_FILES="${BLOCKED_FILES}  - ${file}\n"
    fi
  done <<< "$STAGED_FILES"

  if [ -n "$BLOCKED_FILES" ]; then
    echo ""
    echo "ERROR: Build artifacts are staged for commit!"
    echo "The following files should not be committed:"
    echo -e "$BLOCKED_FILES"
    echo ""
    echo "These files are generated during build and should be ignored."
    echo "Please unstage them before committing."
    exit 1
  fi
fi

echo "✓ .gitignore is working correctly"
