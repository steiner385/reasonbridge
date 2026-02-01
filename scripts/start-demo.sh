#!/bin/bash
#
# Start Demo Environment Script
# Starts all infrastructure services and application services for local demo
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ReasonBridge Demo Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    
    # Update .env with demo-friendly defaults
    sed -i 's|POSTGRES_PASSWORD=localdev|POSTGRES_PASSWORD=unite|g' .env
    sed -i 's|POSTGRES_DB=unite_discord|POSTGRES_DB=unite_dev|g' .env
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://unite:unite@localhost:5432/unite_dev|g' .env
    sed -i 's|# AWS_ENDPOINT_URL=.*|AWS_ENDPOINT_URL=http://localhost:4566|g' .env
    sed -i 's|AWS_ACCESS_KEY_ID=your_aws_access_key_here|AWS_ACCESS_KEY_ID=test|g' .env
    sed -i 's|AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here|AWS_SECRET_ACCESS_KEY=test|g' .env
    sed -i 's|JWT_SECRET=your_jwt_secret_here_change_in_production|JWT_SECRET=demo-jwt-secret-change-in-production-12345|g' .env
    
    echo -e "${GREEN}✓ Created .env file with demo defaults${NC}"
fi

# Export environment variables
export $(grep -v '^#' .env | xargs)

# Start Docker infrastructure
echo ""
echo -e "${YELLOW}Starting Docker infrastructure services...${NC}"
docker compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo -e "${YELLOW}Checking service health...${NC}"
docker compose ps

# Run database migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
cd packages/db-models
npx prisma migrate deploy
cd ../..
echo -e "${GREEN}✓ Database migrations complete${NC}"

# Start all services in development mode
echo ""
echo -e "${YELLOW}Starting application services...${NC}"
echo -e "${BLUE}This will start all backend services and the frontend.${NC}"
echo -e "${BLUE}Services will run in the foreground. Press Ctrl+C to stop.${NC}"
echo ""

# Give user a moment to read
sleep 2

# Start all services
pnpm -r --parallel dev
