# Activity Feed from Followed Users - Design Document

**Date**: 2026-02-13
**Issue**: [T249] #245 - Implement activity feed from followed users
**Author**: Claude Code

---

## Overview

Implement an activity feed that shows actions from users the current user follows. The feed will display topics created, responses posted, and discussions joined.

## Architecture Decision

**Chosen Approach**: Denormalized Activity Events Table

We chose this approach over query-based alternatives because:
- Fast reads with simple joins (UserFollow → ActivityEvent)
- Clean cursor-based pagination on a single table
- Scalable pattern used by platforms like Twitter and GitHub
- Decouples feed generation from source tables

## Database Schema

### New Model: ActivityEvent

```prisma
/// Activity events for feed generation
/// Denormalized table capturing user activities for efficient feed queries
model ActivityEvent {
  id            String       @id @default(uuid()) @db.Uuid
  userId        String       @map("user_id") @db.Uuid
  activityType  ActivityType @map("activity_type")

  // Target entity reference
  targetId      String       @map("target_id") @db.Uuid
  targetType    TargetType   @map("target_type")

  // Denormalized display data (avoids joins when rendering)
  targetTitle   String?      @map("target_title")
  targetSlug    String?      @map("target_slug")

  createdAt     DateTime     @default(now()) @map("created_at")

  // Relations
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("activity_events")
}

enum ActivityType {
  TOPIC_CREATED
  RESPONSE_POSTED
  DISCUSSION_JOINED

  @@map("activity_type")
}

enum TargetType {
  TOPIC
  RESPONSE
  DISCUSSION

  @@map("target_type")
}
```

### Indexes

- `(userId, createdAt DESC)` - Efficiently query all events by a specific user
- `(createdAt DESC)` - Support feed pagination across followed users

## New Service: activity-service

### Service Structure

```
services/activity-service/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── health/
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   ├── activity-feed/
│   │   ├── activity-feed.module.ts
│   │   ├── activity-feed.controller.ts
│   │   ├── activity-feed.service.ts
│   │   ├── activity-feed.service.test.ts
│   │   └── dto/
│   │       ├── activity-event.dto.ts
│   │       └── get-feed.dto.ts
│   └── activity-events/
│       ├── activity-events.module.ts
│       ├── activity-events.service.ts
│       ├── activity-events.service.test.ts
│       ├── activity-events.controller.ts
│       └── dto/
│           └── create-event.dto.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Port Assignment

Add to `packages/common/src/config/ports.ts`:
```typescript
ACTIVITY_SERVICE: 3008,
```

## API Design

### Public Endpoint: Get Activity Feed

```
GET /feed
Authorization: Bearer <jwt>
Query Parameters:
  - limit: number (default: 20, max: 100)
  - cursor: string (ISO timestamp for pagination)

Response 200:
{
  "activities": [
    {
      "id": "uuid",
      "activityType": "TOPIC_CREATED",
      "targetId": "uuid",
      "targetType": "TOPIC",
      "targetTitle": "Should AI have rights?",
      "targetSlug": "should-ai-have-rights",
      "createdAt": "2026-02-13T12:00:00Z",
      "user": {
        "id": "uuid",
        "displayName": "Jane Doe"
      }
    }
  ],
  "nextCursor": "2026-02-13T11:30:00Z" | null,
  "hasMore": true
}
```

### Internal Endpoint: Create Activity Event

```
POST /events
X-Internal-Service-Key: <service-key>
Content-Type: application/json

Body:
{
  "userId": "uuid",
  "activityType": "TOPIC_CREATED",
  "targetId": "uuid",
  "targetType": "TOPIC",
  "targetTitle": "Should AI have rights?",
  "targetSlug": "should-ai-have-rights"
}

Response 201:
{
  "id": "uuid",
  "createdAt": "2026-02-13T12:00:00Z"
}
```

## Feed Query Algorithm

```typescript
async getFeed(userId: string, options: { limit: number; cursor?: string }) {
  // 1. Get IDs of users the current user follows
  const follows = await this.prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followedId: true },
  });

  const followedUserIds = follows.map(f => f.followedId);

  // 2. Early return if not following anyone
  if (followedUserIds.length === 0) {
    return { activities: [], nextCursor: null, hasMore: false };
  }

  // 3. Query activity events from followed users
  const events = await this.prisma.activityEvent.findMany({
    where: {
      userId: { in: followedUserIds },
      ...(options.cursor && {
        createdAt: { lt: new Date(options.cursor) }
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit + 1, // Fetch one extra to check hasMore
    include: {
      user: {
        select: { id: true, displayName: true },
      },
    },
  });

  // 4. Determine pagination
  const hasMore = events.length > options.limit;
  const activities = events.slice(0, options.limit);
  const nextCursor = hasMore
    ? activities[activities.length - 1].createdAt.toISOString()
    : null;

  return { activities, nextCursor, hasMore };
}
```

## Integration with Discussion Service

Discussion-service needs HTTP client to call activity-service when events occur:

### Topic Created
```typescript
// In topics.service.ts after successful topic creation
await this.activityClient.createEvent({
  userId: creatorId,
  activityType: 'TOPIC_CREATED',
  targetId: topic.id,
  targetType: 'TOPIC',
  targetTitle: topic.title,
  targetSlug: topic.slug,
});
```

### Response Posted
```typescript
// In responses.service.ts after successful response creation
await this.activityClient.createEvent({
  userId: response.creatorId,
  activityType: 'RESPONSE_POSTED',
  targetId: response.id,
  targetType: 'RESPONSE',
  targetTitle: topic.title, // Parent topic title for context
  targetSlug: topic.slug,
});
```

### Discussion Joined
```typescript
// In discussions.service.ts when user first participates
await this.activityClient.createEvent({
  userId: userId,
  activityType: 'DISCUSSION_JOINED',
  targetId: discussion.id,
  targetType: 'DISCUSSION',
  targetTitle: topic.title,
  targetSlug: topic.slug,
});
```

## API Gateway Routing

Add to `services/api-gateway/src/proxy/proxy.service.ts`:
```typescript
'/activity': SERVICE_URLS.ACTIVITY_SERVICE,
'/feed': SERVICE_URLS.ACTIVITY_SERVICE,
```

## Error Handling

- **No followed users**: Return empty array, not an error
- **Invalid cursor**: Return 400 Bad Request with message
- **Service unavailable**: Event creation should be fire-and-forget; don't fail the main operation

## Testing Strategy

### Unit Tests
- ActivityFeedService.getFeed() with mocked Prisma
- ActivityEventsService.createEvent() validation
- Cursor-based pagination logic

### Integration Tests
- Full flow: create event → query feed
- Feed isolation: only shows followed users' activities
- Pagination across multiple pages

### E2E Tests (Issue #248: T252)
- Follow user and view their activities in feed

## Performance Considerations

- Index on `(userId, createdAt DESC)` optimizes the common query pattern
- Denormalized title/slug avoids joins for display
- Cursor pagination is O(1) vs offset pagination O(n)
- Consider Redis caching if feed becomes a hot path

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `services/activity-service/` (entire service) |
| Modify | `packages/db-models/prisma/schema.prisma` (add ActivityEvent) |
| Modify | `packages/common/src/config/ports.ts` (add port) |
| Modify | `services/api-gateway/src/proxy/proxy.service.ts` (add routes) |
| Modify | `pnpm-workspace.yaml` (already includes services/*) |
| Modify | `services/discussion-service/` (add HTTP client for events) |
| Modify | `docker-compose.yml` files (add service) |

## Success Criteria

- [ ] ActivityEvent model created with migration
- [ ] activity-service scaffolded with health endpoint
- [ ] GET /feed returns activities from followed users
- [ ] POST /events creates activity events (internal API)
- [ ] discussion-service emits events on topic/response creation
- [ ] API gateway routes to activity-service
- [ ] Unit tests for feed service (>80% coverage)
- [ ] Integration tests for full flow
- [ ] Docker compose updated for local development
