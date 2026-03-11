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
  echo "Last 50 lines of db-seed logs:"
  docker logs "$SEED_CONTAINER" --tail 50 2>/dev/null || true
  exit 1
fi

# Always show db-seed logs for debugging (helps trace seeding issues)
echo "📋 Last 10 lines of db-seed logs:"
docker logs "$SEED_CONTAINER" --tail 10 2>/dev/null || echo "  (no logs available)"

# Verify database has expected data by querying postgres directly
# Using postgres container (not discussion-service) because postgres is guaranteed
# to be ready after db-seed completes, while services may still be initializing
echo "🔍 Verifying database has demo data..."
POSTGRES_CONTAINER="${PROJECT_NAME}-postgres-1"

if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  # Verify users exist
  # Note: Prisma maps User model to "users" table via @@map("users")
  USER_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U reasonbridge_test -d reasonbridge_test -tAc 'SELECT COUNT(*) FROM users;' 2>/dev/null || echo "0")
  USER_COUNT=$(echo "$USER_COUNT" | tr -d '[:space:]')

  if [ "${USER_COUNT:-0}" -gt 0 ]; then
    echo "✅ Users verified: $USER_COUNT users found"
  else
    echo "❌ ERROR: No users found in database - seeding may have failed"
    docker logs "$SEED_CONTAINER" --tail 50 2>/dev/null || true
    exit 1
  fi

  # Verify responses exist (critical for E2E tests that wait for response-item)
  # Note: Prisma maps Response model to "responses" table via @@map("responses")
  RESPONSE_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U reasonbridge_test -d reasonbridge_test -tAc 'SELECT COUNT(*) FROM responses;' 2>/dev/null || echo "0")
  RESPONSE_COUNT=$(echo "$RESPONSE_COUNT" | tr -d '[:space:]')

  if [ "${RESPONSE_COUNT:-0}" -gt 0 ]; then
    echo "✅ Responses verified: $RESPONSE_COUNT responses found"
  else
    echo "❌ ERROR: No responses found in database - seeding may have failed"
    echo "   E2E tests will fail waiting for [data-testid='response-item']"
    docker logs "$SEED_CONTAINER" --tail 50 2>/dev/null || true
    exit 1
  fi

  # Verify topics exist
  # Note: Prisma maps DiscussionTopic model to "discussion_topics" table via @@map("discussion_topics")
  TOPIC_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U reasonbridge_test -d reasonbridge_test -tAc 'SELECT COUNT(*) FROM discussion_topics;' 2>/dev/null || echo "0")
  TOPIC_COUNT=$(echo "$TOPIC_COUNT" | tr -d '[:space:]')

  if [ "${TOPIC_COUNT:-0}" -gt 0 ]; then
    echo "✅ Topics verified: $TOPIC_COUNT topics found"
  else
    echo "❌ ERROR: No topics found in database - seeding may have failed"
    docker logs "$SEED_CONTAINER" --tail 50 2>/dev/null || true
    exit 1
  fi
else
  echo "⚠️  Warning: postgres container not found for verification"
  echo "   Container name expected: ${POSTGRES_CONTAINER}"
  docker ps --format '{{.Names}}' | grep -E '(postgres|db)' || echo "   No postgres containers found"
fi

echo ""
echo "🎉 E2E database verification complete!"
echo "   - Migrations: Verified"
echo "   - Seeding: Verified"
echo ""
