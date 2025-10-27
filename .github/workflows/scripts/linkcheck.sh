#!/bin/bash

cd "$DOCS" || exit

# Check that dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Build may have failed."
  exit 1
fi

# Start an HTTP server in background
echo "Starting HTTP server on port 4321..."
(cd dist && python3 -m http.server 4321) &
SERVER_PID=$!

# Wait for server to be ready
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

# Run link validation tests
echo "Running link validation tests..."
npm run test:e2e
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
