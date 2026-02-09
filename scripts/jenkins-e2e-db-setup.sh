#!/bin/bash
set -e

# Jenkins E2E Database Setup Script
#
# This script sets up the E2E database for Jenkins CI/CD runs.
# It runs Prisma migrations and seeds using the db-models package
# that is already built into the Docker service images.
#
# IMPORTANT: This script does NOT use 'docker cp' to avoid symlink issues
# with pnpm workspaces. The Dockerfile.service already includes all needed
# packages with Prisma client generated.
#
# Usage: ./scripts/jenkins-e2e-db-setup.sh

echo "🗄️  Setting up E2E database for Jenkins CI..."

# Use discussion-service container to run migrations (it has db-models built in)
# Container name uses Docker Compose naming: ${E2E_PROJECT_NAME}-${service}-1
# E2E_PROJECT_NAME is set in Jenkins pipeline (e.g., "e2e-build-4")
CONTAINER="${E2E_PROJECT_NAME:-reasonbridge}-discussion-service-1"
DB_URL="postgresql://reasonbridge_test:reasonbridge_test@postgres:5432/reasonbridge_test"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ ERROR: Container ${CONTAINER} is not running"
  echo "   Make sure docker-compose.e2e.yml is up before running this script"
  exit 1
fi

echo "✅ Container ${CONTAINER} is running"

# Verify db-models exists in container
echo "🔍 Verifying db-models package in container..."
if ! docker exec "$CONTAINER" test -d /app/packages/db-models; then
  echo "❌ ERROR: /app/packages/db-models not found in container"
  echo "   The Dockerfile.service build may have failed"
  docker exec "$CONTAINER" ls -la /app/packages/ || true
  exit 1
fi

echo "✅ db-models package found at /app/packages/db-models"

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
docker exec "$CONTAINER" sh -c "
  cd /app/packages/db-models && \
  DATABASE_URL='$DB_URL' npx prisma migrate deploy
"

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
else
  echo "❌ ERROR: Migration failed"
  exit 1
fi

# Seed database
echo "🌱 Seeding database with test data..."
docker exec "$CONTAINER" sh -c "
  cd /app/packages/db-models && \
  DATABASE_URL='$DB_URL' npx tsx prisma/seed.ts --demo
"

if [ $? -eq 0 ]; then
  echo "✅ Database seeded successfully"
else
  echo "❌ ERROR: Seeding failed"
  exit 1
fi

echo ""
echo "🎉 E2E database setup complete!"
echo "   - Migrations: Applied"
echo "   - Test data: Seeded"
echo ""
