#!/bin/bash
# Run unit tests using Vitest workspaces
# Each service/package uses its own vitest.config.ts for isolated test configuration

set -e

# Collect all arguments
ARGS="$@"

# Ensure Prisma client is generated before running tests
# This is needed because db-models tests import @prisma/client
# and vitest runs tests in parallel across all workspaces
if [ -f "packages/db-models/prisma/schema.prisma" ]; then
    echo "Ensuring Prisma client is generated..."
    # Try pnpm filter first, fallback to running from the package directory
    if ! pnpm --filter @reason-bridge/db-models exec prisma generate; then
        echo "pnpm filter failed, trying direct approach..."
        (cd packages/db-models && npx prisma generate) || echo "Prisma generate failed, tests may fail"
    fi
fi

echo "Running unit tests via Vitest workspaces..."
echo "Using: vitest.workspace.ts"

# Run all workspace tests - Vitest will use each project's vitest.config.ts
pnpm exec vitest run --passWithNoTests $ARGS

echo "All unit tests completed successfully!"
