# Optimistic Locking Quick Reference Card

## Problem Statement

Prevent lost updates when two users edit the same response simultaneously within the 24-hour edit window.

## Solution: Version-Based Optimistic Locking

Track an explicit version number that increments on every update. Detect conflicts by comparing versions.

---

## The Pattern in One Diagram

```
Client A                Database              Client B
│                       │                     │
├─ Get Response ────────→ │                   │
│  (version: 5)          │                    │
│                        │                    │
│                        │ ←──── Get Response │
│                        │       (version: 5) │
│                        │                    │
├─ Edit & Send ─────────→ │                   │
│  (v=5→6, content)      │                    │
│                        ├─ Update ───────┐   │
│                        │ (v=6)           │   │
│                        │                 │   │
│ ←─────────────────────── Success ──────┘   │
│  (version: 6)          │                    │
│                        │                    │
│                        │ ←──── Edit & Send  │
│                        │       (v=5→6, src) │
│                        │                    │
│                        ├─ Check: v=5? ────┐│
│                        │ Actual v=6 ❌      ││
│                        │                   ││
│                        │ ←─ CONFLICT ──────┘│
│                        │  (409, v6 vs v5)  │
│                        │                   │
│                        │                   │ ← Refresh & retry
```

---

## Implementation Checklist

### 1. Schema Changes (15 min)

```prisma
model Response {
  // ... existing fields ...
  version    Int      @default(1)              // NEW
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### 2. Migration (15 min)

```bash
npx prisma migrate dev --name add_response_version
```

### 3. Service Code (45 min)

```typescript
async updateResponse(
  responseId: string,
  userId: string,
  dto: UpdateResponseDto,  // includes expectedVersion
): Promise<ResponseDto> {
  const current = await prisma.response.findUnique({
    where: { id: responseId },
  });

  // ✓ Version check (optimistic lock)
  if (current.version !== dto.expectedVersion) {
    throw new ConflictException('Another user edited this');
  }

  // ✓ Edit window check
  const elapsed = (Date.now() - current.createdAt) / (1000*60*60);
  if (elapsed > 24) {
    throw new BadRequestException('Too old to edit');
  }

  // ✓ Perform update
  return prisma.response.update({
    where: { id: responseId },
    data: {
      content: dto.content,
      version: current.version + 1,  // Increment
      revisionCount: { increment: 1 },
    },
  });
}
```

### 4. DTOs (15 min)

```typescript
// Request
export class UpdateResponseDto {
  content?: string;
  expectedVersion: number; // NEW
}

// Response
export interface ResponseDto {
  id: string;
  content: string;
  version: number; // NEW
  updatedAt: Date;
  // ... other fields ...
}
```

### 5. Tests (30 min)

```typescript
it('should detect version conflicts', async () => {
  const response = createMockResponse({ version: 5 });

  await expect(
    service.updateResponse(id, userId, {
      content: 'new',
      expectedVersion: 3, // Mismatch!
    }),
  ).rejects.toThrow('edited by another');
});
```

### 6. Client Code (30 min)

```typescript
// Send version with update
await api.updateResponse(responseId, {
  content: newContent,
  expectedVersion: currentVersion,
});

// Handle conflict
catch (error) {
  if (error.status === 409) {
    showConflictDialog();
    // Offer: refresh, retry, save as reply
  }
}
```

---

## HTTP Responses

### Success (200)

```json
{
  "id": "resp-123",
  "content": "Updated text",
  "version": 6,
  "updatedAt": "2026-01-27T10:30:00Z"
}
```

### Conflict (409)

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Response modified by another user",
  "details": {
    "code": "EDIT_CONFLICT",
    "currentVersion": 7,
    "expectedVersion": 5
  }
}
```

### Too Old (400)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Responses can only be edited within 24 hours"
}
```

---

## Key Points

✓ **What:** Version field increments on every update
✓ **When:** Check version before writing
✓ **Why:** Detect concurrent edits without locking
✓ **How:** Client sends current version, server compares

| Aspect              | Detail                               |
| ------------------- | ------------------------------------ |
| **Conflicts**       | Detected, not prevented (optimistic) |
| **User Experience** | Clear error message, preserve input  |
| **Performance**     | No blocking, excellent concurrency   |
| **Schema**          | +1 column (4 bytes)                  |
| **Migration**       | Safe, backwards compatible           |

---

## Common Patterns

### Client Flow

```typescript
// 1. Load response
const response = await api.getResponse(id);
editorVersion = response.version;

// 2. User edits
editorContent = userInput;

// 3. Save with version
try {
  const updated = await api.updateResponse(id, {
    content: editorContent,
    expectedVersion: editorVersion, // Client's version
  });
  editorVersion = updated.version; // Update to new version
} catch (error) {
  if (error.status === 409) {
    // Conflict! Show dialog
  }
}
```

### Error Handling

```typescript
// ❌ Bad: Ignore conflicts
response.version = someVersion;

// ✓ Good: Always use current version
response.version = fetchLatestResponse().version;

// ✓ Better: Send what you have, handle error
try {
  update({ expectedVersion: currentVersion });
} catch (ConflictException) {
  // User can refresh and retry
}
```

### Testing

```typescript
// Setup
const response = { id: '1', version: 5 };

// Simulate User A succeeds
updateResponse(id, { version: 5 });
// Response now: version 6

// Simulate User B fails
expect(
  () => updateResponse(id, { version: 5 }), // Stale version
).toThrow(ConflictException);
```

---

## Database Query (What Happens)

### Before

```sql
UPDATE responses
SET content = 'new text'
WHERE id = $1;
-- ❌ No conflict detection
```

### After

```sql
UPDATE responses
SET content = 'new text',
    version = version + 1
WHERE id = $1
  AND version = $2;
-- ✓ Atomic version check + update
-- Returns: # rows updated
--   0 = conflict (version mismatch)
--   1 = success
```

---

## Monitoring

```typescript
// Track conflict rate
if (error instanceof ConflictException) {
  metrics.increment('response.edit_conflict', {
    responseId,
    userId,
    currentVersion: error.details.currentVersion,
  });
}

// Should be < 1% under normal load
// Higher = more concurrent editors (good problem!)
```

---

## Fallback Strategies (If Conflict Occurs)

**Option 1: Refresh & Retry**

- Fetch latest response
- Discard local changes
- Try again with new version

**Option 2: Merge**

- Show diff of changes
- Let user merge manually
- Advanced option

**Option 3: Save as Reply**

- Instead of editing, create a reply
- References original response
- "I had a different interpretation..."

**Option 4: Abandon**

- User discards edits
- No error, no action

---

## Performance Notes

| Metric                 | Value       | Notes                              |
| ---------------------- | ----------- | ---------------------------------- |
| **Update Latency**     | 2-5ms       | No locks, just comparison          |
| **Conflict Detection** | O(1)        | Single version comparison          |
| **Space**              | 4 bytes/row | Negligible for most systems        |
| **Throughput**         | Unlimited   | All writes succeed or are rejected |
| **Scalability**        | Excellent   | Linear with users                  |

**Rule of Thumb:** If < 10% conflicts in testing, optimistic locking works great.

---

## Deployment Checklist

- [ ] Schema migration runs clean
- [ ] Backfill existing responses with version=1
- [ ] Service code has version checks
- [ ] DTOs updated (expectedVersion in, version out)
- [ ] Tests passing (especially conflict tests)
- [ ] Client updated (send/handle version)
- [ ] Error handling tested
- [ ] Monitoring/logging set up
- [ ] Rollback plan documented (comment out check)
- [ ] Stakeholders briefed on 409 responses

---

## Troubleshooting

### "Version always mismatches"

- Check: Are you getting fresh response after fetches?
- Check: Client sending correct version?
- Solution: Verify version is updated after every fetch

### "Conflicts happening too often"

- Check: Is clock skew causing timestamp issues?
- Check: Are users actually editing simultaneously?
- Solution: This is expected, increase UX clarity

### "Migration failed"

- Check: Do you have existing responses?
- Check: Is the column already there?
- Solution: Check with `\d responses` (psql)

### "Tests failing with ConflictException"

- Check: Did you update mock to return version?
- Check: Are version numbers matching?
- Solution: Update mocks to include version field

---

## Links to Detailed Docs

1. **Full Research:** `/PRISMA_OPTIMISTIC_LOCKING_RESEARCH.md`
2. **Implementation:** `/OPTIMISTIC_LOCKING_IMPLEMENTATION_GUIDE.md`
3. **Comparison:** `/LOCKING_STRATEGY_COMPARISON.md`

---

## TL;DR

1. Add `version Int @default(1)` to schema
2. Run migration
3. In update method: check `current.version === expected.version`
4. If mismatch, throw 409 Conflict
5. Increment version on success
6. Client handles 409 by refreshing and retrying

**Total effort:** 2.5 hours
**Risk level:** Very low
**User impact:** Positive (clear error messages)

---

## Support

Questions? Check:

1. Error response includes conflict details
2. Client is sending correct expectedVersion
3. Migration applied successfully
4. Tests include concurrent edit scenario
