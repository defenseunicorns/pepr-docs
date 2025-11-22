#!/bin/bash

# Change to DOCS directory if needed (when not already there)
if [ "$CI" = "true" ] && [ -n "$DOCS" ] && [ ! -d "dist" ] && [ -d "$DOCS" ]; then
  cd "$DOCS" || exit
fi

# Check that dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Build may have failed."
  exit 1
fi

# Kill any existing process on port 4321
echo "Checking for existing processes on port 4321..."
lsof -ti:4321 | xargs kill -9 2>/dev/null || true

# Start HTTP server in background
echo "Starting HTTP server on port 4321..."
python3 -m http.server 4321 --directory dist >/dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
if [ "$CI" = "true" ]; then
  echo "Waiting for server to start..."
  sleep 5

  # Check if server is responding
  for i in {1..30}; do
    if curl -s http://localhost:4321 > /dev/null; then
      echo "Server is ready!"
      break
    fi
    echo "Waiting for server... ($i/30)"
    sleep 2
  done
else
  # Simple wait for local environment
  echo "Waiting for server to start..."
  sleep 2
fi

# Run link validation tests
echo "Running link validation tests..."
if [ "$CI" = "true" ]; then
  npm run test:e2e
else
  npm run --silent test:e2e
fi
TEST_EXIT_CODE=$?

# Stop server
echo "Stopping server..."
kill $SERVER_PID || true

if [ "$TEST_EXIT_CODE" -eq 0 ]; then
  echo "Link validation completed successfully!"
else
  echo "Link validation failed with exit code: $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE
