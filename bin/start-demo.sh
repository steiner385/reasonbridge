#!/bin/bash
# Start ReasonBridge Demo Environment
# Runs the full stack locally for demo/development purposes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🚀 Starting ReasonBridge Demo Environment"
echo "=========================================="

# Check if infrastructure is running
if ! docker compose ps postgres 2>/dev/null | grep -q "healthy"; then
    echo "📦 Starting infrastructure (postgres, redis, localstack)..."
    docker compose up -d

    # Wait for postgres to be healthy
    echo "⏳ Waiting for PostgreSQL to be ready..."
    until docker compose ps postgres 2>/dev/null | grep -q "healthy"; do
        sleep 2
    done
    echo "✅ PostgreSQL is ready"
fi

# Run database migrations if needed
echo "📊 Running database migrations..."
pnpm --filter db-models prisma migrate deploy 2>/dev/null || pnpm --filter db-models prisma migrate dev --name init

# Seed demo data
echo "🌱 Seeding demo data..."
pnpm --filter db-models prisma db seed

# Build all packages
echo "🔨 Building packages..."
pnpm -r build

echo ""
echo "=========================================="
echo "🎉 Infrastructure ready!"
echo ""
echo "Now start the services in separate terminals:"
echo ""
echo "Terminal 1 - API Gateway (port 3000):"
echo "  cd services/api-gateway && pnpm dev"
echo ""
echo "Terminal 2 - User Service (port 3001):"
echo "  cd services/user-service && pnpm dev"
echo ""
echo "Terminal 3 - Discussion Service (port 3007):"
echo "  cd services/discussion-service && pnpm dev"
echo ""
echo "Terminal 4 - AI Service (port 3002):"
echo "  cd services/ai-service && pnpm dev"
echo ""
echo "Terminal 5 - Frontend (port 5173):"
echo "  cd frontend && pnpm dev"
echo ""
echo "Then visit: http://localhost:5173"
echo "=========================================="
