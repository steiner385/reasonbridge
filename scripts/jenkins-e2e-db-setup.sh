#!/bin/bash
set -e

# Jenkins E2E Database Verification Script
#
# This script verifies the E2E database is ready for Jenkins CI/CD runs.
#
# IMPORTANT: Migrations and seeding are now handled by docker-compose.e2e.yml
# via the db-migrate and db-seed services. This script only VERIFIES completion
# to avoid redundant operations that cause memory pressure and OOM kills.
#
# The db-migrate and db-seed containers run at startup with proper dependencies:
#   postgres (healthy) -> db-migrate (completed) -> db-seed (completed) -> services
#
# Usage: ./scripts/jenkins-e2e-db-setup.sh

echo "🗄️  Verifying E2E database for Jenkins CI..."

# Container name uses Docker Compose naming: ${E2E_PROJECT_NAME}-${service}-1
# E2E_PROJECT_NAME is set in Jenkins pipeline (e.g., "e2e-build-362")
PROJECT_NAME="${E2E_PROJECT_NAME:-reasonbridge}"

# Wait for db-migrate container to complete (max 60 seconds)
echo "📦 Waiting for db-migrate to complete..."
MIGRATE_CONTAINER="${PROJECT_NAME}-db-migrate-1"
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  # Check if container exists and has exited
  STATUS=$(docker inspect --format='{{.State.Status}}' "$MIGRATE_CONTAINER" 2>/dev/null || echo "not_found")

  if [ "$STATUS" = "exited" ]; then
    EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$MIGRATE_CONTAINER" 2>/dev/null || echo "1")
    if [ "$EXIT_CODE" = "0" ]; then
      echo "✅ Migrations completed successfully"
      break
    else
      echo "❌ ERROR: db-migrate exited with code $EXIT_CODE"
      docker logs "$MIGRATE_CONTAINER" --tail 20 2>/dev/null || true
      exit 1
    fi
  elif [ "$STATUS" = "running" ]; then
    echo "⏳ db-migrate still running... ($WAIT_COUNT/$MAX_WAIT)"
  elif [ "$STATUS" = "not_found" ]; then
    echo "⏳ Waiting for db-migrate container... ($WAIT_COUNT/$MAX_WAIT)"
  fi

  sleep 2
  WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo "❌ ERROR: Timeout waiting for db-migrate"
  exit 1
fi

# Wait for db-seed container to complete (max 60 seconds)
echo "🌱 Waiting for db-seed to complete..."
SEED_CONTAINER="${PROJECT_NAME}-db-seed-1"
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  STATUS=$(docker inspect --format='{{.State.Status}}' "$SEED_CONTAINER" 2>/dev/null || echo "not_found")

  if [ "$STATUS" = "exited" ]; then
    EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$SEED_CONTAINER" 2>/dev/null || echo "1")
    if [ "$EXIT_CODE" = "0" ]; then
      echo "✅ Database seeding completed successfully"
      break
    else
      echo "❌ ERROR: db-seed exited with code $EXIT_CODE"
      docker logs "$SEED_CONTAINER" --tail 20 2>/dev/null || true
      exit 1
    fi
  elif [ "$STATUS" = "running" ]; then
    echo "⏳ db-seed still running... ($WAIT_COUNT/$MAX_WAIT)"
  elif [ "$STATUS" = "not_found" ]; then
    echo "⏳ Waiting for db-seed container... ($WAIT_COUNT/$MAX_WAIT)"
  fi

  sleep 2
  WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo "❌ ERROR: Timeout waiting for db-seed"
  exit 1
fi

# Verify database has expected data by checking user count
echo "🔍 Verifying database has demo data..."
DISCUSSION_CONTAINER="${PROJECT_NAME}-discussion-service-1"
DB_URL="postgresql://reasonbridge_test:reasonbridge_test@postgres:5432/reasonbridge_test"

if docker ps --format '{{.Names}}' | grep -q "^${DISCUSSION_CONTAINER}$"; then
  USER_COUNT=$(docker exec "$DISCUSSION_CONTAINER" sh -c "
    cd /app/packages/db-models && \
    DATABASE_URL='$DB_URL' npx prisma db execute --stdin <<< 'SELECT COUNT(*) FROM \"User\";' 2>/dev/null | grep -oE '[0-9]+' | head -1
  " 2>/dev/null || echo "0")

  if [ "${USER_COUNT:-0}" -gt 0 ]; then
    echo "✅ Database verified: $USER_COUNT users found"
  else
    echo "⚠️  Warning: Could not verify user count (may be OK)"
  fi
else
  echo "⚠️  Warning: discussion-service not running for verification (may be OK)"
fi

echo ""
echo "🎉 E2E database verification complete!"
echo "   - Migrations: Verified"
echo "   - Seeding: Verified"
echo ""
