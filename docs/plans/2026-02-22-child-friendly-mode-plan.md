# Child-Friendly Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement child-friendly mode with full COPPA, GDPR Article 8, AADC, and Australia OSA compliance across 4 phases.

**Architecture:** Extend existing user-service (compliance), moderation-service (child content queue), discussion-service (filtering), and notification-service (parent alerts). No new microservices. Leverage existing ParentalConsentService, ComplianceService, and mature content filtering.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React 18, Tailwind CSS, AWS SES, Bedrock/Perspective API

---

## Phase 1: Core Compliance (~15 tasks)

### Task 1: Add ComplianceAuditLog Model

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma` (append after line 1141)

**Step 1: Add the ComplianceAuditLog model to schema**

Add to end of schema.prisma:

```prisma
// ============================================================================
// Child Safety & Compliance Models
// ============================================================================

/// Audit log for regulatory compliance actions (COPPA, GDPR, AADC)
model ComplianceAuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  action    String   @db.VarChar(50) // AGE_VERIFIED, CONSENT_REQUESTED, CONSENT_VERIFIED, CONSENT_WITHDRAWN, DATA_DELETION_REQUESTED
  metadata  Json     @default("{}") // { region, consentAge, ipAddress, userAgent }
  timestamp DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([action, timestamp])
  @@map("compliance_audit_logs")
}
```

**Step 2: Add relation to User model**

Find the User model (around line 17-91) and add the relation:

```prisma
  // Add after other relations in User model
  complianceAuditLogs ComplianceAuditLog[]
```

**Step 3: Generate Prisma client**

Run: `cd packages/db-models && pnpm prisma generate`
Expected: "Generated Prisma Client"

**Step 4: Create migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_compliance_audit_log`
Expected: Migration created and applied

**Step 5: Commit**

```bash
git add packages/db-models/prisma/schema.prisma packages/db-models/prisma/migrations/
git commit -m "feat(db): add ComplianceAuditLog model for regulatory compliance"
```

---

### Task 2: Add lastAgeVerifiedAt Field to User

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma` (User model, around line 50)

**Step 1: Add field to User model**

Find User model and add after `parentConsentStatus`:

```prisma
  /// Timestamp of last age verification (for annual re-verification)
  lastAgeVerifiedAt DateTime?
```

**Step 2: Generate and migrate**

Run: `cd packages/db-models && pnpm prisma generate && pnpm prisma migrate dev --name add_last_age_verified_at`

**Step 3: Commit**

```bash
git add packages/db-models/prisma/
git commit -m "feat(db): add lastAgeVerifiedAt for annual age re-verification"
```

---

### Task 3: Create ComplianceAuditService

**Files:**

- Create: `services/user-service/src/compliance/compliance-audit.service.ts`
- Create: `services/user-service/src/compliance/compliance-audit.service.test.ts`

**Step 1: Write the failing test**

```typescript
// services/user-service/src/compliance/compliance-audit.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceAuditService } from './compliance-audit.service.js';

describe('ComplianceAuditService', () => {
  let service: ComplianceAuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      complianceAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new ComplianceAuditService(mockPrisma);
  });

  describe('logAction', () => {
    it('should create audit log entry with correct data', async () => {
      const userId = 'user-123';
      const action = 'AGE_VERIFIED';
      const metadata = { region: 'US', consentAge: 13 };

      mockPrisma.complianceAuditLog.create.mockResolvedValue({
        id: 'log-1',
        userId,
        action,
        metadata,
        timestamp: new Date(),
      });

      const result = await service.logAction(userId, action, metadata);

      expect(mockPrisma.complianceAuditLog.create).toHaveBeenCalledWith({
        data: { userId, action, metadata },
      });
      expect(result.action).toBe(action);
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit logs for user', async () => {
      const userId = 'user-123';
      const logs = [
        { id: 'log-1', userId, action: 'AGE_VERIFIED', metadata: {}, timestamp: new Date() },
      ];

      mockPrisma.complianceAuditLog.findMany.mockResolvedValue(logs);

      const result = await service.getAuditHistory(userId);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('AGE_VERIFIED');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && pnpm test compliance-audit.service.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

```typescript
// services/user-service/src/compliance/compliance-audit.service.ts
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type ComplianceAction =
  | 'AGE_VERIFIED'
  | 'CONSENT_REQUESTED'
  | 'CONSENT_VERIFIED'
  | 'CONSENT_WITHDRAWN'
  | 'DATA_DELETION_REQUESTED'
  | 'DATA_DELETION_COMPLETED'
  | 'ANNUAL_REVERIFICATION';

export interface AuditMetadata {
  region?: string;
  consentAge?: number;
  ipAddress?: string;
  userAgent?: string;
  parentEmail?: string;
  [key: string]: unknown;
}

@Injectable()
export class ComplianceAuditService {
  private readonly logger = new Logger(ComplianceAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a compliance action for audit trail
   */
  async logAction(userId: string, action: ComplianceAction, metadata: AuditMetadata = {}) {
    const log = await this.prisma.complianceAuditLog.create({
      data: {
        userId,
        action,
        metadata,
      },
    });

    this.logger.log(`Compliance action logged: ${action} for user ${userId}`);
    return log;
  }

  /**
   * Get audit history for a user
   */
  async getAuditHistory(userId: string, limit = 100) {
    return this.prisma.complianceAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type (for compliance reports)
   */
  async getLogsByAction(action: ComplianceAction, startDate?: Date, endDate?: Date) {
    return this.prisma.complianceAuditLog.findMany({
      where: {
        action,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && pnpm test compliance-audit.service.test.ts`
Expected: PASS

**Step 5: Export from index and add to module**

Update `services/user-service/src/compliance/index.ts`:

```typescript
export * from './compliance-audit.service.js';
```

Update `services/user-service/src/compliance/compliance.module.ts` to include the service.

**Step 6: Commit**

```bash
git add services/user-service/src/compliance/
git commit -m "feat(user-service): add ComplianceAuditService for regulatory audit trail"
```

---

### Task 4: Enhance RegionalRules Interface

**Files:**

- Modify: `services/user-service/src/compliance/compliance.service.ts`
- Modify: `services/user-service/src/compliance/compliance.service.test.ts` (if exists, else create)

**Step 1: Write the failing test**

```typescript
// Add to compliance.service.test.ts
describe('getRegionalRules', () => {
  it('should return full rules for US (COPPA)', () => {
    const rules = service.getRegionalRules('US');

    expect(rules.consentAge).toBe(13);
    expect(rules.regulationName).toBe('COPPA');
    expect(rules.allowsDirectMessaging).toBe(false);
    expect(rules.requiresManualModeration).toBe(false);
  });

  it('should return full rules for GB (AADC)', () => {
    const rules = service.getRegionalRules('GB');

    expect(rules.consentAge).toBe(13);
    expect(rules.regulationName).toBe('AADC');
    expect(rules.requiresManualModeration).toBe(true);
  });

  it('should return full rules for AU (OSA)', () => {
    const rules = service.getRegionalRules('AU');

    expect(rules.consentAge).toBe(13);
    expect(rules.regulationName).toBe('OSA');
  });
});
```

**Step 2: Update RegionalRules interface**

```typescript
// In compliance.service.ts, replace existing interface
export interface RegionalRules {
  /** Minimum age for data collection without parental consent */
  consentAge: number;
  /** Whether parental consent is required for users under consent age */
  requiresParentalConsent: boolean;
  /** URL to regional privacy policy */
  privacyPolicyUrl: string;
  /** Name of applicable regulation */
  regulationName: 'COPPA' | 'GDPR' | 'AADC' | 'OSA' | 'PIPEDA' | 'DEFAULT';
  /** Whether direct messaging is allowed for minors */
  allowsDirectMessaging: boolean;
  /** Whether profile is visible to adults */
  allowsProfileVisibility: boolean;
  /** Whether manual moderation is required for child content */
  requiresManualModeration: boolean;
  /** Data retention period in days (0 = indefinite with consent) */
  dataRetentionDays: number;
}
```

**Step 3: Update getRegionalRules method**

```typescript
  /**
   * Get comprehensive regional compliance rules
   */
  getRegionalRules(countryCode: string): RegionalRules {
    const consentAge = this.CONSENT_AGES[countryCode] ?? 16;
    const regulation = this.getRegulationName(countryCode);

    // Base rules
    const rules: RegionalRules = {
      consentAge,
      requiresParentalConsent: true,
      privacyPolicyUrl: `/legal/privacy/${countryCode.toLowerCase()}`,
      regulationName: regulation,
      allowsDirectMessaging: false, // Default: no DMs for minors
      allowsProfileVisibility: false, // Default: profiles hidden from adults
      requiresManualModeration: false,
      dataRetentionDays: 0,
    };

    // Regulation-specific overrides
    switch (regulation) {
      case 'AADC':
        rules.requiresManualModeration = true; // UK requires enhanced protection
        break;
      case 'GDPR':
        rules.dataRetentionDays = 365; // GDPR data minimization
        break;
      case 'OSA':
        rules.requiresManualModeration = true; // Australia duty of care
        break;
    }

    return rules;
  }

  private getRegulationName(countryCode: string): RegionalRules['regulationName'] {
    if (countryCode === 'US') return 'COPPA';
    if (countryCode === 'GB') return 'AADC';
    if (countryCode === 'AU') return 'OSA';
    if (countryCode === 'CA') return 'PIPEDA';
    if (this.isEUCountry(countryCode)) return 'GDPR';
    return 'DEFAULT';
  }

  private isEUCountry(countryCode: string): boolean {
    const euCountries = ['DE', 'FR', 'IT', 'NL', 'PL', 'ES', 'BE', 'AT', 'SE', 'DK',
      'FI', 'IE', 'PT', 'GR', 'CZ', 'HU', 'RO', 'BG', 'SK', 'HR', 'SI', 'LT', 'LV',
      'EE', 'CY', 'LU', 'MT'];
    return euCountries.includes(countryCode);
  }
```

**Step 4: Run tests**

Run: `cd services/user-service && pnpm test compliance.service`
Expected: PASS

**Step 5: Commit**

```bash
git add services/user-service/src/compliance/
git commit -m "feat(user-service): enhance RegionalRules with full compliance properties"
```

---

### Task 5: Integrate Audit Logging into AgeVerificationService

**Files:**

- Modify: `services/user-service/src/compliance/age-verification.service.ts`
- Modify: `services/user-service/src/compliance/age-verification.service.test.ts`

**Step 1: Update test to verify audit logging**

```typescript
// Add to age-verification.service.test.ts
it('should log AGE_VERIFIED action to audit trail', async () => {
  // ... existing setup

  await service.verifyAge(userId, birthDate, 'US');

  expect(mockAuditService.logAction).toHaveBeenCalledWith(
    userId,
    'AGE_VERIFIED',
    expect.objectContaining({ region: 'US' }),
  );
});
```

**Step 2: Inject ComplianceAuditService**

```typescript
// In age-verification.service.ts constructor
constructor(
  private readonly prisma: PrismaService,
  private readonly complianceService: ComplianceService,
  private readonly auditService: ComplianceAuditService, // Add this
) {}
```

**Step 3: Add audit logging to verifyAge method**

```typescript
// After updating user in verifyAge method
await this.auditService.logAction(userId, 'AGE_VERIFIED', {
  region: countryCode,
  consentAge: rules.consentAge,
  calculatedAge: age,
  isMinor,
  requiresConsent: isMinor && age < rules.consentAge,
});
```

**Step 4: Update lastAgeVerifiedAt**

```typescript
// In the prisma.user.update call, add:
lastAgeVerifiedAt: new Date(),
```

**Step 5: Run tests and commit**

Run: `cd services/user-service && pnpm test age-verification`
Expected: PASS

```bash
git add services/user-service/src/compliance/
git commit -m "feat(user-service): integrate audit logging into AgeVerificationService"
```

---

### Task 6: Integrate Audit Logging into ParentalConsentService

**Files:**

- Modify: `services/user-service/src/compliance/parental-consent.service.ts`

**Step 1: Add audit logging for consent actions**

Inject `ComplianceAuditService` and log these actions:

- `CONSENT_REQUESTED` in `initiateConsent()`
- `CONSENT_VERIFIED` in `verifyConsent()`
- `CONSENT_WITHDRAWN` in `withdrawConsent()`

**Step 2: Update each method**

```typescript
// In initiateConsent, after creating consent record:
await this.auditService.logAction(userId, 'CONSENT_REQUESTED', {
  parentEmail,
  region: user.declaredCountry,
});

// In verifyConsent, after marking verified:
await this.auditService.logAction(consent.userId, 'CONSENT_VERIFIED', {
  ipAddress,
  verifiedAt: new Date().toISOString(),
});

// In withdrawConsent, after setting status to WITHDRAWN:
await this.auditService.logAction(userId, 'CONSENT_WITHDRAWN', {
  withdrawnAt: new Date().toISOString(),
  triggersDataDeletion: true,
});
```

**Step 3: Run tests and commit**

```bash
git add services/user-service/src/compliance/
git commit -m "feat(user-service): add audit logging to ParentalConsentService"
```

---

### Task 7: Create Annual Age Re-verification Job

**Files:**

- Create: `services/user-service/src/compliance/age-reverification.job.ts`
- Create: `services/user-service/src/compliance/age-reverification.job.test.ts`

**Step 1: Write the failing test**

```typescript
// age-reverification.job.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgeReverificationJob } from './age-reverification.job.js';

describe('AgeReverificationJob', () => {
  let job: AgeReverificationJob;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    job = new AgeReverificationJob(mockPrisma);
  });

  it('should find users needing re-verification (lastAgeVerifiedAt > 365 days)', async () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1', lastAgeVerifiedAt: oldDate, isMinor: true },
    ]);

    const users = await job.findUsersNeedingReverification();

    expect(users).toHaveLength(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isMinor: true,
          lastAgeVerifiedAt: expect.any(Object),
        }),
      }),
    );
  });

  it('should flag users for re-verification on next login', async () => {
    await job.flagForReverification(['user-1', 'user-2']);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-1', 'user-2'] } },
      data: { requiresAgeReverification: true },
    });
  });
});
```

**Step 2: Add field to User model (if not exists)**

```prisma
  /// Flag indicating user needs to re-verify age on next login
  requiresAgeReverification Boolean @default(false)
```

**Step 3: Implement the job**

```typescript
// age-reverification.job.ts
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AgeReverificationJob {
  private readonly logger = new Logger(AgeReverificationJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run daily at 3 AM to find users needing annual re-verification
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('Starting age re-verification check...');
    const users = await this.findUsersNeedingReverification();

    if (users.length > 0) {
      const userIds = users.map((u) => u.id);
      await this.flagForReverification(userIds);
      this.logger.log(`Flagged ${users.length} users for age re-verification`);
    }
  }

  async findUsersNeedingReverification() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.prisma.user.findMany({
      where: {
        isMinor: true,
        lastAgeVerifiedAt: {
          lt: oneYearAgo,
        },
        requiresAgeReverification: false,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        lastAgeVerifiedAt: true,
      },
    });
  }

  async flagForReverification(userIds: string[]) {
    return this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { requiresAgeReverification: true },
    });
  }
}
```

**Step 4: Run tests and commit**

```bash
git add packages/db-models/prisma/ services/user-service/src/compliance/
git commit -m "feat(user-service): add annual age re-verification job"
```

---

### Task 8: Add Privacy Policy Display to Consent Page

**Files:**

- Create: `frontend/src/pages/ParentalConsent/PrivacyPolicySummary.tsx`
- Modify: `frontend/src/pages/ParentalConsent/VerifyConsent.tsx`

**Step 1: Create age-appropriate privacy summary component**

```typescript
// frontend/src/pages/ParentalConsent/PrivacyPolicySummary.tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PrivacyPolicySummaryProps {
  childName: string;
  regulation: string;
}

export function PrivacyPolicySummary({ childName, regulation }: PrivacyPolicySummaryProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">What We Collect About {childName}</h3>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-green-500">✓</span>
          <span><strong>Username</strong> - How they appear to others (no real name required)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500">✓</span>
          <span><strong>Age</strong> - To apply appropriate safety settings</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500">✓</span>
          <span><strong>Your email</strong> - So we can contact you about their account</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500">✓</span>
          <span><strong>Discussion activity</strong> - Topics they join and responses they write</span>
        </li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-4">What We DON'T Do</h3>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-red-500">✗</span>
          <span>Show ads or track for advertising</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-red-500">✗</span>
          <span>Share data with third parties</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-red-500">✗</span>
          <span>Allow direct messaging with strangers</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-red-500">✗</span>
          <span>Show their profile to adult users</span>
        </li>
      </ul>

      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        This summary is provided under {regulation} requirements.
        <a href="/legal/privacy/children" className="underline ml-1">
          Read full children's privacy policy
        </a>
      </p>
    </div>
  );
}
```

**Step 2: Integrate into consent verification page**

Import and render `PrivacyPolicySummary` before the consent checkbox.

**Step 3: Commit**

```bash
git add frontend/src/pages/ParentalConsent/
git commit -m "feat(frontend): add age-appropriate privacy summary to consent page"
```

---

### Task 9-15: Remaining Phase 1 Tasks

Continue with similar TDD pattern for:

- **Task 9:** Consent withdrawal triggers data deletion request
- **Task 10:** Weekly activity digest email template
- **Task 11:** Parent digest scheduler in notification-service
- **Task 12:** GeoIP fallback service
- **Task 13:** Compliance report generation endpoint
- **Task 14:** Phase 1 integration tests
- **Task 15:** Phase 1 E2E tests

---

## Phase 2: Content Safety (~12 tasks)

### Task 16: Add ChildContentReviewQueue Model

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add enums and model**

```prisma
enum ChildReviewStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  ESCALATED
}

enum ReviewPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model ChildContentReviewQueue {
  id              String            @id @default(uuid()) @db.Uuid
  responseId      String            @unique @db.Uuid
  topicId         String            @db.Uuid
  authorId        String            @db.Uuid
  content         String            @db.Text
  status          ChildReviewStatus @default(PENDING)
  priority        ReviewPriority    @default(NORMAL)
  aiFlags         Json?
  reviewedById    String?           @db.Uuid
  reviewedAt      DateTime?
  decision        String?           @db.VarChar(20)
  rejectionReason String?           @db.Text
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  response  Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  topic     DiscussionTopic @relation(fields: [topicId], references: [id])
  author    User @relation("QueueAuthor", fields: [authorId], references: [id])
  reviewer  User? @relation("QueueReviewer", fields: [reviewedById], references: [id])

  @@index([status, priority, createdAt])
  @@index([topicId])
  @@index([authorId])
  @@map("child_content_review_queue")
}
```

**Step 2: Generate and migrate**

**Step 3: Commit**

---

### Task 17: Create ChildContentModerationService

**Files:**

- Create: `services/moderation-service/src/services/child-content-moderation.service.ts`
- Create: `services/moderation-service/src/services/child-content-moderation.service.test.ts`

**Step 1: Write failing tests**

```typescript
describe('ChildContentModerationService', () => {
  describe('queueForReview', () => {
    it('should create queue entry for response in child-accessible topic', async () => {
      // ...
    });

    it('should set priority to URGENT if AI flags grooming patterns', async () => {
      // ...
    });
  });

  describe('approveContent', () => {
    it('should mark response as approved and make visible', async () => {
      // ...
    });
  });

  describe('rejectContent', () => {
    it('should mark response as rejected with child-friendly feedback', async () => {
      // ...
    });
  });
});
```

**Step 2: Implement service**

```typescript
@Injectable()
export class ChildContentModerationService {
  async queueForReview(
    responseId: string,
    topicId: string,
    authorId: string,
    content: string,
  ): Promise<void>;
  async approveContent(queueId: string, moderatorId: string): Promise<void>;
  async rejectContent(queueId: string, moderatorId: string, reason: string): Promise<void>;
  async escalate(queueId: string, reason: string): Promise<void>;
  async getQueueStats(): Promise<QueueStats>;
  async getPendingItems(limit?: number): Promise<QueueItem[]>;
}
```

**Step 3: Run tests and commit**

---

### Task 18-21: Grooming Detection

- **Task 18:** Create GroomingDetectorService in ai-service
- **Task 19:** Define grooming pattern rules
- **Task 20:** Integrate with content screening
- **Task 21:** Add URGENT escalation for high-risk flags

---

### Task 22-24: Queue Routing

- **Task 22:** Modify discussion-service to route child content to queue
- **Task 23:** Add response status PENDING_REVIEW
- **Task 24:** Hide pending responses from UI until approved

---

### Task 25-27: Moderator SLA

- **Task 25:** Create SLA monitoring job
- **Task 26:** Auto-escalate stale items
- **Task 27:** Admin notification for SLA breaches

---

## Phase 3: UX Layer (~14 tasks)

### Task 28: Create ChildSafetyContext

**Files:**

- Create: `frontend/src/contexts/ChildSafetyContext.tsx`
- Create: `frontend/src/contexts/ChildSafetyContext.test.tsx`

**Step 1: Write failing test**

```typescript
describe('ChildSafetyContext', () => {
  it('should detect child mode from user profile', () => {
    // ...
  });

  it('should restrict features for minors', () => {
    // ...
  });

  it('should show panic button for minors', () => {
    // ...
  });
});
```

**Step 2: Implement context**

```typescript
interface ChildSafetyState {
  isChildMode: boolean;
  uiTheme: 'standard' | 'child-friendly';
  restrictedFeatures: string[];
  showPanicButton: boolean;
}

export const ChildSafetyContext = createContext<ChildSafetyState | null>(null);

export function ChildSafetyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const state: ChildSafetyState = useMemo(() => ({
    isChildMode: user?.isMinor ?? false,
    uiTheme: user?.isMinor ? 'child-friendly' : 'standard',
    restrictedFeatures: user?.isMinor ? ['DM', 'USER_SEARCH', 'PROFILE_EDIT', 'SOCIAL_LINKS'] : [],
    showPanicButton: user?.isMinor ?? false,
  }), [user]);

  return (
    <ChildSafetyContext.Provider value={state}>
      {children}
    </ChildSafetyContext.Provider>
  );
}
```

---

### Task 29-31: Panic Button

- **Task 29:** Create PanicButton component
- **Task 30:** Create SafetyReport API endpoint
- **Task 31:** Integrate panic button into app layout

---

### Task 32-35: Parental Dashboard

- **Task 32:** Create ParentalDashboard page
- **Task 33:** Activity timeline component
- **Task 34:** Settings management (email prefs, limits)
- **Task 35:** Consent withdrawal flow

---

### Task 36-41: Child-Friendly UI

- **Task 36:** Child-friendly color palette
- **Task 37:** Larger typography variant
- **Task 38:** Simplified navigation
- **Task 39:** Hide restricted features
- **Task 40:** Safe space indicator badge
- **Task 41:** Feature restriction guards

---

## Phase 4: Privacy & Reporting (~10 tasks)

### Task 42-44: Cookie-less Sessions

- **Task 42:** Detect minor in auth middleware
- **Task 43:** Disable tracking scripts for minors
- **Task 44:** Session-only tokens for minors

---

### Task 45-47: Data Deletion

- **Task 45:** Create DataDeletionRequest model
- **Task 46:** Create DataDeletionService
- **Task 47:** Implement 48-hour deletion job

---

### Task 48-50: CSAM Reporting

- **Task 48:** Create CsamReport model
- **Task 49:** Evidence preservation service
- **Task 50:** Admin reporting interface

---

### Task 51: Final Integration

- **Task 51:** Full E2E test suite for child safety

---

## Execution Checklist

- [ ] Phase 1: Core Compliance (Tasks 1-15)
- [ ] Phase 2: Content Safety (Tasks 16-27)
- [ ] Phase 3: UX Layer (Tasks 28-41)
- [ ] Phase 4: Privacy & Reporting (Tasks 42-51)

Each phase can be shipped independently after passing all tests.
