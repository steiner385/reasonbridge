#!/bin/bash
# Run unit tests using Vitest workspaces
# Each service/package uses its own vitest.config.ts for isolated test configuration

set -e

# Collect all arguments
ARGS="$@"

echo "Running unit tests via Vitest workspaces..."
echo "Using: vitest.workspace.ts"

# Run all workspace tests - Vitest will use each project's vitest.config.ts
pnpm exec vitest run --passWithNoTests $ARGS

echo "All unit tests completed successfully!"
