# Internal API Key Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add API key authentication to internal service-to-service endpoints to prevent unauthorized access.

**Architecture:** Create `InternalApiKeyGuard` in `@reason-bridge/common` that validates `Authorization: ApiKey <key>` headers using timing-safe comparison. Service clients send the key; controllers enforce it via the guard decorator.

**Tech Stack:** NestJS guards, Node.js crypto (timingSafeEqual), ConfigService

**Spec:** `docs/superpowers/specs/2026-03-26-internal-api-key-auth-design.md`

---

## File Structure

| File                                                                           | Purpose                       |
| ------------------------------------------------------------------------------ | ----------------------------- |
| `packages/common/src/auth/internal-api-key.guard.ts`                           | CREATE - Guard implementation |
| `packages/common/src/auth/internal-api-key.guard.test.ts`                      | CREATE - Unit tests           |
| `packages/common/src/auth/index.ts`                                            | MODIFY - Export new guard     |
| `services/user-service/src/clients/sms.client.ts`                              | MODIFY - Add API key header   |
| `services/user-service/src/clients/moderation-service.client.ts`               | MODIFY - Add API key header   |
| `services/moderation-service/src/clients/notification-service.client.ts`       | MODIFY - Add API key header   |
| `services/notification-service/src/internal/internal-sms.controller.ts`        | MODIFY - Add guard            |
| `services/notification-service/src/internal/internal-sla-breach.controller.ts` | MODIFY - Add guard            |
| `services/moderation-service/src/internal/internal-bot-flagged.controller.ts`  | MODIFY - Add guard            |
| `.env.example`                                                                 | MODIFY - Document env vars    |

---

## Task 1: Create InternalApiKeyGuard with Tests

**Files:**

- Create: `packages/common/src/auth/internal-api-key.guard.ts`
- Create: `packages/common/src/auth/internal-api-key.guard.test.ts`
- Modify: `packages/common/src/auth/index.ts`

### Step 1: Write failing tests for the guard

Create `packages/common/src/auth/internal-api-key.guard.test.ts`:

```typescript
/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard.js';

describe('InternalApiKeyGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    const mockRequest = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  describe('when INTERNAL_API_KEY is configured', () => {
    beforeEach(() => {
      process.env['INTERNAL_API_KEY'] = 'test-primary-key-32chars-long!!';
    });

    it('should allow request with valid primary key', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey test-primary-key-32chars-long!!');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request with valid secondary key during rotation', async () => {
      process.env['INTERNAL_API_KEY_SECONDARY'] = 'test-secondary-key-32chars!!';
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey test-secondary-key-32chars!!');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject request with invalid key', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey wrong-key');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with missing Authorization header', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with malformed header (wrong scheme)', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('Bearer test-primary-key-32chars-long!!');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with malformed header (no key)', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when INTERNAL_API_KEY is not configured', () => {
    describe('in test/development mode', () => {
      beforeEach(() => {
        process.env['NODE_ENV'] = 'test';
        delete process.env['INTERNAL_API_KEY'];
      });

      it('should allow request without authentication', async () => {
        const guard = new InternalApiKeyGuard();
        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        process.env['NODE_ENV'] = 'production';
        delete process.env['INTERNAL_API_KEY'];
      });

      it('should throw error during guard construction', () => {
        expect(() => new InternalApiKeyGuard()).toThrow(
          'INTERNAL_API_KEY is required in production',
        );
      });
    });
  });
});
```

### Step 2: Run tests to verify they fail

```bash
cd packages/common && pnpm test internal-api-key.guard.test.ts
```

Expected: FAIL - module not found

### Step 3: Implement InternalApiKeyGuard

Create `packages/common/src/auth/internal-api-key.guard.ts`:

````typescript
/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Guard for internal service-to-service API authentication.
 *
 * Validates `Authorization: ApiKey <key>` header against configured keys.
 * Supports key rotation by accepting both primary and secondary keys.
 *
 * @remarks
 * - Uses timing-safe comparison to prevent timing attacks
 * - In test/development mode, allows requests if no key is configured
 * - In production mode, requires INTERNAL_API_KEY to be set
 *
 * @example
 * ```typescript
 * @Controller('internal/endpoint')
 * @UseGuards(InternalApiKeyGuard)
 * export class InternalController { ... }
 * ```
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private readonly primaryKey: string | undefined;
  private readonly secondaryKey: string | undefined;
  private readonly isDevMode: boolean;

  constructor() {
    this.primaryKey = process.env['INTERNAL_API_KEY'];
    this.secondaryKey = process.env['INTERNAL_API_KEY_SECONDARY'];

    const nodeEnv = process.env['NODE_ENV'];
    this.isDevMode = !nodeEnv || nodeEnv === 'development' || nodeEnv === 'test';

    // Require key in production
    if (!this.primaryKey && !this.isDevMode) {
      throw new Error('INTERNAL_API_KEY is required in production');
    }
  }

  /**
   * Validate the API key from the Authorization header.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow requests in dev mode when no key configured
    if (!this.primaryKey && this.isDevMode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      this.logger.warn('Missing Authorization header on internal endpoint');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const key = this.extractApiKey(authHeader);
    if (!key) {
      this.logger.warn('Malformed Authorization header on internal endpoint');
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: ApiKey <key>',
      );
    }

    if (!this.validateKey(key)) {
      this.logger.warn('Invalid API key on internal endpoint');
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /**
   * Extract API key from Authorization header.
   * Expected format: "ApiKey <key>"
   */
  private extractApiKey(authHeader: string): string | null {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'ApiKey') {
      return null;
    }
    const key = parts[1];
    if (!key || key.trim() === '') {
      return null;
    }
    return key;
  }

  /**
   * Validate key using timing-safe comparison.
   */
  private validateKey(providedKey: string): boolean {
    // Check primary key
    if (this.primaryKey && this.timingSafeCompare(providedKey, this.primaryKey)) {
      return true;
    }

    // Check secondary key (for rotation)
    if (this.secondaryKey && this.timingSafeCompare(providedKey, this.secondaryKey)) {
      return true;
    }

    return false;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private timingSafeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');

      // Lengths must match for timingSafeEqual
      if (bufA.length !== bufB.length) {
        // Still do a comparison to maintain constant time
        timingSafeEqual(bufA, bufA);
        return false;
      }

      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
````

### Step 4: Export the guard

Modify `packages/common/src/auth/index.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication utilities for NestJS services
 *
 * @packageDocumentation
 */

export { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard.js';
export { InternalApiKeyGuard } from './internal-api-key.guard.js';
```

### Step 5: Run tests to verify they pass

```bash
cd packages/common && pnpm test internal-api-key.guard.test.ts
```

Expected: All tests PASS

### Step 6: Rebuild common package

```bash
cd packages/common && pnpm build
```

### Step 7: Commit

```bash
git add packages/common/src/auth/internal-api-key.guard.ts packages/common/src/auth/internal-api-key.guard.test.ts packages/common/src/auth/index.ts
git commit -m "feat(auth): add InternalApiKeyGuard for service-to-service auth (#1157)

- Validates Authorization: ApiKey <key> header
- Supports key rotation with primary/secondary keys
- Uses timing-safe comparison to prevent timing attacks
- Relaxed mode in test/development when key not configured

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update SmsClient to Send API Key

**Files:**

- Modify: `services/user-service/src/clients/sms.client.ts`

### Step 1: Update SmsClient to include API key header

Modify `services/user-service/src/clients/sms.client.ts`:

Add to imports:

```typescript
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
```

Update constructor and add header logic:

```typescript
@Injectable()
export class SmsClient {
  private readonly logger = new Logger(SmsClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string | undefined;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.baseUrl = process.env['NOTIFICATION_SERVICE_URL'] || getServiceUrl('NOTIFICATION_SERVICE');
    this.internalApiKey = this.configService?.get<string>('INTERNAL_API_KEY') ?? process.env['INTERNAL_API_KEY'];
  }

  /**
   * Build headers for internal requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.internalApiKey) {
      headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
    }

    return headers;
  }
```

Update the fetch call in `sendVerificationCode`:

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: this.buildHeaders(),
  body: JSON.stringify({ phoneNumber, code }),
});
```

### Step 2: Run user-service tests

```bash
cd services/user-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/user-service/src/clients/sms.client.ts
git commit -m "feat(user-service): add API key to SmsClient requests (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update ModerationServiceClient to Send API Key

**Files:**

- Modify: `services/user-service/src/clients/moderation-service.client.ts`

### Step 1: Update ModerationServiceClient to include API key header

Apply same pattern as SmsClient:

```typescript
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceUrl } from '@reason-bridge/common';

// ... interfaces remain unchanged ...

@Injectable()
export class ModerationServiceClient {
  private readonly logger = new Logger(ModerationServiceClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string | undefined;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.baseUrl = process.env['MODERATION_SERVICE_URL'] || getServiceUrl('MODERATION_SERVICE');
    this.internalApiKey = this.configService?.get<string>('INTERNAL_API_KEY') ?? process.env['INTERNAL_API_KEY'];
  }

  /**
   * Build headers for internal requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.internalApiKey) {
      headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
    }

    return headers;
  }

  async flagUserAsBot(request: BotFlagRequest): Promise<BotFlagResult | null> {
    const endpoint = `${this.baseUrl}/internal/bot-flagged`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          ...request,
          detectedAt: new Date().toISOString(),
        }),
      });
      // ... rest unchanged
```

### Step 2: Run user-service tests

```bash
cd services/user-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/user-service/src/clients/moderation-service.client.ts
git commit -m "feat(user-service): add API key to ModerationServiceClient requests (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update NotificationServiceClient to Send API Key

**Files:**

- Modify: `services/moderation-service/src/clients/notification-service.client.ts`

### Step 1: Update NotificationServiceClient to include API key header

Apply same pattern:

```typescript
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceUrl } from '@reason-bridge/common';

// ... interfaces remain unchanged ...

@Injectable()
export class NotificationServiceClient {
  private readonly logger = new Logger(NotificationServiceClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string | undefined;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.baseUrl = process.env['NOTIFICATION_SERVICE_URL'] || getServiceUrl('NOTIFICATION_SERVICE');
    this.internalApiKey = this.configService?.get<string>('INTERNAL_API_KEY') ?? process.env['INTERNAL_API_KEY'];
  }

  /**
   * Build headers for internal requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.internalApiKey) {
      headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
    }

    return headers;
  }

  async sendSlaBreachNotification(
    breaches: SlaBreachItem[],
  ): Promise<SlaBreachNotificationResponse | null> {
    if (breaches.length === 0) {
      return { success: true, notificationsSent: 0, broadcastSent: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/internal/sla-breach`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          breaches,
          checkedAt: new Date().toISOString(),
        }),
      });
      // ... rest unchanged
```

### Step 2: Run moderation-service tests

```bash
cd services/moderation-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/moderation-service/src/clients/notification-service.client.ts
git commit -m "feat(moderation-service): add API key to NotificationServiceClient requests (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Guard to InternalSmsController

**Files:**

- Modify: `services/notification-service/src/internal/internal-sms.controller.ts`

### Step 1: Add guard decorator to controller

Update imports and add decorator:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { InternalApiKeyGuard } from '@reason-bridge/common';
import { SmsService, type SmsResult } from '../services/sms.service.js';

// ... DTOs unchanged ...

@Controller('internal/sms')
@UseGuards(InternalApiKeyGuard)
export class InternalSmsController {
  // ... rest unchanged
```

### Step 2: Run notification-service tests

```bash
cd services/notification-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/notification-service/src/internal/internal-sms.controller.ts
git commit -m "feat(notification-service): add InternalApiKeyGuard to SMS controller (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Guard to InternalSlaBreachController

**Files:**

- Modify: `services/notification-service/src/internal/internal-sla-breach.controller.ts`

### Step 1: Add guard decorator to controller

Update imports and add decorator:

```typescript
import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '@reason-bridge/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';

// ... interfaces unchanged ...

@Controller('internal/sla-breach')
@UseGuards(InternalApiKeyGuard)
export class InternalSlaBreachController {
  // ... rest unchanged
```

### Step 2: Run notification-service tests

```bash
cd services/notification-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/notification-service/src/internal/internal-sla-breach.controller.ts
git commit -m "feat(notification-service): add InternalApiKeyGuard to SLA breach controller (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Guard to InternalBotFlaggedController

**Files:**

- Modify: `services/moderation-service/src/internal/internal-bot-flagged.controller.ts`

### Step 1: Add guard decorator to controller

Update imports and add decorator:

```typescript
import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '@reason-bridge/common';
import { PrismaService } from '../prisma/prisma.service.js';

// ... interfaces unchanged ...

@Controller('internal/bot-flagged')
@UseGuards(InternalApiKeyGuard)
export class InternalBotFlaggedController {
  // ... rest unchanged
```

### Step 2: Run moderation-service tests

```bash
cd services/moderation-service && pnpm test
```

Expected: All tests PASS

### Step 3: Commit

```bash
git add services/moderation-service/src/internal/internal-bot-flagged.controller.ts
git commit -m "feat(moderation-service): add InternalApiKeyGuard to bot-flagged controller (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Document Environment Variables

**Files:**

- Modify: `.env.example`

### Step 1: Add internal API key section to .env.example

Add after the "API Keys (Optional Features)" section:

```bash
# =============================================================================
# Internal Service-to-Service Authentication
# =============================================================================
# API key for authenticating internal service-to-service requests
# Generate with: openssl rand -base64 32
# Required in production, optional in development/test
INTERNAL_API_KEY=your_internal_api_key_here

# Secondary key for rotation periods (optional)
# During key rotation, both keys are valid for a transition period
# INTERNAL_API_KEY_SECONDARY=your_previous_key_here
```

### Step 2: Commit

```bash
git add .env.example
git commit -m "docs: document INTERNAL_API_KEY environment variables (#1157)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Run Full Test Suite

### Step 1: Run all unit tests

```bash
pnpm test:unit
```

Expected: All tests PASS

### Step 2: Run linting

```bash
pnpm lint
```

Expected: No errors

---

## Verification Checklist

- [ ] InternalApiKeyGuard created with timing-safe comparison
- [ ] Guard supports primary and secondary keys for rotation
- [ ] Guard relaxes in test/development when key not configured
- [ ] All three service clients send API key header
- [ ] All three internal controllers protected with guard
- [ ] Environment variables documented in .env.example
- [ ] All unit tests pass
- [ ] All integration tests pass
