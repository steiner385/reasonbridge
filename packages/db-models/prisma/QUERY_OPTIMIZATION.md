# Database Query Optimization Guide

This document describes the indexing strategy and query optimization practices for ReasonBridge.

## Indexing Strategy

### User Service Tables

| Table                  | Index          | Purpose                                           |
| ---------------------- | -------------- | ------------------------------------------------- |
| `users`                | `cognitoSub`   | AWS Cognito lookups                               |
| `users`                | `email`        | Login and uniqueness                              |
| `users`                | `displayName`  | User search                                       |
| `users`                | `createdAt`    | User listing/sorting                              |
| `verification_records` | `userId, type` | Composite for finding user's verification by type |
| `verification_records` | `status`       | Filter by verification status                     |
| `video_uploads`        | `expiresAt`    | Cleanup of expired uploads                        |

### Discussion Service Tables

| Table               | Index                                  | Purpose                              |
| ------------------- | -------------------------------------- | ------------------------------------ |
| `discussion_topics` | `status`                               | Filter active/archived topics        |
| `discussion_topics` | `creatorId`                            | User's created topics                |
| `discussion_topics` | `createdAt DESC`                       | Recent topics listing                |
| `discussion_topics` | `activityLevel, suggestedForNewUsers`  | Onboarding topic suggestions         |
| `responses`         | `topicId, createdAt DESC`              | Composite for topic thread listing   |
| `responses`         | `discussionId, deletedAt`              | Composite for soft-deleted responses |
| `responses`         | `authorId`                             | User's responses                     |
| `responses`         | `parentId`                             | Thread replies                       |
| `discussions`       | `topicId, status, lastActivityAt DESC` | Active discussions by topic          |
| `propositions`      | `topicId, consensusScore DESC`         | Top propositions by consensus        |

### Moderation Service Tables

| Table                | Index                  | Purpose                           |
| -------------------- | ---------------------- | --------------------------------- |
| `moderation_actions` | `targetType, targetId` | Find actions for specific content |
| `moderation_actions` | `status`               | Pending/active moderation queue   |
| `moderation_actions` | `expiresAt`            | Expired temporary bans            |
| `appeals`            | `status`               | Pending appeals queue             |

## Query Patterns

### High-Frequency Queries

1. **Topic List with Pagination**

   ```sql
   -- Uses: discussion_topics_status_idx, discussion_topics_created_at_idx
   SELECT * FROM discussion_topics
   WHERE status = 'ACTIVE'
   ORDER BY created_at DESC
   LIMIT 20 OFFSET 0;
   ```

2. **Response Thread with Replies**

   ```sql
   -- Uses: responses_topic_id_created_at_idx
   SELECT * FROM responses
   WHERE topic_id = $1 AND deleted_at IS NULL
   ORDER BY created_at DESC;
   ```

3. **User Verification Check**
   ```sql
   -- Uses: verification_records_user_id_type_idx
   SELECT * FROM verification_records
   WHERE user_id = $1 AND type = $2
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Performance Considerations

1. **Avoid N+1 Queries**: Use Prisma's `include` for related data

   ```typescript
   // Good: Single query with relations
   const topic = await prisma.discussionTopic.findUnique({
     where: { id },
     include: { tags: { include: { tag: true } }, creator: true },
   });

   // Bad: N+1 queries
   const topic = await prisma.discussionTopic.findUnique({ where: { id } });
   const tags = await Promise.all(
     topic.tagIds.map((id) => prisma.tag.findUnique({ where: { id } })),
   );
   ```

2. **Use Select for Partial Data**: Don't fetch entire rows when you need specific fields

   ```typescript
   // Good: Select only needed fields
   const users = await prisma.user.findMany({
     select: { id: true, displayName: true, trustScoreAbility: true },
   });

   // Bad: Fetch everything
   const users = await prisma.user.findMany();
   ```

3. **Cursor Pagination for Large Sets**: Use cursor-based pagination instead of offset

   ```typescript
   // Good: Cursor pagination
   const responses = await prisma.response.findMany({
     take: 20,
     cursor: { id: lastResponseId },
     skip: 1, // Skip the cursor item
     orderBy: { createdAt: 'desc' },
   });

   // Less efficient: Offset pagination for large datasets
   const responses = await prisma.response.findMany({
     take: 20,
     skip: 1000, // Scans 1000 rows
     orderBy: { createdAt: 'desc' },
   });
   ```

## Query Logging

Enable query logging in development to identify slow queries:

```typescript
// In service configuration
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

// Log slow queries (>100ms)
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    console.warn(`Slow query (${e.duration}ms): ${e.query}`);
  }
});
```

## EXPLAIN ANALYZE

Run EXPLAIN ANALYZE on production-like data to verify index usage:

```sql
EXPLAIN ANALYZE
SELECT * FROM discussion_topics
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- ✓ "Index Scan" or "Index Only Scan"
-- ✗ "Seq Scan" on large tables indicates missing index
```

## Index Maintenance

Indexes are automatically maintained by PostgreSQL. For large tables:

1. **Monitor Bloat**: Use `pg_stat_user_indexes` to check index usage
2. **Reindex if Needed**: `REINDEX INDEX index_name;`
3. **Analyze Tables**: `ANALYZE table_name;` updates statistics

## Adding New Indexes

When adding new query patterns:

1. Write the query first
2. Run EXPLAIN ANALYZE on test data
3. Add index to `schema.prisma` if Seq Scan on large table
4. Use composite indexes for multi-column WHERE clauses
5. Add sort direction (ASC/DESC) when ORDER BY is common

```prisma
// Composite index example
@@index([topicId, status, lastActivityAt(sort: Desc)])
```
