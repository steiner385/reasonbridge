#!/bin/bash
# Wait for frontend service to be healthy before running E2E tests

set -e

FRONTEND_URL="${1:-http://localhost:9080}"
MAX_ATTEMPTS="${2:-30}"
WAIT_SECONDS="${3:-2}"

echo "Waiting for frontend at $FRONTEND_URL to be ready..."
echo "Max attempts: $MAX_ATTEMPTS, Wait between attempts: ${WAIT_SECONDS}s"

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo "Attempt $attempt/$MAX_ATTEMPTS..."

  if curl -sf "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✓ Frontend is ready!"
    exit 0
  fi

  if [ $attempt -lt $MAX_ATTEMPTS ]; then
    echo "  Frontend not ready yet, waiting ${WAIT_SECONDS}s..."
    sleep $WAIT_SECONDS
  fi

  attempt=$((attempt + 1))
done

echo "✗ ERROR: Frontend did not become ready after $MAX_ATTEMPTS attempts"
echo ""
echo "Debugging information:"
echo "===================="
echo "Docker containers:"
docker ps -a | grep -E "frontend|CONTAINER" || true
echo ""
echo "Frontend container logs (last 50 lines):"
docker logs unite-frontend-e2e --tail 50 2>&1 || echo "Could not fetch frontend logs"
echo ""
echo "Checking if frontend container is running:"
docker inspect unite-frontend-e2e --format='{{.State.Status}}' 2>&1 || echo "Container not found"

exit 1
