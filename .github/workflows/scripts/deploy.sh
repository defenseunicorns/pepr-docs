#!/bin/bash

BRANCH=deploy

cd "$DOCS"
git config user.name "GitHub Actions"
git config user.email "actions@github.com"

git add --all
if ! git diff-index --quiet HEAD 2>/dev/null; then
if git commit -m "Auto-deploy docs" 2>/dev/null; then
    if git push origin "$BRANCH" 2>/dev/null; then
    echo "Successfully deployed docs"
    else
    echo "Error: Failed to push to deploy branch"
    exit 1
    fi
else
    echo "Error: Failed to commit deployment"
    exit 1
fi
else
echo "No changes to deploy"
fi