#!/bin/bash
# Run unit tests for backend and frontend with support for flags like --coverage

set -e

# Collect all arguments
ARGS="$@"

# Run backend tests with flags
echo "Running backend unit tests..."
pnpm exec vitest run --passWithNoTests $ARGS

# Run frontend tests with flags, using -- to properly separate pnpm flags from script flags
echo "Running frontend unit tests..."
if [ -z "$ARGS" ]; then
  pnpm --filter frontend test
else
  pnpm --filter frontend test -- $ARGS
fi

echo "All unit tests completed successfully!"
