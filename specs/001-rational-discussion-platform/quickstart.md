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

## Testing (Test-Driven Development)

This project follows TDD principles. All new features and bug fixes should follow the test-first approach.

### TDD Workflow

```
1. Write failing E2E test (acceptance criteria)
2. Write failing integration tests (API contracts)
3. Write failing unit tests (service behavior)
4. Implement minimum code to pass tests
5. Refactor while keeping tests green
6. Run full test suite before commit
```

### Test Commands

| Command | Description | Coverage Requirement |
|---------|-------------|---------------------|
| `pnpm test` | Run all tests | 80% line coverage |
| `pnpm test:unit` | Unit tests (Vitest) | 80% for business logic |
| `pnpm test:integration` | Integration tests | API endpoints covered |
| `pnpm test:e2e` | E2E tests (Playwright) | Critical paths covered |
| `pnpm test:contract` | Contract tests (Pact) | All API boundaries |
| `pnpm test:watch` | Watch mode for TDD | - |
| `pnpm test:coverage` | Generate coverage report | - |

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Watch mode (recommended for TDD)
pnpm test:unit --watch

# Run specific test file
pnpm test:unit src/services/discussion.test.ts

# Run tests matching pattern
pnpm test:unit --testNamePattern="should create proposition"
```

**Writing Unit Tests (TDD Pattern)**:
```typescript
// 1. Start with a failing test
describe('DiscussionService', () => {
  describe('createProposition', () => {
    it('should create proposition with AI-identified source', async () => {
      // Arrange
      const discussionId = 'test-discussion';
      const statement = 'Climate change requires immediate action';

      // Act
      const proposition = await discussionService.createProposition({
        discussionId,
        statement,
        source: 'ai_identified',
      });

      // Assert
      expect(proposition.id).toBeDefined();
      expect(proposition.source).toBe('ai_identified');
      expect(proposition.consensusScore).toBeNull(); // No alignments yet
    });

    it('should require creator_id for user-created propositions', async () => {
      await expect(
        discussionService.createProposition({
          discussionId: 'test',
          statement: 'Test',
          source: 'user_created',
          // Missing creatorId
        })
      ).rejects.toThrow('VALIDATION_001');
    });
  });
});
```

### Integration Tests

```bash
# Start test infrastructure (required)
make docker:test-up

# Run integration tests
pnpm test:integration

# Run with verbose output
pnpm test:integration --verbose

# Clean up after tests
make docker:test-down
```

**Integration Test Setup**:
```typescript
// tests/integration/setup.ts
import { prisma } from '@uniteDiscord/db-models';
import { startTestServer } from './helpers';

beforeAll(async () => {
  await startTestServer();
});

beforeEach(async () => {
  // Clean database between tests
  await prisma.$transaction([
    prisma.feedback.deleteMany(),
    prisma.response.deleteMany(),
    prisma.proposition.deleteMany(),
    prisma.discussionTopic.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**Integration Test Pattern**:
```typescript
describe('POST /discussions/:id/responses', () => {
  it('should create response and trigger AI feedback', async () => {
    // Arrange
    const user = await createTestUser();
    const topic = await createTestTopic();
    const token = await getAuthToken(user);

    // Act
    const response = await request(app)
      .post(`/api/v1/discussions/${topic.id}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'This is a well-reasoned response with sources.',
        citedSources: [{ url: 'https://example.com/study' }],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.feedback).toBeDefined(); // AI feedback included
  });

  it('should return RATE_LIMIT_001 when posting too quickly', async () => {
    const user = await createTestUser();
    const token = await getAuthToken(user);

    // Post 10 responses rapidly
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post(`/api/v1/discussions/${topicId}/responses`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `Response ${i}` });
    }

    // 11th should be rate limited
    const response = await request(app)
      .post(`/api/v1/discussions/${topicId}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'One more' });

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMIT_001');
  });
});
```

### E2E Tests

```bash
# Install Playwright browsers (first time)
pnpm --filter frontend playwright install

# Start the full stack
make dev

# In another terminal, run Playwright
pnpm --filter frontend test:e2e

# Run with UI mode (recommended for debugging)
pnpm --filter frontend test:e2e --ui

# Run specific test file
pnpm --filter frontend test:e2e tests/e2e/discussion.spec.ts

# Run with tracing for debugging
pnpm --filter frontend test:e2e --trace on
```

**E2E Test Pattern (User Story Coverage)**:
```typescript
// tests/e2e/us-02-communication-feedback.spec.ts
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('US-02: Receive Constructive Feedback on Communication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discussions/test-topic');
    await loginAsTestUser(page);
  });

  test('should receive non-blocking suggestion for inflammatory language', async ({ page }) => {
    // Navigate to compose
    await page.click('[data-testid="compose-response"]');

    // Type inflammatory content
    await page.fill('[data-testid="response-input"]',
      "You're completely wrong and anyone who thinks that is an idiot.");

    // AI feedback should appear
    const feedback = page.locator('[data-testid="ai-feedback"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('AI Assistant');
    await expect(feedback).toContainText('personal attack');

    // Feedback should NOT block posting
    await expect(page.locator('[data-testid="submit-response"]')).toBeEnabled();
  });

  test('should acknowledge improvement after revision', async ({ page }) => {
    await page.click('[data-testid="compose-response"]');

    // Type content that triggers feedback
    await page.fill('[data-testid="response-input"]',
      "You're wrong because you're stupid.");

    await expect(page.locator('[data-testid="ai-feedback"]')).toBeVisible();

    // Revise the content
    await page.fill('[data-testid="response-input"]',
      "I disagree with this position because the evidence suggests otherwise.");

    // Positive acknowledgment should appear
    await expect(page.locator('[data-testid="ai-feedback"]'))
      .toContainText('Thanks for taking a moment to refine');
  });

  test('should meet WCAG 2.2 AA accessibility standards', async ({ page }) => {
    await page.click('[data-testid="compose-response"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

### Contract Tests (Pact)

```bash
# Run consumer tests (generates pacts)
pnpm test:pact:consumer

# Run provider verification
pnpm test:pact:provider

# Publish pacts to broker (CI only)
pnpm pact:publish
```

**Consumer Contract Pattern**:
```typescript
// tests/contract/ai-service.consumer.pact.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike } = MatchersV3;

describe('AI Service Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'DiscussionService',
    provider: 'AIService',
  });

  it('returns bias analysis for text with detected patterns', async () => {
    await provider
      .given('text contains ad hominem pattern')
      .uponReceiving('a request for bias analysis')
      .withRequest({
        method: 'POST',
        path: '/analyze/bias',
        headers: { 'Content-Type': 'application/json' },
        body: { text: "You're wrong because you're biased" },
      })
      .willRespondWith({
        status: 200,
        body: {
          patterns: eachLike({
            type: like('ad_hominem'),
            confidence: like(0.92),
            suggestion: like('Consider addressing the argument rather than the person'),
            startOffset: like(0),
            endOffset: like(38),
          }),
          overallConfidence: like(0.92),
          displayToUser: like(true),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const result = await aiClient.analyzeBias(
        "You're wrong because you're biased",
        mockServer.url
      );
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe('ad_hominem');
    });
  });
});
```

### Performance Tests

```bash
# Run k6 load tests (requires k6 installed)
k6 run tests/performance/api-load.js

# Run with specific scenario
k6 run --env SCENARIO=spike tests/performance/api-load.js
```

### Test Coverage Requirements

| Component | Coverage Target | Enforced By |
|-----------|----------------|-------------|
| Services (business logic) | 80% lines | CI gate |
| API Routes | 100% endpoints | Contract tests |
| React Components | 70% lines | Vitest |
| Critical User Paths | 100% | E2E tests |
| Error Scenarios | All error codes | Integration tests |

### CI Pipeline Test Stages

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Lint &    │ → │    Unit     │ → │ Integration │ → │  Contract   │
│  Type Check │   │    Tests    │   │    Tests    │   │    Tests    │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              │
                                                              ▼
                                           ┌─────────────────────────────┐
                                           │      E2E Tests (main only)  │
                                           └─────────────────────────────┘
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
