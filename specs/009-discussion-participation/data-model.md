# Data Model: Discussion Participation

**Feature**: 009-discussion-participation
**Phase**: 1 - Design
**Date**: 2026-01-27

## Overview

This document defines the database schema for the Discussion Participation feature, including new entities, schema modifications to existing models, indexes for performance optimization, and migration strategy.

**Design Principles**:
1. Extend existing Prisma schema rather than creating parallel structures
2. Maintain referential integrity with cascading deletes where appropriate
3. Optimize for read-heavy workload (discussions are read 10x more than written)
4. Support soft delete for thread integrity while allowing hard delete for privacy

---

## Entity Relationship Diagram

```
User (existing)
  ├─ 1:N → Discussion (new)
  ├─ 1:N → Response (existing, extended)
  └─ 1:N → ParticipantActivity (new)

DiscussionTopic (existing)
  └─ 1:N → Discussion (new)

Discussion (new)
  ├─ 1:1 → DiscussionTopic
  ├─ 1:N → Response
  ├─ N:1 → User (creator)
  └─ 1:N → ParticipantActivity

Response (existing, extended)
  ├─ N:1 → Discussion
  ├─ N:1 → User (author)
  ├─ 1:N → Response (self-referential threading)
  └─ 1:N → Citation (new)

Citation (new)
  └─ N:1 → Response
```

---

## Entity Definitions

### 1. Discussion (NEW)

**Purpose**: Represents a user-created conversation thread within a topic. Distinct from DiscussionTopic (which is a category/theme) - Discussion is a specific conversation.

**Why Separate from DiscussionTopic**:
- DiscussionTopic: Broad category (e.g., "Climate Change")
- Discussion: Specific conversation (e.g., "Should carbon taxes increase in 2027?")
- Relationship: 1 DiscussionTopic contains many Discussions

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Required | Unique discussion identifier |
| `topicId` | UUID | FK, Required, Indexed | References `discussion_topics.id` |
| `creatorId` | UUID | FK, Required, Indexed | User who created the discussion |
| `title` | String | Required, 10-200 chars | Discussion title (FR-002) |
| `status` | Enum | Required, Default: ACTIVE | `ACTIVE`, `ARCHIVED`, `DELETED` |
| `responseCount` | Int | Default: 0 | Denormalized count for performance |
| `participantCount` | Int | Default: 0 | Unique users who responded |
| `lastActivityAt` | DateTime | Required, Indexed | Last response timestamp for sorting |
| `createdAt` | DateTime | Required, Indexed | Discussion creation time |
| `updatedAt` | DateTime | Required | Auto-updated on changes |

**Prisma Schema**:
```prisma
enum DiscussionStatus {
  ACTIVE
  ARCHIVED
  DELETED

  @@map("discussion_status")
}

model Discussion {
  id               String            @id @default(uuid()) @db.Uuid
  topicId          String            @map("topic_id") @db.Uuid
  creatorId        String            @map("creator_id") @db.Uuid
  title            String            @db.VarChar(200)
  status           DiscussionStatus  @default(ACTIVE)
  responseCount    Int               @default(0) @map("response_count")
  participantCount Int               @default(0) @map("participant_count")
  lastActivityAt   DateTime          @default(now()) @map("last_activity_at")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  // Relations
  topic                DiscussionTopic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  creator              User                  @relation(fields: [creatorId], references: [id])
  responses            Response[]
  participantActivities ParticipantActivity[]

  @@index([topicId, status, lastActivityAt(sort: Desc)]) // Sort discussions by activity
  @@index([creatorId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("discussions")
}
```

**Indexes Rationale**:
- `(topicId, status, lastActivityAt DESC)`: Composite index for listing active discussions sorted by activity
- `creatorId`: User's discussion history
- `status`: Filter archived/deleted
- `createdAt DESC`: Sort by newest

---

### 2. Response (EXISTING - EXTENDED)

**Purpose**: User contribution within a discussion. Supports threading via self-referential `parentId`.

**Existing Fields** (from schema.prisma):
- `id`, `topicId`, `authorId`, `parentId`, `content`, `citedSources`, `status`, `createdAt`, `updatedAt`

**New Fields** (additions for Feature 009):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `discussionId` | UUID | FK, Required, Indexed | Links response to specific discussion (not just topic) |
| `version` | Int | Required, Default: 1 | Optimistic locking for concurrent edits (Research: Optimistic Locking) |
| `deletedAt` | DateTime | Nullable, Indexed | Soft delete timestamp (Research: Soft Delete) |
| `editedAt` | DateTime | Nullable | Last edit timestamp (distinct from `updatedAt`) |
| `editCount` | Int | Default: 0 | Number of times edited |

**Updated Prisma Schema**:
```prisma
model Response {
  id                    String         @id @default(uuid()) @db.Uuid
  topicId               String         @map("topic_id") @db.Uuid  // EXISTING
  discussionId          String         @map("discussion_id") @db.Uuid  // NEW
  authorId              String         @map("author_id") @db.Uuid  // EXISTING
  parentId              String?        @map("parent_id") @db.Uuid  // EXISTING (threading)
  content               String         @db.Text  // EXISTING
  citedSources          Json?          @map("cited_sources")  // EXISTING (will deprecate for Citation model)
  containsOpinion       Boolean        @default(false) @map("contains_opinion")  // EXISTING
  containsFactualClaims Boolean        @default(false) @map("contains_factual_claims")  // EXISTING
  status                ResponseStatus @default(VISIBLE)  // EXISTING
  version               Int            @default(1)  // NEW: Optimistic locking
  deletedAt             DateTime?      @map("deleted_at")  // NEW: Soft delete
  editedAt              DateTime?      @map("edited_at")  // NEW: Last edit time
  editCount             Int            @default(0) @map("edit_count")  // NEW
  revisionCount         Int            @default(0) @map("revision_count")  // EXISTING (rename to editCount)
  createdAt             DateTime       @default(now()) @map("created_at")  // EXISTING
  updatedAt             DateTime       @updatedAt @map("updated_at")  // EXISTING

  // Relations
  topic            DiscussionTopic       @relation(fields: [topicId], references: [id], onDelete: Cascade)  // EXISTING
  discussion       Discussion            @relation(fields: [discussionId], references: [id], onDelete: Cascade)  // NEW
  author           User                  @relation(fields: [authorId], references: [id])  // EXISTING
  parent           Response?             @relation("ResponseThreading", fields: [parentId], references: [id], onDelete: Cascade)  // EXISTING
  replies          Response[]            @relation("ResponseThreading")  // EXISTING
  propositions     ResponseProposition[]  // EXISTING
  feedback         Feedback[]  // EXISTING
  factCheckResults FactCheckResult[]  // EXISTING
  votes            Vote[]  // EXISTING
  citations        Citation[]  // NEW

  @@index([topicId])  // EXISTING
  @@index([discussionId, deletedAt])  // NEW: Filter soft-deleted per discussion
  @@index([authorId])  // EXISTING
  @@index([parentId])  // EXISTING
  @@index([topicId, createdAt(sort: Desc)])  // EXISTING
  @@index([status])  // EXISTING
  @@index([deletedAt])  // NEW: Global soft delete filter
  @@map("responses")
}
```

**Migration Notes**:
- Add `discussionId` FK with NOT NULL constraint (requires data backfill)
- Add `version` field with default 1
- Add `deletedAt` nullable field
- Add `editedAt` nullable field
- Add `editCount` with default 0
- Create new composite indexes

---

### 3. Citation (NEW)

**Purpose**: Structured storage of source URLs attached to responses. Replaces JSON `citedSources` field with relational model for better querying, validation tracking, and broken link detection.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Required | Unique citation identifier |
| `responseId` | UUID | FK, Required, Indexed | Response this citation supports |
| `originalUrl` | String | Required, Max 2048 chars | User-provided URL (as entered) |
| `normalizedUrl` | String | Required, Max 2048 chars | Normalized for deduplication |
| `title` | String | Nullable, Max 500 chars | Optional citation title/description |
| `resolvedIp` | String | Nullable | IP address resolved during validation (audit trail) |
| `validationStatus` | Enum | Required, Default: UNVERIFIED | `ACTIVE`, `BROKEN`, `UNVERIFIED` |
| `validatedAt` | DateTime | Nullable | Last validation timestamp |
| `createdAt` | DateTime | Required | When citation was added |

**Prisma Schema**:
```prisma
enum CitationValidationStatus {
  ACTIVE      // HTTP 2xx-3xx response
  BROKEN      // HTTP 4xx-5xx response
  UNVERIFIED  // Not yet checked or timeout

  @@map("citation_validation_status")
}

model Citation {
  id               String                   @id @default(uuid()) @db.Uuid
  responseId       String                   @map("response_id") @db.Uuid
  originalUrl      String                   @map("original_url") @db.VarChar(2048)
  normalizedUrl    String                   @map("normalized_url") @db.VarChar(2048)
  title            String?                  @db.VarChar(500)
  resolvedIp       String?                  @map("resolved_ip") @db.VarChar(45)  // IPv6 max length
  validationStatus CitationValidationStatus @default(UNVERIFIED) @map("validation_status")
  validatedAt      DateTime?                @map("validated_at")
  createdAt        DateTime                 @default(now()) @map("created_at")

  // Relations
  response Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@index([responseId])
  @@index([normalizedUrl])  // Deduplication queries
  @@index([validationStatus])  // Filter broken links
  @@map("citations")
}
```

**Indexes Rationale**:
- `responseId`: Fetch citations for a response
- `normalizedUrl`: Deduplication (find same URL across responses)
- `validationStatus`: Background job to check broken links

---

### 4. ParticipantActivity (NEW)

**Purpose**: Track which users have contributed to which discussions for metrics and notifications. Denormalizes for performance (alternative to COUNT DISTINCT queries).

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Required | Unique activity record |
| `discussionId` | UUID | FK, Required | Discussion user participated in |
| `userId` | UUID | FK, Required | User who participated |
| `firstContributionAt` | DateTime | Required | When user first responded |
| `lastContributionAt` | DateTime | Required | Most recent response timestamp |
| `responseCount` | Int | Default: 1 | Number of responses by this user |

**Prisma Schema**:
```prisma
model ParticipantActivity {
  id                   String     @id @default(uuid()) @db.Uuid
  discussionId         String     @map("discussion_id") @db.Uuid
  userId               String     @map("user_id") @db.Uuid
  firstContributionAt  DateTime   @default(now()) @map("first_contribution_at")
  lastContributionAt   DateTime   @default(now()) @map("last_contribution_at")
  responseCount        Int        @default(1) @map("response_count")

  // Relations
  discussion Discussion @relation(fields: [discussionId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([discussionId, userId])  // One record per user per discussion
  @@index([discussionId])
  @@index([userId])
  @@map("participant_activities")
}
```

**Indexes Rationale**:
- `(discussionId, userId)`: Unique constraint + lookup
- `discussionId`: List participants for a discussion
- `userId`: User's participation history

---

## Schema Extensions to Existing Models

### User Model (NO CHANGES)

Existing User model already has:
- Relations to Response (`responses`)
- Relations to DiscussionTopic (`createdTopics`)

New relations added automatically via Prisma:
- `discussions: Discussion[]` (reverse relation)
- `participantActivities: ParticipantActivity[]` (reverse relation)

### DiscussionTopic Model (ADD RELATION)

Add reverse relation to Discussion:

```prisma
model DiscussionTopic {
  // ... existing fields ...

  // Relations (EXISTING)
  creator              User                   @relation(fields: [creatorId], references: [id])
  tags                 TopicTag[]
  sourceLinks          TopicLink[]            @relation("SourceTopic")
  targetLinks          TopicLink[]            @relation("TargetTopic")
  propositions         Proposition[]
  responses            Response[]
  commonGroundAnalyses CommonGroundAnalysis[]
  topicInterests       TopicInterest[]

  // Relations (NEW)
  discussions          Discussion[]  // NEW: Topic contains many discussions

  // ... existing indexes ...
}
```

---

## Migration Strategy

### Phase 1: Additive Changes (Safe, No Data Loss Risk)

**Migration**: `20260127_add_discussion_participation`

```sql
-- 1. Create new enums
CREATE TYPE "discussion_status" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE "citation_validation_status" AS ENUM ('ACTIVE', 'BROKEN', 'UNVERIFIED');

-- 2. Create Discussion table
CREATE TABLE "discussions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "topic_id" UUID NOT NULL REFERENCES "discussion_topics"("id") ON DELETE CASCADE,
  "creator_id" UUID NOT NULL REFERENCES "users"("id"),
  "title" VARCHAR(200) NOT NULL,
  "status" discussion_status NOT NULL DEFAULT 'ACTIVE',
  "response_count" INTEGER NOT NULL DEFAULT 0,
  "participant_count" INTEGER NOT NULL DEFAULT 0,
  "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Citation table
CREATE TABLE "citations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "response_id" UUID NOT NULL REFERENCES "responses"("id") ON DELETE CASCADE,
  "original_url" VARCHAR(2048) NOT NULL,
  "normalized_url" VARCHAR(2048) NOT NULL,
  "title" VARCHAR(500),
  "resolved_ip" VARCHAR(45),
  "validation_status" citation_validation_status NOT NULL DEFAULT 'UNVERIFIED',
  "validated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create ParticipantActivity table
CREATE TABLE "participant_activities" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "discussion_id" UUID NOT NULL REFERENCES "discussions"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "first_contribution_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_contribution_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "response_count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "participant_activities_discussion_id_user_id_key" UNIQUE ("discussion_id", "user_id")
);

-- 5. Add new fields to Response table
ALTER TABLE "responses"
  ADD COLUMN "discussion_id" UUID,  -- Nullable initially for backfill
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "edited_at" TIMESTAMP(3),
  ADD COLUMN "edit_count" INTEGER NOT NULL DEFAULT 0;

-- 6. Create indexes (Discussion)
CREATE INDEX "discussions_topic_id_status_last_activity_at_idx"
  ON "discussions"("topic_id", "status", "last_activity_at" DESC);
CREATE INDEX "discussions_creator_id_idx" ON "discussions"("creator_id");
CREATE INDEX "discussions_status_idx" ON "discussions"("status");
CREATE INDEX "discussions_created_at_idx" ON "discussions"("created_at" DESC);

-- 7. Create indexes (Citation)
CREATE INDEX "citations_response_id_idx" ON "citations"("response_id");
CREATE INDEX "citations_normalized_url_idx" ON "citations"("normalized_url");
CREATE INDEX "citations_validation_status_idx" ON "citations"("validation_status");

-- 8. Create indexes (ParticipantActivity)
CREATE INDEX "participant_activities_discussion_id_idx" ON "participant_activities"("discussion_id");
CREATE INDEX "participant_activities_user_id_idx" ON "participant_activities"("user_id");

-- 9. Create indexes (Response new fields)
CREATE INDEX "responses_discussion_id_deleted_at_idx" ON "responses"("discussion_id", "deleted_at");
CREATE INDEX "responses_deleted_at_idx" ON "responses"("deleted_at");
```

### Phase 2: Data Backfill (Requires Application Code)

**Purpose**: Populate `discussion_id` on existing Response records.

**Approach**: One-time migration script (not SQL):

```typescript
// /packages/db-models/prisma/scripts/backfill-discussions.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillDiscussions() {
  console.log('Starting discussion backfill...');

  // Get all topics
  const topics = await prisma.discussionTopic.findMany();

  for (const topic of topics) {
    // Create one discussion per topic (legacy behavior)
    const discussion = await prisma.discussion.create({
      data: {
        topicId: topic.id,
        creatorId: topic.creatorId,
        title: topic.title,  // Use topic title as discussion title
        status: 'ACTIVE',
        responseCount: topic.responseCount || 0,
        lastActivityAt: topic.createdAt,
      },
    });

    console.log(`Created discussion ${discussion.id} for topic ${topic.title}`);

    // Update all responses for this topic to reference the discussion
    const updated = await prisma.response.updateMany({
      where: {
        topicId: topic.id,
        discussionId: null,  // Only backfill null records
      },
      data: {
        discussionId: discussion.id,
      },
    });

    console.log(`  → Updated ${updated.count} responses`);
  }

  console.log('✅ Backfill complete!');
}

backfillDiscussions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run**:
```bash
tsx packages/db-models/prisma/scripts/backfill-discussions.ts
```

### Phase 3: Schema Finalization (After Backfill)

```sql
-- Make discussion_id NOT NULL after backfill completes
ALTER TABLE "responses"
  ALTER COLUMN "discussion_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "responses"
  ADD CONSTRAINT "responses_discussion_id_fkey"
  FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE CASCADE;
```

---

## Query Patterns

### 1. List Discussions for a Topic (Sorted by Activity)

```typescript
const discussions = await prisma.discussion.findMany({
  where: {
    topicId: topicId,
    status: 'ACTIVE',
  },
  include: {
    creator: {
      select: { id: true, displayName: true },
    },
    _count: {
      select: { responses: true },
    },
  },
  orderBy: {
    lastActivityAt: 'desc',
  },
  take: 20,
  skip: page * 20,
});
```

**Index Used**: `discussions_topic_id_status_last_activity_at_idx`

### 2. Get Discussion with Threaded Responses (Excluding Soft-Deleted)

```typescript
const discussion = await prisma.discussion.findUnique({
  where: { id: discussionId },
  include: {
    responses: {
      where: {
        deletedAt: null,  // Exclude soft-deleted (Prisma extension will automate this)
      },
      include: {
        author: {
          select: { id: true, displayName: true },
        },
        citations: true,
        _count: {
          select: { replies: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
});

// Client-side tree reconstruction using buildResponseTree() from research.md
const tree = buildResponseTree(discussion.responses);
```

**Index Used**: `responses_discussion_id_deleted_at_idx`

### 3. Create Response with Optimistic Locking on Edit

```typescript
// Create
const response = await prisma.response.create({
  data: {
    discussionId,
    authorId,
    content,
    version: 1,  // Initial version
  },
});

// Edit (with optimistic locking check)
const current = await prisma.response.findUnique({
  where: { id: responseId },
});

if (current.version !== expectedVersion) {
  throw new ConflictException('Response was modified by another user');
}

const updated = await prisma.response.update({
  where: { id: responseId },
  data: {
    content: newContent,
    version: current.version + 1,  // Increment version
    editedAt: new Date(),
    editCount: current.editCount + 1,
  },
});
```

### 4. Soft Delete Response (Conditional)

```typescript
const response = await prisma.response.findUnique({
  where: { id: responseId },
  include: {
    _count: { select: { replies: true } },
  },
});

if (response._count.replies > 0) {
  // SOFT DELETE: Has replies, preserve thread
  await prisma.response.update({
    where: { id: responseId },
    data: {
      deletedAt: new Date(),
      content: '[deleted by author]',
      // Clear personal data
      citedSources: null,
    },
  });
} else {
  // HARD DELETE: No replies, safe to remove
  await prisma.response.delete({
    where: { id: responseId },
    // Cascades to: citations, feedback, votes
  });
}
```

### 5. Get Participants for a Discussion

```typescript
const participants = await prisma.participantActivity.findMany({
  where: { discussionId },
  include: {
    user: {
      select: {
        id: true,
        displayName: true,
        verificationLevel: true,
      },
    },
  },
  orderBy: {
    responseCount: 'desc',  // Most active first
  },
});
```

---

## Performance Considerations

### Denormalization

**Denormalized Fields** (for read optimization):
- `Discussion.responseCount`: Avoid COUNT(*) on every list query
- `Discussion.participantCount`: Avoid COUNT DISTINCT on every list query
- `Discussion.lastActivityAt`: Avoid MAX(createdAt) subquery for sorting

**Update Triggers** (maintain denormalized data):
```typescript
// In ResponseService.create()
await prisma.$transaction([
  // Create response
  prisma.response.create({ data }),

  // Increment discussion.responseCount
  prisma.discussion.update({
    where: { id: discussionId },
    data: {
      responseCount: { increment: 1 },
      lastActivityAt: new Date(),
    },
  }),

  // Upsert participant activity
  prisma.participantActivity.upsert({
    where: {
      discussionId_userId: { discussionId, userId: authorId },
    },
    update: {
      lastContributionAt: new Date(),
      responseCount: { increment: 1 },
    },
    create: {
      discussionId,
      userId: authorId,
      responseCount: 1,
    },
  }),

  // Increment discussion.participantCount if new participant
  // (complex, may use separate job)
]);
```

### Index Strategy

**Composite Indexes** (multiple columns):
- `(topicId, status, lastActivityAt DESC)`: Single index for common query pattern
- `(discussionId, deletedAt)`: Filter soft-deleted responses per discussion

**Partial Indexes** (future optimization):
```sql
-- Index only active responses (exclude soft-deleted)
CREATE INDEX "responses_discussion_id_active_idx"
  ON "responses"("discussion_id")
  WHERE "deleted_at" IS NULL;
```

**Benefits**: Smaller index size, faster queries for active responses only.

---

## Data Retention and Cleanup

### Soft Delete Policy

**When to Soft Delete**:
- Response has child replies (`_count.replies > 0`)
- Response is cited in CommonGroundAnalysis (future check)

**When to Hard Delete**:
- Response has no child replies
- User deletes entire account (cascade delete all responses)

### Cleanup Jobs (Background)

**Job 1: Archive Old Discussions**
```typescript
// Run daily: Archive discussions with no activity for 90 days
await prisma.discussion.updateMany({
  where: {
    status: 'ACTIVE',
    lastActivityAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  },
  data: {
    status: 'ARCHIVED',
  },
});
```

**Job 2: Check Broken Links**
```typescript
// Run weekly: Revalidate citations
const citations = await prisma.citation.findMany({
  where: {
    validationStatus: 'ACTIVE',
    validatedAt: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // 7 days old
    },
  },
  take: 1000,  // Batch size
});

for (const citation of citations) {
  const isValid = await validateUrl(citation.normalizedUrl);
  await prisma.citation.update({
    where: { id: citation.id },
    data: {
      validationStatus: isValid ? 'ACTIVE' : 'BROKEN',
      validatedAt: new Date(),
    },
  });
}
```

---

## Validation Rules

### Database Constraints

**Discussion**:
- `title`: 10-200 characters (CHECK constraint or app-level)
- `responseCount`: >= 0
- `participantCount`: >= 0

**Response**:
- `content`: 50-5000 words (app-level validation)
- `version`: >= 1
- `editCount`: >= 0

**Citation**:
- `originalUrl`: Max 2048 chars (URL length limit)
- `normalizedUrl`: Must be valid HTTP/HTTPS URL

### Application-Level Validation (class-validator DTOs)

```typescript
// CreateDiscussionDto
class CreateDiscussionDto {
  @IsString()
  @Length(10, 200)
  title: string;

  @IsString()
  @Length(50, 25000)  // ~5000 words
  initialResponse: string;

  @IsUUID()
  topicId: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CitationDto)
  citations?: CitationDto[];
}

// UpdateResponseDto
class UpdateResponseDto {
  @IsString()
  @Length(50, 25000)
  content: string;

  @IsInt()
  @Min(1)
  expectedVersion: number;  // Optimistic locking

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CitationDto)
  citations?: CitationDto[];
}

// CitationDto
class CitationDto {
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;
}
```

---

## Migration Checklist

- [ ] **Phase 1**: Run additive migration (create tables, add fields)
- [ ] **Phase 2**: Run backfill script (populate `discussion_id`)
- [ ] **Phase 3**: Make `discussion_id` NOT NULL and add FK constraint
- [ ] **Verification**: Query discussions and responses to confirm data integrity
- [ ] **Rollback Plan**: Keep backfill script reversible; can drop tables if needed
- [ ] **Performance Test**: Benchmark queries with realistic data (1000 discussions, 10,000 responses)

---

## Next Steps

1. **Generate Prisma migration**: `npx prisma migrate dev --name add_discussion_participation`
2. **Review migration SQL**: Verify generated SQL matches this specification
3. **Run migration**: Apply to development database
4. **Execute backfill**: Run TypeScript backfill script
5. **Finalize schema**: Make `discussion_id` NOT NULL
6. **Generate Prisma client**: `npx prisma generate`
7. **Proceed to API contracts**: Define OpenAPI specs for discussion/response endpoints
