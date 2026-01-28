# Prisma Optimistic Locking Strategies for Concurrent Edit Conflict Prevention

## Executive Summary

This research explores optimistic locking patterns with Prisma 6.3.1 to prevent lost updates when users concurrently edit discussion responses within the 24-hour edit window. Optimistic locking assumes conflicts are rare and detects them only at write-time, making it ideal for this use case.

**Recommended Strategy:** Version-based optimistic locking using an explicit `version` field combined with timestamp validation for the 24-hour edit window constraint.

---

## 1. Context & Requirements

### Current State

- Discussion responses can be edited within 24 hours of creation
- Responses already track: `updatedAt` (auto-updated by Prisma `@updatedAt`), `revisionCount` (manual increment)
- No concurrency control currently exists

### Risk Scenario

```
Time 0:00  → User A fetches Response V1 (updatedAt: T0, version: 1)
Time 0:10  → User B fetches Response V1 (updatedAt: T0, version: 1)
Time 0:15  → User A edits: content + sources → Response V2 (updatedAt: T1, version: 2)
Time 0:20  → User B edits: content only → CONFLICT or LOST UPDATE
```

Without concurrency control, User B's update at 0:20 overwrites User A's changes from 0:15.

---

## 2. Optimistic Locking Patterns

### Pattern A: Timestamp-based Locking (Lightweight)

#### Description

Fetch the current `updatedAt` timestamp and compare before update. If the timestamp differs, another user has edited the response.

#### Implementation

**Schema Changes:**

```prisma
model Response {
  // ... existing fields ...
  updatedAt       DateTime       @updatedAt @map("updated_at")
  // No new fields needed - uses existing timestamp
}
```

**Service Code:**

```typescript
async updateResponseWithTimestampLocking(
  responseId: string,
  authorId: string,
  expectedUpdatedAt: DateTime,
  updateResponseDto: UpdateResponseDto,
): Promise<ResponseDto> {
  // 1. Fetch response with current timestamp
  const currentResponse = await this.prisma.response.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      authorId: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!currentResponse) {
    throw new NotFoundException(`Response with ID ${responseId} not found`);
  }

  // 2. Authorization check
  if (currentResponse.authorId !== authorId) {
    throw new ForbiddenException('You can only edit your own responses');
  }

  // 3. Check 24-hour edit window
  const now = new Date();
  const hoursElapsed = (now.getTime() - currentResponse.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursElapsed > 24) {
    throw new BadRequestException('Responses can only be edited within 24 hours of creation');
  }

  // 4. Optimistic lock check
  if (currentResponse.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new ConflictException(
      'Response has been modified by another user. Please refresh and try again.',
      {
        code: 'EDIT_CONFLICT',
        currentUpdatedAt: currentResponse.updatedAt,
      },
    );
  }

  // 5. Perform update (Prisma auto-updates @updatedAt)
  const updatedResponse = await this.prisma.response.update({
    where: { id: responseId },
    data: {
      content: updateResponseDto.content.trim(),
      revisionCount: { increment: 1 },
      // @updatedAt automatically updated by Prisma
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return this.mapToResponseDto(updatedResponse);
}
```

**Pros:**

- Minimal schema changes (uses existing `updatedAt`)
- Simple implementation (one timestamp comparison)
- Prisma auto-manages timestamp updates
- Low performance overhead

**Cons:**

- Timestamp comparison can be fragile (millisecond precision needed)
- Doesn't track edit causality or history
- Race condition window between select and update (though small)

---

### Pattern B: Version-based Optimistic Locking (Recommended)

#### Description

Use an explicit `version` field (integer) that increments on every update. Check that the version hasn't changed before applying an update.

#### Implementation

**Schema Changes:**

```prisma
model Response {
  id                    String         @id @default(uuid()) @db.Uuid
  topicId               String         @map("topic_id") @db.Uuid
  authorId              String         @map("author_id") @db.Uuid
  parentId              String?        @map("parent_id") @db.Uuid
  content               String         @db.Text
  citedSources          Json?          @map("cited_sources")
  containsOpinion       Boolean        @default(false) @map("contains_opinion")
  containsFactualClaims Boolean        @default(false) @map("contains_factual_claims")
  status                ResponseStatus @default(VISIBLE)
  revisionCount         Int            @default(0) @map("revision_count")
  version               Int            @default(1)              // NEW: Optimistic lock version
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  // Relations
  topic            DiscussionTopic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  author           User                  @relation(fields: [authorId], references: [id])
  parent           Response?             @relation("ResponseThreading", fields: [parentId], references: [id], onDelete: Cascade)
  replies          Response[]            @relation("ResponseThreading")
  propositions     ResponseProposition[]
  feedback         Feedback[]
  factCheckResults FactCheckResult[]
  votes            Vote[]

  @@index([topicId])
  @@index([authorId])
  @@index([parentId])
  @@index([topicId, createdAt(sort: Desc)])
  @@index([status])
  @@map("responses")
}
```

**Migration:**

```sql
-- Prisma will generate this, but for reference:
ALTER TABLE responses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Backfill existing rows
UPDATE responses SET version = 1 WHERE version IS NULL;

-- Optional: Add index for bulk operations
-- CREATE INDEX idx_responses_version ON responses(version);
```

**Service Code:**

```typescript
async updateResponseWithVersionLocking(
  responseId: string,
  authorId: string,
  expectedVersion: number,
  updateResponseDto: UpdateResponseDto,
): Promise<ResponseDto> {
  // 1. Fetch response
  const currentResponse = await this.prisma.response.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      authorId: true,
      version: true,
      createdAt: true,
      topic: { select: { status: true } },
    },
  });

  if (!currentResponse) {
    throw new NotFoundException(`Response with ID ${responseId} not found`);
  }

  // 2. Authorization check
  if (currentResponse.authorId !== authorId) {
    throw new ForbiddenException('You can only edit your own responses');
  }

  // 3. Check 24-hour edit window
  const now = new Date();
  const hoursElapsed = (now.getTime() - currentResponse.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursElapsed > 24) {
    throw new BadRequestException('Responses can only be edited within 24 hours of creation');
  }

  // 4. Optimistic lock check - version must match
  if (currentResponse.version !== expectedVersion) {
    throw new ConflictException(
      'Response has been modified by another user. Please refresh and try again.',
      {
        code: 'EDIT_CONFLICT',
        currentVersion: currentResponse.version,
        expectedVersion: expectedVersion,
      },
    );
  }

  // 5. Perform atomic update with version increment
  const updatedResponse = await this.prisma.response.update({
    where: { id: responseId },
    data: {
      content: updateResponseDto.content?.trim(),
      containsOpinion: updateResponseDto.containsOpinion,
      containsFactualClaims: updateResponseDto.containsFactualClaims,
      citedSources: updateResponseDto.citedSources ?
        updateResponseDto.citedSources.map((url) => ({
          url,
          title: null,
          extractedAt: new Date().toISOString(),
        })) : undefined,
      version: currentResponse.version + 1,        // Increment version
      revisionCount: { increment: 1 },
      // updatedAt auto-incremented by @updatedAt
    },
    include: {
      author: { select: { id: true, displayName: true } },
      propositions: {
        include: {
          proposition: { select: { id: true, statement: true } },
        },
      },
    },
  });

  return this.mapToResponseDto(updatedResponse);
}
```

**TypeScript DTO Updates:**

```typescript
// update-response.dto.ts
export class UpdateResponseDto {
  content?: string;
  containsOpinion?: boolean;
  containsFactualClaims?: boolean;
  citedSources?: string[];
  propositionIds?: string[];
  expectedVersion: number; // NEW: Client sends current version for optimistic lock
}

// response.dto.ts
export interface ResponseDto {
  id: string;
  content: string;
  authorId: string;
  parentId: string | null;
  author?: UserSummaryDto;
  citedSources?: CitedSourceDto[];
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  propositions?: PropositionDto[];
  status: string;
  revisionCount: number;
  version: number; // NEW: Return current version to client
  createdAt: Date;
  updatedAt: Date;
}
```

**Pros:**

- Explicit version field (clear semantics)
- No millisecond precision issues
- Enables version-based caching
- Clear edit causality tracking
- Simple client implementation (increment + send)
- PostgreSQL-native support

**Cons:**

- Requires schema migration
- One additional integer column per response
- Must manage version increment in application code

---

### Pattern C: PostgreSQL Row-Level Locking (Pessimistic - Not Recommended)

#### Description

Use PostgreSQL's `FOR UPDATE` locking to acquire exclusive locks on rows during read-then-write operations.

#### Implementation

```typescript
async updateResponseWithRowLocking(
  responseId: string,
  authorId: string,
  updateResponseDto: UpdateResponseDto,
): Promise<ResponseDto> {
  // Use Prisma $queryRaw for row-level locking
  const [currentResponse] = await this.prisma.$queryRaw<any[]>`
    SELECT id, author_id, version, created_at, updated_at
    FROM responses
    WHERE id = ${responseId}
    FOR UPDATE  -- Acquire exclusive lock, blocking other writers
  `;

  if (!currentResponse) {
    throw new NotFoundException(`Response with ID ${responseId} not found`);
  }

  if (currentResponse.author_id !== authorId) {
    throw new ForbiddenException('You can only edit your own responses');
  }

  // Now safe to update (lock held until transaction commits)
  const updatedResponse = await this.prisma.response.update({
    where: { id: responseId },
    data: {
      content: updateResponseDto.content?.trim(),
      version: currentResponse.version + 1,
      revisionCount: { increment: 1 },
    },
  });

  return this.mapToResponseDto(updatedResponse);
}
```

**Pros:**

- Eliminates all race conditions
- True mutual exclusion
- Database-native solution

**Cons:**

- **Blocks readers/writers** during the entire edit operation
- High contention under concurrent edits
- Reduces throughput significantly
- Not suitable for high-concurrency scenarios
- **Not recommended for this use case** (responses are edited frequently in discussion contexts)

---

## 3. Error Handling & User Experience

### Recommended Conflict Resolution Strategy

**Client receives:**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Response has been modified by another user. Please refresh and try again.",
  "details": {
    "code": "EDIT_CONFLICT",
    "currentVersion": 5,
    "yourVersion": 3
  },
  "preserveUserInput": true
}
```

**Client-side Flow:**

```typescript
// responses-edit.component.ts
async onSaveResponse(content: string, version: number) {
  try {
    await this.responsesService.updateResponse(this.responseId, {
      content,
      expectedVersion: version,
    });
    this.showSuccessMessage('Response updated successfully');
  } catch (error: any) {
    if (error.error?.details?.code === 'EDIT_CONFLICT') {
      // Show conflict dialog
      this.showConflictDialog({
        message: 'This response was edited by someone else while you were editing.',
        currentVersion: error.error.details.currentVersion,
        userVersion: error.error.details.yourVersion,
        userContent: this.editorContent, // Preserve user's edits
      });

      // Give user options:
      // 1. "Refresh & Retry" - reload latest version
      // 2. "View Changes" - show diff between versions
      // 3. "Save as New Reply" - create a reply instead
      // 4. "Discard" - abandon edits
    } else {
      this.showErrorMessage('Failed to update response');
    }
  }
}

async refreshAndRetry() {
  // Fetch latest response version
  const latest = await this.responsesService.getResponse(this.responseId);

  // Show merge dialog if user has edits
  if (this.hasUserEdits) {
    this.showMergeDialog(latest, this.editorContent);
  } else {
    this.responseContent = latest.content;
    this.responseVersion = latest.version;
  }
}
```

**HTTP Exception Class:**

```typescript
// conflict.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class ConflictException extends HttpException {
  constructor(
    message: string,
    details?: {
      code: string;
      currentVersion?: number;
      expectedVersion?: number;
      currentUpdatedAt?: Date;
    },
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message,
        details,
        preserveUserInput: true, // Signal to client to preserve input
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

---

## 4. Performance Implications

### Comparison Matrix

| Aspect                            | Version-based       | Timestamp-based     | Row Locking           |
| --------------------------------- | ------------------- | ------------------- | --------------------- |
| **Schema Changes**                | 1 column            | None                | None                  |
| **Query Overhead**                | ~1-2ms per update   | ~1-2ms per update   | ~5-10ms (blocking)    |
| **Space Overhead**                | 4 bytes per row     | 0 bytes             | 0 bytes               |
| **Conflict Detection**            | After write attempt | After write attempt | Before write          |
| **Throughput**                    | High (optimistic)   | High (optimistic)   | Low (blocked writers) |
| **Suitable for High Concurrency** | ✓ Yes               | ✓ Yes               | ✗ No                  |
| **Edit Window (24h)**             | Must enforce in app | Must enforce in app | Could enforce in DB   |

### Database Query Examples

**Current updateResponse (no locking):**

```sql
UPDATE responses
SET content = $1,
    revision_count = revision_count + 1,
    updated_at = NOW()
WHERE id = $2;
-- Risk: Lost update if another writer updated between SELECT and UPDATE
```

**With Version-based Locking:**

```sql
UPDATE responses
SET content = $1,
    version = version + 1,
    revision_count = revision_count + 1,
    updated_at = NOW()
WHERE id = $2 AND version = $3;
-- Safe: Version check ensures no concurrent updates
-- Result: rowCount = 0 if conflict detected
```

**Verification in Prisma:**

```typescript
// After update, check if any rows were affected
const result = await this.prisma.response.updateMany({
  where: {
    id: responseId,
    version: expectedVersion, // Optimistic lock condition
  },
  data: {
    version: { increment: 1 },
    content: newContent,
  },
});

if (result.count === 0) {
  // No rows updated = version mismatch
  throw new ConflictException('Edit conflict detected');
}
```

---

## 5. Migration Requirements

### Step 1: Add Version Column

```bash
# Generate migration
npx prisma migrate dev --name add_response_version_column
```

**Generated migration file:**

```sql
-- migrations/[timestamp]_add_response_version_column/migration.sql

ALTER TABLE responses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Backfill existing rows with version 1
-- (Prisma handles this with DEFAULT 1)
```

### Step 2: Update Schema

```prisma
// packages/db-models/prisma/schema.prisma

model Response {
  id                    String         @id @default(uuid()) @db.Uuid
  topicId               String         @map("topic_id") @db.Uuid
  authorId              String         @map("author_id") @db.Uuid
  parentId              String?        @map("parent_id") @db.Uuid
  content               String         @db.Text
  citedSources          Json?          @map("cited_sources")
  containsOpinion       Boolean        @default(false) @map("contains_opinion")
  containsFactualClaims Boolean        @default(false) @map("contains_factual_claims")
  status                ResponseStatus @default(VISIBLE)
  revisionCount         Int            @default(0) @map("revision_count")
  version               Int            @default(1)              // NEW
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  // ... relations unchanged ...
}
```

### Step 3: Update Service Layer

```typescript
// responses.service.ts - Replace updateResponse with version-locked variant
async updateResponse(
  responseId: string,
  authorId: string,
  updateResponseDto: UpdateResponseDtoWithVersion,  // Now includes expectedVersion
): Promise<ResponseDto> {
  // ... (as shown in Pattern B above)
}
```

### Step 4: Update Controller & DTOs

```typescript
// update-response.dto.ts
export class UpdateResponseDto {
  content?: string;
  containsOpinion?: boolean;
  containsFactualClaims?: boolean;
  citedSources?: string[];
  propositionIds?: string[];
  expectedVersion: number; // NEW: Required for optimistic lock
}

// response.dto.ts
export interface ResponseDto {
  // ... existing fields ...
  version: number; // NEW: Include version in response
}
```

### Step 5: Database & App Tests

```bash
# Push schema to dev database
npx pnpm run db:push

# Run migration tests
npx pnpm run test:migrations

# Run application tests (test suite will validate version handling)
npx pnpm run test
```

---

## 6. Testing Strategy

### Unit Tests

```typescript
// responses.service.optimistic-locking.test.ts
describe('ResponsesService - Optimistic Locking', () => {
  describe('updateResponse with version locking', () => {
    it('should update response when version matches', async () => {
      const response = createMockResponse({ version: 5 });
      mockPrisma.response.findUnique.mockResolvedValue(response);
      mockPrisma.response.update.mockResolvedValue({
        ...response,
        version: 6,
        content: 'Updated content',
      });

      const result = await service.updateResponse('response-1', 'user-1', {
        content: 'Updated content',
        expectedVersion: 5,
      });

      expect(result.version).toBe(6);
      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        data: expect.objectContaining({
          version: 6, // Incremented
        }),
      });
    });

    it('should reject update when version mismatches', async () => {
      const response = createMockResponse({ version: 7 });
      mockPrisma.response.findUnique.mockResolvedValue(response);

      await expect(
        service.updateResponse('response-1', 'user-1', {
          content: 'Updated content',
          expectedVersion: 5, // Mismatch: actual is 7
        }),
      ).rejects.toThrow('Response has been modified by another user');
    });

    it('should include version in response DTO', async () => {
      const response = createMockResponse({ version: 3 });
      mockPrisma.response.findUnique.mockResolvedValue(response);

      const result = mapToResponseDto(response);

      expect(result.version).toBe(3);
    });
  });

  describe('24-hour edit window', () => {
    it('should reject edit after 24 hours', async () => {
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - 25); // 25 hours ago

      const response = createMockResponse({ createdAt, version: 1 });
      mockPrisma.response.findUnique.mockResolvedValue(response);

      await expect(
        service.updateResponse('response-1', 'user-1', {
          content: 'Updated content',
          expectedVersion: 1,
        }),
      ).rejects.toThrow('Responses can only be edited within 24 hours');
    });

    it('should allow edit within 24 hours', async () => {
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - 23); // 23 hours ago

      const response = createMockResponse({ createdAt, version: 1 });
      mockPrisma.response.findUnique.mockResolvedValue(response);
      mockPrisma.response.update.mockResolvedValue({ ...response, version: 2 });

      const result = await service.updateResponse('response-1', 'user-1', {
        content: 'Updated content',
        expectedVersion: 1,
      });

      expect(result.version).toBe(2);
    });
  });
});
```

### Integration Tests

```typescript
// responses.service.integration.test.ts
describe('ResponsesService - Integration Tests', () => {
  describe('concurrent edit simulation', () => {
    it('should detect concurrent edits', async () => {
      // Setup: Create a response
      const topic = await prisma.discussionTopic.create({
        data: {
          title: 'Test Topic',
          description: 'Test',
          creatorId: userId,
          status: 'ACTIVE',
        },
      });

      const response = await prisma.response.create({
        data: {
          topicId: topic.id,
          authorId: userId,
          content: 'Original content',
          version: 1,
        },
      });

      // Simulate User A reads response (version 1)
      const userAVersion = response.version;

      // Simulate User B reads response (version 1)
      const userBVersion = response.version;

      // User A edits successfully
      const userAUpdate = await service.updateResponse(response.id, userId, {
        content: 'Updated by User A',
        expectedVersion: userAVersion, // Matches current (1)
      });
      expect(userAUpdate.version).toBe(2); // Version incremented

      // User B tries to edit with outdated version
      await expect(
        service.updateResponse(response.id, userId, {
          content: 'Updated by User B',
          expectedVersion: userBVersion, // Still 1, but actual is now 2
        }),
      ).rejects.toThrow('Response has been modified');
    });
  });
});
```

---

## 7. Implementation Checklist

- [ ] **Schema Migration**

  - [ ] Add `version INT DEFAULT 1` column to responses table
  - [ ] Run `prisma migrate dev`
  - [ ] Update `schema.prisma` with version field

- [ ] **Service Layer Updates**

  - [ ] Create `ConflictException` class
  - [ ] Update `updateResponse()` method with version-based locking
  - [ ] Add 24-hour edit window validation
  - [ ] Update DTOs to include `expectedVersion` and `version`

- [ ] **API Controller Updates**

  - [ ] Accept `expectedVersion` in request body
  - [ ] Return `version` in response DTOs
  - [ ] Handle `ConflictException` in error middleware

- [ ] **Client-Side Updates**

  - [ ] Fetch version with response
  - [ ] Send version in update requests
  - [ ] Handle 409 Conflict responses
  - [ ] Show conflict dialogs with merge options
  - [ ] Preserve user input on conflict

- [ ] **Testing**

  - [ ] Unit tests for version lock logic
  - [ ] Integration tests for concurrent edits
  - [ ] 24-hour window validation tests
  - [ ] Error handling tests

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Document error codes and client handling
  - [ ] Add migration guide for deployment

---

## 8. Decision Summary

### Recommendation: **Version-based Optimistic Locking**

**Why this approach:**

1. **Minimal overhead** - One 4-byte integer column
2. **Simple semantics** - Clear version tracking
3. **High throughput** - Optimistic approach scales better
4. **Clear error handling** - Distinct version mismatch signals
5. **PostgreSQL-friendly** - Native integer comparison
6. **Future-proof** - Enables version-based caching, audit trails

**Alternative Acceptable:** Timestamp-based (if migration is not viable)

**Not Recommended:** Row-level locking (pessimistic, blocks writers)

---

## 9. Code Example: Complete Implementation

### Full Updated Service Method

```typescript
// responses.service.ts
async updateResponse(
  responseId: string,
  authorId: string,
  updateResponseDto: UpdateResponseDto,
): Promise<ResponseDto> {
  // 1. Fetch the existing response
  const existingResponse = await this.prisma.response.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      authorId: true,
      version: true,
      createdAt: true,
      status: true,
      topic: {
        select: { status: true },
      },
    },
  });

  if (!existingResponse) {
    throw new NotFoundException(`Response with ID ${responseId} not found`);
  }

  // 2. Authorization check
  if (existingResponse.authorId !== authorId) {
    throw new ForbiddenException('You can only edit your own responses');
  }

  // 3. Check edit window constraint
  const now = new Date();
  const msElapsed = now.getTime() - existingResponse.createdAt.getTime();
  const hoursElapsed = msElapsed / (1000 * 60 * 60);

  if (hoursElapsed > 24) {
    throw new BadRequestException(
      'Responses can only be edited within 24 hours of creation',
    );
  }

  // 4. Check response status
  if (existingResponse.status === 'HIDDEN' || existingResponse.status === 'REMOVED') {
    throw new BadRequestException(
      `Cannot edit responses with status: ${existingResponse.status}`,
    );
  }

  // 5. Check topic status
  if (existingResponse.topic.status === 'ARCHIVED') {
    throw new BadRequestException('Cannot edit responses in archived topics');
  }

  // 6. Validate content
  if (updateResponseDto.content !== undefined) {
    const content = updateResponseDto.content.trim();
    if (content.length < 10) {
      throw new BadRequestException('Response content must be at least 10 characters');
    }
    if (content.length > 10000) {
      throw new BadRequestException('Response content must not exceed 10000 characters');
    }
  }

  // 7. OPTIMISTIC LOCK: Verify version hasn't changed
  if (existingResponse.version !== updateResponseDto.expectedVersion) {
    throw new ConflictException(
      'Response has been modified by another user. Please refresh and try again.',
      {
        code: 'EDIT_CONFLICT',
        currentVersion: existingResponse.version,
        expectedVersion: updateResponseDto.expectedVersion,
      },
    );
  }

  // 8. Prepare update data
  const updateData: any = {
    version: existingResponse.version + 1,  // Increment version
    revisionCount: { increment: 1 },
  };

  if (updateResponseDto.content !== undefined) {
    updateData.content = updateResponseDto.content.trim();
  }

  if (updateResponseDto.containsOpinion !== undefined) {
    updateData.containsOpinion = updateResponseDto.containsOpinion;
  }

  if (updateResponseDto.containsFactualClaims !== undefined) {
    updateData.containsFactualClaims = updateResponseDto.containsFactualClaims;
  }

  if (updateResponseDto.citedSources !== undefined) {
    updateData.citedSources =
      updateResponseDto.citedSources.length > 0
        ? updateResponseDto.citedSources.map((url) => ({
            url,
            title: null,
            extractedAt: new Date().toISOString(),
          }))
        : null;
  }

  // 9. Perform update (Prisma auto-updates @updatedAt)
  const updatedResponse = await this.prisma.response.update({
    where: { id: responseId },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
        },
      },
      propositions: {
        include: {
          proposition: {
            select: {
              id: true,
              statement: true,
            },
          },
        },
      },
    },
  });

  // 10. Handle proposition associations if provided
  if (updateResponseDto.propositionIds !== undefined) {
    await this.prisma.responseProposition.deleteMany({
      where: { responseId },
    });

    if (updateResponseDto.propositionIds.length > 0) {
      await this.prisma.responseProposition.createMany({
        data: updateResponseDto.propositionIds.map((propositionId) => ({
          responseId,
          propositionId,
        })),
        skipDuplicates: true,
      });
    }

    const responseWithPropositions = await this.prisma.response.findUnique({
      where: { id: responseId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(responseWithPropositions!);
  }

  return this.mapToResponseDto(updatedResponse);
}
```

---

## 10. References & Resources

### Prisma Optimistic Concurrency Control

- Prisma Docs: https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access
- Pattern: Version-based concurrency control in ORMs

### PostgreSQL Locking

- PostgreSQL Docs: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- Row-level locking (pessimistic approach)

### Conflict Resolution Best Practices

- Google Docs-style conflict handling
- CRDTs (Conflict-free Replicated Data Types)
- Edit distance and merge strategies

---

## Conclusion

**Version-based optimistic locking with Prisma 6.3.1 is the recommended approach** for preventing concurrent edit conflicts in the discussion responses system. It provides:

- Minimal schema changes (1 column)
- Clear conflict detection
- Excellent performance under typical edit loads
- Straightforward client-side integration
- PostgreSQL compatibility

The implementation is low-risk and can be deployed with a single migration, making it ideal for the 24-hour edit window constraint where conflicts are expected to be rare but must be handled gracefully.
