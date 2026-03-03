# Data Model: User Profile Pages

**Feature Branch**: `001-profile-page`
**Date**: 2026-03-02
**Status**: Complete

## Overview

This document defines the data entities for user profile pages. The feature primarily extends existing models with new fields and relationships.

---

## Entity Definitions

### 1. User (Extended)

**Source**: `packages/db-models/prisma/schema.prisma`
**Status**: Existing model, extended with bio field

```prisma
model User {
  // ... existing fields ...

  // NEW: Profile bio
  bio                       String?             @db.VarChar(300)

  // Existing fields relevant to profile
  id                        String              @id @default(uuid()) @db.Uuid
  email                     String              @unique
  displayName               String?             @map("display_name") @db.VarChar(50)
  avatarUrl                 String?             @map("avatar_url")
  verificationLevel         VerificationLevel   @default(BASIC)
  trustScoreAbility         Decimal             @default(0.50) @db.Decimal(3, 2)
  trustScoreBenevolence     Decimal             @default(0.50) @db.Decimal(3, 2)
  trustScoreIntegrity       Decimal             @default(0.50) @db.Decimal(3, 2)
  accountStatus             AccountStatus       @default(ACTIVE)
  createdAt                 DateTime            @default(now())

  // Existing relationships
  following                 UserFollow[]        @relation("Follower")
  followers                 UserFollow[]        @relation("Followed")
  userRank                  UserRank?
  topicExpertise            TopicExpertise[]

  // NEW: Privacy settings relationship
  privacySettings           UserPrivacySettings?
}
```

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| displayName | 3-50 characters | "Display name must be 3-50 characters" |
| bio | 0-300 characters | "Bio must not exceed 300 characters" |

---

### 2. UserPrivacySettings (New)

**Purpose**: Stores user privacy preferences for profile sections

```prisma
model UserPrivacySettings {
  id                  String              @id @default(uuid()) @db.Uuid
  userId              String              @unique @map("user_id") @db.Uuid
  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  activityHistory     ProfileVisibility   @default(PUBLIC) @map("activity_history")
  detailedTrustScores ProfileVisibility   @default(PUBLIC) @map("detailed_trust_scores")
  followerList        ProfileVisibility   @default(PUBLIC) @map("follower_list")
  followingList       ProfileVisibility   @default(PUBLIC) @map("following_list")

  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  @@map("user_privacy_settings")
}

enum ProfileVisibility {
  PUBLIC
  FOLLOWERS_ONLY
  PRIVATE
}
```

**Field Descriptions**:
| Field | Type | Description | Default |
|-------|------|-------------|---------|
| activityHistory | ProfileVisibility | Who can see contribution history | PUBLIC |
| detailedTrustScores | ProfileVisibility | Who can see ABI breakdown (not overall level) | PUBLIC |
| followerList | ProfileVisibility | Who can see followers list | PUBLIC |
| followingList | ProfileVisibility | Who can see following list | PUBLIC |

**Constraints**:
- `detailedTrustScores` cannot be `PRIVATE` (platform integrity per FR-018)
- Each user has exactly one privacy settings record (1:1)

**State Transitions**: None (settings are mutable without workflow)

---

### 3. UserRank (Existing)

**Source**: Already implemented in schema.prisma
**Usage**: Provides tier level and composite score for profile display

```prisma
model UserRank {
  id                String        @id @default(uuid()) @db.Uuid
  userId            String        @unique @map("user_id") @db.Uuid
  user              User          @relation(fields: [userId], references: [id])

  compositeScore    Decimal       @default(0.00) @db.Decimal(5, 4)
  tierLevel         TierLevel     @default(NEWCOMER) @map("tier_level")
  nextTierThreshold Decimal       @map("next_tier_threshold") @db.Decimal(5, 4)
  progressToNextTier Decimal      @default(0.00) @map("progress_to_next_tier") @db.Decimal(5, 2)

  // Scoring components
  engagementScore   Decimal       @default(0.00) @map("engagement_score") @db.Decimal(5, 4)
  qualityScore      Decimal       @default(0.00) @map("quality_score") @db.Decimal(5, 4)
  tenureBonus       Decimal       @default(0.00) @map("tenure_bonus") @db.Decimal(5, 4)
  badges            String[]      @default([])

  lastCalculated    DateTime      @map("last_calculated")
  lastActivityAt    DateTime?     @map("last_activity_at")
}

enum TierLevel {
  NEWCOMER      // 0.00-0.19
  CONTRIBUTOR   // 0.20-0.39
  TRUSTED       // 0.40-0.59
  LEADER        // 0.60-0.79
  EXPERT        // 0.80-1.00
}
```

---

### 4. TopicExpertise (Existing)

**Source**: Already implemented in schema.prisma
**Usage**: Displays domain-specific expertise badges on profile

```prisma
model TopicExpertise {
  id              String          @id @default(uuid()) @db.Uuid
  userId          String          @map("user_id") @db.Uuid
  user            User            @relation(fields: [userId], references: [id])
  tagId           String          @map("tag_id") @db.Uuid
  tag             Tag             @relation(fields: [tagId], references: [id])

  expertiseScore  Decimal         @default(0.00) @db.Decimal(5, 4)
  expertiseLevel  ExpertiseLevel  @default(NOVICE) @map("expertise_level")
  responseCount   Int             @default(0) @map("response_count")
  progressToNextLevel Decimal     @default(0.00) @db.Decimal(5, 2)
  lastActive      DateTime?       @map("last_active")

  @@unique([userId, tagId])
}

enum ExpertiseLevel {
  NOVICE         // 0.00-0.24
  FAMILIAR       // 0.25-0.49
  KNOWLEDGEABLE  // 0.50-0.74
  EXPERT         // 0.75-1.00
}
```

---

### 5. UserFollow (Existing)

**Source**: Already implemented in schema.prisma
**Usage**: Powers follow/unfollow and follower/following lists

```prisma
model UserFollow {
  id          String   @id @default(uuid()) @db.Uuid
  followerId  String   @map("follower_id") @db.Uuid
  follower    User     @relation("Follower", fields: [followerId], references: [id])
  followedId  String   @map("followed_id") @db.Uuid
  followed    User     @relation("Followed", fields: [followedId], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([followerId, followedId])
  @@map("user_follows")
}
```

**Constraints**:
- User cannot follow themselves (validated at application layer)
- Relationship is unidirectional (A follows B ≠ B follows A)

---

### 6. Contribution (View Model)

**Purpose**: Aggregated view for contribution history display
**Note**: Not a database model - composed from existing Topic, Response, and ClaimValidation records

```typescript
interface ContributionItem {
  id: string;
  type: 'TOPIC' | 'RESPONSE' | 'VALIDATION';
  title: string;           // Topic title or truncated response (100 chars)
  topicId: string;
  topicTitle: string;
  createdAt: string;       // ISO 8601 timestamp

  // Type-specific stats
  stats: {
    upvotes?: number;      // RESPONSE only
    downvotes?: number;    // RESPONSE only
    responseCount?: number; // TOPIC only
    validated?: boolean;   // VALIDATION only
  };
}

interface ContributionList {
  items: ContributionItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}
```

**Source Tables**:
- TOPIC: `topics` table
- RESPONSE: `responses` table
- VALIDATION: `claim_validations` table

---

## Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │
│ displayName     │
│ bio (NEW)       │
│ avatarUrl       │
│ trustScore*     │
│ verificationLvl │
│ accountStatus   │
└────────┬────────┘
         │
    ┌────┴────────────────────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
┌─────────┐      ┌────────────┐      ┌────────────────────┐
│UserRank │      │TopicExpert-│      │UserPrivacySettings │
│(1:1)    │      │ise (1:N)   │      │(1:1) NEW           │
├─────────┤      ├────────────┤      ├────────────────────┤
│tierLevel│      │tagId       │      │activityHistory     │
│composite│      │expertise   │      │detailedTrustScores │
│Score    │      │Level       │      │followerList        │
│progress │      │score       │      │followingList       │
└─────────┘      └────────────┘      └────────────────────┘

         │
         │ UserFollow (N:N self-join)
         ▼
┌─────────────────┐
│   UserFollow    │
├─────────────────┤
│ followerId (FK) │───► User.id
│ followedId (FK) │───► User.id
│ createdAt       │
└─────────────────┘
```

---

## Database Migration

### New Table: user_privacy_settings

```sql
-- Migration: add_user_privacy_settings

CREATE TYPE profile_visibility AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE');

CREATE TABLE user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  activity_history profile_visibility NOT NULL DEFAULT 'PUBLIC',
  detailed_trust_scores profile_visibility NOT NULL DEFAULT 'PUBLIC',
  follower_list profile_visibility NOT NULL DEFAULT 'PUBLIC',
  following_list profile_visibility NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint: detailed_trust_scores cannot be PRIVATE
ALTER TABLE user_privacy_settings
ADD CONSTRAINT chk_trust_scores_not_private
CHECK (detailed_trust_scores != 'PRIVATE');

CREATE INDEX idx_privacy_user_id ON user_privacy_settings(user_id);
```

### Alter Table: users

```sql
-- Migration: add_user_bio

ALTER TABLE users ADD COLUMN bio VARCHAR(300);
```

---

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| user_privacy_settings | idx_privacy_user_id | user_id | Fast lookup by user |
| users | idx_users_display_name | display_name | Search by name |
| user_follows | idx_follows_follower | follower_id | List following |
| user_follows | idx_follows_followed | followed_id | List followers |
| topic_expertise | idx_expertise_user | user_id | List user expertise |

---

## Data Integrity Rules

1. **Privacy Settings Creation**: Default settings created when user registers (via trigger or application)
2. **Trust Score Visibility**: `detailed_trust_scores` field constrained to non-PRIVATE values
3. **Display Name Format**: Alphanumeric, spaces, hyphens, underscores only (validated at app layer)
4. **Bio Sanitization**: Strip HTML, normalize whitespace (validated at app layer)
5. **Follow Self-Reference**: User cannot follow themselves (validated at app layer)
6. **Cascade Delete**: Privacy settings deleted when user deleted (ON DELETE CASCADE)
