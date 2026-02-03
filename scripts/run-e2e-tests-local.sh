#!/bin/bash
set -e

# Run E2E Tests Locally Using Docker Network
#
# This script runs Playwright E2E tests inside a Docker container on the same
# network as the E2E services, avoiding localhost port mapping issues.
#
# Prerequisites:
# - E2E environment must be running: docker compose -f docker-compose.e2e.yml up -d
# - Database must be set up: ./scripts/jenkins-e2e-db-setup.sh
#
# Usage:
#   ./scripts/run-e2e-tests-local.sh              # Run all tests
#   ./scripts/run-e2e-tests-local.sh --headed      # Run in headed mode
#   ./scripts/run-e2e-tests-local.sh --ui          # Run with Playwright UI

echo "🧪 Running E2E Tests in Docker Container"
echo "=========================================="

# Check if E2E environment is running
if ! docker ps | grep -q "reasonbridge-frontend-e2e"; then
    echo "❌ ERROR: E2E environment is not running"
    echo "   Start it with: docker compose -f docker-compose.e2e.yml up -d"
    exit 1
fi

# Check if frontend is healthy
if ! docker inspect --format='{{.State.Health.Status}}' reasonbridge-frontend-e2e 2>/dev/null | grep -q "healthy"; then
    echo "⚠️  WARNING: Frontend container is not healthy"
    echo "   Waiting for frontend to become healthy..."
    sleep 5
fi

echo "✅ E2E environment is running"

# Parse arguments
PLAYWRIGHT_ARGS="$@"
if [ -z "$PLAYWRIGHT_ARGS" ]; then
    PLAYWRIGHT_ARGS="--reporter=list"
fi

echo "📦 Running Playwright tests with: $PLAYWRIGHT_ARGS"
echo ""

# Run Playwright tests in Docker container on the same network
docker run --rm \
    --network reasonbridge_reasonbridge-e2e \
    -v $(pwd)/frontend:/app/frontend \
    -v $(pwd)/coverage:/app/coverage \
    -w /app/frontend \
    -e CI=true \
    -e E2E_DOCKER=true \
    -e PLAYWRIGHT_BASE_URL=http://frontend:80 \
    -e SKIP_GLOBAL_SETUP_WAIT=true \
    mcr.microsoft.com/playwright:v1.57.0-noble \
    bash -c "npm install > /dev/null 2>&1 && npx playwright test $PLAYWRIGHT_ARGS"

echo ""
echo "🎉 E2E tests completed!"
