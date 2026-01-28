# Prisma Soft Delete Implementation Research

**Date**: 2026-01-27
**Feature**: Discussion Participation (Feature 009)
**Context**: Conditional soft delete for discussion responses - show "[deleted by author]" placeholder when responses have replies, hard-delete when no replies exist

## Executive Summary

This research document provides a complete implementation roadmap for soft deletes in Prisma, specifically tailored for the Response model in reasonBridge. The implementation will use **Prisma Client Extensions** (modern approach replacing deprecated middleware) with conditional logic to soft-delete responses with children and hard-delete responses without children.

**Key Decision**: Use Prisma Client Extensions with conditional delete logic rather than traditional middleware, as middleware was deprecated in Prisma v4.16.0 and removed in v6.14.0.

---

## 1. Investigation of Prisma Soft Delete Patterns

### 1.1 Evolution of Prisma Soft Delete Approaches

**Historical Approach (Deprecated)**:

- Prior to Prisma v4.16.0: Used `$use()` middleware method
- v4.16.0 - v5.x: Middleware marked as deprecated with deprecation warnings
- v6.0.0+: Middleware completely removed

**Current Best Practice**:

- Use `$extends()` with custom client extensions
- Define soft delete behavior at the Prisma client level
- Automatically filter soft-deleted records from all queries

### 1.2 Prisma Extension Architecture

Prisma client extensions provide:

1. **Query Extension**: Intercepts and modifies queries (findMany, findFirst, findUnique, count, update, delete, deleteMany)
2. **Model-Level Filtering**: Apply custom logic to specific models
3. **Override Mechanisms**: Allow queries to opt-in/opt-out of soft delete filtering
4. **Recursive Filtering**: Automatically filter nested relations

---

## 2. Conditional Delete Logic for Responses

### 2.1 Requirements from Feature Spec

From `/specs/009-discussion-participation/spec.md`:

- **FR-014**: System MUST allow users to delete their own responses at any time
- **FR-015**: System MUST replace deleted responses that have child replies with a "[deleted by author]" placeholder to maintain thread integrity
- **FR-016**: System MUST completely remove deleted responses that have no child replies
- **FR-029**: System MUST maintain referential integrity when discussions or responses are deleted
- **FR-030**: System MUST prevent orphaned responses by cascading deletes appropriately

### 2.2 Implementation Strategy

**Conditional Deletion Logic**:

```
When user deletes a Response:
├─ Check if response has child replies (replies.length > 0)
│  ├─ YES: Execute SOFT DELETE
│  │  └─ Set deletedAt = now()
│  │  └─ Set content = "[deleted by author]"
│  │  └─ Keep authorId, createdAt, updatedAt intact
│  │  └─ Maintain all relations (Feedback, Votes, FactCheckResults)
│  │
│  └─ NO: Execute HARD DELETE
│     └─ Delete record completely from database
│     └─ Cascade delete related records (Feedback, Votes, FactCheckResults, ResponseProposition)
│     └─ Update parent response (if exists)
```

**Why This Approach**:

- Preserves thread integrity: Readers can still see the conversation flow
- Respects user privacy: Author can delete their content if no one replied
- Maintains data consistency: No orphaned replies
- Supports common ground analysis: Responses with citations aren't lost abruptly

---

## 3. Query Filtering Patterns for Soft-Deleted Records

### 3.1 Default Filtering Behavior

**All queries should automatically exclude soft-deleted responses** unless explicitly requested:

```typescript
// Automatic filtering (soft-deleted excluded)
const responses = await prisma.response.findMany({
  where: { topicId: '123' },
});
// Internal query becomes:
// WHERE topic_id = '123' AND deleted_at IS NULL

// Explicit inclusion (include soft-deleted)
const allResponses = await prisma.response.findMany({
  where: { topicId: '123' },
  includeDeleted: true, // Custom extension flag
});

// Only soft-deleted (for auditing/moderation)
const deletedResponses = await prisma.response.findMany({
  where: { topicId: '123' },
  onlyDeleted: true, // Custom extension flag
});
```

### 3.2 Filtering at Query Levels

**Find Operations**:

- `findMany()`: Exclude soft-deleted by default
- `findFirst()`: Exclude soft-deleted by default
- `findUnique()`: Exclude soft-deleted by default (unless ID explicitly targeting a deleted record)
- `count()`: Exclude soft-deleted by default

**Update Operations**:

- `update()`: Can update soft-deleted records (for un-delete operations)
- `updateMany()`: Exclude from query scope unless explicitly bypassed

**Nested Relations**:

```typescript
// Filtering applies to nested includes/selects
const topic = await prisma.discussionTopic.findUnique({
  where: { id: '123' },
  include: {
    responses: {
      // Automatically excludes soft-deleted responses
      where: {
        /* user filters */
      },
    },
  },
});
```

### 3.3 N+1 Query Prevention

**Problem**: Checking reply count for every response creates N+1 queries

**Solution**: Use Prisma's count aggregate in initial query:

```typescript
const responsesWithReplyCount = await prisma.response.findMany({
  where: { topicId },
  select: {
    id: true,
    content: true,
    authorId: true,
    _count: {
      select: { replies: true }, // Single aggregation query
    },
  },
});

// Determine soft vs hard delete based on _count.replies
responsesWithReplyCount.forEach((r) => {
  if (r._count.replies > 0) {
    // SOFT DELETE
  } else {
    // HARD DELETE
  }
});
```

**Alternative with Relations**:

```typescript
const response = await prisma.response.findUnique({
  where: { id: responseId },
  include: {
    replies: {
      select: { id: true }, // Only fetch IDs, not full records
    },
  },
});

const hasReplies = response.replies.length > 0;
```

---

## 4. Cascade Delete Behaviors with Soft Deletes

### 4.1 Current Prisma Schema

**Response Model Relations**:

```prisma
model Response {
  // ... fields ...

  // Reverse relations
  parent    Response?              @relation("ResponseThreading", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Response[]             @relation("ResponseThreading")

  // Child relations with Cascade onDelete
  propositions    ResponseProposition[]
  feedback        Feedback[]
  factCheckResults FactCheckResult[]
  votes           Vote[]
}
```

**Current Behavior**:

- When a Response is deleted via `deleteMany()`, PostgreSQL CASCADE triggers delete of Feedback, Vote, FactCheckResult, ResponseProposition
- When Response is deleted with children, responses in "ResponseThreading" relation have `onDelete: Cascade` but responses can't cascade-delete themselves

### 4.2 Cascade Strategy with Soft Deletes

**Soft Delete Approach**:

When soft-deleting a Response:

1. ✅ Keep all related records (Feedback, Votes, FactCheckResults)
2. ✅ Keep reply relationships intact (replies still reference parent)
3. ✅ Keep parent reference intact
4. ⚠️ Mark response as deleted, set content to placeholder

**Hard Delete Approach** (for responses without replies):

When hard-deleting a Response:

1. Let Prisma CASCADE handle child deletes:
   - Delete ResponseProposition records
   - Delete Feedback records
   - Delete Vote records
   - Delete FactCheckResult records
2. ✅ Delete Response record itself
3. ✅ Replies are handled by separate logic (they become orphans or are reparented)

### 4.3 Managing Reply Orphaning

**Challenge**: If parent Response is hard-deleted, child replies become orphans

**Solution Options**:

**Option A: Cascade Delete Replies** (Data Loss)

```prisma
parent Response? @relation("ResponseThreading", fields: [parentId], references: [id], onDelete: Cascade)
```

- Pro: No orphans
- Con: Deleting one response deletes entire subtree

**Option B: Set Parent to Null** (Less Common)

```prisma
parent Response? @relation("ResponseThreading", fields: [parentId], references: [id], onDelete: SetNull)
parentId String? @map("parent_id") @db.Uuid
```

- Pro: Preserves replies as top-level responses
- Con: Changes discussion structure unexpectedly

**Option C: Soft Delete Only (RECOMMENDED)**

- Keep parent references intact
- Never hard-delete if replies exist
- Only hard-delete orphaned responses (no replies, no parent)
- Application-level logic prevents cascade issues

**Implementation**:

```typescript
async deleteResponse(responseId: string, authorId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: {
      authorId: true,
      _count: { select: { replies: true } }
    }
  });

  if (response.authorId !== authorId) {
    throw new ForbiddenException('Can only delete own responses');
  }

  if (response._count.replies > 0) {
    // SOFT DELETE - preserve thread structure
    return prisma.response.update({
      where: { id: responseId },
      data: {
        deletedAt: new Date(),
        content: '[deleted by author]'
      }
    });
  } else {
    // HARD DELETE - safe to remove completely
    return prisma.response.delete({
      where: { id: responseId }
    });
  }
}
```

---

## 5. Recommended Soft Delete Implementation

### 5.1 Schema Migration

**Add `deletedAt` field to Response model**:

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
  deletedAt             DateTime?      @map("deleted_at")  // NEW FIELD
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  // ... rest of model ...

  @@index([topicId, deletedAt]) // NEW INDEX for filtered queries
  @@map("responses")
}
```

**Prisma Migration**:

```bash
npx prisma migrate dev --name add_soft_delete_to_responses
```

**Generated SQL**:

```sql
ALTER TABLE "responses" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "responses_topic_id_deleted_at_idx" ON "responses"("topic_id", "deleted_at");
```

### 5.2 Prisma Client Extension

**File**: `/packages/db-models/src/extensions/soft-delete.extension.ts`

```typescript
import { Prisma } from '@prisma/client';

/**
 * Type definitions for soft delete extension
 */
interface SoftDeleteExtensionOptions {
  models: {
    [key: string]: true;
  };
}

/**
 * Soft delete extension with conditional hard/soft delete logic
 * Automatically filters out soft-deleted records from all queries
 * Allows override with includeDeleted: true or onlyDeleted: true
 */
export function createSoftDeleteExtension(
  options: SoftDeleteExtensionOptions = {
    models: {
      Response: true,
      // Can add more models here: User: true, Topic: true
    },
  },
) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        // Handle all soft-deletable models
        ...Object.keys(options.models).reduce(
          (result, model) => {
            result[model] = {
              // findMany - exclude soft-deleted by default
              findMany: async ({ args, query }) => {
                // Add default filter to exclude soft-deleted
                if (args.where) {
                  args.where = {
                    AND: [args.where, { deletedAt: null }],
                  };
                } else {
                  args.where = { deletedAt: null };
                }

                // Check for override flags
                const { includeDeleted, onlyDeleted } = args.where as any;
                if (includeDeleted) {
                  // Remove the override flag from query
                  delete args.where.includeDeleted;
                } else if (onlyDeleted) {
                  // Replace filter with IS NOT NULL
                  delete args.where.onlyDeleted;
                  args.where = {
                    AND: [args.where, { deletedAt: { not: null } }],
                  };
                }

                return query(args);
              },

              // findUnique - exclude soft-deleted
              findUnique: async ({ args, query }) => {
                const { includeDeleted } = args.where as any;
                if (!includeDeleted) {
                  args.where = {
                    ...args.where,
                    deletedAt: null,
                  };
                } else {
                  delete args.where.includeDeleted;
                }
                return query(args);
              },

              // findFirst - exclude soft-deleted
              findFirst: async ({ args, query }) => {
                if (args.where) {
                  args.where = {
                    AND: [args.where, { deletedAt: null }],
                  };
                } else {
                  args.where = { deletedAt: null };
                }

                const { includeDeleted, onlyDeleted } = args.where as any;
                if (includeDeleted) {
                  delete args.where.includeDeleted;
                } else if (onlyDeleted) {
                  delete args.where.onlyDeleted;
                  args.where = {
                    AND: [args.where, { deletedAt: { not: null } }],
                  };
                }

                return query(args);
              },

              // count - exclude soft-deleted
              count: async ({ args, query }) => {
                if (args.where) {
                  args.where = {
                    AND: [args.where, { deletedAt: null }],
                  };
                } else {
                  args.where = { deletedAt: null };
                }

                const { includeDeleted } = args.where as any;
                if (includeDeleted) {
                  delete args.where.includeDeleted;
                }

                return query(args);
              },

              // update - can update soft-deleted records
              update: async ({ args, query }) => {
                // Allow updates to soft-deleted records for un-delete operations
                return query(args);
              },

              // delete - conditional soft/hard delete
              delete: async ({ args, query, model }) => {
                // This is the key deletion logic
                // Check if record has children before deciding soft vs hard delete
                const record = await client[model].findUnique({
                  where: args.where,
                  select: { id: true, _count: { select: { replies: true } } },
                });

                if (!record) {
                  throw new Error(`${model} record not found`);
                }

                if (record._count.replies > 0) {
                  // SOFT DELETE - has children
                  return client[model].update({
                    where: args.where,
                    data: {
                      deletedAt: new Date(),
                      content: '[deleted by author]',
                    },
                  });
                } else {
                  // HARD DELETE - no children
                  return query(args);
                }
              },

              // deleteMany - convert to updateMany for soft delete
              deleteMany: async ({ args, query }) => {
                // For safety, convert bulk deletes to soft deletes
                // (responses with replies can't be hard-deleted anyway)
                return client[model].updateMany({
                  where: args.where,
                  data: {
                    deletedAt: new Date(),
                    content: '[deleted by author]',
                  },
                });
              },
            };
            return result;
          },
          {} as Record<string, any>,
        ),
      },
    }),
  );
}
```

### 5.3 Prisma Service Integration

**File**: `/packages/db-models/src/client.ts` (modified)

```typescript
import { PrismaClient } from '@prisma/client';
import { createSoftDeleteExtension } from './extensions/soft-delete.extension.js';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const baseClient = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Apply soft delete extension
    prismaInstance = baseClient.$extends(
      createSoftDeleteExtension({
        models: {
          Response: true,
          // Can extend to other models
        },
      }),
    );
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

export function createPrismaClient(
  options?: ConstructorParameters<typeof PrismaClient>[0],
): PrismaClient {
  const client = new PrismaClient(options);
  return client.$extends(
    createSoftDeleteExtension({
      models: { Response: true },
    }),
  );
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
```

---

## 6. Query Patterns for Excluding Soft-Deleted Records

### 6.1 Common Query Patterns

**Pattern 1: Get all responses for a topic (soft-deleted excluded automatically)**

```typescript
const responses = await prisma.response.findMany({
  where: { topicId },
  include: {
    author: { select: { id: true, displayName: true } },
    replies: true,
    feedback: true,
  },
  orderBy: { createdAt: 'asc' },
});
// deletedAt IS NULL is automatically applied
```

**Pattern 2: Get responses including soft-deleted (for moderation)**

```typescript
const allResponses = await prisma.response.findMany({
  where: { topicId },
  includeDeleted: true, // Override auto-filtering
});
```

**Pattern 3: Get only soft-deleted responses (for audit)**

```typescript
const deletedResponses = await prisma.response.findMany({
  where: { topicId },
  onlyDeleted: true, // Only fetch deleted records
});
```

**Pattern 4: Threaded conversation with soft-deleted handling**

```typescript
async getThreadTree(topicId: string) {
  const responses = await prisma.response.findMany({
    where: {
      topicId,
      parentId: null  // Top-level only
    },
    include: {
      author: { select: { id: true, displayName: true } },
      replies: {
        include: {
          author: { select: { id: true, displayName: true } },
          replies: {
            include: {
              author: { select: { id: true, displayName: true } }
              // replies: { ... }  // Nested recursively
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return responses;
  // All soft-deleted responses automatically excluded from includes
}
```

**Pattern 5: Count responses excluding soft-deleted**

```typescript
const activeResponseCount = await prisma.response.count({
  where: { topicId },
});
// deletedAt IS NULL is automatically applied
```

**Pattern 6: Check if response has child replies (before deletion)**

```typescript
const response = await prisma.response.findUnique({
  where: { id: responseId },
  select: {
    _count: { select: { replies: true } },
  },
});

const hasReplies = response._count.replies > 0;
```

### 6.2 Performance Optimization

**Indexed Queries**:

- All soft-deleted filtering uses the `deleted_at` index
- Combined indexes on `(topicId, deletedAt)` optimize topic queries
- Response queries are O(log n) with proper indexing

**Avoiding N+1 for Reply Counts**:

```typescript
// ✅ GOOD - Single aggregation query
const responses = await prisma.response.findMany({
  where: { topicId },
  select: {
    id: true,
    content: true,
    _count: { select: { replies: true } },
  },
});

// ❌ BAD - N+1 queries
const responses = await prisma.response.findMany({
  where: { topicId },
  include: { replies: true },
});

responses.forEach((r) => {
  console.log(r.replies.length); // Each row fetched separately
});
```

---

## 7. Migration for deletedAt/status Field

### 7.1 Migration Steps

**Step 1: Create migration file**

```bash
cd packages/db-models
npx prisma migrate dev --name add_soft_delete_to_responses
```

**Step 2: Auto-generated migration in `/packages/db-models/prisma/migrations/[timestamp]_add_soft_delete_to_responses/migration.sql`**

```sql
-- AddColumn
ALTER TABLE "responses" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "responses_topic_id_deleted_at_idx" ON "responses"("topic_id", "deleted_at");
```

**Step 3: Generate Prisma client**

```bash
npx prisma generate
```

**Step 4: Update types in all services**

```bash
# Rebuild all packages that depend on db-models
npm run build -w packages/db-models
npm run build -w services/discussion-service
npm run build -w services/user-service
```

### 7.2 Data Cleanup (Optional)

If migrating from hard-deleted records, populate `deletedAt`:

```sql
-- For responses marked as REMOVED in status enum
UPDATE "responses"
SET "deleted_at" = "updated_at"
WHERE status = 'REMOVED' AND "deleted_at" IS NULL;
```

### 7.3 Rollback Plan

If soft delete needs to be removed:

```bash
npx prisma migrate resolve --rolled-back add_soft_delete_to_responses
# Then manually restore hard-delete behavior
```

---

## 8. Cascade Behavior with Child Replies

### 8.1 Decision Matrix

| Scenario                                   | Action                                       | Reason                                                |
| ------------------------------------------ | -------------------------------------------- | ----------------------------------------------------- |
| User deletes response with replies         | SOFT DELETE (set deletedAt, replace content) | Preserve thread integrity, maintain conversation flow |
| User deletes response without replies      | HARD DELETE (remove record)                  | Respect user privacy, no orphaned data                |
| Admin hard-deletes due to policy violation | HARD DELETE + CASCADE                        | Policy enforcement, but warn if has replies           |
| Response author deleted their account      | Soft delete all their responses (auto)       | Preserve community value, anonymize author            |
| Common ground analysis references response | Prevent hard delete (app logic)              | Maintain analysis integrity                           |

### 8.2 Implementation Guards

```typescript
async deleteResponse(responseId: string, authorId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      replies: { select: { id: true } },
      factCheckResults: { select: { id: true } },
      feedback: { select: { id: true } }
    }
  });

  // Authorization check
  if (response.authorId !== authorId) {
    throw new ForbiddenException('Can only delete own responses');
  }

  // Guard: Prevent deletion if cited in fact-checks
  if (response.factCheckResults.length > 0) {
    throw new BadRequestException(
      'Cannot delete response with active fact-check citations. Contact support.'
    );
  }

  // Conditional delete logic
  if (response.replies.length > 0) {
    // SOFT DELETE - maintain thread
    return prisma.response.update({
      where: { id: responseId },
      data: {
        deletedAt: new Date(),
        content: '[deleted by author]',
        status: 'DELETED'  // If using status enum
      }
    });
  } else {
    // HARD DELETE - safe removal
    // Feedback cascade will be handled by Prisma onDelete: Cascade
    // Votes cascade will be handled by Prisma onDelete: Cascade
    // ResponseProposition cascade will be handled by Prisma onDelete: Cascade
    return prisma.response.delete({
      where: { id: responseId }
    });
  }
}
```

---

## 9. Compliance with Data Retention Policies

### 9.1 GDPR Compliance

**Right to Be Forgotten**:

- When user deletes account, all responses are soft-deleted
- If response has no replies, it can be hard-deleted after 30-day grace period
- If response has replies, keep placeholders indefinitely

**Data Minimization**:

- Soft-deleted responses only retain: id, deletedAt, content ("[deleted by author]")
- All PII removed from soft-deleted records
- Audit logs kept separately with retention policies

### 9.2 Platform-Specific Retention

**Response Retention Policy**:

- Hard-deleted responses: Removed immediately from production
- Soft-deleted without replies: Kept for 30 days, then hard-deleted
- Soft-deleted with replies: Kept indefinitely (thread integrity)
- Backup retention: 90 days (separate retention policy)

**Audit Trail**:

```sql
CREATE TABLE "response_deletion_audit" (
  id UUID PRIMARY KEY,
  response_id UUID NOT NULL,
  author_id UUID NOT NULL,
  deletion_type ENUM('SOFT', 'HARD') NOT NULL,
  had_replies BOOLEAN NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  deletion_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 10. Testing Strategies

### 10.1 Unit Tests for Soft Delete Logic

```typescript
describe('ResponseService - deleteResponse', () => {
  it('should soft delete response with replies', async () => {
    const response = await createResponseWithReplies();

    await service.deleteResponse(response.id, response.authorId);

    const deleted = await prisma.response.findUnique({
      where: { id: response.id },
      includeDeleted: true,
    });

    expect(deleted.deletedAt).toBeDefined();
    expect(deleted.content).toBe('[deleted by author]');
  });

  it('should hard delete response without replies', async () => {
    const response = await createResponse();

    await service.deleteResponse(response.id, response.authorId);

    const result = await prisma.response.findUnique({
      where: { id: response.id },
      includeDeleted: true,
    });

    expect(result).toBeNull();
  });

  it('should exclude soft-deleted from regular queries', async () => {
    const response = await createResponse();
    await service.deleteResponse(response.id, response.authorId);

    const responses = await prisma.response.findMany({
      where: { topicId: response.topicId },
    });

    expect(responses).not.toContainEqual(expect.objectContaining({ id: response.id }));
  });
});
```

### 10.2 Integration Tests

```typescript
describe('Discussion Thread - Soft Delete Integration', () => {
  it('should preserve thread structure when parent is soft-deleted', async () => {
    const parent = await createResponse();
    const child1 = await createResponse({ parentId: parent.id });
    const child2 = await createResponse({ parentId: parent.id });

    await service.deleteResponse(parent.id, parent.authorId);

    // Fetch thread with soft-deleted included
    const thread = await prisma.response.findUnique({
      where: { id: parent.id },
      includeDeleted: true,
      include: { replies: true },
    });

    expect(thread.replies).toHaveLength(2);
    expect(thread.content).toBe('[deleted by author]');
  });
});
```

### 10.3 E2E Tests

```typescript
test('User deletes response without replies - removes completely', async ({ page }) => {
  const response = await createTestResponse();

  await page.goto(`/discussions/${response.topicId}`);
  await page.click(`[data-testid="delete-response-${response.id}"]`);
  await page.click('[data-testid="confirm-delete"]');

  // Response should not be visible
  await expect(page.locator(`text=${response.content}`)).not.toBeVisible();
});

test('User deletes response with replies - shows placeholder', async ({ page }) => {
  const parent = await createTestResponse();
  const child = await createTestResponse({ parentId: parent.id });

  await page.goto(`/discussions/${parent.topicId}`);
  await page.click(`[data-testid="delete-response-${parent.id}"]`);
  await page.click('[data-testid="confirm-delete"]');

  // Placeholder should be visible
  await expect(page.locator('text=[deleted by author]')).toBeVisible();

  // Child reply should still be visible
  await expect(page.locator(`text=${child.content}`)).toBeVisible();
});
```

---

## 11. Implementation Checklist

- [ ] Add `deletedAt` field to Response model in Prisma schema
- [ ] Create migration: `prisma migrate dev --name add_soft_delete_to_responses`
- [ ] Create soft delete extension file: `/packages/db-models/src/extensions/soft-delete.extension.ts`
- [ ] Integrate extension into PrismaClient: Update `/packages/db-models/src/client.ts`
- [ ] Add soft delete index on `(topicId, deletedAt)` to schema
- [ ] Update ResponsesService.deleteResponse() with conditional logic
- [ ] Add unit tests for soft delete logic
- [ ] Add integration tests for thread preservation
- [ ] Add E2E tests for user deletion workflows
- [ ] Update API documentation (OpenAPI/Swagger)
- [ ] Add data retention policy documentation
- [ ] Test cascade delete behavior with test data
- [ ] Performance test with large thread datasets (1000+ responses)
- [ ] Audit trail implementation (optional)

---

## 12. Decision Records

### Decision 1: Use Prisma Client Extensions vs Middleware

**Status**: DECIDED
**Option A**: Prisma Middleware (deprecated)
**Option B**: Prisma Client Extensions ✅ CHOSEN
**Option C**: Manual filtering in all queries

**Rationale**:

- Middleware removed in Prisma v6.0, we're on v6.3.1
- Client extensions are the recommended modern approach
- Automatic filtering across all queries prevents accidental exposure
- Centralized logic easier to maintain

### Decision 2: Conditional Soft vs Hard Delete

**Status**: DECIDED
**Option A**: Always soft delete (preserve all data)
**Option B**: Always hard delete (clean removal)
**Option C**: Conditional based on replies ✅ CHOSEN

**Rationale**:

- Spec requirement FR-015 and FR-016 explicitly require this behavior
- Respects user privacy (hard delete when safe)
- Maintains thread integrity (soft delete with replies)
- Prevents orphaned data

### Decision 3: Index Strategy

**Status**: DECIDED
**Option A**: Single column index on `deletedAt`
**Option B**: Composite index `(topicId, deletedAt)` ✅ CHOSEN

**Rationale**:

- Most queries filter by both `topicId` AND exclude `deletedAt`
- Composite index covers both conditions in single B-tree traversal
- Reduces query cost from O(n log n) to O(log n)

---

## 13. References and Resources

### Prisma Documentation

- [Prisma Client Extensions Overview](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Middleware (Legacy) Documentation](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware)

### Community Resources

- [Soft Delete: Implementation Issues in Prisma and Solution in ZenStack](https://zenstack.dev/blog/soft-delete)
- [Soft Delete with Prisma using Partial Indexes - This Dot Labs](https://www.thisdot.co/blog/how-to-implement-soft-delete-with-prisma-using-partial-indexes)
- [True Soft Deletion in Prisma ORM](https://matranga.dev/true-soft-deletion-in-prisma-orm/)
- [API with NestJS #105. Implementing soft deletes with Prisma and middleware](http://wanago.io/2023/04/24/api-nestjs-prisma-soft-deletes/)
- [Soft Delete Extension - NPM](https://www.npmjs.com/package/prisma-soft-delete-middleware)
- [prisma-soft-delete-middleware GitHub](https://github.com/olivierwilkinson/prisma-soft-delete-middleware)

### Feature Specification

- [Discussion Participation Feature Spec](./specs/009-discussion-participation/spec.md)
  - FR-014: Allow deletion
  - FR-015: Soft delete with replies
  - FR-016: Hard delete without replies
  - FR-029: Maintain referential integrity
  - FR-030: Prevent orphaned responses

---

## Appendix A: Example Migration File

**File**: `packages/db-models/prisma/migrations/20260127_add_soft_delete_to_responses/migration.sql`

```sql
-- AlterTable
ALTER TABLE "responses" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex (for filtering soft-deleted records efficiently)
CREATE INDEX "responses_topic_id_deleted_at_idx" ON "responses"("topic_id", "deleted_at");

-- Add partial index for active responses (PostgreSQL optimization)
CREATE INDEX "responses_topic_id_active_idx" ON "responses"("topic_id")
  WHERE "deleted_at" IS NULL;
```

---

## Appendix B: Complete Extension Implementation

See Section 5.2 for the full `soft-delete.extension.ts` implementation with all CRUD operations covered.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: READY FOR IMPLEMENTATION
**Reviewer**: TBD
