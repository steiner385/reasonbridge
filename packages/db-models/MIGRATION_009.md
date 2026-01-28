# Feature 009: Discussion Participation - Migration Guide

**Feature**: Discussion Participation
**Date**: 2026-01-27
**Strategy**: 3-Phase Migration (Additive → Backfill → Finalize)

## Overview

This feature adds Discussion entity for specific conversation threads within topics, along with Citation and ParticipantActivity tracking. The Response model is extended with fields for optimistic locking (version), soft delete (deletedAt), and edit tracking (editedAt, editCount).

**Why 3 Phases?**

- **Phase 1 (Additive)**: Add new tables and nullable discussionId field without breaking existing data
- **Phase 2 (Backfill)**: Populate the discussionId field by linking existing responses to newly created discussions
- **Phase 3 (Finalize)**: Make discussionId NOT NULL and add foreign key constraint after backfill completes

## Phase 1: Additive Migration (T006)

**Status**: ✅ Schema updated, migration ready to generate

**Changes**:

1. Add new `DiscussionStatus` enum (ACTIVE, ARCHIVED, DELETED)
2. Add new `CitationValidationStatus` enum (ACTIVE, BROKEN, UNVERIFIED)
3. Create `Discussion` table with FK to `discussion_topics` and `users`
4. Create `Citation` table with FK to `responses`
5. Create `ParticipantActivity` table with FK to `discussions` and `users`
6. Extend `Response` model:
   - Add `discussionId` UUID (nullable) - will be backfilled in Phase 2
   - Add `version` INT DEFAULT 1 - optimistic locking counter
   - Add `deletedAt` TIMESTAMP NULL - soft delete timestamp
   - Add `editedAt` TIMESTAMP NULL - last edit timestamp
   - Add `editCount` INT DEFAULT 0 - edit counter
7. Add indexes:
   - `responses(discussionId, deletedAt)` - filter soft-deleted per discussion
   - `responses(deletedAt)` - global soft delete filter
   - `discussions(topicId, status, lastActivityAt DESC)` - sort discussions by activity
   - `citations(normalizedUrl)` - URL deduplication
   - `participant_activities(discussionId, userId)` - unique constraint

**To generate migration**:

```bash
cd packages/db-models
pnpm prisma migrate dev --name feature_009_phase1_additive
```

**Rollback plan**: Drop new tables and columns if needed before Phase 2.

---

## Phase 2: Data Backfill (T007)

**Status**: ✅ Script created at `scripts/backfill-discussions.ts`

**Prerequisites**:

- Phase 1 migration applied successfully
- Database backup created
- No active writes to responses table (optional: enable maintenance mode)

**Backfill Strategy**:

1. For each `DiscussionTopic`:
   - Create one `Discussion` with the topic's title
   - Link all existing `Response` records (where `discussionId IS NULL`) to this Discussion
   - Calculate and set `responseCount` from actual response count
   - Calculate and set `lastActivityAt` from most recent response
2. For each unique (discussionId, authorId) combination:
   - Create `ParticipantActivity` record
   - Set `firstContributionAt` from earliest response
   - Set `lastContributionAt` from most recent response
   - Set `responseCount` from actual count
3. Update Discussion `participantCount` from ParticipantActivity count
4. Validate: Ensure zero responses have `discussionId IS NULL`

**To run backfill**:

```bash
cd packages/db-models
npx tsx scripts/backfill-discussions.ts
```

**Expected output**:

```
🚀 Starting Discussion backfill...
📊 Found N topics to process
📝 Processing topic: "Climate Change" (uuid)
   ✅ Created discussion uuid
   📌 Linked 42 responses to discussion
   👥 Created 15 participant activity records
   ✓ Topic processing complete
...
✨ Backfill complete!
📊 Statistics:
   Topics processed: N/N
   Discussions created: N
   Responses linked: NNNN
   Participant activities created: NNNN
```

**Validation**:

- Script includes automatic validation step
- Checks for orphaned responses (null discussionId)
- Verifies discussion counts match actual response counts
- Exits with error code 1 if validation fails

**Rollback plan**:

```sql
-- If backfill fails, reset discussionId to NULL:
UPDATE responses SET discussion_id = NULL;
DELETE FROM participant_activities;
DELETE FROM discussions;
```

---

## Phase 3: Finalize Migration (T008)

**Status**: ⏳ Pending Phase 2 completion

**Prerequisites**:

- Phase 2 backfill completed successfully
- Validation passed (zero responses with null discussionId)

**Changes**:

1. Make `Response.discussionId` NOT NULL
2. Add foreign key constraint: `responses.discussion_id → discussions.id`
3. Add cascade delete behavior: DELETE Discussion → CASCADE DELETE Responses

**Migration SQL**:

```sql
-- Make discussionId NOT NULL (will fail if any NULL values exist)
ALTER TABLE responses ALTER COLUMN discussion_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE responses
  ADD CONSTRAINT responses_discussion_id_fkey
  FOREIGN KEY (discussion_id)
  REFERENCES discussions(id)
  ON DELETE CASCADE;

-- Create covering index for performance
CREATE INDEX responses_discussion_id_deleted_at_idx
  ON responses(discussion_id, deleted_at);
```

**To generate migration**:

```bash
cd packages/db-models
pnpm prisma migrate dev --name feature_009_phase3_finalize
```

**Validation**:

```sql
-- Verify foreign key exists
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'responses_discussion_id_fkey';

-- Expected: 1 row with responses → discussions
```

**Rollback plan**: Not recommended after this phase. Would require re-running Phase 2 backfill.

---

## Testing Checklist

### Phase 1 (Additive)

- [ ] Migration generates without errors
- [ ] Migration applies to dev database
- [ ] All existing queries still work (topicId-based response queries)
- [ ] Can still create responses without discussionId
- [ ] New Discussion records can be created manually

### Phase 2 (Backfill)

- [ ] Backfill script runs without fatal errors
- [ ] All responses have non-null discussionId after backfill
- [ ] Discussion responseCount matches actual response count
- [ ] ParticipantActivity records created for all (discussion, user) pairs
- [ ] Discussion lastActivityAt matches most recent response
- [ ] Validation step passes

### Phase 3 (Finalize)

- [ ] Migration applies without errors (no null discussionId values)
- [ ] Foreign key constraint exists and enforces referential integrity
- [ ] Cascade delete works: deleting Discussion deletes Responses
- [ ] Application code updated to always provide discussionId
- [ ] All existing tests pass

---

## Deployment Order

1. **Deploy Phase 1**: Apply additive migration to all environments (dev → staging → production)
2. **Wait for safety period**: 24-48 hours to ensure no rollback needed
3. **Run Phase 2 backfill**: Execute in maintenance window (low-traffic period)
   - Development: Immediate
   - Staging: 24 hours after dev
   - Production: 48 hours after staging
4. **Deploy Phase 3**: Apply finalize migration after backfill validation
5. **Deploy application code**: Update services to use Discussion entity

---

## Monitoring & Alerts

**During Phase 2 backfill**:

- Monitor PostgreSQL CPU and memory usage
- Track backfill progress via script output
- Set timeout: Abort if backfill takes >30 minutes
- Alert if error count >10

**After Phase 3**:

- Monitor foreign key violation errors (should be zero)
- Track query performance on new indexes
- Alert if response creation latency >500ms

---

## Performance Impact

**Phase 1**: Minimal (only schema changes, no data movement)
**Phase 2**: Moderate (table scans, bulk inserts, index creation)

- Expected duration: ~1 minute per 10,000 responses
- Locks acquired: Row-level locks on responses table
- Recommend: Run during low-traffic window
  **Phase 3**: Minimal (constraint addition is metadata-only in PostgreSQL)

**Post-migration query performance**:

- Discussion list queries: +10% faster (dedicated table vs. response grouping)
- Response queries by discussion: +50% faster (indexed discussionId)
- Participant tracking: +90% faster (denormalized ParticipantActivity)

---

## FAQs

**Q: Can I skip Phase 2 and go straight to Phase 3?**
A: No. Phase 3 requires all responses to have a valid discussionId, which Phase 2 provides.

**Q: What if Phase 2 backfill fails partway through?**
A: The script is idempotent - it only processes responses with null discussionId. Re-run after fixing the error.

**Q: Can I run Phase 2 multiple times?**
A: Yes, with `skipDuplicates: true` in createMany. Existing Discussion records won't be duplicated.

**Q: How do I handle new responses during Phase 2 backfill?**
A: Application code should start setting discussionId after Phase 1 deployment. Phase 2 only backfills null values.

**Q: What if I need to rollback after Phase 3?**
A: Not recommended. If absolutely necessary: (1) Drop FK constraint, (2) Re-run Phase 2 backfill with fresh data.

---

## Schema Changes Summary

**New Tables**: 3 (Discussion, Citation, ParticipantActivity)
**New Enums**: 2 (DiscussionStatus, CitationValidationStatus)
**Modified Tables**: 2 (Response, User, DiscussionTopic)
**New Indexes**: 7 (on discussions, responses, citations, participant_activities)
**New Constraints**: 4 (FK to discussions, users; unique on participant_activities)

**Total Migration Impact**:

- Schema complexity: +15% (3 new entities, 1 extended entity)
- Storage overhead: ~10% (ParticipantActivity denormalization)
- Query performance: +30% improvement (indexed discussion lookups)
