# Developer Quickstart: uniteDiscord

**Feature**: 001-rational-discussion-platform | **Date**: 2026-01-17

This guide helps developers get the uniteDiscord platform running locally and understand the development workflow.

## Prerequisites

- **Node.js** 20 LTS (use `nvm install 20`)
- **pnpm** 8.x (install: `npm install -g pnpm`)
- **Docker** 24.x+ and **Docker Compose** v2
- **Git** 2.40+
- **AWS CLI** v2 (for deployment, not local dev)

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/uniteDiscord.git
cd uniteDiscord

# Install dependencies
pnpm install

# Start local infrastructure (Postgres, Redis, LocalStack)
make setup

# Run all services in development mode
make dev

# Open the app
open http://localhost:3000
```

## Project Structure

```
uniteDiscord/
├── services/              # Backend microservices
│   ├── api-gateway/       # Request routing, auth
│   ├── user-service/      # Users, verification, trust
│   ├── discussion-service/# Topics, responses, analysis
│   ├── ai-service/        # AI feedback, Bedrock integration
│   ├── moderation-service/# Flags, actions, appeals
│   ├── recommendation-service/
│   ├── notification-service/
│   └── fact-check-service/
├── packages/              # Shared libraries
│   ├── common/            # Types, utilities
│   ├── db-models/         # Prisma schema
│   ├── ai-client/         # Bedrock wrapper
│   ├── event-schemas/     # Async event contracts
│   └── testing-utils/     # Test helpers
├── frontend/              # React SPA
├── infrastructure/        # CDK, Helm, Docker
└── specs/                 # Feature specifications
```

## Development Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install deps, start Docker, run migrations |
| `make dev` | Start all services in watch mode |
| `make test` | Run full test suite |
| `make test:unit` | Run unit tests only |
| `make test:integration` | Run integration tests |
| `make test:e2e` | Run Playwright E2E tests |
| `make lint` | Run ESLint and Prettier check |
| `make lint:fix` | Auto-fix lint issues |
| `make build` | Build all services |
| `make db:migrate` | Run Prisma migrations |
| `make db:studio` | Open Prisma Studio |
| `make docker:up` | Start infrastructure containers |
| `make docker:down` | Stop infrastructure containers |

## Local Infrastructure

Docker Compose provides these services:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching, sessions, rate limiting |
| LocalStack | 4566 | S3, SQS, SNS emulation |
| Mailhog | 8025 | Email testing UI |
| Jaeger | 16686 | Distributed tracing UI |

## Service Ports (Development)

| Service | Port |
|---------|------|
| Frontend | 3000 |
| API Gateway | 4000 |
| User Service | 4001 |
| Discussion Service | 4002 |
| AI Service | 4003 |
| Moderation Service | 4004 |
| Recommendation Service | 4005 |
| Notification Service | 4006 |
| Fact-Check Service | 4007 |

## Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Key variables:

```bash
# Database
DATABASE_URL=postgresql://unite:unite@localhost:5432/unite_dev

# Redis
REDIS_URL=redis://localhost:6379

# AWS (LocalStack for local dev)
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# AI Service (local dev uses mock by default)
AI_MOCK_ENABLED=true
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Auth (local dev uses mock Cognito)
COGNITO_USER_POOL_ID=local_pool
COGNITO_CLIENT_ID=local_client
```

## Running Individual Services

```bash
# Start a specific service
pnpm --filter user-service dev

# Start frontend only
pnpm --filter frontend dev

# Run specific service tests
pnpm --filter discussion-service test
```

## Database Operations

```bash
# Create a new migration
pnpm --filter db-models prisma migrate dev --name add_feature

# Reset database (caution: destroys data)
pnpm --filter db-models prisma migrate reset

# Generate Prisma client after schema changes
pnpm --filter db-models prisma generate

# Seed development data
pnpm --filter db-models db:seed
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Watch mode
pnpm test:unit --watch
```

### Integration Tests

```bash
# Start test infrastructure
make docker:up

# Run integration tests
pnpm test:integration
```

### E2E Tests

```bash
# Start the full stack
make dev

# In another terminal, run Playwright
pnpm --filter frontend test:e2e

# Run with UI
pnpm --filter frontend test:e2e --ui
```

### Contract Tests (Pact)

```bash
# Run consumer tests (generates pacts)
pnpm test:pact:consumer

# Run provider tests (verifies pacts)
pnpm test:pact:provider
```

## AI Service Development

For local development, the AI service runs in mock mode by default. To test with real Bedrock:

1. Configure AWS credentials with Bedrock access
2. Set `AI_MOCK_ENABLED=false` in `.env.local`
3. Ensure you have provisioned throughput or on-demand access

Mock mode returns predictable responses for testing feedback flows.

## Common Tasks

### Adding a New API Endpoint

1. Update OpenAPI spec in `specs/001-rational-discussion-platform/contracts/`
2. Generate types: `pnpm generate:types`
3. Implement controller in service
4. Add unit tests
5. Add Pact consumer test
6. Add integration test

### Adding a New Event

1. Add event schema to `packages/event-schemas/`
2. Generate types: `pnpm generate:events`
3. Implement publisher in source service
4. Implement subscriber(s) in consuming service(s)
5. Add contract test

### Adding a Database Migration

1. Update Prisma schema in `packages/db-models/prisma/schema.prisma`
2. Create migration: `pnpm --filter db-models prisma migrate dev --name description`
3. Update data-model.md if significant change
4. Regenerate types: `pnpm --filter db-models prisma generate`

## Debugging

### Service Logs

```bash
# View logs for all services
make logs

# View logs for specific service
docker-compose logs -f user-service
```

### Database Queries

```bash
# Open Prisma Studio
make db:studio

# Direct psql access
docker-compose exec postgres psql -U unite -d unite_dev
```

### Tracing

Access Jaeger UI at http://localhost:16686 to view distributed traces across services.

## Code Style

- **TypeScript**: Strict mode, no `any` without justification
- **Linting**: ESLint with Airbnb config + Prettier
- **Commits**: Conventional Commits format
- **Tests**: 80% coverage threshold for business logic

Pre-commit hooks run lint and type checks automatically.

## Getting Help

- **Specs**: `specs/001-rational-discussion-platform/` - Feature specification and design docs
- **Plan**: `specs/001-rational-discussion-platform/plan.md` - Implementation plan
- **Data Model**: `specs/001-rational-discussion-platform/data-model.md` - Entity documentation
- **API Contracts**: `specs/001-rational-discussion-platform/contracts/` - OpenAPI specs

## Next Steps

1. Read the [spec.md](./spec.md) to understand feature requirements
2. Review the [plan.md](./plan.md) for implementation approach
3. Check [tasks.md](./tasks.md) (when generated) for work breakdown
4. Run `/speckit.tasks` to generate implementation tasks
