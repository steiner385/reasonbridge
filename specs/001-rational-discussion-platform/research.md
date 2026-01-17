# Research: uniteDiscord Technology Decisions

**Feature**: 001-rational-discussion-platform
**Date**: 2026-01-17
**Status**: Complete

## Executive Summary

This document captures technology decisions for the uniteDiscord platform based on the specified constraints: local development with Jenkins, AWS production deployment with EKS, RDS, and Bedrock.

---

## 1. Backend Framework

**Decision**: NestJS with TypeScript

**Rationale**:
- Native TypeScript support with decorators for clean microservice architecture
- Built-in dependency injection aligns with testability requirements
- First-class support for microservices patterns (message brokers, gRPC, hybrid apps)
- Strong ecosystem for AWS integration (@nestjs/aws-sdk)
- Prisma integration well-documented

**Alternatives Considered**:

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| Express.js | Simple, flexible | No structure, manual DI | Too much boilerplate for 8 services |
| Fastify | Performance | Less mature microservices support | NestJS can use Fastify adapter if needed |
| Go | Performance, K8s native | Team ramp-up, different toolchain | TypeScript consistency with frontend more valuable |

---

## 2. AI Integration Strategy

**Decision**: Amazon Bedrock with Claude models + local lightweight inference

**Rationale**:
- Bedrock provides managed access to Claude (Anthropic) models ideal for nuanced text analysis
- No infrastructure to manage for LLM hosting
- Pay-per-request aligns with variable AI workload
- Local models (via ONNX runtime) for <500ms real-time feedback

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Service                              │
├─────────────────────────────────────────────────────────────┤
│  Real-time Layer (<500ms)         │  Synthesis Layer (<5s)  │
│  ─────────────────────────────    │  ────────────────────── │
│  • Tone detection (local ONNX)    │  • Common ground (Bedrock)│
│  • Fallacy patterns (local)       │  • Moral foundations     │
│  • Claim extraction (local)       │  • Argument translation  │
│  • Confidence scoring             │  • Viewpoint clustering  │
└─────────────────────────────────────────────────────────────┘
```

**Bedrock Configuration**:
- Model: Claude 3 Sonnet (balance of capability/cost)
- Provisioned throughput for consistent latency
- Region: us-east-1 (Bedrock availability)

**Local Model Stack**:
- ONNX Runtime for inference
- DistilBERT fine-tuned for tone classification
- Custom fallacy detection model trained on argumentation datasets

**Alternatives Considered**:

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| OpenAI API | Mature, well-documented | Non-AWS, data residency concerns | Bedrock keeps data in AWS ecosystem |
| Self-hosted LLM | Full control | Operational complexity, GPU costs | Managed service preferred for MVP |
| Hugging Face Inference | Good models | Latency variability | Bedrock SLAs more predictable |

---

## 3. Database Architecture

**Decision**: PostgreSQL 15 on RDS with read replicas

**Rationale**:
- JSONB support for flexible schema evolution (proposition evidence pools, moral foundation profiles)
- Full-text search for topic discovery
- Strong consistency for moderation actions
- RDS handles backups, failover, patching

**Schema Strategy**:
- One database per bounded context (user, discussion, moderation)
- Cross-service queries via API calls, not shared DB
- Read replicas for recommendation service queries

**Indexing Strategy**:
- B-tree indexes on foreign keys and lookup fields
- GIN indexes on JSONB fields and arrays (tags, alignments)
- Partial indexes for active/seeding topics

**Alternatives Considered**:

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| DynamoDB | Serverless, auto-scaling | Complex queries for common ground analysis | Relational queries essential |
| Aurora Serverless | Auto-scaling | Cost unpredictability at scale | Provisioned RDS more predictable |
| MongoDB | Flexible schema | Weaker consistency, joins | Strong consistency needed for moderation |

---

## 4. Caching & Real-time

**Decision**: Redis (ElastiCache) for caching + Socket.io for real-time

**Rationale**:
- Redis handles rate limiting, session storage, and response caching
- ElastiCache provides managed Redis with cluster mode
- Socket.io for WebSocket connections (real-time feedback, live updates)

**Caching Patterns**:

| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| User sessions | 24h | On logout |
| Topic metadata | 5min | On update event |
| Common ground analysis | 1h | On new response |
| Fact-check results | 24h | Manual refresh |
| Rate limit counters | 1min | Auto-expire |

**Real-time Channels**:
- `discussion:{topicId}` - Live responses, alignment updates
- `user:{userId}` - Personal notifications, feedback
- `moderation:queue` - Moderator dashboard updates

---

## 5. Message Queue

**Decision**: Amazon SQS + SNS for event-driven communication

**Rationale**:
- Native AWS integration, no additional infrastructure
- SNS for fan-out (one event, multiple subscribers)
- SQS for reliable queue processing with DLQ support
- FIFO queues for order-sensitive events (moderation actions)

**Event Flow**:

```
Publisher → SNS Topic → SQS Queues → Consumer Services
                      ↓
              (fan-out to multiple queues)
```

**Alternatives Considered**:

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| Kafka | High throughput, replay | Operational complexity | SQS/SNS simpler for event volumes expected |
| RabbitMQ | Feature-rich | Self-managed | AWS-managed preferred |
| EventBridge | Native AWS events | Less flexible routing | SNS/SQS more familiar pattern |

---

## 6. Frontend Architecture

**Decision**: React 18 + TanStack Query + Zustand + Tailwind CSS

**Rationale**:
- React 18 concurrent features for responsive UI during AI feedback
- TanStack Query for server state with optimistic updates
- Zustand for minimal client state (no Redux boilerplate)
- Tailwind for rapid UI development with design system

**Component Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Page Components                          │
│  (TopicPage, ProfilePage, OnboardingPage)                   │
├─────────────────────────────────────────────────────────────┤
│                   Feature Components                         │
│  (DiscussionThread, PropositionCard, ConsensusMeter)        │
├─────────────────────────────────────────────────────────────┤
│                      UI Primitives                           │
│  (Button, Input, Modal, Card - design system)               │
└─────────────────────────────────────────────────────────────┘
```

**State Management**:
- Server state: TanStack Query (topics, responses, analysis)
- UI state: Zustand (modals, compose draft, view mode)
- URL state: React Router (topic ID, filters)

---

## 7. Authentication & Identity

**Decision**: AWS Cognito for auth + custom verification service

**Rationale**:
- Cognito handles OAuth (Google, Apple), email/password, MFA
- Built-in JWT tokens work with API Gateway
- Custom service for enhanced verification (phone, ID) and trust scoring

**Auth Flow**:

```
User → Cognito (OAuth/email) → JWT → API Gateway → Services
                                          ↓
                                   user-service (profile, trust)
```

**Verification Tiers**:

| Level | Requirements | Badge |
|-------|--------------|-------|
| Basic | Email verified | None |
| Enhanced | Phone verified | ✓ |
| Verified Human | ID verification (third-party) | ✓✓ |

---

## 8. Infrastructure as Code

**Decision**: AWS CDK (TypeScript) + Helm for Kubernetes

**Rationale**:
- CDK uses same language as application (TypeScript)
- Type-safe infrastructure definitions
- Helm for Kubernetes-specific resources (services, deployments)

**Stack Organization**:

| CDK Stack | Resources |
|-----------|-----------|
| NetworkStack | VPC, subnets, security groups |
| DataStack | RDS, ElastiCache, S3 buckets |
| EksStack | EKS cluster, node groups |
| BedrockStack | IAM roles, model access |
| CiCdStack | ECR repositories, IAM for Jenkins |

---

## 9. CI/CD Pipeline

**Decision**: Jenkins (local) + GitHub Actions (cloud backup)

**Rationale**:
- Jenkins on local dev server for primary CI/CD
- GitHub Actions as backup for cloud-based builds
- Pipeline stages: lint → test → build → deploy

**Jenkins Pipeline Stages**:

```
1. Checkout
2. Install dependencies (pnpm)
3. Lint (ESLint + Prettier check)
4. Type check (tsc --noEmit)
5. Unit tests (Jest)
6. Integration tests (Testcontainers)
7. Contract tests (Pact)
8. Build Docker images
9. Push to ECR
10. Deploy to EKS (Helm upgrade)
11. E2E tests (Playwright against staging)
12. Promote to production (manual gate)
```

---

## 10. Observability

**Decision**: AWS CloudWatch + X-Ray + Prometheus/Grafana

**Rationale**:
- CloudWatch for logs and basic metrics (AWS native)
- X-Ray for distributed tracing across services
- Prometheus/Grafana for detailed application metrics

**Key Metrics**:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API p95 latency | <200ms | >500ms |
| AI feedback latency | <500ms | >1s |
| Error rate | <0.1% | >1% |
| AI confidence avg | >80% | <70% |
| Moderation queue depth | <100 | >500 |

---

## 11. Security Considerations

**Decision Points**:

| Concern | Approach |
|---------|----------|
| Data at rest | RDS encryption, S3 encryption |
| Data in transit | TLS 1.3 everywhere |
| Secrets | AWS Secrets Manager, K8s secrets |
| Rate limiting | Redis-based, per-user and per-IP |
| Bot detection | CAPTCHA (hCaptcha), behavior analysis |
| PII handling | Minimal storage, user data export/delete |

---

## 12. Local Development Environment

**Decision**: Docker Compose with LocalStack for AWS services

**Components**:

```yaml
# docker-compose.yml services
- postgres:15      # RDS substitute
- redis:7          # ElastiCache substitute
- localstack       # S3, SQS, SNS emulation
- mailhog          # Email testing
- jaeger           # Local tracing
```

**Developer Workflow**:
1. `make setup` - Install dependencies, start Docker
2. `make dev` - Start all services in watch mode
3. `make test` - Run full test suite
4. `make e2e` - Run Playwright tests locally

---

## 13. Testing Strategy (TDD Implementation)

**Decision**: Test-Driven Development with comprehensive coverage across all test types

### Test Framework Selection

| Test Type | Framework | Rationale |
|-----------|-----------|-----------|
| Unit Tests | Vitest | Fast, ESM-native, Jest-compatible API, excellent TypeScript support |
| Integration Tests | Supertest + Testcontainers | Real HTTP testing, containerized dependencies |
| E2E Tests | Playwright | Cross-browser, excellent async handling, accessibility built-in |
| Contract Tests | Pact + OpenAPI | Consumer-driven contracts, schema validation |
| Performance Tests | k6 | JavaScript-based, easy CI integration |

### Test Pyramid Distribution

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← Playwright (critical paths)
                    │   (~10% tests)  │  ← 6 user stories × 3-4 scenarios each
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │    Integration Tests        │  ← Supertest + Testcontainers
              │      (~30% tests)           │  ← All API endpoints, DB operations
              └──────────────┬──────────────┘
                             │
    ┌────────────────────────┴────────────────────────┐
    │              Unit Tests (~60% tests)            │  ← Vitest
    │  Services, utilities, components, hooks         │
    └─────────────────────────────────────────────────┘
```

### TDD Workflow per User Story

Each user story follows this test-first development flow:

```
1. Write E2E test (failing) → Defines acceptance criteria
2. Write integration tests (failing) → Defines API contracts
3. Write unit tests (failing) → Defines service behavior
4. Implement code → Make tests pass
5. Refactor → Keep tests green
6. Run full suite → Verify no regressions
```

### Testing Configuration by Service

| Service | Unit Coverage Target | Integration Pattern | E2E Scenarios |
|---------|---------------------|---------------------|---------------|
| API Gateway | 80% | Supertest + MSW | Auth flows |
| Discussion Service | 85% | Testcontainers (Postgres) | Topic CRUD, responses |
| AI Service | 90% | Mock LLM responses | Feedback display |
| User Service | 80% | Testcontainers (Postgres) | Profile, verification |
| Moderation Service | 85% | Testcontainers + fixtures | Moderation workflow |
| Recommendation Service | 75% | Mock data | Discovery flows |

### Mocking Strategy

| Dependency | Unit Test Mock | Integration Test Approach |
|------------|----------------|---------------------------|
| Database (Postgres) | Prisma mock client | Testcontainers postgres |
| Cache (Redis) | In-memory mock | Testcontainers redis |
| LLM (Bedrock) | MSW handler | MSW handler with fixtures |
| OAuth Providers | MSW handler | MSW handler |
| Fact-Check APIs | MSW handler | MSW handler with fixtures |
| Message Queue (SQS) | LocalStack mock | LocalStack in Docker |

### Test Data Management

**Fixture Strategy**:
```typescript
// Shared fixtures for consistent test data
const fixtures = {
  users: {
    verified: { id: 'user-1', verificationLevel: 'verified', trustScore: { ability: 80, benevolence: 75, integrity: 90 } },
    basic: { id: 'user-2', verificationLevel: 'basic', trustScore: { ability: 50, benevolence: 50, integrity: 50 } },
    bot: { id: 'user-3', verificationLevel: 'none', botScore: 0.95 },
  },
  discussions: {
    active: { id: 'disc-1', status: 'active', propositionCount: 5 },
    seeding: { id: 'disc-2', status: 'seeding', propositionCount: 2 },
  },
};
```

**Factory Pattern**:
```typescript
// Dynamic test data generation
const createUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  displayName: faker.person.fullName(),
  verificationLevel: 'basic',
  ...overrides,
});
```

### AI Testing Patterns

**Real-time AI (Local Models)**:
```typescript
// Unit test for bias detector
describe('BiasDetector', () => {
  it('should detect ad hominem pattern', async () => {
    const result = await biasDetector.analyze("You're wrong because you're stupid");
    expect(result.patterns).toContainEqual(
      expect.objectContaining({ type: 'ad_hominem', confidence: expect.any(Number) })
    );
    expect(result.patterns[0].confidence).toBeGreaterThan(0.8);
  });

  it('should complete within latency target', async () => {
    const start = performance.now();
    await biasDetector.analyze('Sample text for analysis');
    expect(performance.now() - start).toBeLessThan(100);
  });
});
```

**Cloud LLM (Bedrock)**:
```typescript
// Integration test with mocked Bedrock
describe('CommonGroundAnalyzer', () => {
  beforeAll(() => {
    server.use(
      http.post('https://bedrock-runtime.*.amazonaws.com/model/*/invoke', () => {
        return HttpResponse.json(mockBedrockResponse);
      })
    );
  });

  it('should return valid common ground analysis', async () => {
    const result = await analyzer.generateAnalysis(discussionId);
    expect(CommonGroundAnalysisSchema.safeParse(result).success).toBe(true);
    expect(result.agreementZones).toBeDefined();
    expect(result.genuineDisagreements).toBeDefined();
  });
});
```

### Accessibility Testing

**Automated WCAG 2.2 AA Checks**:
```typescript
// Playwright accessibility test
test.describe('Accessibility', () => {
  test('Discussion page meets WCAG 2.2 AA', async ({ page }) => {
    await page.goto('/discussions/test-discussion');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('AI feedback is announced to screen readers', async ({ page }) => {
    await page.goto('/discussions/test-discussion/compose');
    await page.fill('[data-testid="response-input"]', 'You are wrong because...');

    // Verify ARIA live region updates
    const feedback = page.locator('[role="alert"][aria-live="polite"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute('aria-label', expect.stringContaining('AI Assistant'));
  });

  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/discussions/test-discussion');

    // Tab through all interactive elements
    const focusableElements = await page.locator('button, a, input, [tabindex="0"]').all();
    for (const element of focusableElements) {
      await element.focus();
      await expect(element).toBeFocused();
    }
  });
});
```

### Performance Testing

**k6 Load Test Configuration**:
```javascript
// k6 load test for API endpoints
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up
    { duration: '3m', target: 1000 },  // Sustained load
    { duration: '1m', target: 10000 }, // Peak load (SC-014)
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // NFR-004
    http_req_failed: ['rate<0.01'],     // <1% error rate
  },
};

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/discussions`],
    ['GET', `${BASE_URL}/discussions/${DISCUSSION_ID}`],
  ]);

  check(responses[0], {
    'discussions list status is 200': (r) => r.status === 200,
    'discussions list under 100ms': (r) => r.timings.duration < 100,
  });
}
```

### Contract Testing

**OpenAPI Validation**:
```typescript
// API response contract validation
describe('API Contracts', () => {
  const apiSpec = loadOpenAPISpec('./contracts/api.yaml');

  it('GET /discussions matches OpenAPI schema', async () => {
    const response = await request(app).get('/discussions');
    const validation = validateAgainstSchema(response.body, apiSpec.paths['/discussions'].get.responses['200']);
    expect(validation.valid).toBe(true);
  });

  it('Error responses match error schema', async () => {
    const response = await request(app).get('/discussions/non-existent');
    const validation = validateAgainstSchema(response.body, apiSpec.components.schemas.ErrorResponse);
    expect(validation.valid).toBe(true);
    expect(response.body.code).toMatch(/^[A-Z]+_\d{3}$/);
  });
});
```

**Pact Consumer Tests**:
```typescript
// Frontend consumer expectations for AI service
describe('AI Service Consumer Contract', () => {
  it('expects bias analysis response', async () => {
    await provider.addInteraction({
      state: 'text contains potential bias',
      uponReceiving: 'a request for bias analysis',
      withRequest: {
        method: 'POST',
        path: '/analyze/bias',
        body: { text: 'Some potentially biased text' },
      },
      willRespondWith: {
        status: 200,
        body: {
          patterns: like([{ type: 'confirmation_bias', confidence: 0.85, suggestion: 'Consider...' }]),
          overallConfidence: like(0.85),
        },
      },
    });

    const result = await biasAnalysisClient.analyze('Some potentially biased text');
    expect(result.patterns).toBeDefined();
  });
});
```

### CI Integration

**Jenkins Pipeline Test Stages**:
```groovy
stage('Unit Tests') {
  steps {
    sh 'pnpm test:unit --coverage'
  }
  post {
    always {
      publishHTML([
        reportDir: 'coverage',
        reportFiles: 'index.html',
        reportName: 'Coverage Report'
      ])
    }
  }
}

stage('Integration Tests') {
  steps {
    sh 'docker-compose -f docker-compose.test.yml up -d'
    sh 'pnpm test:integration'
    sh 'docker-compose -f docker-compose.test.yml down'
  }
}

stage('Contract Tests') {
  steps {
    sh 'pnpm test:contract'
    sh 'pnpm pact:publish'
  }
}

stage('E2E Tests') {
  when { branch 'main' }
  steps {
    sh 'pnpm playwright install'
    sh 'pnpm test:e2e'
  }
  post {
    always {
      publishHTML([
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'E2E Report'
      ])
    }
  }
}
```

---

## Unresolved Items

None - all technical decisions made based on user-specified constraints (AWS, K8s, RDS, Bedrock).

---

## References

- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
- [TanStack Query](https://tanstack.com/query/latest)
- [AWS CDK TypeScript](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html)
