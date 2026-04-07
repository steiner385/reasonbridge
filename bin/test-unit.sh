#!/bin/bash
# Run unit tests using Vitest workspaces
# Each service/package uses its own vitest.config.ts for isolated test configuration

set -e

# Collect all arguments
ARGS="$@"

# CI-specific optimizations to prevent OOM and improve stability
# Detect CI environment: Jenkins sets BUILD_NUMBER, GitHub Actions sets CI=true
CI_OPTS=""
if [ -n "$BUILD_NUMBER" ] || [ "$CI" = "true" ]; then
    echo "CI environment detected - applying memory optimizations..."
    # Limit workers to reduce memory pressure
    # Use sequential file execution to prevent resource contention
    CI_OPTS="--maxWorkers=2 --no-file-parallelism"
fi

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
if [ -n "$CI_OPTS" ]; then
    echo "CI optimizations: $CI_OPTS"
fi

# Run all workspace tests - Vitest will use each project's vitest.config.ts
pnpm exec vitest run --passWithNoTests $CI_OPTS $ARGS

# Run db-models tests separately (excluded from workspace because it needs prisma generate)
echo "Running db-models tests..."
pnpm --filter @reason-bridge/db-models test

echo "All unit tests completed successfully!"
