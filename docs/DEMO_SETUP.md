# Demo Environment Setup Guide

This guide will help you set up and run the ReasonBridge demo environment locally.

## Prerequisites

- **Node.js 20.x** or higher
- **pnpm 9.x** (will be installed by setup script if missing)
- **Docker** and **Docker Compose**
- **Git**

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/steiner385/reasonbridge.git
cd reasonbridge

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install --frozen-lockfile

# Build shared packages
pnpm -r --filter="@reason-bridge/*" build
```

### 2. Start Demo Environment

```bash
# Use the demo start script
./scripts/start-demo.sh
```

This script will:
1. Create/update `.env` file with demo-friendly defaults
2. Start Docker infrastructure services (PostgreSQL, Redis, LocalStack, etc.)
3. Run database migrations
4. Start all backend services and frontend

### 3. Access the Application

Once all services are running:

- **Frontend Application**: http://localhost:3000
- **API Gateway**: http://localhost:3000/api-docs (Swagger UI)
- **User Service**: http://localhost:3001
- **AI Service**: http://localhost:3002
- **Moderation Service**: http://localhost:3003
- **Recommendation Service**: http://localhost:3004
- **Notification Service**: http://localhost:3005
- **Fact Check Service**: http://localhost:3006

### Infrastructure Services

- **PostgreSQL**: localhost:5432
  - Database: `unite_dev`
  - User: `unite`
  - Password: `unite`
- **Redis**: localhost:6379
- **LocalStack (AWS emulation)**: localhost:4566
- **MailHog (Email testing)**: http://localhost:8025
- **Jaeger (Tracing)**: http://localhost:16686
- **Qdrant (Vector DB)**: http://localhost:6333

## Manual Setup (Alternative)

If you prefer to start services step-by-step:

### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update these key values:
# DATABASE_URL=postgresql://unite:unite@localhost:5432/unite_dev
# AWS_ENDPOINT_URL=http://localhost:4566
# AWS_ACCESS_KEY_ID=test
# AWS_SECRET_ACCESS_KEY=test
# JWT_SECRET=your-secure-secret-here
```

### 2. Start Infrastructure

```bash
# Start Docker services
docker compose up -d

# Verify services are healthy
docker compose ps
```

### 3. Database Setup

```bash
# Run migrations
cd packages/db-models
DATABASE_URL="postgresql://unite:unite@localhost:5432/unite_dev" npx prisma migrate deploy
cd ../..
```

### 4. Start Application Services

```bash
# Set environment variables and start all services
export DATABASE_URL="postgresql://unite:unite@localhost:5432/unite_dev"
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export JWT_SECRET="demo-jwt-secret-change-in-production-12345"

# Start all services in parallel
pnpm -r --parallel dev
```

## Troubleshooting

### Services won't start

**Issue**: Services fail to start due to missing environment variables

**Solution**: Ensure `.env` file exists and has correct values. Run `./scripts/start-demo.sh` which sets up defaults automatically.

### Database connection errors

**Issue**: `Error: P1001: Can't reach database server`

**Solution**: 
1. Check if PostgreSQL container is running: `docker compose ps`
2. Verify DATABASE_URL in `.env` matches container credentials
3. Restart infrastructure: `docker compose down && docker compose up -d`

### Port already in use

**Issue**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
1. Find the process using the port: `lsof -i :3000`
2. Kill the process: `kill <PID>`
3. Or use different ports by setting `PORT` environment variable for each service

### User service fails with S3 errors

**Issue**: `Cannot read properties of undefined (reading 'get')`

**Solution**: Ensure AWS/LocalStack configuration is set:
```bash
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
```

### Qdrant version mismatch

**Issue**: `Client version 1.16.2 is incompatible with server version 1.7.4`

**Solution**: This is a warning and won't prevent the service from working. To fix, you can either:
1. Update Qdrant Docker image to latest version in `docker-compose.yml`
2. Or downgrade the Qdrant client in the service

## Development Workflow

### Running Tests

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# All tests
pnpm test
```

### Linting and Type Checking

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
pnpm db:studio

# Create a new migration
pnpm db:migrate

# Seed database with demo data
pnpm db:seed
```

## Stopping the Demo Environment

### Stop Services

Press `Ctrl+C` in the terminal running `pnpm -r --parallel dev`

### Stop Infrastructure

```bash
# Stop Docker services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Architecture Overview

The ReasonBridge platform uses a microservices architecture:

- **Frontend**: React 18 + Vite + TypeScript
- **API Gateway**: NestJS + Fastify (central routing)
- **User Service**: Authentication, profiles, verification
- **Discussion Service**: Topics, propositions, responses
- **AI Service**: Bedrock integration, common ground detection
- **Moderation Service**: Content moderation, appeals
- **Notification Service**: Real-time notifications
- **Fact Check Service**: Claim verification
- **Recommendation Service**: Content recommendations

### Infrastructure

- **PostgreSQL 15**: Primary database with Prisma ORM
- **Redis 7**: Caching and pub/sub
- **LocalStack**: AWS services emulation (S3, SQS, SNS)
- **Qdrant**: Vector database for embeddings
- **MailHog**: Email testing
- **Jaeger**: Distributed tracing

## Next Steps

1. Explore the frontend at http://localhost:3000
2. Check API documentation at http://localhost:3000/api-docs
3. Try creating an account and exploring features
4. Review the codebase structure in `CLAUDE.md`
5. Check out feature specifications in `specs/` directory

## Support

For issues or questions:
- Check `CLAUDE.md` for architecture details
- Review `README.md` in the root directory
- Check existing issues on GitHub
- Create a new issue with detailed description

## License

MIT - See LICENSE file for details
