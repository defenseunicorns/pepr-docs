#!/bin/bash

echo "Checking for existing processes on port 4321..."
lsof -ti:4321 | xargs kill -9 2>/dev/null || true

echo "Starting HTTP server on port 4321..."
python3 -m http.server 4321 --directory dist >/dev/null 2>&1 &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 2

echo "Running link validation tests..."
npm run --silent test:e2e
EXIT_CODE=$?

echo "Stopping server..."
kill $SERVER_PID || true

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Link validation completed successfully!"
else
  echo "Link validation failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE
