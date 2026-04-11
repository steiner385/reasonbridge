# Production Readiness Checklist

This document provides a comprehensive checklist for production deployment and operational procedures for the ReasonBridge platform.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Database Migration Strategy](#database-migration-strategy)
- [Secret Management](#secret-management)
- [Audit Logging](#audit-logging)
- [GDPR/COPPA Compliance](#gdprcoppa-compliance)
- [Monitoring & Alerting](#monitoring--alerting)
- [Incident Response](#incident-response)

---

## Pre-Deployment Checklist

### Infrastructure

- [ ] PostgreSQL 15.x provisioned with automated backups
- [ ] Redis 7.x configured with persistence (AOF or RDB)
- [ ] Load balancer configured with health checks
- [ ] TLS/SSL certificates installed and auto-renewal configured
- [ ] DNS records configured (A, CNAME, CAA)
- [ ] CDN configured for static assets

### Security

- [ ] JWT_SECRET: 256-bit random string (32+ characters)
- [ ] Database credentials: Unique per environment, rotated from development
- [ ] AWS IAM: Minimal required permissions (principle of least privilege)
- [ ] CORS: Restricted to production domains only
- [ ] Rate limiting: Verified and enabled (see `security.config.ts`)
- [ ] Helmet security headers: Enabled (OWASP compliant)
- [ ] Secrets: Stored in secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Environment files: NOT deployed (use environment variables or secrets manager)

### Application

- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info (not debug)
- [ ] Error stack traces: Disabled in production responses
- [ ] Health endpoints: `/health` and `/health/ready` responding
- [ ] Swagger/API docs: Disabled or restricted to internal network

### Database

- [ ] Connection pooling: Configured (default 10 connections per service)
- [ ] Indexes: Verified for common queries
- [ ] Migrations: All applied successfully
- [ ] Backup: Automated daily backups configured
- [ ] Point-in-time recovery: Enabled

---

## Database Migration Strategy

### Pre-Migration Checklist

Before running any production migration:

1. **Backup the database**
   ```bash
   pg_dump -h $PROD_DB_HOST -U $PROD_DB_USER $PROD_DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migration in staging**
   - Apply migration to staging environment first
   - Run integration tests against staging
   - Verify application functionality

3. **Review migration SQL**
   ```bash
   pnpm --filter=@reason-bridge/db-models exec prisma migrate diff \
     --from-schema-datamodel ./prisma/schema.prisma \
     --to-migrations ./prisma/migrations \
     --script
   ```

4. **Schedule maintenance window** (for breaking changes)
   - Notify users of planned downtime
   - Have rollback plan ready

### Running Migrations

**Production deployment:**
```bash
# Always use 'deploy' (not 'dev') in production
DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter=@reason-bridge/db-models exec prisma migrate deploy
```

**Verify migration status:**
```bash
DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter=@reason-bridge/db-models exec prisma migrate status
```

### Rollback Procedures

#### Option 1: Restore from Backup (Recommended for Data-Affecting Migrations)

```bash
# Stop application services
docker-compose -f docker-compose.prod.yml stop

# Restore database
psql -h $PROD_DB_HOST -U $PROD_DB_USER $PROD_DB_NAME < backup_YYYYMMDD_HHMMSS.sql

# Deploy previous application version
docker tag reasonbridge/api-gateway:rollback reasonbridge/api-gateway:latest
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: Manual Reversal (Schema-Only Changes)

For additive migrations (new tables, columns), create a reversal migration:

```bash
# Create reversal migration
pnpm --filter=@reason-bridge/db-models exec prisma migrate diff \
  --from-schema-datamodel ./prisma/schema.prisma \
  --to-schema-datasource ./prisma/schema.prisma \
  --script > reversal.sql

# Review and apply manually
psql -h $PROD_DB_HOST -U $PROD_DB_USER $PROD_DB_NAME < reversal.sql
```

#### Option 3: Mark Migration as Rolled Back

If migration was partially applied:

```bash
# Mark migration as rolled back (doesn't modify database)
DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter=@reason-bridge/db-models exec prisma migrate resolve --rolled-back <migration_name>
```

### Migration Best Practices

1. **Make migrations backward-compatible** when possible
   - Add new columns as nullable first
   - Deploy application that handles both old and new schema
   - Backfill data
   - Make column required in subsequent migration

2. **Avoid destructive migrations during business hours**
   - DROP TABLE, DROP COLUMN, type changes
   - Schedule during low-traffic windows

3. **Test with production-like data volumes**
   - Large table migrations can lock tables
   - Use `CREATE INDEX CONCURRENTLY` for indexes

---

## Secret Management

### Secret Inventory

| Secret | Purpose | Rotation Frequency |
|--------|---------|-------------------|
| JWT_SECRET | Access token signing | 90 days |
| JWT_REFRESH_SECRET | Refresh token signing | 90 days |
| DATABASE_URL | Database connection | 90 days |
| REDIS_PASSWORD | Cache authentication | 90 days |
| AWS_ACCESS_KEY_ID | AWS API access | 90 days |
| INTERNAL_API_KEY | Service-to-service auth | 30 days |
| COGNITO_CLIENT_SECRET | OAuth authentication | On compromise |

### Secret Rotation Procedure

#### JWT Secret Rotation (Zero-Downtime)

1. **Add new secret alongside old**
   ```bash
   # In secrets manager, add:
   JWT_SECRET_NEW="<new-256-bit-secret>"
   ```

2. **Deploy application with dual-secret support**
   - Application validates tokens with both secrets
   - New tokens signed with new secret
   - Old tokens remain valid until expiration

3. **Wait for token expiration** (default: 15 minutes for access, 7 days for refresh)

4. **Remove old secret**
   ```bash
   # Remove JWT_SECRET_OLD from secrets manager
   # Update JWT_SECRET to the new value
   ```

#### Database Credential Rotation

1. **Create new database user**
   ```sql
   CREATE USER reasonbridge_new WITH PASSWORD 'new_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE reasonbridge TO reasonbridge_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reasonbridge_new;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reasonbridge_new;
   ```

2. **Update connection string** in secrets manager

3. **Rolling restart** of all services

4. **Revoke old user** after verification
   ```sql
   REVOKE ALL PRIVILEGES ON DATABASE reasonbridge FROM reasonbridge_old;
   DROP USER reasonbridge_old;
   ```

### Secret Expiration Monitoring

Add to monitoring system:

```yaml
# alertmanager rule
- alert: SecretExpirationWarning
  expr: secret_expiration_days < 14
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Secret {{ $labels.secret_name }} expires in {{ $value }} days"
```

---

## Audit Logging

### Audit Log Schema

The `ComplianceAuditLog` table (see `packages/db-models/prisma/schema.prisma`) tracks:

- User ID performing action
- Action type (enum: `ComplianceAction`)
- Timestamp
- Metadata (JSON)

### Actions That Require Audit Logging

#### Administrative Actions

| Action | Audit Required | Metadata |
|--------|---------------|----------|
| User ban/suspend | Yes | reason, duration, admin_id |
| Content removal | Yes | content_id, content_type, reason |
| Role change | Yes | old_role, new_role, admin_id |
| Topic lock/unlock | Yes | topic_id, reason |
| Appeal resolution | Yes | appeal_id, decision, admin_id |

#### Compliance Actions

| Action | Audit Required | Metadata |
|--------|---------------|----------|
| Data export request | Yes | user_id, format, requested_at |
| Data deletion request | Yes | user_id, requested_by, scheduled_for |
| Age verification | Yes | user_id, verification_method, result |
| Parental consent | Yes | child_id, parent_id, consent_type |

### Implementation Pattern

```typescript
// Example: Audit logging for user ban
async banUser(adminId: string, userId: string, reason: string, duration: number) {
  // Perform action
  await this.userService.banUser(userId, duration);

  // Log to audit
  await this.prisma.complianceAuditLog.create({
    data: {
      userId,
      action: ComplianceAction.ACCOUNT_SUSPENDED,
      metadata: {
        adminId,
        reason,
        duration,
        timestamp: new Date().toISOString(),
      },
    },
  });
}
```

### Audit Log Retention

- **Retention period**: 7 years (regulatory requirement)
- **Storage**: Archive to cold storage after 1 year
- **Access**: Restricted to compliance officers and legal team

---

## GDPR/COPPA Compliance

### Data Deletion Workflow

The `DataDeletionRequest` model handles deletion requests:

1. **Request received** (user, parent, or automated)
2. **48-hour grace period** (allows cancellation)
3. **Automated deletion** of user data

#### Data to Delete

| Data Category | Tables | Soft Delete | Hard Delete |
|--------------|--------|-------------|-------------|
| User profile | users, user_profiles | Yes | After 30 days |
| Content | topics, responses, propositions | Yes | After 30 days |
| Personal data | email, phone, avatar | No | Immediate |
| Activity logs | activity_events | No | Immediate |
| Preferences | feedback_preferences, notification_settings | No | Immediate |

#### Data to Retain (Anonymized)

| Data Category | Retention Reason |
|--------------|-----------------|
| Aggregate statistics | Platform analytics |
| Compliance audit logs | Legal requirement |
| Financial records | Tax/legal requirement |

### Data Export (Right to Portability)

Users can request their data export:

```bash
# Generate export via API
POST /api/users/me/export
Authorization: Bearer <token>

# Response: Download link valid for 24 hours
{
  "downloadUrl": "https://s3.../exports/user_export_20260218.zip",
  "expiresAt": "2026-02-19T12:00:00Z"
}
```

**Export includes:**
- Profile information (JSON)
- All authored content (JSON)
- Activity history (JSON)
- Preferences (JSON)

### Consent Management

- **Cookie consent**: Tracked via `CookieConsent` banner
- **Marketing consent**: Stored in user preferences
- **Parental consent**: Required for users under 13 (COPPA)

---

## Monitoring & Alerting

### Key Metrics

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| Response time (p95) | > 500ms | > 2000ms |
| Error rate | > 1% | > 5% |
| Database connections | > 80% pool | > 95% pool |
| Memory usage | > 80% | > 95% |
| Disk usage | > 70% | > 90% |
| Circuit breaker open | Any | Multiple services |

### Health Check Endpoints

```bash
# Liveness (is the process running?)
GET /health
# {"status":"ok","timestamp":"2026-02-18T12:00:00.000Z"}

# Readiness (can it serve traffic?)
GET /health/ready
# {"status":"ok","services":{"postgres":"ok","redis":"ok"}}
```

### Alert Configuration

```yaml
# Example: PagerDuty integration
alerting:
  critical:
    - pagerduty: production-oncall
  warning:
    - slack: #ops-alerts
    - email: ops-team@reasonbridge.org
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Service down | 15 minutes | Database unavailable |
| P2 | Major degradation | 1 hour | High error rate |
| P3 | Minor degradation | 4 hours | Single feature broken |
| P4 | Low impact | 24 hours | Cosmetic issue |

### Incident Response Checklist

1. **Acknowledge** incident in monitoring system
2. **Assess** severity and impact
3. **Communicate** status to stakeholders
4. **Mitigate** immediate impact (rollback, disable feature)
5. **Resolve** root cause
6. **Document** in post-mortem

### Runbooks

| Scenario | Runbook Location |
|----------|-----------------|
| Database failover | `docs/runbooks/database-failover.md` |
| Service restart | `docs/runbooks/service-restart.md` |
| Secret rotation | `docs/runbooks/secret-rotation.md` |
| Data restoration | `docs/runbooks/data-restoration.md` |

---

## Appendix: Environment-Specific Configuration

### Production Environment Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/reasonbridge
REDIS_URL=redis://:pass@prod-redis:6379
JWT_SECRET=<256-bit-secret>
AWS_REGION=us-east-1

# Recommended
LOG_LEVEL=info
SKIP_SWAGGER=1
RATE_LIMIT_ENABLED=true
```

### Production Docker Compose (Example)

```yaml
services:
  api-gateway:
    image: reasonbridge/api-gateway:${VERSION}
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

---

**Document Version:** 1.0
**Last Updated:** 2026-04-10
**Next Review:** 2026-07-10
