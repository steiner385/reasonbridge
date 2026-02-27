# Deployment Guide

This guide covers deploying the ReasonBridge platform to various environments, from local development to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Deployment (Docker Compose)](#local-deployment-docker-compose)
- [CI/CD Pipeline (Jenkins)](#cicd-pipeline-jenkins)
- [Production Deployment](#production-deployment)
- [Health Checks and Monitoring](#health-checks-and-monitoring)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

| Tool              | Version | Purpose                       |
| ----------------- | ------- | ----------------------------- |
| Docker            | 24.x+   | Container runtime             |
| Docker Compose    | 2.x+    | Multi-container orchestration |
| Node.js           | 20 LTS  | Runtime for services          |
| pnpm              | 9.x     | Package manager               |
| PostgreSQL Client | 15.x    | Database access (optional)    |
| Redis CLI         | 7.x     | Cache inspection (optional)   |

### AWS Services (Production)

| Service     | Purpose                        |
| ----------- | ------------------------------ |
| AWS Bedrock | AI model inference (Claude)    |
| AWS Cognito | User authentication (optional) |
| AWS S3      | File storage                   |
| AWS SQS/SNS | Message queuing                |

## Environment Configuration

### Configuration Files

```
.env.example       # Template with all variables
.env               # Local development (gitignored)
.env.test          # Test environment
```

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Core Settings:**

| Variable    | Description       | Example                          |
| ----------- | ----------------- | -------------------------------- |
| `NODE_ENV`  | Environment mode  | `development`, `production`      |
| `LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

**Database:**

| Variable            | Description           | Example                               |
| ------------------- | --------------------- | ------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `POSTGRES_HOST`     | Database host         | `localhost`                           |
| `POSTGRES_PORT`     | Database port         | `5432`                                |
| `POSTGRES_USER`     | Database user         | `reasonbridge`                        |
| `POSTGRES_PASSWORD` | Database password     | (secure value)                        |
| `POSTGRES_DB`       | Database name         | `reasonbridge_dev`                    |

**Cache:**

| Variable     | Description      | Example                  |
| ------------ | ---------------- | ------------------------ |
| `REDIS_URL`  | Redis connection | `redis://localhost:6379` |
| `REDIS_HOST` | Redis host       | `localhost`              |
| `REDIS_PORT` | Redis port       | `6379`                   |

**Authentication:**

| Variable                 | Description        | Example                  |
| ------------------------ | ------------------ | ------------------------ |
| `JWT_SECRET`             | JWT signing secret | (32+ char secure string) |
| `JWT_EXPIRATION`         | Access token TTL   | `15m`                    |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL  | `7d`                     |

**AWS (Production):**

| Variable                | Description      | Example                             |
| ----------------------- | ---------------- | ----------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key   | (from IAM)                          |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key   | (from IAM)                          |
| `AWS_REGION`            | AWS region       | `us-east-1`                         |
| `BEDROCK_DEFAULT_MODEL` | Default AI model | `us.anthropic.claude-3-5-haiku-...` |

### Environment-Specific Configuration

**Development:**

```env
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://reasonbridge:localdev@localhost:5432/reasonbridge_dev
```

**Production:**

```env
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://user:SECURE_PASSWORD@prod-db.example.com:5432/reasonbridge
```

## Local Deployment (Docker Compose)

### Infrastructure Services

Start the required infrastructure:

```bash
# Start all infrastructure services
docker-compose up -d

# Services started:
# - PostgreSQL (5432)
# - Redis (6379)
# - LocalStack (4566) - AWS emulation
# - MailHog (1025/8025) - Email testing
# - Jaeger (16686/4318) - Distributed tracing
# - Qdrant (6333/6334) - Vector database
```

Verify services are healthy:

```bash
docker-compose ps
docker-compose logs postgres  # Check specific service
```

### Application Services

**Build and start all services:**

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm -r --filter="@reason-bridge/*" build

# Initialize database
pnpm --filter=@reason-bridge/db-models exec prisma migrate dev

# Start all services in development mode
pnpm dev
```

**Start individual services:**

```bash
# API Gateway (port 3000)
pnpm --filter=api-gateway dev

# User Service (port 3001)
pnpm --filter=user-service dev

# Discussion Service (port 3007)
pnpm --filter=discussion-service dev

# Frontend (port 5173)
pnpm --filter=frontend dev
```

### Service Ports

| Service                | Port | URL                   |
| ---------------------- | ---- | --------------------- |
| API Gateway            | 3000 | http://localhost:3000 |
| User Service           | 3001 | http://localhost:3001 |
| AI Service             | 3002 | http://localhost:3002 |
| Moderation Service     | 3003 | http://localhost:3003 |
| Notification Service   | 3004 | http://localhost:3004 |
| Fact-Check Service     | 3005 | http://localhost:3005 |
| Recommendation Service | 3006 | http://localhost:3006 |
| Discussion Service     | 3007 | http://localhost:3007 |
| Frontend               | 5173 | http://localhost:5173 |

### Stopping Services

```bash
# Stop Docker infrastructure
docker-compose down

# Stop with volume cleanup (WARNING: deletes data)
docker-compose down -v
```

## CI/CD Pipeline (Jenkins)

### Pipeline Overview

The Jenkins pipeline (`Jenkinsfile`) runs on every push:

```
┌─────────────┐
│  Checkout   │  Clone repository
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

### Branch Protection

The `main` branch requires these status checks:

- `jenkins/lint` - Code quality
- `jenkins/unit-tests` - Unit tests
- `jenkins/integration` - Integration tests
- `jenkins/ci` - Overall pipeline status

### Jenkins Configuration

**Server:** `http://jenkins.reasonbridge.org`

**Agents:**

- runner-1, runner-2: 4GB RAM, general tasks
- runner-3: 6GB RAM, E2E dedicated

**Shared Library:** `github.com/steiner385/reasonbridge-jenkins-lib`

### Triggering Builds

Builds are automatically triggered via GitHub webhook on push. No manual triggering needed.

```bash
# Check build status
gh pr checks <PR-number>

# View build logs
# Jenkins UI → ReasonBridge-ci → [branch-name] → Build Console
```

## Production Deployment

### Docker Production Build

**Build production images:**

```bash
# Build frontend
docker build -f frontend/Dockerfile -t reasonbridge/frontend:latest ./frontend

# Build services
docker build -f services/api-gateway/Dockerfile -t reasonbridge/api-gateway:latest ./services/api-gateway
docker build -f services/user-service/Dockerfile -t reasonbridge/user-service:latest ./services/user-service
# ... repeat for other services
```

**Run with production compose file:**

```bash
# Create production docker-compose.prod.yml with:
# - Production environment variables
# - Resource limits
# - Restart policies
# - Health checks

docker-compose -f docker-compose.prod.yml up -d
```

### Database Migrations (Production)

**IMPORTANT:** Always backup before migrating.

```bash
# Backup database
pg_dump -h prod-db.example.com -U reasonbridge reasonbridge > backup_$(date +%Y%m%d).sql

# Run migrations
DATABASE_URL="postgresql://..." pnpm --filter=@reason-bridge/db-models exec prisma migrate deploy

# Verify migration
DATABASE_URL="postgresql://..." pnpm --filter=@reason-bridge/db-models exec prisma migrate status
```

### SSL/TLS Configuration

Production deployments require TLS. Configure via:

1. **Reverse proxy (recommended):** nginx or Traefik with Let's Encrypt
2. **Load balancer:** AWS ALB, CloudFlare, etc.
3. **Application level:** Configure Node.js HTTPS (less common)

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name api.reasonbridge.org;

    ssl_certificate /etc/letsencrypt/live/reasonbridge.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reasonbridge.org/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Checklist

Before deploying to production:

- [ ] Strong `JWT_SECRET` (32+ characters, randomly generated)
- [ ] Database credentials rotated from development
- [ ] AWS credentials with minimal required permissions
- [ ] CORS origins restricted to production domains
- [ ] TLS/SSL configured
- [ ] Rate limiting enabled
- [ ] Secrets not in environment files (use secrets manager)
- [ ] Log level set to `info` or `warn` (not `debug`)
- [ ] Health checks configured
- [ ] Monitoring and alerting set up

## Health Checks and Monitoring

### Health Endpoints

Each service exposes health endpoints:

| Endpoint            | Purpose                        |
| ------------------- | ------------------------------ |
| `GET /health`       | Basic liveness check           |
| `GET /health/ready` | Readiness check (dependencies) |
| `GET /metrics`      | Prometheus metrics             |

**Example health check:**

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-02-18T12:00:00.000Z"}

curl http://localhost:3000/health/ready
# {"status":"ok","services":{"postgres":"ok","redis":"ok"}}
```

### Metrics

The API Gateway exposes Prometheus-compatible metrics at `/metrics`:

- Request count by endpoint and status
- Response time percentiles (p50, p95, p99)
- Error rates by service
- Circuit breaker states

### Circuit Breaker Monitoring

View circuit breaker status:

```bash
curl http://localhost:3000/resilience/stats
# Returns state (closed/open/half-open) for each upstream service
```

### Logging

Services output structured JSON logs:

```json
{
  "level": "info",
  "timestamp": "2026-02-18T12:00:00.000Z",
  "correlationId": "abc-123",
  "service": "api-gateway",
  "message": "Request completed",
  "method": "GET",
  "path": "/api/topics",
  "statusCode": 200,
  "duration": 45
}
```

Aggregate logs with:

- **Development:** `docker-compose logs -f`
- **Production:** ELK stack, CloudWatch Logs, Datadog, etc.

## Rollback Procedures

### Application Rollback

**Docker deployment:**

```bash
# Tag current version before deploying
docker tag reasonbridge/api-gateway:latest reasonbridge/api-gateway:rollback-$(date +%Y%m%d)

# Deploy new version
docker-compose -f docker-compose.prod.yml up -d

# If issues, rollback
docker tag reasonbridge/api-gateway:rollback-20260218 reasonbridge/api-gateway:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

**Prisma migration rollback:**

```bash
# List migrations
pnpm --filter=@reason-bridge/db-models exec prisma migrate status

# Rollback last migration (development only)
pnpm --filter=@reason-bridge/db-models exec prisma migrate reset

# Production: Restore from backup
psql -h prod-db.example.com -U reasonbridge reasonbridge < backup_20260218.sql
```

### Git Rollback

```bash
# Revert last commit
git revert HEAD

# Or reset to specific commit (careful with shared branches)
git reset --hard <commit-sha>
```

## Troubleshooting

### Common Issues

**Issue:** Service fails to start with "ECONNREFUSED"

```bash
# Check if dependencies are running
docker-compose ps
docker-compose logs postgres
docker-compose logs redis

# Verify connection
nc -zv localhost 5432  # PostgreSQL
nc -zv localhost 6379  # Redis
```

**Issue:** Database migration fails

```bash
# Check migration status
pnpm --filter=@reason-bridge/db-models exec prisma migrate status

# View migration history
pnpm --filter=@reason-bridge/db-models exec prisma migrate resolve

# Reset (development only)
pnpm --filter=@reason-bridge/db-models exec prisma migrate reset
```

**Issue:** Out of memory (OOM) in Docker

```bash
# Check container memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          memory: 512M
```

**Issue:** SSL certificate issues

```bash
# Test certificate
openssl s_client -connect api.reasonbridge.org:443 -servername api.reasonbridge.org

# Check expiration
echo | openssl s_client -connect api.reasonbridge.org:443 2>/dev/null | openssl x509 -noout -dates
```

**Issue:** High latency or timeouts

```bash
# Check circuit breaker status
curl http://localhost:3000/resilience/stats

# Check metrics for slow endpoints
curl http://localhost:3000/metrics | grep http_request_duration

# Check database slow queries
# Enable pg_stat_statements in PostgreSQL
```

### Getting Help

1. Check [Architecture Documentation](./ARCHITECTURE.md)
2. Review [Developer Guide](./DEVELOPER.md)
3. Check Jenkins build logs
4. Search [GitHub Issues](https://github.com/steiner385/reasonbridge/issues)

### Useful Commands

```bash
# Check all service health
for port in 3000 3001 3002 3003 3004 3005 3006 3007; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status' 2>/dev/null || echo 'DOWN')"
done

# View all container logs
docker-compose logs -f --tail=100

# Restart specific service
docker-compose restart api-gateway

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -f
```
