#!/bin/bash

# Validate .gitignore is working correctly
# This script tests that critical build artifacts would be ignored by git
# Prevents accidentally committing node_modules, dist, work, and .astro directories

echo "Testing .gitignore patterns..."

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

echo "✓ .gitignore is working correctly"
