#!/bin/bash

cd "$DOCS" || exit

# Start preview server in background
echo "Starting preview server..."
npm run preview &
PREVIEW_PID=$!

# Wait for server to be ready
echo "Waiting for preview server to start..."
sleep 10

# Check if server is responding
for i in {1..30}; do
  if curl -s http://localhost:4321 > /dev/null; then
    echo "Preview server is ready!"
    break
  fi
  echo "Waiting for server... ($i/30)"
  sleep 2
done

# Run link validation tests
echo "Running link validation tests..."
npm run test:e2e
TEST_EXIT_CODE=$?

# Stop preview server
echo "Stopping preview server..."
kill $PREVIEW_PID || true

if [ "$TEST_EXIT_CODE" -eq 0 ]; then
  echo "Link validation completed successfully!"
else
  echo "Link validation failed with exit code: $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE
