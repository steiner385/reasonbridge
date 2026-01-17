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

## Unresolved Items

None - all technical decisions made based on user-specified constraints (AWS, K8s, RDS, Bedrock).

---

## References

- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
- [TanStack Query](https://tanstack.com/query/latest)
- [AWS CDK TypeScript](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html)
