# ReasonBridge Architecture

This document provides a comprehensive overview of the ReasonBridge platform architecture, including microservices design, resilience patterns, and infrastructure components.

## Table of Contents

- [System Overview](#system-overview)
- [Microservices Architecture](#microservices-architecture)
- [API Gateway](#api-gateway)
- [Resilience Patterns](#resilience-patterns)
- [Observability](#observability)
- [Security](#security)
- [Data Layer](#data-layer)
- [Frontend Architecture](#frontend-architecture)
- [Infrastructure](#infrastructure)

## System Overview

ReasonBridge is a rational discussion platform built using a microservices architecture. The system enables constructive discourse through AI-powered analysis, structured argumentation, and evidence-based discussions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Clients                                     │
│                    (Web Browser, Mobile Apps)                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                    │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐ │
│  │   CORS    │ │  Auth    │ │ Rate Limit │ │  Circuit  │ │  Metrics  │ │
│  │  Headers  │ │Middleware│ │ Throttler  │ │  Breaker  │ │Interceptor│ │
│  └───────────┘ └──────────┘ └────────────┘ └───────────┘ └───────────┘ │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ User Service  │      │  Discussion   │      │  AI Service   │
│               │      │   Service     │      │               │
│ - Auth        │      │ - Topics      │      │ - Analysis    │
│ - Profiles    │      │ - Responses   │      │ - Common      │
│ - Trust       │      │ - Threading   │      │   Ground      │
└───────────────┘      └───────────────┘      └───────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │  LocalStack  │  │   Prisma     │ │
│  │  (Primary)   │  │  (Cache/PubSub│  │  (AWS S3/SQS)│  │   (ORM)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Microservices Architecture

### Services Overview

| Service                | Port | Description                                         |
| ---------------------- | ---- | --------------------------------------------------- |
| API Gateway            | 3000 | Central routing, auth, rate limiting, resilience    |
| User Service           | 3001 | User management, authentication, profiles           |
| AI Service             | 3002 | AI-powered analysis (bias detection, common ground) |
| Moderation Service     | 3003 | Content moderation, appeals, reporting              |
| Notification Service   | 3004 | Real-time notifications, email, push                |
| Fact-Check Service     | 3005 | Claim verification, source validation               |
| Recommendation Service | 3006 | Content recommendations, discovery                  |
| Discussion Service     | 3007 | Topics, propositions, responses, threading          |

### Service Communication

**Synchronous Communication:**

- HTTP/REST via API Gateway
- Direct service-to-service calls for internal operations

**Asynchronous Communication:**

- Redis Pub/Sub for real-time events
- AWS SQS/SNS (LocalStack in development) for message queuing

### Shared Packages

```
packages/
├── common/           # Shared utilities, constants, types
├── db-models/        # Prisma schema and database models
├── event-schemas/    # Event type definitions for service communication
├── ai-client/        # AI provider abstraction (OpenAI, Anthropic)
├── shared/           # Cross-cutting concerns (logging, config)
├── testing-utils/    # Shared test utilities
└── test-utils/       # Additional test helpers
```

## API Gateway

The API Gateway (`services/api-gateway`) serves as the central entry point for all client requests, providing:

### Core Features

1. **Request Routing** - Proxies requests to appropriate microservices
2. **Authentication** - JWT validation and user context propagation
3. **Rate Limiting** - Protects against abuse with configurable tiers
4. **Resilience** - Circuit breakers and retry logic for upstream services
5. **Observability** - Request metrics, correlation IDs, logging

### Request Flow

```
Client Request
       │
       ▼
┌──────────────────┐
│ Correlation      │  ← Adds X-Correlation-ID
│ Middleware       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Rate Limiting    │  ← @nestjs/throttler
│ (Throttler)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Metrics          │  ← Captures request duration, status
│ Interceptor      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Proxy Service    │  ← Routes to upstream service
│ + Circuit Breaker│
│ + Retry Logic    │
└────────┬─────────┘
         │
         ▼
   Upstream Service
```

## Resilience Patterns

### Circuit Breaker

Prevents cascade failures when upstream services are unhealthy.

**Implementation:** `services/api-gateway/src/resilience/circuit-breaker.service.ts`

```typescript
// Configuration per service
interface CircuitBreakerConfig {
  name: string;
  timeout: 5000; // 5 second timeout
  errorThresholdPercentage: 50; // Trip at 50% failures
  resetTimeout: 30000; // Try again after 30s
  volumeThreshold: 5; // Min 5 requests before tripping
}
```

**States:**

- **Closed** - Normal operation, requests pass through
- **Open** - Failures exceeded threshold, requests fail fast
- **Half-Open** - Testing if service recovered

### Retry with Exponential Backoff

Automatically retries transient failures with increasing delays.

**Implementation:** `services/api-gateway/src/resilience/retry.util.ts`

```typescript
// Default configuration
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 100, // 100ms
  maxDelay: 5000, // 5 seconds
  backoffFactor: 2, // Exponential multiplier
  jitter: true, // ±25% randomization
};
```

**Retryable Errors:**

- HTTP 5xx (Server errors)
- HTTP 408 (Request Timeout)
- HTTP 429 (Too Many Requests)
- Network errors (ECONNREFUSED, ETIMEDOUT, ECONNRESET)

### Rate Limiting

Configurable rate limiting tiers to protect the system.

**Implementation:** `services/api-gateway/src/config/security.config.ts`

| Tier    | Limit    | Use Case                                |
| ------- | -------- | --------------------------------------- |
| Default | 100/min  | General API access                      |
| Strict  | 10/min   | Expensive operations (AI analysis)      |
| Auth    | 5/min    | Login attempts (brute force protection) |
| API     | 1000/min | Authenticated API users                 |

## Observability

### Metrics

The API Gateway collects metrics via `MetricsInterceptor`:

- **Request count** by endpoint and status
- **Response time** percentiles (p50, p95, p99)
- **Error rates** by service and endpoint
- **Circuit breaker states** per upstream service

**Endpoint:** `GET /metrics` - Prometheus-compatible metrics

### Correlation IDs

Every request is assigned a unique correlation ID (`X-Correlation-ID`) that propagates through all services for distributed tracing.

### Logging

Structured JSON logging with:

- Request/response logging
- Error details with stack traces
- Service communication logs
- Circuit breaker state changes

## Security

### Security Headers

Implemented via `@fastify/helmet`:

| Header                    | Value                           | Purpose                     |
| ------------------------- | ------------------------------- | --------------------------- |
| X-Content-Type-Options    | nosniff                         | Prevent MIME sniffing       |
| X-Frame-Options           | DENY                            | Prevent clickjacking        |
| Referrer-Policy           | strict-origin-when-cross-origin | Control referrer info       |
| X-DNS-Prefetch-Control    | off                             | Privacy protection          |
| Strict-Transport-Security | max-age=31536000                | Force HTTPS (production)    |
| Content-Security-Policy   | Configured                      | XSS protection (production) |

### CORS Configuration

Environment-aware CORS settings:

```typescript
// Production
origin: ['https://reasonbridge.org', 'https://app.reasonbridge.org'];

// Development
origin: ['http://localhost:3000', 'http://localhost:5173'];

// Test
origin: true; // Allow all
```

### Authentication

- JWT-based authentication
- Token refresh mechanism
- Role-based access control (RBAC)
- AWS Cognito integration (optional)

## Data Layer

### PostgreSQL (Primary Database)

- **ORM:** Prisma 5.x
- **Schema Location:** `packages/db-models/prisma/schema.prisma`
- **Key Models:** User, Topic, Response, Proposition, ModerationAction

### Redis (Cache & Pub/Sub)

- Session storage
- Rate limiting counters
- Real-time event distribution
- Query result caching

### LocalStack (AWS Services Emulation)

Development environment for:

- **S3** - File storage (avatars, attachments)
- **SQS** - Message queuing
- **SNS** - Push notifications

## Frontend Architecture

### Technology Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context + hooks
- **Routing:** React Router 6

### Component Structure

```
frontend/src/
├── components/       # Reusable UI components
│   ├── auth/         # Authentication flows
│   ├── topics/       # Discussion topics
│   ├── responses/    # Response threading
│   ├── common-ground/# Agreement visualization
│   └── ui/           # Base primitives
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── lib/              # Utilities and API client
├── pages/            # Route-level components
└── types/            # TypeScript definitions
```

## Infrastructure

### Development Environment

```bash
# Start all services
docker-compose up -d

# Services started:
# - PostgreSQL (5432)
# - Redis (6379)
# - LocalStack (4566)
```

### CI/CD Pipeline (Jenkins)

```
┌─────────────┐
│  Checkout   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Install   │  pnpm install --frozen-lockfile
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │  pnpm -r build
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Lint     │  pnpm lint
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Unit Tests  │  vitest run
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Integration │  Docker + vitest
│   Tests     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  E2E Tests  │  Playwright (main/develop only)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │  (if main branch)
└─────────────┘
```

### Load Testing

k6 load tests are available in `load-tests/`:

```bash
# Smoke test (5 users)
k6 run load-tests/scenarios/health.js

# Load test (100 users)
k6 run -e TEST_TYPE=load load-tests/scenarios/topics.js

# Soak test (10,000 users)
k6 run load-tests/scenarios/soak-10k.js
```

## Configuration

### Environment Variables

Key configuration categories:

| Category    | Examples                             |
| ----------- | ------------------------------------ |
| Application | `NODE_ENV`, `PORT`, `LOG_LEVEL`      |
| Database    | `DATABASE_URL`, `REDIS_URL`          |
| Auth        | `JWT_SECRET`, `COGNITO_*`            |
| Services    | `USER_SERVICE_URL`, `AI_SERVICE_URL` |
| Resilience  | `*_TIMEOUT`, `*_RETRY_ATTEMPTS`      |
| Security    | `ALLOWED_ORIGINS`, `CORS_*`          |

### Service-Specific Timeouts

| Service            | Default Timeout | Retry Attempts |
| ------------------ | --------------- | -------------- |
| User Service       | 5s              | 3              |
| Discussion Service | 5s              | 3              |
| AI Service         | 30s             | 2              |

## Monitoring and Alerting

### Health Checks

Each service exposes:

- `GET /health` - Basic liveness check
- `GET /health/ready` - Readiness check (dependencies)

### Metrics Endpoints

- `GET /metrics` - Prometheus metrics
- `GET /resilience/stats` - Circuit breaker statistics

## Further Reading

- [Developer Setup Guide](./DEVELOPER.md)
- [API Documentation](http://localhost:3000/api-docs)
- [Load Testing Guide](../load-tests/README.md)
- [Security Configuration](../services/api-gateway/src/config/security.config.ts)
