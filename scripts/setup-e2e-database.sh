#!/bin/bash
set -e

# E2E Database Setup Script
# This script sets up the E2E PostgreSQL database with migrations and seed data
# Usage: ./scripts/setup-e2e-database.sh

echo "🔧 Setting up E2E database..."

# Database connection details for E2E environment
E2E_DATABASE_URL="postgresql://unite_test:unite_test@localhost:5434/unite_test"

# Check if E2E postgres container is running
if ! docker ps | grep -q "unite-postgres-e2e"; then
  echo "❌ E2E postgres container is not running!"
  echo "   Start the E2E environment first: docker compose -f docker-compose.e2e.yml up -d"
  exit 1
fi

echo "✅ E2E postgres container is running"

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 30 sh -c 'until docker exec unite-postgres-e2e pg_isready -U unite_test 2>/dev/null; do sleep 1; done' || {
  echo "❌ PostgreSQL did not become ready in time"
  exit 1
}
echo "✅ PostgreSQL is ready"

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
cd packages/db-models
DATABASE_URL="$E2E_DATABASE_URL" npx prisma migrate deploy
echo "✅ Migrations applied"

# Run seed script
echo "🌱 Seeding database with test data..."
DATABASE_URL="$E2E_DATABASE_URL" node prisma/seed.js
echo "✅ Database seeded"

echo ""
echo "🎉 E2E database setup complete!"
echo "   - Migrations: Applied"
echo "   - Test data: Seeded (3 topics, 2 users, 2 responses)"
echo ""
echo "You can now run E2E tests:"
echo "   cd frontend && E2E_DOCKER=true E2E_FRONTEND_PORT=8080 npx playwright test"
