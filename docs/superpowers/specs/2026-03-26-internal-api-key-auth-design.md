# Internal API Key Authentication Design

**Issue:** #1157 - Add authentication to internal service-to-service endpoints
**Date:** 2026-03-26
**Status:** Approved

## Problem

Internal endpoints are exposed without authentication, relying solely on network isolation. If the internal network is compromised or a service is accidentally exposed, attackers could:

- Send arbitrary SMS messages
- Trigger SLA breach notifications
- Flag users as bots

## Affected Endpoints

| Service | Endpoint | Purpose | Called By |
|---------|----------|---------|-----------|
| notification-service | `POST /internal/sms/verification-code` | Send SMS verification codes | user-service |
| notification-service | `POST /internal/sla-breach` | Alert moderators about SLA breaches | moderation-service |
| moderation-service | `POST /internal/bot-flagged` | Create bot suspicion reports | user-service |

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication method | API Key | Simplest solution, recommended in issue |
| Key scope | Single shared key | Simpler management, sufficient for internal use |
| Rotation support | Yes, two valid keys | Allows gradual rollout during key changes |
| Header format | `Authorization: ApiKey <key>` | Standard header with distinct scheme |
| Guard location | `@reason-bridge/common` | Consistent with JwtAuthGuard, no duplication |

## Solution

### 1. InternalApiKeyGuard

**Location:** `packages/common/src/auth/internal-api-key.guard.ts`

A NestJS guard that validates the API key header on internal endpoints.

**Behavior:**
- Extracts key from `Authorization: ApiKey <key>` header
- Validates against primary key (`INTERNAL_API_KEY`)
- Falls back to secondary key (`INTERNAL_API_KEY_SECONDARY`) for rotation
- Uses timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attacks
- Throws `UnauthorizedException` with clear error message on failure
- Logs unauthorized attempts for security monitoring

**Export:** Add to `packages/common/src/auth/index.ts` and re-export from package root.

### 2. Environment Variables

```bash
# Required - primary API key for internal service communication
INTERNAL_API_KEY=<32+ character random string>

# Optional - secondary key for rotation periods
INTERNAL_API_KEY_SECONDARY=<previous key during rotation>
```

**Key generation example:**
```bash
openssl rand -base64 32
```

### 3. Service Clients

Three clients need to send the API key header:

#### user-service/src/clients/sms.client.ts
- Inject `ConfigService`
- Add `Authorization: ApiKey ${key}` header to POST requests
- Load key from `INTERNAL_API_KEY` environment variable

#### user-service/src/clients/moderation-service.client.ts
- Same pattern as SmsClient

#### moderation-service/src/clients/notification-service.client.ts
- Same pattern as SmsClient

**Client pattern:**
```typescript
constructor(private readonly configService: ConfigService) {
  this.internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');
  if (!this.internalApiKey && process.env['NODE_ENV'] === 'production') {
    throw new Error('INTERNAL_API_KEY is required in production');
  }
}

async callInternalEndpoint(dto: SomeDto): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (this.internalApiKey) {
    headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });
}
```

### 4. Protected Controllers

Apply guard at class level to protect all endpoints:

#### notification-service/src/internal/internal-sms.controller.ts
```typescript
import { InternalApiKeyGuard } from '@reason-bridge/common';

@Controller('internal/sms')
@UseGuards(InternalApiKeyGuard)
export class InternalSmsController { ... }
```

#### notification-service/src/internal/internal-sla-breach.controller.ts
```typescript
@Controller('internal/sla-breach')
@UseGuards(InternalApiKeyGuard)
export class InternalSlaBreachController { ... }
```

#### moderation-service/src/internal/internal-bot-flagged.controller.ts
```typescript
@Controller('internal/bot-flagged')
@UseGuards(InternalApiKeyGuard)
export class InternalBotFlaggedController { ... }
```

## Key Rotation Procedure

1. Generate new key: `openssl rand -base64 32`
2. Set `INTERNAL_API_KEY_SECONDARY` to current `INTERNAL_API_KEY` value
3. Set `INTERNAL_API_KEY` to new key
4. Deploy all services (order doesn't matter - both keys valid)
5. After all services deployed, remove `INTERNAL_API_KEY_SECONDARY`

## Files to Modify

| File | Change |
|------|--------|
| `packages/common/src/auth/internal-api-key.guard.ts` | CREATE - New guard |
| `packages/common/src/auth/index.ts` | Export new guard |
| `services/user-service/src/clients/sms.client.ts` | Add API key header |
| `services/user-service/src/clients/moderation-service.client.ts` | Add API key header |
| `services/moderation-service/src/clients/notification-service.client.ts` | Add API key header |
| `services/notification-service/src/internal/internal-sms.controller.ts` | Add guard |
| `services/notification-service/src/internal/internal-sla-breach.controller.ts` | Add guard |
| `services/moderation-service/src/internal/internal-bot-flagged.controller.ts` | Add guard |
| `.env.example` | Document new environment variables |

## Testing Strategy

1. **Unit tests for InternalApiKeyGuard:**
   - Valid primary key → allows request
   - Valid secondary key → allows request
   - Invalid key → throws UnauthorizedException
   - Missing header → throws UnauthorizedException
   - Malformed header → throws UnauthorizedException

2. **Integration tests for clients:**
   - Verify header is sent with requests
   - Verify behavior when key is not configured (dev mode)

3. **E2E tests:**
   - Existing tests should pass (configure INTERNAL_API_KEY in test env)
   - Add test for rejected request without key

## Security Considerations

- **Timing-safe comparison:** Uses `crypto.timingSafeEqual` to prevent timing attacks
- **Key length:** Recommend 32+ characters (256 bits of entropy)
- **Logging:** Log unauthorized attempts without exposing the provided key
- **Test mode:** Guard can be relaxed in test environment if key not configured
