#!/bin/bash

# Demo mode startup script for Unite Discord application
# This script will build and start the complete application stack with demo data

set -e  # Exit on any error

echo "🚀 Starting Unite Discord Demo Mode"
echo "====================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop or docker service."
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build and start the services
echo ""
echo "📦 Building Docker images (this may take a few minutes)..."
docker compose -f docker-compose.e2e.yml build --parallel

echo ""
echo "🐳 Starting services..."
docker compose -f docker-compose.e2e.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for postgres to be ready
echo "  - Waiting for PostgreSQL..."
until docker compose -f docker-compose.e2e.yml exec postgres pg_isready > /dev/null 2>&1; do
    sleep 2
done
echo "  ✅ PostgreSQL is ready"

# Wait for redis to be ready
echo "  - Waiting for Redis..."
until docker compose -f docker-compose.e2e.yml exec redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
echo "  ✅ Redis is ready"

# Run database migrations and seed data
echo ""
echo "🗄️  Setting up database (migrations + seed data)..."
docker compose -f docker-compose.e2e.yml exec -T postgres sh -c "
    until pg_isready -U unite_test -d unite_test; do
        echo 'Waiting for postgres...';
        sleep 1;
    done
    echo 'Postgres is ready'
"

# Run migrations and seed data from db-models package already in the container
# Note: db-models is already present at /app/packages/db-models via Dockerfile.service
docker compose -f docker-compose.e2e.yml exec -T discussion-service sh -c "
    cd /app/packages/db-models || { echo 'ERROR: db-models not found at /app/packages/db-models'; exit 1; }
    DATABASE_URL='postgresql://unite_test:unite_test@postgres:5432/unite_test' npx prisma migrate deploy
    DATABASE_URL='postgresql://unite_test:unite_test@postgres:5432/unite_test' node prisma/seed.js
" || echo "⚠️  Could not run migrations/seed - check that Docker containers are running"

echo ""
echo "📊 Application Status:"
docker compose -f docker-compose.e2e.yml ps

echo ""
echo "🌐 Access the application:"
echo "  - Frontend: http://localhost:9080"
echo "  - API Gateway: http://localhost:3000"
echo "  - PostgreSQL: localhost:5434 (username: unite_test, password: unite_test, db: unite_test)"
echo "  - Redis: localhost:6381"

echo ""
echo "📋 Demo User Accounts (from seed data):"
echo "  - Username: test-user-1, Display Name: Test User One"
echo "  - Username: test-user-2, Display Name: Test User Two"

echo ""
echo "🎯 Demo Features Available:"
echo "  - Browse discussion topics"
echo "  - View common ground analysis"
echo "  - Submit responses and engage in discussions"
echo "  - Moderate content (admin features)"

echo ""
echo "🔧 To stop the demo: docker compose -f docker-compose.e2e.yml down"
echo "🔄 To restart: docker compose -f docker-compose.e2e.yml restart"
echo "📊 To view logs: docker compose -f docker-compose.e2e.yml logs -f"

echo ""
echo "✅ Unite Discord Demo Mode is now running!"