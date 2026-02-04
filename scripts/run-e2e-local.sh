#!/bin/bash
# Local E2E Test Runner - Replicates Jenkins CI environment exactly
# This script runs E2E tests using Docker containers just like Jenkins does

set -e  # Exit on error

# Configuration
PROJECT_NAME="e2e-local-$$"
PLAYWRIGHT_VERSION="v1.58.0-noble"
CONTAINER_NAME="playwright-e2e-local-$$"
PLAYWRIGHT_BASE_URL="http://frontend:80"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up..."

    # Remove Playwright container
    if [ -n "$CONTAINER_NAME" ]; then
        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    fi

    # Stop and remove all E2E services
    COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.e2e.yml down -v --remove-orphans 2>/dev/null || true

    log_info "Cleanup complete"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

# Change to repository root
cd "$(dirname "$0")/.."

log_info "=========================================="
log_info "Local E2E Test Runner"
log_info "Replicating Jenkins CI environment"
log_info "=========================================="
log_info "Project Name: $PROJECT_NAME"
log_info "Playwright Version: $PLAYWRIGHT_VERSION"
log_info "Base URL: $PLAYWRIGHT_BASE_URL"
log_info "=========================================="

# Step 1: Start all E2E services
log_info "Starting E2E services (docker-compose)..."
COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.e2e.yml up -d --build

# Step 2: Wait for postgres to be ready
log_info "Waiting for PostgreSQL to be ready..."
MAX_WAIT=60
WAIT_COUNT=0
until COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.e2e.yml exec -T postgres pg_isready -U reasonbridge_test -d reasonbridge_test > /dev/null 2>&1; do
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        log_error "PostgreSQL did not become ready after ${MAX_WAIT} seconds"
        exit 1
    fi
    echo "Waiting for PostgreSQL... ($WAIT_COUNT/$MAX_WAIT)"
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done
log_info "PostgreSQL is ready"

# Step 3: Run database migrations and seed
log_info "Setting up E2E database (migrations + seed)..."
E2E_PROJECT_NAME=$PROJECT_NAME ./scripts/jenkins-e2e-db-setup.sh
log_info "E2E database ready"

# Step 4: Wait for frontend to be healthy
log_info "Waiting for frontend container to be healthy..."
MAX_WAIT=60
WAIT_COUNT=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' ${PROJECT_NAME}-frontend-1 2>/dev/null)" = "healthy" ]; do
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        log_error "Frontend container did not become healthy after ${MAX_WAIT} seconds"
        docker logs ${PROJECT_NAME}-frontend-1 --tail 50
        exit 1
    fi
    echo "Waiting for frontend health check... ($WAIT_COUNT/$MAX_WAIT)"
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 1))
done
log_info "Frontend container is healthy"

# Step 5: Verify frontend is accessible from Docker network
log_info "Verifying frontend is accessible from Docker network..."
MAX_ATTEMPTS=30
for i in $(seq 1 $MAX_ATTEMPTS); do
    if COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.e2e.yml exec -T frontend curl -f -s http://localhost:80 > /dev/null 2>&1; then
        log_info "Frontend is accessible on Docker network"
        break
    fi
    if [ $i -eq $MAX_ATTEMPTS ]; then
        log_error "Frontend not accessible after $MAX_ATTEMPTS attempts"
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.e2e.yml logs frontend --tail 50
        exit 1
    fi
    echo "Attempt $i/$MAX_ATTEMPTS: Waiting for frontend to be accessible..."
    sleep 2
done

# Step 6: Create Playwright container on the same Docker network
log_info "=========================================="
log_info "Creating Playwright test container"
log_info "Container: $CONTAINER_NAME"
log_info "Network: ${PROJECT_NAME}_reasonbridge-e2e"
log_info "Base URL: $PLAYWRIGHT_BASE_URL"
log_info "=========================================="

docker run -d \
    --name "$CONTAINER_NAME" \
    --network ${PROJECT_NAME}_reasonbridge-e2e \
    --memory 4g \
    -w /app/frontend \
    -e CI=true \
    -e E2E_DOCKER=true \
    -e PLAYWRIGHT_BASE_URL=$PLAYWRIGHT_BASE_URL \
    -e SKIP_GLOBAL_SETUP_WAIT=true \
    mcr.microsoft.com/playwright:$PLAYWRIGHT_VERSION \
    sleep infinity

# Step 7: Copy frontend files to container using tar (handles pnpm symlinks)
log_info "Copying frontend files to container (using tar to handle symlinks)..."
tar -chf - -C frontend . | docker exec -i "$CONTAINER_NAME" tar -xf - -C /app/frontend/

log_info "Files copied. Verifying..."
docker exec "$CONTAINER_NAME" ls -la /app/frontend/ | head -20

# Create coverage directory
docker exec "$CONTAINER_NAME" mkdir -p /app/coverage 2>/dev/null || true

# Step 8: Install @playwright/test and run tests
log_info "=========================================="
log_info "Running Playwright tests..."
log_info "=========================================="

docker exec "$CONTAINER_NAME" bash -c "
    export PLAYWRIGHT_BASE_URL='$PLAYWRIGHT_BASE_URL'
    echo 'DEBUG: Inside container - Starting E2E test execution'
    echo 'DEBUG: Working directory:' \$(pwd)
    echo 'DEBUG: PLAYWRIGHT_BASE_URL=' \$PLAYWRIGHT_BASE_URL

    # Remove broken local @playwright (pnpm symlinks break after tar copy)
    rm -rf node_modules/@playwright node_modules/playwright node_modules/playwright-core 2>/dev/null || true

    echo 'DEBUG: Reinstalling @playwright/test...'
    npm install @playwright/test --no-save --prefer-offline 2>/dev/null || npm install @playwright/test --no-save

    echo 'DEBUG: Playwright version:' \$(npx playwright --version)
    echo 'DEBUG: Starting Playwright tests...'
    echo '=========================================='

    # Run tests
    npx playwright test --reporter=list,junit,json
" || {
    EXIT_CODE=$?
    log_error "Playwright tests exited with code $EXIT_CODE"

    # Copy results out even on failure
    log_info "Copying test results (even though tests failed)..."
    docker cp "$CONTAINER_NAME":/app/frontend/playwright-report ./frontend/ 2>/dev/null || true
    docker cp "$CONTAINER_NAME":/app/frontend/test-results ./frontend/ 2>/dev/null || true

    log_error "Tests failed! Check frontend/test-results/ and frontend/playwright-report/ for details"
    exit $EXIT_CODE
}

# Step 9: Copy test results back to host
log_info "Copying test results..."
docker cp "$CONTAINER_NAME":/app/frontend/playwright-report ./frontend/ 2>/dev/null || true
docker cp "$CONTAINER_NAME":/app/frontend/test-results ./frontend/ 2>/dev/null || true

log_info "=========================================="
log_info "E2E tests completed successfully!"
log_info "=========================================="
log_info "Test reports:"
log_info "  - Playwright Report: frontend/playwright-report/"
log_info "  - Test Results: frontend/test-results/"
log_info "=========================================="

# Cleanup happens automatically via trap
