# Service Extraction Design

**Issue:** #1169 - Continue refactoring large services
**Date:** 2026-04-06
**Status:** Approved

## Problem

Two large service files have grown difficult to test and maintain:
- `topics.service.ts` - 1,525 lines
- `responses.service.ts` - 1,109 lines

## Solution

Extract focused services from both files while maintaining the existing public API through delegation.

## Architecture

### Before
```
TopicsService (1,525 lines) ─── handles everything
ResponsesService (1,109 lines) ─── handles everything
```

### After
```
TopicsService (~800 lines)
  ├── delegates to → TopicMergeService (new)
  ├── delegates to → TopicStatusService (new)
  └── delegates to → TopicCommonGroundService (new)

ResponsesService (~900 lines)
  └── delegates to → ResponseThreadingService (new)
```

**Key principle:** Parent services retain their public methods and inject the new services. This means:
- No controller changes needed
- No breaking changes to API
- Tests can be migrated incrementally

## Extracted Services

### TopicMergeService (~250 lines)

**Location:** `services/discussion-service/src/topics/topic-merge.service.ts`

**Methods:**
- `mergeTopics(moderatorId, mergeDto)` - Merge multiple source topics into target
- `rollbackTopicMerge(moderatorId, topicId, mergeHistoryId)` - Undo a merge operation

**Dependencies:** PrismaService only (self-contained transaction logic)

**Why extract:** Complex transaction with snapshots, validation, and rollback - a distinct domain concern separate from basic CRUD.

### TopicStatusService (~200 lines)

**Location:** `services/discussion-service/src/topics/topic-status.service.ts`

**Methods:**
- `updateStatus(topicId, userId, newStatus, isModerator, reason?)` - Handle status transitions with business rules

**Dependencies:** PrismaService, CacheManager

**Why extract:** Status transitions have complex rules (SEEDING→ACTIVE→ARCHIVED→LOCKED) with different permissions for creators vs moderators. Isolating this makes the state machine testable.

### TopicCommonGroundService (~100 lines)

**Location:** `services/discussion-service/src/topics/topic-common-ground.service.ts`

**Methods:**
- `getAnalysis(topicId)` - Fetch common ground analysis with caching
- `invalidateCache(topicId)` - Clear cached analysis

**Dependencies:** PrismaService, CacheManager

**Why extract:** Common ground is a distinct feature that could grow; isolating cache logic improves testability.

### ResponseThreadingService (~150 lines)

**Location:** `services/discussion-service/src/responses/response-threading.service.ts`

**Methods:**
- `replyToResponse(parentId, userId, replyDto)` - Create threaded reply with depth validation
- `calculateThreadDepth(responseId)` - Walk parent chain to determine depth
- `buildThreadTree(responses)` - Convert flat list to nested tree structure

**Dependencies:** PrismaService only

**Why extract:** Threading is a self-contained concern with its own data structure (ThreadedResponse) and depth limits.

## File Structure

### New Files to Create

```
services/discussion-service/src/topics/
├── topic-merge.service.ts              # NEW
├── topic-merge.service.test.ts         # NEW
├── topic-status.service.ts             # NEW
├── topic-status.service.test.ts        # NEW
├── topic-common-ground.service.ts      # NEW
├── topic-common-ground.service.test.ts # NEW
└── topics.module.ts                    # MODIFY (add providers)

services/discussion-service/src/responses/
├── response-threading.service.ts       # NEW
├── response-threading.service.test.ts  # NEW
└── responses.module.ts                 # MODIFY (add provider)
```

### Module Registration

**topics.module.ts changes:**
```typescript
@Module({
  providers: [
    TopicsService,
    TopicMergeService,        // NEW
    TopicStatusService,       // NEW
    TopicCommonGroundService, // NEW
    // ... existing providers
  ],
  exports: [
    TopicsService,
    // New services not exported - internal use only
  ],
})
```

**responses.module.ts changes:**
```typescript
@Module({
  providers: [
    ResponsesService,
    ResponseThreadingService,  // NEW
    // ... existing providers
  ],
})
```

### Injection Pattern

The parent services inject the new services and delegate:

```typescript
// topics.service.ts
constructor(
  private mergeService: TopicMergeService,
  private statusService: TopicStatusService,
  private commonGroundService: TopicCommonGroundService,
  // ... existing deps
) {}

async mergeTopics(moderatorId: string, dto: MergeTopicsDto) {
  return this.mergeService.mergeTopics(moderatorId, dto);
}
```

## Testing Strategy

### Test Migration Approach

**Existing tests stay in place initially.** The parent services delegate to new services, so existing tests continue to pass through the delegation.

**New unit tests** for each extracted service test the isolated logic:

| New Test File | Focus |
|---------------|-------|
| `topic-merge.service.test.ts` | Transaction rollback, validation, snapshot creation |
| `topic-status.service.test.ts` | State machine transitions, permission checks |
| `topic-common-ground.service.test.ts` | Cache hit/miss, invalidation |
| `response-threading.service.test.ts` | Depth calculation, tree building, orphan handling |

### Mock Strategy

Each new service gets its own mock in tests:

```typescript
// Example: testing TopicsService with mocked dependencies
const mockMergeService = {
  mergeTopics: vi.fn(),
  rollbackTopicMerge: vi.fn(),
};

// Inject mock, verify delegation
expect(mockMergeService.mergeTopics).toHaveBeenCalledWith(moderatorId, dto);
```

### No Breaking Changes

- All existing `topics.service.test.ts` tests pass unchanged (delegation is transparent)
- All existing `responses.service.test.ts` tests pass unchanged
- Integration tests unaffected (API unchanged)

## Expected Outcome

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| `topics.service.ts` | 1,525 lines | ~800 lines | ~48% |
| `responses.service.ts` | 1,109 lines | ~900 lines | ~19% |

Total new code: ~700 lines across 4 new service files with focused responsibilities.
