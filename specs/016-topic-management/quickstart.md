# Quickstart: Topic Management

**Feature**: 016-topic-management
**Audience**: Developers implementing or maintaining topic management functionality

## Overview

This feature extends ReasonBridge's topic system with user-generated topic creation, lifecycle management (archive/lock/reopen), edit tracking, duplicate detection, search/filtering, analytics dashboards, and moderator merge capabilities.

**Key Capabilities**:
- ✅ Users create topics with title, description, and tags
- ✅ Lifecycle management (archive, lock, reopen topics)
- ✅ Edit history tracking for transparency
- ✅ Duplicate detection before creation
- ✅ Full-text search and tag filtering
- ✅ Analytics dashboards (participation, trends, diversity)
- ✅ Moderator merge and link operations

## Architecture Context

### Service Boundary

Topic management is implemented in the **discussion-service** microservice:
- **Path**: `services/discussion-service/src/topics/`
- **Port**: 3002 (local development)
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis (topic listing cache)

### Frontend Integration

React SPA components in **frontend**:
- **Path**: `frontend/src/components/topics/` and `frontend/src/pages/Topics/`
- **State Management**: TanStack Query for server state, React Context for UI state
- **Port**: 5173 (Vite dev server)

### Database Schema

New tables added to Prisma schema:
- `TopicEdit` - Immutable edit history
- `TopicLink` - Bidirectional topic relationships
- `TopicMerge` - Merge operation audit trail
- `TopicAnalytics` - Pre-aggregated metrics

Extended `Topic` table with new fields:
- `slug`, `status`, `visibility`, `lastActivityAt`, counts, `editedAt`, `deletedAt`, `redirectToId`, `searchVector`

## Getting Started

### 1. Database Setup

Run Prisma migrations to add new schema:

```bash
cd services/discussion-service
npx prisma migrate dev --name add-topic-management
```

Create full-text search indexes:

```sql
-- PostgreSQL extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search vector (auto-updated via trigger)
CREATE INDEX topic_search_idx ON "Topic" USING gin(to_tsvector('english', title || ' ' || description));

-- Trigram similarity for duplicate detection
CREATE INDEX topic_title_trgm_idx ON "Topic" USING gin(title gin_trgm_ops);

-- Status and sorting indexes
CREATE INDEX topic_status_created_idx ON "Topic"(status, "createdAt" DESC);
CREATE INDEX topic_last_activity_idx ON "Topic"("lastActivityAt" DESC);
```

Backfill existing topics:

```bash
npm run migrate:backfill-topics
```

### 2. Backend Development

Start discussion-service in development mode:

```bash
cd services/discussion-service
npm run dev
```

Service will be available at `http://localhost:3002`

**Key Endpoints** (see `contracts/topics-api.yaml` for full spec):
- `POST /topics` - Create topic
- `GET /topics` - List/filter/search topics
- `PATCH /topics/:id` - Update topic
- `POST /topics/:id/archive` - Archive topic
- `POST /topics/:id/lock` - Lock topic
- `GET /topics/:id/edits` - Edit history
- `GET /topics/:id/analytics` - Analytics data
- `POST /topics/merge` - Merge topics (moderators only)

### 3. Frontend Development

Start frontend development server:

```bash
cd frontend
npm run dev
```

Application will be available at `http://localhost:5173`

**Key Components**:
- `CreateTopicModal` - Topic creation form with duplicate detection
- `EditTopicModal` - Edit form with change reason input
- `TopicStatusActions` - Archive/Lock/Reopen buttons
- `DuplicateWarning` - Similar topic suggestions
- `TopicAnalytics` - Analytics dashboard
- `MergeTopicsModal` - Moderator merge interface (moderators only)

### 4. Running Tests

**Unit Tests** (discussion-service):
```bash
cd services/discussion-service
npm test
```

**Integration Tests** (with Docker services):
```bash
cd services/discussion-service
npm run test:integration
```

**E2E Tests** (full stack):
```bash
cd frontend
npx playwright test e2e/create-topic.spec.ts
npx playwright test e2e/edit-topic.spec.ts
```

## Common Workflows

### Workflow 1: Create a Topic

**User Flow**:
1. User clicks "Create New Topic" button on Topics page
2. `CreateTopicModal` opens with form (title, description, tags)
3. User enters "Should AI be regulated?" as title
4. As user types, frontend checks for duplicates via `/topics/search?q=...`
5. If similar topics found (>0.7 similarity), show `DuplicateWarning` component
6. User reviews suggestions, decides to proceed anyway
7. User clicks "Publish Topic"
8. Frontend calls `POST /topics` with data
9. Backend validates (10-200 char title, 50-5000 char description, 1-5 tags)
10. Backend generates slug: `should-ai-be-regulated`
11. Backend checks uniqueness, adds `-2` suffix if needed
12. Topic created with `status=Active`, `visibility=Public`
13. User redirected to new topic page

**Code Example** (frontend):
```typescript
const { mutate: createTopic } = useCreateTopic();

const handleSubmit = (data) => {
  createTopic({
    title: data.title,
    description: data.description,
    tags: data.tags
  }, {
    onSuccess: (topic) => {
      navigate(`/topics/${topic.slug}`);
    },
    onError: (error) => {
      if (error.statusCode === 409) {
        // Show duplicate warning
        setSimilarTopics(error.similarTopics);
      }
    }
  });
};
```

**Code Example** (backend):
```typescript
async createTopic(userId: string, dto: CreateTopicDto) {
  // Check duplicates
  const similarTopics = await this.searchService.findSimilar(dto.title, dto.description);
  if (similarTopics.length > 0 && similarTopics[0].score > 0.8) {
    throw new ConflictException({ similarTopics });
  }

  // Generate unique slug
  const slug = await this.generateUniqueSlug(dto.title);

  // Create topic
  return this.prisma.topic.create({
    data: {
      title: dto.title,
      description: dto.description,
      slug,
      status: 'Active',
      visibility: dto.visibility || 'Public',
      creatorId: userId,
      tags: {
        create: dto.tags.map(tag => ({ tagName: tag.toLowerCase() }))
      }
    },
    include: { tags: true }
  });
}
```

### Workflow 2: Archive a Topic

**User Flow**:
1. Topic creator views their own topic
2. Clicks "Archive Topic" from dropdown menu
3. Confirmation modal appears: "Are you sure? This topic will be hidden from default listings."
4. User confirms
5. Frontend calls `POST /topics/:id/archive`
6. Backend updates `status=Archived`
7. Topic removed from default listings (but accessible via direct link or "Show Archived" filter)
8. All participants notified via notification-service

**Code Example** (backend):
```typescript
async archiveTopic(topicId: string, userId: string) {
  const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });

  // Authorization: creator or moderator
  if (topic.creatorId !== userId && !await this.isUserModerator(userId)) {
    throw new ForbiddenException('Only topic creator or moderators can archive');
  }

  // Update status
  await this.prisma.topic.update({
    where: { id: topicId },
    data: { status: 'Archived' }
  });

  // Notify participants
  await this.notificationService.sendStatusChange(topicId, 'Archived');

  // Invalidate cache
  await this.redis.del('topics:active');
}
```

### Workflow 3: Edit a Topic with History

**User Flow**:
1. Topic creator clicks "Edit Topic"
2. `EditTopicModal` shows pre-filled form
3. User changes title from "Should AI be regulated?" to "Should AI development require government oversight?"
4. User adds change reason: "Clarifying scope to focus on development phase"
5. User clicks "Save Changes"
6. Frontend calls `PATCH /topics/:id` with changes
7. Backend creates `TopicEdit` record with before/after values
8. Backend checks if edit is "significant" (title change + 50+ responses)
9. If significant, flags for moderator review
10. Topic updated, edit history recorded
11. "(edited)" indicator shown on topic with link to edit history

**Code Example** (backend):
```typescript
async updateTopic(topicId: string, userId: string, dto: UpdateTopicDto) {
  const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });

  // Authorization check
  if (topic.creatorId !== userId && !await this.isUserModerator(userId)) {
    throw new ForbiddenException();
  }

  // Record edit history
  await this.topicEditService.recordEdit({
    topicId,
    editorId: userId,
    previousTitle: topic.title,
    newTitle: dto.title,
    previousDescription: topic.description,
    newDescription: dto.description,
    changeReason: dto.changeReason,
    flaggedForReview: await this.isSignificantEdit(topic, dto)
  });

  // Update topic
  return this.prisma.topic.update({
    where: { id: topicId },
    data: {
      title: dto.title,
      description: dto.description,
      editedAt: new Date()
    }
  });
}
```

### Workflow 4: Merge Duplicate Topics (Moderator)

**User Flow**:
1. Moderator identifies two duplicate topics
2. Clicks "Merge Topics" from moderator menu
3. `MergeTopicsModal` shows both topics side-by-side
4. Moderator selects primary (keep) and secondary (merge) topics
5. Moderator enters reason: "Duplicate - both discuss same proposition"
6. Confirms merge
7. Frontend calls `POST /topics/merge`
8. Backend executes transaction:
   - Move all discussions from secondary to primary
   - Soft-delete secondary topic
   - Create redirect (secondary → primary)
   - Record merge in `TopicMerge` table
   - Notify all participants
9. Users accessing old URL automatically redirected with notice

**Code Example** (backend):
```typescript
async mergeTopics(dto: MergeTopicsDto, moderatorId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Move discussions
    const { count } = await tx.discussion.updateMany({
      where: { topicId: dto.secondaryTopicId },
      data: { topicId: dto.primaryTopicId }
    });

    // 2. Soft-delete secondary, add redirect
    await tx.topic.update({
      where: { id: dto.secondaryTopicId },
      data: {
        status: 'Deleted',
        deletedAt: new Date(),
        redirectToId: dto.primaryTopicId
      }
    });

    // 3. Record merge
    await tx.topicMerge.create({
      data: {
        primaryTopicId: dto.primaryTopicId,
        secondaryTopicId: dto.secondaryTopicId,
        moderatorId,
        mergeReason: dto.mergeReason,
        discussionsMoved: count,
        rollbackDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // 4. Recalculate counts
    await this.recalculateTopicCounts(tx, dto.primaryTopicId);

    return { primaryTopicId: dto.primaryTopicId, discussionsMoved: count };
  });
}
```

## Configuration

### Environment Variables

**discussion-service** (`.env`):
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/reasonbridge"

# Redis cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate limiting
TOPIC_CREATION_LIMIT=5        # Max topics per day per user
TOPIC_EDIT_LIMIT=10            # Max edits per day per topic

# Duplicate detection
SIMILARITY_THRESHOLD=0.8       # Trigram similarity threshold (0-1)
SEMANTIC_FALLBACK_THRESHOLD=0.85  # Embedding similarity threshold

# Analytics
ANALYTICS_UPDATE_INTERVAL=3600000  # 1 hour in ms
```

**frontend** (`.env`):
```bash
VITE_API_URL=http://localhost:3001  # API Gateway URL
```

### Feature Flags

Topic management respects existing feature flags:
- `ENABLE_TOPIC_CREATION` - Toggle user topic creation (default: true)
- `ENABLE_TOPIC_ANALYTICS` - Toggle analytics dashboard (default: true)

## Troubleshooting

### Issue: Duplicate detection not working

**Symptoms**: Similar topics not suggested during creation

**Causes**:
1. Trigram index not created
2. ai-service unavailable for semantic check
3. Similarity threshold too high

**Solution**:
```bash
# Check index exists
psql -d reasonbridge -c "\d \"Topic\""

# Recreate trigram index
CREATE INDEX IF NOT EXISTS topic_title_trgm_idx ON "Topic" USING gin(title gin_trgm_ops);

# Lower threshold temporarily
export SIMILARITY_THRESHOLD=0.7
```

### Issue: Search returns no results

**Symptoms**: Full-text search returns empty array

**Causes**:
1. Search vector not populated
2. GIN index missing
3. Query syntax invalid

**Solution**:
```bash
# Backfill search vectors
UPDATE "Topic" SET search_vector = to_tsvector('english', title || ' ' || description);

# Create GIN index
CREATE INDEX IF NOT EXISTS topic_search_idx ON "Topic" USING gin(search_vector);

# Test query
SELECT * FROM "Topic" WHERE search_vector @@ to_tsquery('english', 'regulation');
```

### Issue: Analytics not updating

**Symptoms**: Analytics dashboard shows stale data (>1 hour old)

**Causes**:
1. Background job not running
2. Job failing silently
3. Redis cache serving stale data

**Solution**:
```bash
# Check job logs
docker logs discussion-service | grep "analytics-job"

# Manually trigger calculation
curl -X POST http://localhost:3002/internal/analytics/recalculate

# Clear Redis cache
redis-cli DEL "analytics:*"
```

### Issue: Merge operation hangs

**Symptoms**: Merge request times out or never completes

**Causes**:
1. Large topic with 1000s of discussions
2. Database lock contention
3. Notification service timeout

**Solution**:
```typescript
// Increase transaction timeout in Prisma
await prisma.$transaction(async (tx) => {
  // ... merge logic
}, {
  timeout: 60000 // 60 seconds instead of default 5
});

// Or: Migrate discussions in batches
const batchSize = 100;
for (let i = 0; i < discussionCount; i += batchSize) {
  await tx.discussion.updateMany({
    where: { topicId: secondaryId },
    data: { topicId: primaryId },
    take: batchSize
  });
}
```

## Performance Optimization Tips

1. **Cache Topic Listings**: Use Redis to cache filtered topic lists (TTL: 5 minutes)
2. **Lazy Load Analytics**: Fetch analytics on-demand, not with topic details
3. **Batch Tag Operations**: When filtering by multiple tags, use single query with `IN` clause
4. **Cursor Pagination**: For infinite scroll, use cursor-based pagination instead of offset
5. **Pre-aggregate Counts**: Use cached `participantCount`/`discussionCount` instead of real-time COUNT queries

## Next Steps

After implementing topic management:
1. **Run tests**: Ensure 80%+ coverage on new services
2. **Test E2E flows**: Create, edit, archive, merge in staging environment
3. **Monitor performance**: Add DataDog/New Relic tracking for search latency
4. **Gather feedback**: Run beta with 10-20 users to validate UX
5. **Scale testing**: Test with 10K+ topics to validate PostgreSQL FTS performance

## Further Reading

- [Specification](./spec.md) - Full requirements and user stories
- [Data Model](./data-model.md) - Detailed entity definitions
- [API Contract](./contracts/topics-api.yaml) - OpenAPI schema
- [Research](./research.md) - Technical decisions and alternatives
- [Implementation Plan](./plan.md) - Architecture and structure
