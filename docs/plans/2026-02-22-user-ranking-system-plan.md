# User Ranking & Tiered Access System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a 5-tier user ranking system with domain-specific expertise, credential verification, and tiered topic access control.

**Architecture:** Scheduled batch recalculation with cached UserRank/TopicExpertise tables. Daily cron job recalculates scores. Uses existing Tag model for domain categories. Builds on existing TrustScoreCalculator.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vitest, React, TailwindCSS

---

## Phase 1: Database Schema

### Task 1.1: Add UserRank Model to Prisma Schema

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add TierLevel enum**

Add after line 112 (after UserStatus enum):

```prisma
enum TierLevel {
  NEWCOMER      // Level 1: 0.00 - 0.19
  CONTRIBUTOR   // Level 2: 0.20 - 0.39
  TRUSTED       // Level 3: 0.40 - 0.59
  LEADER        // Level 4: 0.60 - 0.79
  EXPERT        // Level 5: 0.80 - 1.00

  @@map("tier_level")
}
```

**Step 2: Add UserRank model**

Add after TierLevel enum:

```prisma
/// Cached user ranking data, recalculated daily
model UserRank {
  id                 String    @id @default(uuid()) @db.Uuid
  userId             String    @unique @map("user_id") @db.Uuid
  tierLevel          TierLevel @default(NEWCOMER) @map("tier_level")
  compositeScore     Decimal   @default(0.00) @map("composite_score") @db.Decimal(4, 3)
  engagementScore    Decimal   @default(0.00) @map("engagement_score") @db.Decimal(4, 3)
  qualityScore       Decimal   @default(0.00) @map("quality_score") @db.Decimal(4, 3)
  tenureBonus        Decimal   @default(0.00) @map("tenure_bonus") @db.Decimal(4, 3)
  badges             Json      @default("[]")
  lastCalculated     DateTime  @default(now()) @map("last_calculated")
  nextTierThreshold  Decimal   @default(0.20) @map("next_tier_threshold") @db.Decimal(4, 3)
  lastActivityAt     DateTime? @map("last_activity_at")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tierLevel])
  @@index([compositeScore(sort: Desc)])
  @@index([lastCalculated])
  @@map("user_ranks")
}
```

**Step 3: Add relation to User model**

Add to User model relations (after line 80):

```prisma
  // Ranking system (Feature #781)
  userRank              UserRank?
```

**Step 4: Run Prisma format**

Run: `cd packages/db-models && pnpm prisma format`
Expected: Schema formatted successfully

**Step 5: Commit**

```bash
git add packages/db-models/prisma/schema.prisma
git commit -m "feat(db): add UserRank model for tier system #781"
```

---

### Task 1.2: Add TopicExpertise Model

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add ExpertiseLevel enum**

Add after TierLevel enum:

```prisma
enum ExpertiseLevel {
  NOVICE         // 0.00 - 0.24
  FAMILIAR       // 0.25 - 0.49
  KNOWLEDGEABLE  // 0.50 - 0.74
  EXPERT         // 0.75 - 1.00

  @@map("expertise_level")
}
```

**Step 2: Add TopicExpertise model**

```prisma
/// Per-category expertise scores for users
model TopicExpertise {
  id              String         @id @default(uuid()) @db.Uuid
  userId          String         @map("user_id") @db.Uuid
  tagId           String         @map("tag_id") @db.Uuid
  expertiseScore  Decimal        @default(0.00) @map("expertise_score") @db.Decimal(4, 3)
  expertiseLevel  ExpertiseLevel @default(NOVICE) @map("expertise_level")
  responseCount   Int            @default(0) @map("response_count")
  avgQualityScore Decimal        @default(0.00) @map("avg_quality_score") @db.Decimal(4, 3)
  credentialBoost Decimal        @default(0.00) @map("credential_boost") @db.Decimal(4, 3)
  lastActive      DateTime?      @map("last_active")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([userId, tagId])
  @@index([expertiseLevel])
  @@index([expertiseScore(sort: Desc)])
  @@map("topic_expertise")
}
```

**Step 3: Add relations to User and Tag models**

Add to User model:

```prisma
  topicExpertise        TopicExpertise[]
```

Add to Tag model (after line 428):

```prisma
  expertise   TopicExpertise[]
```

**Step 4: Run Prisma format**

Run: `cd packages/db-models && pnpm prisma format`
Expected: Schema formatted successfully

**Step 5: Commit**

```bash
git add packages/db-models/prisma/schema.prisma
git commit -m "feat(db): add TopicExpertise model for domain expertise #781"
```

---

### Task 1.3: Add DomainCredential Model

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add CredentialType and CredentialStatus enums**

```prisma
enum CredentialType {
  ACADEMIC_DOCTORATE
  ACADEMIC_MASTERS
  ACADEMIC_BACHELORS
  PROFESSIONAL_LICENSE
  INDUSTRY_CERTIFICATION
  PUBLICATION

  @@map("credential_type")
}

enum CredentialStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED

  @@map("credential_status")
}
```

**Step 2: Add DomainCredential model**

```prisma
/// User-submitted credentials for domain expertise
model DomainCredential {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  tagId           String           @map("tag_id") @db.Uuid
  type            CredentialType
  title           String           @db.VarChar(200)
  institution     String?          @db.VarChar(200)
  documentUrl     String?          @map("document_url")
  verificationUrl String?          @map("verification_url")
  status          CredentialStatus @default(PENDING)
  reviewedById    String?          @map("reviewed_by_id") @db.Uuid
  reviewNotes     String?          @map("review_notes") @db.Text
  verifiedAt      DateTime?        @map("verified_at")
  expiresAt       DateTime?        @map("expires_at")
  boostValue      Decimal          @default(0.00) @map("boost_value") @db.Decimal(3, 2)
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  // Relations
  user       User  @relation("UserCredentials", fields: [userId], references: [id], onDelete: Cascade)
  tag        Tag   @relation(fields: [tagId], references: [id], onDelete: Cascade)
  reviewedBy User? @relation("CredentialReviewer", fields: [reviewedById], references: [id])

  @@index([userId, tagId])
  @@index([status])
  @@index([expiresAt])
  @@map("domain_credentials")
}
```

**Step 3: Add relations to User and Tag**

Add to User:

```prisma
  credentials           DomainCredential[] @relation("UserCredentials")
  credentialReviews     DomainCredential[] @relation("CredentialReviewer")
```

Add to Tag:

```prisma
  credentials DomainCredential[]
```

**Step 4: Run Prisma format and commit**

```bash
cd packages/db-models && pnpm prisma format
git add packages/db-models/prisma/schema.prisma
git commit -m "feat(db): add DomainCredential model for verified credentials #781"
```

---

### Task 1.4: Add TierAppeal and ProvisionalAccess Models

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add AppealType and AppealStatus enums**

```prisma
enum AppealType {
  GLOBAL_TIER
  DOMAIN_EXPERTISE

  @@map("appeal_type")
}

enum AppealStatus {
  PENDING
  APPROVED
  DENIED

  @@map("appeal_status")
}
```

**Step 2: Add TierAppeal model**

```prisma
/// Appeals for tier/expertise decisions
model TierAppeal {
  id             String       @id @default(uuid()) @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  appealType     AppealType   @map("appeal_type")
  tagId          String?      @map("tag_id") @db.Uuid
  requestedLevel Int          @map("requested_level")
  reason         String       @db.Text
  status         AppealStatus @default(PENDING)
  reviewedById   String?      @map("reviewed_by_id") @db.Uuid
  reviewNotes    String?      @map("review_notes") @db.Text
  createdAt      DateTime     @default(now()) @map("created_at")
  resolvedAt     DateTime?    @map("resolved_at")

  // Relations
  user       User  @relation("UserAppeals", fields: [userId], references: [id], onDelete: Cascade)
  tag        Tag?  @relation(fields: [tagId], references: [id])
  reviewedBy User? @relation("AppealReviewer", fields: [reviewedById], references: [id])

  @@index([userId])
  @@index([status])
  @@map("tier_appeals")
}
```

**Step 3: Add ProvisionalAccessStatus enum and ProvisionalAccess model**

```prisma
enum ProvisionalAccessStatus {
  ACTIVE
  EXPIRED
  REVOKED

  @@map("provisional_access_status")
}

/// Temporary access to tier-restricted topics
model ProvisionalAccess {
  id          String                  @id @default(uuid()) @db.Uuid
  userId      String                  @map("user_id") @db.Uuid
  topicId     String                  @map("topic_id") @db.Uuid
  grantedById String                  @map("granted_by_id") @db.Uuid
  reason      String?                 @db.VarChar(500)
  expiresAt   DateTime                @map("expires_at")
  status      ProvisionalAccessStatus @default(ACTIVE)
  createdAt   DateTime                @default(now()) @map("created_at")

  // Relations
  user      User            @relation("ProvisionalAccessUser", fields: [userId], references: [id], onDelete: Cascade)
  topic     DiscussionTopic @relation(fields: [topicId], references: [id], onDelete: Cascade)
  grantedBy User            @relation("ProvisionalAccessGranter", fields: [grantedById], references: [id])

  @@unique([userId, topicId])
  @@index([expiresAt])
  @@index([status])
  @@map("provisional_access")
}
```

**Step 4: Add relations to User, Tag, and DiscussionTopic**

Add to User:

```prisma
  tierAppeals           TierAppeal[]        @relation("UserAppeals")
  appealReviews         TierAppeal[]        @relation("AppealReviewer")
  provisionalAccess     ProvisionalAccess[] @relation("ProvisionalAccessUser")
  provisionalGrants     ProvisionalAccess[] @relation("ProvisionalAccessGranter")
  canMentor             Boolean             @default(false) @map("can_mentor")
```

Add to Tag:

```prisma
  appeals     TierAppeal[]
```

Add to DiscussionTopic:

```prisma
  provisionalAccess     ProvisionalAccess[]
```

**Step 5: Run Prisma format and commit**

```bash
cd packages/db-models && pnpm prisma format
git add packages/db-models/prisma/schema.prisma
git commit -m "feat(db): add TierAppeal and ProvisionalAccess models #781"
```

---

### Task 1.5: Add Tier Restriction Fields to DiscussionTopic

**Files:**

- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add tier restriction fields to DiscussionTopic model**

Add after line 230 (after `visibility` field):

```prisma
  // Tier access control (Feature #781)
  minimumTierLevel        Int?      @map("minimum_tier_level") // null = open to all
  minimumExpertiseLevel   Int?      @map("minimum_expertise_level")
  requiredTagId           String?   @map("required_tag_id") @db.Uuid
  allowProvisionalAccess  Boolean   @default(true) @map("allow_provisional_access")
```

Add relation for requiredTagId:

```prisma
  requiredTag             Tag?      @relation("TopicRequiredExpertise", fields: [requiredTagId], references: [id])
```

Add to Tag:

```prisma
  requiredByTopics DiscussionTopic[] @relation("TopicRequiredExpertise")
```

**Step 2: Run Prisma format and commit**

```bash
cd packages/db-models && pnpm prisma format
git add packages/db-models/prisma/schema.prisma
git commit -m "feat(db): add tier restriction fields to DiscussionTopic #781"
```

---

### Task 1.6: Generate and Run Migration

**Files:**

- Create: `packages/db-models/prisma/migrations/YYYYMMDDHHMMSS_add_ranking_system/migration.sql`

**Step 1: Generate migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_ranking_system`
Expected: Migration file created

**Step 2: Verify migration ran successfully**

Run: `cd packages/db-models && pnpm prisma migrate status`
Expected: All migrations applied

**Step 3: Regenerate Prisma client**

Run: `cd packages/db-models && pnpm prisma generate`
Expected: Prisma client generated

**Step 4: Commit migration**

```bash
git add packages/db-models/prisma/migrations
git commit -m "feat(db): add ranking system migration #781"
```

---

## Phase 2: Ranking Calculator Service

### Task 2.1: Create RankingCalculator Service - Test First

**Files:**

- Create: `services/user-service/src/ranking/ranking-calculator.service.ts`
- Create: `services/user-service/src/ranking/__tests__/ranking-calculator.service.spec.ts`

**Step 1: Write the failing test**

Create `services/user-service/src/ranking/__tests__/ranking-calculator.service.spec.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingCalculatorService } from '../ranking-calculator.service.js';
import { TrustScoreCalculator } from '../../services/trust-score.calculator.js';

// Mock Prisma
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
  }
  return {
    Prisma: { Decimal: MockDecimal },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

describe('RankingCalculatorService', () => {
  let service: RankingCalculatorService;
  let trustScoreCalculator: TrustScoreCalculator;

  beforeEach(() => {
    trustScoreCalculator = new TrustScoreCalculator();
    service = new RankingCalculatorService(trustScoreCalculator);
  });

  describe('calculateCompositeScore', () => {
    it('should return score between 0 and 1', () => {
      const input = {
        trustAverage: 0.5,
        verificationLevel: 'BASIC' as const,
        engagementScore: 0.3,
        qualityScore: 0.4,
        accountAgeDays: 100,
      };

      const score = service.calculateCompositeScore(input);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should weight trust at 40%', () => {
      const base = {
        verificationLevel: 'BASIC' as const,
        engagementScore: 0,
        qualityScore: 0,
        accountAgeDays: 0,
      };

      const lowTrust = service.calculateCompositeScore({ ...base, trustAverage: 0 });
      const highTrust = service.calculateCompositeScore({ ...base, trustAverage: 1 });

      expect(highTrust - lowTrust).toBeCloseTo(0.4, 2);
    });

    it('should weight verification at 20%', () => {
      const base = {
        trustAverage: 0,
        engagementScore: 0,
        qualityScore: 0,
        accountAgeDays: 0,
      };

      const basic = service.calculateCompositeScore({ ...base, verificationLevel: 'BASIC' });
      const verified = service.calculateCompositeScore({
        ...base,
        verificationLevel: 'VERIFIED_HUMAN',
      });

      // BASIC = 0.2, VERIFIED_HUMAN = 1.0 -> difference = 0.8 * 0.2 = 0.16
      expect(verified - basic).toBeCloseTo(0.16, 2);
    });
  });

  describe('determineTierLevel', () => {
    it('should return NEWCOMER for score 0-0.19', () => {
      expect(service.determineTierLevel(0)).toBe('NEWCOMER');
      expect(service.determineTierLevel(0.19)).toBe('NEWCOMER');
    });

    it('should return CONTRIBUTOR for score 0.20-0.39', () => {
      expect(service.determineTierLevel(0.2)).toBe('CONTRIBUTOR');
      expect(service.determineTierLevel(0.39)).toBe('CONTRIBUTOR');
    });

    it('should return TRUSTED for score 0.40-0.59', () => {
      expect(service.determineTierLevel(0.4)).toBe('TRUSTED');
      expect(service.determineTierLevel(0.59)).toBe('TRUSTED');
    });

    it('should return LEADER for score 0.60-0.79', () => {
      expect(service.determineTierLevel(0.6)).toBe('LEADER');
      expect(service.determineTierLevel(0.79)).toBe('LEADER');
    });

    it('should return EXPERT for score 0.80-1.00', () => {
      expect(service.determineTierLevel(0.8)).toBe('EXPERT');
      expect(service.determineTierLevel(1.0)).toBe('EXPERT');
    });
  });

  describe('getNextTierThreshold', () => {
    it('should return 0.20 for NEWCOMER', () => {
      expect(service.getNextTierThreshold('NEWCOMER')).toBe(0.2);
    });

    it('should return 0.40 for CONTRIBUTOR', () => {
      expect(service.getNextTierThreshold('CONTRIBUTOR')).toBe(0.4);
    });

    it('should return 1.0 for EXPERT (max tier)', () => {
      expect(service.getNextTierThreshold('EXPERT')).toBe(1.0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking-calculator.service.spec.ts`
Expected: FAIL with "Cannot find module '../ranking-calculator.service.js'"

**Step 3: Write minimal implementation**

Create `services/user-service/src/ranking/ranking-calculator.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { TierLevel } from '@prisma/client';
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';

export interface CompositeScoreInput {
  trustAverage: number;
  verificationLevel: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
  engagementScore: number;
  qualityScore: number;
  accountAgeDays: number;
}

/**
 * RankingCalculatorService - Calculates user composite scores and tier levels
 *
 * Formula:
 * compositeScore =
 *   (trustAverage × 0.40) +
 *   (verificationWeight × 0.20) +
 *   (engagementScore × 0.20) +
 *   (qualityScore × 0.15) +
 *   (tenureBonus × 0.05)
 */
@Injectable()
export class RankingCalculatorService {
  private readonly TIER_THRESHOLDS = {
    NEWCOMER: 0,
    CONTRIBUTOR: 0.2,
    TRUSTED: 0.4,
    LEADER: 0.6,
    EXPERT: 0.8,
  };

  private readonly VERIFICATION_WEIGHTS = {
    BASIC: 0.2,
    ENHANCED: 0.6,
    VERIFIED_HUMAN: 1.0,
  };

  constructor(private readonly trustScoreCalculator: TrustScoreCalculator) {}

  /**
   * Calculate the composite score for ranking
   */
  calculateCompositeScore(input: CompositeScoreInput): number {
    const verificationWeight = this.VERIFICATION_WEIGHTS[input.verificationLevel];
    const tenureBonus = Math.min(1.0, input.accountAgeDays / 365);

    const score =
      input.trustAverage * 0.4 +
      verificationWeight * 0.2 +
      input.engagementScore * 0.2 +
      input.qualityScore * 0.15 +
      tenureBonus * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine tier level based on composite score
   */
  determineTierLevel(compositeScore: number): TierLevel {
    if (compositeScore >= 0.8) return TierLevel.EXPERT;
    if (compositeScore >= 0.6) return TierLevel.LEADER;
    if (compositeScore >= 0.4) return TierLevel.TRUSTED;
    if (compositeScore >= 0.2) return TierLevel.CONTRIBUTOR;
    return TierLevel.NEWCOMER;
  }

  /**
   * Get the score threshold needed for the next tier
   */
  getNextTierThreshold(currentTier: TierLevel): number {
    switch (currentTier) {
      case TierLevel.NEWCOMER:
        return 0.2;
      case TierLevel.CONTRIBUTOR:
        return 0.4;
      case TierLevel.TRUSTED:
        return 0.6;
      case TierLevel.LEADER:
        return 0.8;
      case TierLevel.EXPERT:
        return 1.0; // Already at max
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking-calculator.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/user-service/src/ranking/
git commit -m "feat(user-service): add RankingCalculatorService with TDD #781"
```

---

### Task 2.2: Create RankingService - Orchestration Layer

**Files:**

- Create: `services/user-service/src/ranking/ranking.service.ts`
- Create: `services/user-service/src/ranking/__tests__/ranking.service.spec.ts`

**Step 1: Write the failing test**

Create `services/user-service/src/ranking/__tests__/ranking.service.spec.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingService } from '../ranking.service.js';
import { RankingCalculatorService } from '../ranking-calculator.service.js';
import { TrustScoreCalculator } from '../../services/trust-score.calculator.js';

// Mock Prisma
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
  }
  return {
    Prisma: { Decimal: MockDecimal },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

// Mock PrismaService
const mockPrismaService = {
  userRank: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  response: {
    count: vi.fn(),
    aggregate: vi.fn(),
  },
};

describe('RankingService', () => {
  let service: RankingService;
  let calculator: RankingCalculatorService;

  beforeEach(() => {
    vi.clearAllMocks();
    const trustCalculator = new TrustScoreCalculator();
    calculator = new RankingCalculatorService(trustCalculator);
    service = new RankingService(mockPrismaService as never, calculator);
  });

  describe('getUserRank', () => {
    it('should return user rank if exists', async () => {
      const mockRank = {
        id: 'rank-1',
        userId: 'user-1',
        tierLevel: 'CONTRIBUTOR',
        compositeScore: { toNumber: () => 0.35 },
      };
      mockPrismaService.userRank.findUnique.mockResolvedValue(mockRank);

      const result = await service.getUserRank('user-1');

      expect(result).toEqual(mockRank);
      expect(mockPrismaService.userRank.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return null if no rank exists', async () => {
      mockPrismaService.userRank.findUnique.mockResolvedValue(null);

      const result = await service.getUserRank('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getLeaderboard', () => {
    it('should return top users by composite score', async () => {
      const mockLeaderboard = [
        { userId: 'user-1', tierLevel: 'EXPERT', compositeScore: { toNumber: () => 0.9 } },
        { userId: 'user-2', tierLevel: 'LEADER', compositeScore: { toNumber: () => 0.7 } },
      ];
      mockPrismaService.userRank.findMany.mockResolvedValue(mockLeaderboard);

      const result = await service.getLeaderboard(10);

      expect(result).toEqual(mockLeaderboard);
      expect(mockPrismaService.userRank.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { compositeScore: 'desc' },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking.service.spec.ts`
Expected: FAIL with "Cannot find module '../ranking.service.js'"

**Step 3: Write minimal implementation**

Create `services/user-service/src/ranking/ranking.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { Prisma, TierLevel, UserRank } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RankingCalculatorService } from './ranking-calculator.service.js';

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: RankingCalculatorService,
  ) {}

  /**
   * Get a user's current rank
   */
  async getUserRank(userId: string): Promise<UserRank | null> {
    return this.prisma.userRank.findUnique({
      where: { userId },
    });
  }

  /**
   * Get the leaderboard (top users by composite score)
   */
  async getLeaderboard(limit: number = 50): Promise<UserRank[]> {
    return this.prisma.userRank.findMany({
      take: limit,
      orderBy: { compositeScore: 'desc' },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Recalculate and update a user's rank
   */
  async recalculateUserRank(userId: string): Promise<UserRank> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        responses: { select: { id: true, createdAt: true } },
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Calculate trust average
    const trustAverage =
      (user.trustScoreAbility.toNumber() +
        user.trustScoreBenevolence.toNumber() +
        user.trustScoreIntegrity.toNumber()) /
      3;

    // Calculate engagement score (responses / 100, capped at 1)
    const responseCount = user.responses.length;
    const engagementScore = Math.min(1, responseCount / 100);

    // Calculate quality score (placeholder - will integrate with AI feedback)
    const qualityScore = 0.5; // Default for now

    // Calculate account age
    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate composite score
    const compositeScore = this.calculator.calculateCompositeScore({
      trustAverage,
      verificationLevel: user.verificationLevel,
      engagementScore,
      qualityScore,
      accountAgeDays,
    });

    // Determine tier
    const tierLevel = this.calculator.determineTierLevel(compositeScore);
    const nextTierThreshold = this.calculator.getNextTierThreshold(tierLevel);

    // Upsert user rank
    return this.prisma.userRank.upsert({
      where: { userId },
      create: {
        userId,
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        engagementScore: new Prisma.Decimal(engagementScore),
        qualityScore: new Prisma.Decimal(qualityScore),
        tenureBonus: new Prisma.Decimal(Math.min(1, accountAgeDays / 365)),
        nextTierThreshold: new Prisma.Decimal(nextTierThreshold),
        lastActivityAt: user.responses[0]?.createdAt ?? null,
      },
      update: {
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        engagementScore: new Prisma.Decimal(engagementScore),
        qualityScore: new Prisma.Decimal(qualityScore),
        tenureBonus: new Prisma.Decimal(Math.min(1, accountAgeDays / 365)),
        nextTierThreshold: new Prisma.Decimal(nextTierThreshold),
        lastCalculated: new Date(),
        lastActivityAt: user.responses[0]?.createdAt ?? null,
      },
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/user-service/src/ranking/
git commit -m "feat(user-service): add RankingService for rank orchestration #781"
```

---

### Task 2.3: Create Ranking Module and DTOs

**Files:**

- Create: `services/user-service/src/ranking/ranking.module.ts`
- Create: `services/user-service/src/ranking/dto/user-rank.dto.ts`
- Create: `services/user-service/src/ranking/dto/leaderboard.dto.ts`
- Create: `services/user-service/src/ranking/index.ts`

**Step 1: Create DTOs**

Create `services/user-service/src/ranking/dto/user-rank.dto.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierLevel } from '@prisma/client';

export class UserRankDto {
  userId: string;
  tierLevel: TierLevel;
  tierName: string;
  tierNumber: number;
  compositeScore: number;
  engagementScore: number;
  qualityScore: number;
  tenureBonus: number;
  nextTierThreshold: number;
  progressToNextTier: number; // Percentage 0-100
  badges: string[];
  lastCalculated: Date;

  constructor(rank: {
    userId: string;
    tierLevel: TierLevel;
    compositeScore: { toNumber: () => number };
    engagementScore: { toNumber: () => number };
    qualityScore: { toNumber: () => number };
    tenureBonus: { toNumber: () => number };
    nextTierThreshold: { toNumber: () => number };
    badges: string[];
    lastCalculated: Date;
  }) {
    this.userId = rank.userId;
    this.tierLevel = rank.tierLevel;
    this.tierName = this.getTierName(rank.tierLevel);
    this.tierNumber = this.getTierNumber(rank.tierLevel);
    this.compositeScore = rank.compositeScore.toNumber();
    this.engagementScore = rank.engagementScore.toNumber();
    this.qualityScore = rank.qualityScore.toNumber();
    this.tenureBonus = rank.tenureBonus.toNumber();
    this.nextTierThreshold = rank.nextTierThreshold.toNumber();
    this.progressToNextTier = this.calculateProgress();
    this.badges = rank.badges as string[];
    this.lastCalculated = rank.lastCalculated;
  }

  private getTierName(tier: TierLevel): string {
    const names: Record<TierLevel, string> = {
      NEWCOMER: 'Newcomer',
      CONTRIBUTOR: 'Contributor',
      TRUSTED: 'Trusted',
      LEADER: 'Leader',
      EXPERT: 'Expert',
    };
    return names[tier];
  }

  private getTierNumber(tier: TierLevel): number {
    const numbers: Record<TierLevel, number> = {
      NEWCOMER: 1,
      CONTRIBUTOR: 2,
      TRUSTED: 3,
      LEADER: 4,
      EXPERT: 5,
    };
    return numbers[tier];
  }

  private calculateProgress(): number {
    const thresholds: Record<TierLevel, { min: number; max: number }> = {
      NEWCOMER: { min: 0, max: 0.2 },
      CONTRIBUTOR: { min: 0.2, max: 0.4 },
      TRUSTED: { min: 0.4, max: 0.6 },
      LEADER: { min: 0.6, max: 0.8 },
      EXPERT: { min: 0.8, max: 1.0 },
    };

    const range = thresholds[this.tierLevel];
    const progress = (this.compositeScore - range.min) / (range.max - range.min);
    return Math.round(Math.max(0, Math.min(100, progress * 100)));
  }
}
```

Create `services/user-service/src/ranking/dto/leaderboard.dto.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierLevel } from '@prisma/client';

export class LeaderboardEntryDto {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  tierLevel: TierLevel;
  tierName: string;
  compositeScore: number;

  constructor(
    entry: {
      userId: string;
      tierLevel: TierLevel;
      compositeScore: { toNumber: () => number };
      user: { displayName: string | null; avatarUrl: string | null };
    },
    rank: number,
  ) {
    this.rank = rank;
    this.userId = entry.userId;
    this.displayName = entry.user.displayName;
    this.avatarUrl = entry.user.avatarUrl;
    this.tierLevel = entry.tierLevel;
    this.tierName = this.getTierName(entry.tierLevel);
    this.compositeScore = entry.compositeScore.toNumber();
  }

  private getTierName(tier: TierLevel): string {
    const names: Record<TierLevel, string> = {
      NEWCOMER: 'Newcomer',
      CONTRIBUTOR: 'Contributor',
      TRUSTED: 'Trusted',
      LEADER: 'Leader',
      EXPERT: 'Expert',
    };
    return names[tier];
  }
}

export class LeaderboardDto {
  entries: LeaderboardEntryDto[];
  total: number;

  constructor(entries: LeaderboardEntryDto[], total: number) {
    this.entries = entries;
    this.total = total;
  }
}
```

**Step 2: Create module**

Create `services/user-service/src/ranking/ranking.module.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RankingService } from './ranking.service.js';
import { RankingCalculatorService } from './ranking-calculator.service.js';
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';

@Module({
  imports: [PrismaModule],
  providers: [RankingService, RankingCalculatorService, TrustScoreCalculator],
  exports: [RankingService, RankingCalculatorService],
})
export class RankingModule {}
```

**Step 3: Create index**

Create `services/user-service/src/ranking/index.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './ranking.module.js';
export * from './ranking.service.js';
export * from './ranking-calculator.service.js';
export * from './dto/user-rank.dto.js';
export * from './dto/leaderboard.dto.js';
```

**Step 4: Commit**

```bash
git add services/user-service/src/ranking/
git commit -m "feat(user-service): add RankingModule with DTOs #781"
```

---

### Task 2.4: Create Ranking Controller

**Files:**

- Create: `services/user-service/src/ranking/ranking.controller.ts`
- Create: `services/user-service/src/ranking/__tests__/ranking.controller.spec.ts`

**Step 1: Write the failing test**

Create `services/user-service/src/ranking/__tests__/ranking.controller.spec.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingController } from '../ranking.controller.js';
import { RankingService } from '../ranking.service.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  TierLevel: {
    NEWCOMER: 'NEWCOMER',
    CONTRIBUTOR: 'CONTRIBUTOR',
    TRUSTED: 'TRUSTED',
    LEADER: 'LEADER',
    EXPERT: 'EXPERT',
  },
}));

const mockRankingService = {
  getUserRank: vi.fn(),
  getLeaderboard: vi.fn(),
  recalculateUserRank: vi.fn(),
};

describe('RankingController', () => {
  let controller: RankingController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new RankingController(mockRankingService as never);
  });

  describe('GET /users/:id/ranking', () => {
    it('should return user rank', async () => {
      const mockRank = {
        userId: 'user-1',
        tierLevel: 'CONTRIBUTOR',
        compositeScore: { toNumber: () => 0.35 },
        engagementScore: { toNumber: () => 0.2 },
        qualityScore: { toNumber: () => 0.5 },
        tenureBonus: { toNumber: () => 0.1 },
        nextTierThreshold: { toNumber: () => 0.4 },
        badges: [],
        lastCalculated: new Date(),
      };
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      const result = await controller.getUserRank('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.tierLevel).toBe('CONTRIBUTOR');
      expect(result.tierName).toBe('Contributor');
    });

    it('should throw 404 if rank not found', async () => {
      mockRankingService.getUserRank.mockResolvedValue(null);

      await expect(controller.getUserRank('user-1')).rejects.toThrow('User rank not found');
    });
  });

  describe('GET /users/leaderboard', () => {
    it('should return leaderboard', async () => {
      const mockLeaderboard = [
        {
          userId: 'user-1',
          tierLevel: 'EXPERT',
          compositeScore: { toNumber: () => 0.9 },
          user: { displayName: 'Expert User', avatarUrl: null },
        },
      ];
      mockRankingService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard(10);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].displayName).toBe('Expert User');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking.controller.spec.ts`
Expected: FAIL with "Cannot find module '../ranking.controller.js'"

**Step 3: Write implementation**

Create `services/user-service/src/ranking/ranking.controller.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Param, Query, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { RankingService } from './ranking.service.js';
import { UserRankDto } from './dto/user-rank.dto.js';
import { LeaderboardDto, LeaderboardEntryDto } from './dto/leaderboard.dto.js';

@Controller('users')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get(':id/ranking')
  async getUserRank(@Param('id') userId: string): Promise<UserRankDto> {
    const rank = await this.rankingService.getUserRank(userId);
    if (!rank) {
      throw new NotFoundException('User rank not found');
    }
    return new UserRankDto(rank as never);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<LeaderboardDto> {
    const ranks = await this.rankingService.getLeaderboard(Math.min(limit, 100));
    const entries = ranks.map((rank, index) => new LeaderboardEntryDto(rank as never, index + 1));
    return new LeaderboardDto(entries, entries.length);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && pnpm vitest run src/ranking/__tests__/ranking.controller.spec.ts`
Expected: PASS

**Step 5: Update module to include controller**

Update `services/user-service/src/ranking/ranking.module.ts` to add controller:

```typescript
import { RankingController } from './ranking.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [RankingController],
  providers: [RankingService, RankingCalculatorService, TrustScoreCalculator],
  exports: [RankingService, RankingCalculatorService],
})
export class RankingModule {}
```

**Step 6: Commit**

```bash
git add services/user-service/src/ranking/
git commit -m "feat(user-service): add RankingController with endpoints #781"
```

---

## Phase 3: Frontend Components

### Task 3.1: Create TierBadge Component

**Files:**

- Create: `frontend/src/components/ranking/TierBadge.tsx`
- Create: `frontend/src/components/ranking/__tests__/TierBadge.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/components/ranking/__tests__/TierBadge.test.tsx`:

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierBadge } from '../TierBadge';

describe('TierBadge', () => {
  it('renders NEWCOMER tier correctly', () => {
    render(<TierBadge tier="NEWCOMER" />);
    expect(screen.getByText('Newcomer')).toBeInTheDocument();
  });

  it('renders CONTRIBUTOR tier correctly', () => {
    render(<TierBadge tier="CONTRIBUTOR" />);
    expect(screen.getByText('Contributor')).toBeInTheDocument();
  });

  it('renders EXPERT tier with gold styling', () => {
    render(<TierBadge tier="EXPERT" />);
    const badge = screen.getByText('Expert');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('renders compact variant', () => {
    render(<TierBadge tier="TRUSTED" size="sm" />);
    const badge = screen.getByText('Trusted');
    expect(badge).toHaveClass('text-xs');
  });

  it('shows tooltip on hover', () => {
    render(<TierBadge tier="LEADER" showTooltip />);
    expect(screen.getByTitle('Leader - Tier 4')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/ranking/__tests__/TierBadge.test.tsx`
Expected: FAIL with "Cannot find module '../TierBadge'"

**Step 3: Write implementation**

Create `frontend/src/components/ranking/TierBadge.tsx`:

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type TierLevel = 'NEWCOMER' | 'CONTRIBUTOR' | 'TRUSTED' | 'LEADER' | 'EXPERT';

interface TierBadgeProps {
  tier: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<
  TierLevel,
  { name: string; number: number; bgColor: string; textColor: string; icon: string }
> = {
  NEWCOMER: {
    name: 'Newcomer',
    number: 1,
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-700 dark:text-gray-300',
    icon: '🌱',
  },
  CONTRIBUTOR: {
    name: 'Contributor',
    number: 2,
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: '💬',
  },
  TRUSTED: {
    name: 'Trusted',
    number: 3,
    bgColor: 'bg-green-100 dark:bg-green-900',
    textColor: 'text-green-700 dark:text-green-300',
    icon: '✓',
  },
  LEADER: {
    name: 'Leader',
    number: 4,
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: '⭐',
  },
  EXPERT: {
    name: 'Expert',
    number: 5,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    icon: '👑',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size = 'md',
  showTooltip = false,
  className = '',
}) => {
  const config = TIER_CONFIG[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${SIZE_CLASSES[size]} ${className}`}
      title={showTooltip ? `${config.name} - Tier ${config.number}` : undefined}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </span>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/ranking/__tests__/TierBadge.test.tsx`
Expected: PASS

**Step 5: Create index file and commit**

Create `frontend/src/components/ranking/index.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './TierBadge';
```

```bash
git add frontend/src/components/ranking/
git commit -m "feat(frontend): add TierBadge component #781"
```

---

### Task 3.2: Create TierProgressCard Component

**Files:**

- Create: `frontend/src/components/ranking/TierProgressCard.tsx`
- Create: `frontend/src/components/ranking/__tests__/TierProgressCard.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/components/ranking/__tests__/TierProgressCard.test.tsx`:

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierProgressCard } from '../TierProgressCard';

const mockRankData = {
  tierLevel: 'CONTRIBUTOR' as const,
  tierName: 'Contributor',
  compositeScore: 0.35,
  engagementScore: 0.2,
  qualityScore: 0.5,
  tenureBonus: 0.1,
  nextTierThreshold: 0.4,
  progressToNextTier: 75,
};

describe('TierProgressCard', () => {
  it('renders current tier', () => {
    render(<TierProgressCard data={mockRankData} />);
    expect(screen.getByText('Contributor')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<TierProgressCard data={mockRankData} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('shows next tier name', () => {
    render(<TierProgressCard data={mockRankData} />);
    expect(screen.getByText(/Trusted/)).toBeInTheDocument();
  });

  it('shows score breakdown', () => {
    render(<TierProgressCard data={mockRankData} showBreakdown />);
    expect(screen.getByText(/Engagement:/)).toBeInTheDocument();
    expect(screen.getByText(/Quality:/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/ranking/__tests__/TierProgressCard.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

Create `frontend/src/components/ranking/TierProgressCard.tsx`:

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TierBadge, TierLevel } from './TierBadge';

interface TierProgressCardProps {
  data: {
    tierLevel: TierLevel;
    tierName: string;
    compositeScore: number;
    engagementScore: number;
    qualityScore: number;
    tenureBonus: number;
    nextTierThreshold: number;
    progressToNextTier: number;
  };
  showBreakdown?: boolean;
  className?: string;
}

const NEXT_TIER: Record<TierLevel, TierLevel | null> = {
  NEWCOMER: 'CONTRIBUTOR',
  CONTRIBUTOR: 'TRUSTED',
  TRUSTED: 'LEADER',
  LEADER: 'EXPERT',
  EXPERT: null,
};

const TIER_NAMES: Record<TierLevel, string> = {
  NEWCOMER: 'Newcomer',
  CONTRIBUTOR: 'Contributor',
  TRUSTED: 'Trusted',
  LEADER: 'Leader',
  EXPERT: 'Expert',
};

export const TierProgressCard: React.FC<TierProgressCardProps> = ({
  data,
  showBreakdown = false,
  className = '',
}) => {
  const nextTier = NEXT_TIER[data.tierLevel];
  const isMaxTier = !nextTier;

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Tier</h3>
          <TierBadge tier={data.tierLevel} size="lg" />
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(data.compositeScore * 100)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
        </div>
      </div>

      {!isMaxTier && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              Progress to {TIER_NAMES[nextTier]}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.progressToNextTier}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={data.progressToNextTier}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          >
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${data.progressToNextTier}%` }}
            />
          </div>
        </div>
      )}

      {isMaxTier && (
        <div className="mb-4 rounded-md bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            You've reached the highest tier!
          </span>
        </div>
      )}

      {showBreakdown && (
        <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Score Breakdown</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600 dark:text-gray-400">Engagement:</div>
            <div className="text-right font-medium text-gray-900 dark:text-white">
              {Math.round(data.engagementScore * 100)}%
            </div>
            <div className="text-gray-600 dark:text-gray-400">Quality:</div>
            <div className="text-right font-medium text-gray-900 dark:text-white">
              {Math.round(data.qualityScore * 100)}%
            </div>
            <div className="text-gray-600 dark:text-gray-400">Tenure:</div>
            <div className="text-right font-medium text-gray-900 dark:text-white">
              {Math.round(data.tenureBonus * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/ranking/__tests__/TierProgressCard.test.tsx`
Expected: PASS

**Step 5: Update index and commit**

Update `frontend/src/components/ranking/index.ts`:

```typescript
export * from './TierBadge';
export * from './TierProgressCard';
```

```bash
git add frontend/src/components/ranking/
git commit -m "feat(frontend): add TierProgressCard component #781"
```

---

## Phase 4-7: Remaining Implementation

Due to plan length constraints, the following phases are outlined at task level. Each task follows the same TDD pattern (test first, implement, commit):

### Phase 4: Domain Expertise

- Task 4.1: Create ExpertiseCalculatorService (test + impl)
- Task 4.2: Create ExpertiseService for CRUD operations
- Task 4.3: Add ExpertiseBadge frontend component
- Task 4.4: Create expertise API endpoints

### Phase 5: Credentials System

- Task 5.1: Create CredentialService (test + impl)
- Task 5.2: Create CredentialController with upload handling
- Task 5.3: Create CredentialSubmitForm frontend component
- Task 5.4: Create admin CredentialReviewQueue component

### Phase 6: Access Control

- Task 6.1: Create TierGuard middleware (test + impl)
- Task 6.2: Add provisional access endpoints
- Task 6.3: Create TierGateBanner frontend component
- Task 6.4: Create RequestAccessModal component

### Phase 7: Anti-Exclusion & Polish

- Task 7.1: Create AppealService (test + impl)
- Task 7.2: Create AppealController with endpoints
- Task 7.3: Create RankingDashboard page
- Task 7.4: Create admin RankingAnalytics dashboard
- Task 7.5: Add daily recalculation cron job
- Task 7.6: Create E2E tests for ranking flow

---

## Commands Reference

**Run all ranking tests:**

```bash
cd services/user-service && pnpm vitest run src/ranking/
cd frontend && pnpm vitest run src/components/ranking/
```

**Generate Prisma client after schema changes:**

```bash
cd packages/db-models && pnpm prisma generate
```

**Run migrations:**

```bash
cd packages/db-models && pnpm prisma migrate dev
```

**Build all packages:**

```bash
pnpm -r build
```
