# Research: Topic Management

**Feature**: 016-topic-management
**Date**: 2026-02-05
**Status**: Complete

## Research Questions

### Q1: Full-Text Search Strategy for Topics

**Question**: Should we use PostgreSQL native full-text search (tsvector) or implement Elasticsearch for topic search at scale?

**Decision**: PostgreSQL native full-text search with tsvector + GIN indexes

**Rationale**:
1. **Current Scale**: Target of 10,000 topics fits comfortably within PostgreSQL FTS capabilities
2. **Existing Infrastructure**: No Elasticsearch in current stack; adding it increases operational complexity
3. **Performance Benchmarks**: PostgreSQL tsvector with GIN index handles 100K+ documents with <100ms search times
4. **Simplicity**: Keeps search logic in same database as topics, simplifying transactions and consistency
5. **Migration Path**: Can add Elasticsearch later if scale exceeds 50K topics without API changes

**Implementation Details**:
- Add `search_vector` tsvector column to `Topic` table
- Create GIN index: `CREATE INDEX topic_search_idx ON "Topic" USING gin(search_vector);`
- Update search vector on insert/update: `to_tsvector('english', title || ' ' || description)`
- Use `ts_rank` for relevance scoring combined with activity recency boost

**Alternatives Considered**:
- **Elasticsearch**: Rejected due to operational overhead (new service, data sync complexity, resource usage)
- **PostgreSQL pg_trgm**: Rejected in favor of tsvector for better linguistic matching (stemming, stop words)

### Q2: Duplicate Topic Detection Algorithm

**Question**: How do we detect similar topics with 80% accuracy requirement using text similarity?

**Decision**: Hybrid approach using PostgreSQL trigram similarity + semantic embeddings for edge cases

**Rationale**:
1. **Primary Method**: PostgreSQL `pg_trgm` extension for trigram similarity on title + description
   - Fast (indexed), ~85% accuracy on exact/fuzzy matches
   - Formula: `similarity(topic1.title, topic2.title) > 0.8`
2. **Fallback**: OpenAI embeddings via existing ai-service for semantic similarity
   - Handles paraphrased/synonym matches trigrams miss
   - Only called for borderline cases (0.7-0.8 trigram similarity)
3. **Performance**: Trigram index lookup <50ms, embeddings <200ms when needed

**Implementation Details**:
```typescript
// Step 1: Fast trigram match (most duplicates caught here)
const candidates = await prisma.$queryRaw`
  SELECT id, title, similarity(title, ${newTitle}) as score
  FROM "Topic"
  WHERE similarity(title, ${newTitle}) > 0.7
  ORDER BY score DESC LIMIT 5
`;

// Step 2: Semantic check for borderline cases (score 0.7-0.8)
for (const candidate of candidates.filter(c => c.score < 0.8)) {
  const semanticScore = await aiService.compareSimilarity(
    newDescription,
    candidate.description
  );
  if (semanticScore > 0.85) {
    // Flag as potential duplicate
  }
}
```

**Alternatives Considered**:
- **Pure embeddings**: Rejected due to cost (API calls for every creation) and latency
- **Simple keyword matching**: Rejected due to low accuracy (misses synonyms, paraphrases)

### Q3: Edit History Storage Strategy

**Question**: Should edit history be stored as separate records or JSON diffs?

**Decision**: Separate `TopicEdit` records with full snapshot of changed fields

**Rationale**:
1. **Queryability**: Separate records enable "who edited what when" queries without JSON parsing
2. **Immutability**: Audit requirement demands no modifications to history
3. **Simplicity**: Full snapshots avoid complex diff reconstruction
4. **Performance**: Edit history queries rare (only shown on demand); storage cost minimal

**Implementation Details**:
```prisma
model TopicEdit {
  id              String   @id @default(uuid())
  topicId         String
  topic           Topic    @relation(fields: [topicId], references: [id])
  editorId        String
  editor          User     @relation(fields: [editorId], references: [id])
  editedAt        DateTime @default(now())

  // Changed fields (null if unchanged)
  previousTitle        String?
  newTitle            String?
  previousDescription String?
  newDescription      String?
  previousTags        String[] @default([])
  newTags            String[] @default([])

  changeReason    String?  // Optional: "typo correction", "clarification"

  @@index([topicId, editedAt(sort: Desc)])
}
```

**Alternatives Considered**:
- **JSON diffs**: Rejected for poor queryability and diff reconstruction complexity
- **Event sourcing**: Rejected as overkill for this use case (only 3 editable fields)

### Q4: Topic Analytics Calculation Strategy

**Question**: Should analytics be calculated real-time or pre-aggregated?

**Decision**: Hybrid: real-time for counts, pre-aggregated for trends via background job

**Rationale**:
1. **Real-Time Metrics**: Simple counts (participants, discussions, responses) calculated on-demand via SQL
   - Query cost minimal with proper indexes
   - Always current, no staleness
2. **Trend Data**: 30-day response volume pre-aggregated hourly
   - Expensive to calculate on-demand (requires time-series aggregation)
   - Updated by background job every hour
   - Acceptable staleness (<1 hour)

**Implementation Details**:
```typescript
// Real-time (fast queries)
const analytics = {
  participantCount: await prisma.response.findMany({
    where: { discussion: { topicId } },
    distinct: ['userId']
  }).count(),

  discussionCount: await prisma.discussion.count({
    where: { topicId }
  }),

  responseCount: await prisma.response.count({
    where: { discussion: { topicId } }
  })
};

// Pre-aggregated (background job)
model TopicAnalytics {
  id          String @id @default(uuid())
  topicId     String
  calculatedAt DateTime @default(now())

  // 30-day trend (array of 30 values)
  responsesPerDay Int[]

  // Diversity metrics (updated daily)
  perspectiveDiversity Json // { progressive: 0.23, conservative: 0.31, ... }

  @@unique([topicId])
}
```

**Alternatives Considered**:
- **Fully real-time**: Rejected due to cost of time-series aggregations on large datasets
- **Fully pre-aggregated**: Rejected because simple counts would be stale unnecessarily

### Q5: Topic Merge Data Migration Pattern

**Question**: How do we safely migrate discussions from secondary to primary topic during merge?

**Decision**: Transaction-based move with redirect record and rollback capability

**Rationale**:
1. **Safety**: All operations in single Prisma transaction—either all succeed or none do
2. **Atomicity**: Prevents partial merges (some discussions moved, others orphaned)
3. **Audit Trail**: `TopicMerge` record tracks merge history for transparency
4. **Rollback**: Keep secondary topic soft-deleted for 30 days, allowing undo if needed

**Implementation Details**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Move all discussions to primary topic
  await tx.discussion.updateMany({
    where: { topicId: secondaryId },
    data: { topicId: primaryId }
  });

  // 2. Soft-delete secondary topic
  await tx.topic.update({
    where: { id: secondaryId },
    data: {
      status: 'Deleted',
      deletedAt: new Date(),
      redirectToId: primaryId // Enable automatic redirect
    }
  });

  // 3. Record merge for audit trail
  await tx.topicMerge.create({
    data: {
      primaryTopicId: primaryId,
      secondaryTopicId: secondaryId,
      moderatorId: userId,
      mergedAt: new Date(),
      reason: mergeReason
    }
  });

  // 4. Recalculate primary topic analytics
  await recalculateTopicCounts(tx, primaryId);

  // 5. Notify all affected participants
  await notificationService.sendMergeNotifications(secondaryId, primaryId);
});
```

**Alternatives Considered**:
- **Cascade delete**: Rejected due to data loss risk
- **Copy + keep both**: Rejected due to confusion and duplicate content

## Architecture Decisions

### AD-1: Service Boundary

**Decision**: Extend existing `discussion-service` rather than create new `topic-service`

**Justification**:
- Topics and discussions are tightly coupled (discussions belong to topics)
- Existing service already handles topic reads; adding writes maintains cohesion
- Avoids distributed transaction complexity (topic + discussion creation atomic)
- Reduces inter-service communication overhead

### AD-2: Caching Strategy

**Decision**: Redis cache for topic listings, no cache for individual topic details

**Justification**:
- Listings endpoint (most frequent) benefits from caching
- Individual topic pages need real-time data (participant counts, recent activity)
- Cache invalidation: Flush topic list cache on create/update/delete
- TTL: 5 minutes for topic listings

### AD-3: Frontend State Management

**Decision**: Use TanStack Query for server state, React Context for UI state

**Justification**:
- TanStack Query handles caching, refetching, optimistic updates for topic CRUD
- React Context for modal visibility, form state
- Aligns with existing frontend patterns (already using TanStack Query for discussions)

## External Dependencies

### Existing Services Integration

1. **ai-service**:
   - Used for: Semantic duplicate detection (embeddings comparison)
   - Fallback strategy: If ai-service unavailable, skip semantic check (rely on trigram only)

2. **notification-service**:
   - Used for: Status change notifications, merge notifications
   - Fallback strategy: Log notification failure, don't block topic operation

3. **moderation-service**:
   - Used for: Offensive title detection, significant edit flagging
   - Fallback strategy: Allow topic creation, flag for post-moderation

### Third-Party Services

None required. All functionality implemented with existing infrastructure (PostgreSQL, Redis, OpenAI API via ai-service).

## Performance Considerations

### Database Indexes Required

```sql
-- Full-text search
CREATE INDEX topic_search_idx ON "Topic" USING gin(search_vector);

-- Trigram similarity
CREATE INDEX topic_title_trgm_idx ON "Topic" USING gin(title gin_trgm_ops);

-- Filtering and sorting
CREATE INDEX topic_status_created_idx ON "Topic"(status, "createdAt" DESC);
CREATE INDEX topic_last_activity_idx ON "Topic"("lastActivityAt" DESC);

-- Edit history lookups
CREATE INDEX topic_edit_topic_date_idx ON "TopicEdit"("topicId", "editedAt" DESC);

-- Tag filtering
CREATE INDEX topic_tag_topic_idx ON "TopicTag"("topicId");
CREATE INDEX topic_tag_tag_idx ON "TopicTag"("tagName");
```

### Query Optimization

- **Pagination**: Use cursor-based pagination for infinite scroll (better than offset at scale)
- **Aggregations**: Participant count via `COUNT(DISTINCT userId)` with indexed subquery
- **Trend calculations**: Pre-aggregate in background job, store in `TopicAnalytics` table

## Security Considerations

1. **Authorization**: Enforce verification level check (BASIC+) at controller level using NestJS guards
2. **Rate Limiting**: Topic creation throttled to 5/day per user (prevents spam)
3. **Input Validation**:
   - Title: 10-200 chars, no HTML/scripts
   - Description: 50-5000 chars, sanitize markdown
   - Tags: 1-5 tags, max 30 chars each, alphanumeric + hyphens only
4. **Edit Permissions**: Topic creators can edit own topics; moderators can edit any
5. **Merge Permissions**: Only moderators can merge topics
6. **Soft Delete**: Preserve data for audit; hard delete only after compliance period

## Open Questions

**None remaining.** All technical decisions resolved through research.
