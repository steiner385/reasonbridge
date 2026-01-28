# Concurrent Edit Conflict Prevention: Strategy Comparison & Decision Framework

## Quick Decision Tree

```
Do you need to implement optimistic locking for response edits?
│
├─ YES (responses edited frequently, conflicts rare)
│  │
│  ├─ Can add schema columns? → VERSION-BASED (RECOMMENDED)
│  │  ├─ Pros: Clear, efficient, future-proof
│  │  ├─ Cons: Requires migration
│  │  └─ Effort: 2-3 hours
│  │
│  └─ Cannot modify schema? → TIMESTAMP-BASED
│     ├─ Pros: No migration needed
│     ├─ Cons: Fragile comparisons, less explicit
│     └─ Effort: 2-3 hours
│
└─ NO (pessimistic locking acceptable)
   └─ ROW-LEVEL LOCKING (NOT RECOMMENDED)
      ├─ Pros: Guaranteed consistency
      ├─ Cons: Blocks writers, kills throughput
      └─ Effort: 1-2 hours but bad UX
```

---

## Strategy Comparison Matrix

### Core Characteristics

| Aspect                        | Version-Based | Timestamp-Based | Row-Level Locking |
| ----------------------------- | ------------- | --------------- | ----------------- |
| **Locking Type**              | Optimistic    | Optimistic      | Pessimistic       |
| **Conflict Detection**        | At write-time | At write-time   | At read-time      |
| **Schema Changes**            | 1 column      | None            | None              |
| **Implementation Complexity** | Low           | Low             | Medium            |
| **Data Loss Risk**            | None          | None            | None              |
| **Edit Window Enforcement**   | App-level     | App-level       | Can be DB-level   |

### Performance Characteristics

| Metric                 | Version-Based | Timestamp-Based | Row-Level Locking |
| ---------------------- | ------------- | --------------- | ----------------- |
| **Update Latency**     | ~2-5ms        | ~2-5ms          | ~10-50ms          |
| **Concurrent Readers** | ✓ Unlimited   | ✓ Unlimited     | ✓ Unlimited       |
| **Concurrent Writers** | ✓ Excellent   | ✓ Excellent     | ✗ Blocked         |
| **Space Overhead**     | 4 bytes/row   | 0 bytes         | 0 bytes           |
| **Index Overhead**     | Minimal       | Minimal         | Minimal           |
| **Query Complexity**   | Simple        | Simple          | Complex           |

### Feature Support

| Feature                       | Version-Based   | Timestamp-Based | Row-Level Locking |
| ----------------------------- | --------------- | --------------- | ----------------- |
| **24-hour Edit Window**       | ✓ Yes           | ✓ Yes           | ✓ Yes             |
| **Concurrent Edit Detection** | ✓ Yes           | ✓ Yes           | ✓ Yes             |
| **Version History**           | ✓ Supports      | ✗ Not ideal     | ✗ Doesn't support |
| **Audit Trail**               | ✓ Easy          | ✗ Harder        | ✓ Possible        |
| **Client Caching**            | ✓ Version-based | ✗ Not ideal     | ✗ Doesn't support |
| **API Idempotency**           | ✓ Easier        | ✗ Harder        | ✓ Possible        |

### Compatibility

| Requirement             | Version-Based   | Timestamp-Based | Row-Level Locking |
| ----------------------- | --------------- | --------------- | ----------------- |
| **Prisma 6.3.1**        | ✓ Perfect       | ✓ Perfect       | ✓ Via $queryRaw   |
| **PostgreSQL**          | ✓ Native        | ✓ Native        | ✓ Native          |
| **Migration Required**  | ✓ Yes           | ✓ No            | ✗ No              |
| **Backward Compatible** | ✓ Yes           | ✓ N/A           | ✓ Yes             |
| **Existing Code**       | Minimal changes | Minimal changes | Moderate changes  |

---

## Detailed Strategy Analysis

### 1. VERSION-BASED OPTIMISTIC LOCKING

#### Use When:

- Conflicts are **rare but must be handled gracefully**
- **High concurrency expected** (many users, few actual conflicts)
- You want **explicit versioning** for audit/caching
- You can **add a schema column**
- You need **good UX with clear error messages**

#### Mechanism

```
Client                          Database
├─ Fetch Response V1 (v=5)
├─ Display to user
├─ User edits
├─ Send update with v=5  ──────→ ├─ Check: current.version == 5?
│                                 ├─ YES: Update, set v=6
│                                 ├─ Return new version (6)
│                                 └─ updatedAt auto-updated
├─ Receive v=6
└─ Show success, update UI
```

#### Implementation Effort

```
Schema:           15 min (1 column)
Migration:        15 min
Service Layer:    45 min (version check in updateResponse)
DTOs:             15 min
Tests:            30 min
Client:           30 min
─────────────────────────
Total:            ~2.5 hours
```

#### Risk Assessment

- **Data Loss:** None (optimistic, safe)
- **Schema:** Low (adding column is safe, backwards compatible)
- **Migration:** Low (simple ALTER TABLE)
- **Compatibility:** Zero (Prisma handles everything)
- **Rollback:** Easy (comment out version check)

#### Example Conflict Scenario

```
Time  User A                      User B                  Response Version
───────────────────────────────────────────────────────────────────────────
10:00 Fetch response (v=5)        Fetch response (v=5)    v=5
10:05 Modify content
10:10                             Modify sources
10:15 Send update (v=5) ────────→ Succeeds ─────────────→ v=6
10:20                             Send update (v=5) ─────→ CONFLICT
                                                           (v is now 6)
10:21 Show success                Show error:
      "Saved! Version 6"          "Edit conflict. Your
                                   version 5 is outdated.
                                   Click to refresh."
```

#### Client Experience

```javascript
try {
  await updateResponse({
    content: newContent,
    expectedVersion: 5, // What you think it is
  });
} catch (error) {
  if (error.code === 'EDIT_CONFLICT') {
    // Show dialog:
    // "Someone else edited this. Options:
    //  1. Refresh & see their changes
    //  2. View differences
    //  3. Save as new reply instead"
  }
}
```

#### Production Readiness

- ✓ Battle-tested pattern (Google Docs, AWS, etc.)
- ✓ Clear semantics
- ✓ Excellent observability
- ✓ Easy to debug
- ✓ Scales well

---

### 2. TIMESTAMP-BASED OPTIMISTIC LOCKING

#### Use When:

- You **cannot add schema columns** (locked schema, migrations forbidden)
- Conflicts are **still rare**
- You need **minimal changes** to existing code
- **Millisecond precision** comparison is acceptable
- You have **good timestamp handling** in your stack

#### Mechanism

```
Client                          Database
├─ Fetch Response (updatedAt=T0)
├─ User edits
├─ Send update with
│  expectedUpdatedAt=T0    ─────→ ├─ Check: current.updatedAt == T0?
│                                  ├─ YES: Update, set updatedAt=NOW()
│                                  ├─ Return new updatedAt
│                                  └─ Success
├─ Receive new time
└─ Show success
```

#### Implementation Effort

```
Schema:           0 min (uses @updatedAt)
Migration:        0 min
Service Layer:    45 min (timestamp comparison)
DTOs:             10 min
Tests:            30 min
Client:           30 min
─────────────────────────
Total:            ~2 hours
```

#### Risk Assessment

- **Data Loss:** None (optimistic, safe)
- **Precision:** Medium (millisecond comparison can be fragile)
- **Race Conditions:** Small window between SELECT and UPDATE
- **Database:** Zero (uses existing field)
- **Compatibility:** Good (all systems have timestamps)

#### Gotchas & Pitfalls

```typescript
// ❌ DANGER: Direct object comparison
if (client.updatedAt === database.updatedAt) {
}
// Problem: JSON comparison fails, timezone issues

// ✓ SAFE: Millisecond comparison
if (client.updatedAt.getTime() === database.updatedAt.getTime()) {
}
// Always convert to timestamps first

// ✓ SAFER: Tolerance range
const diff = Math.abs(database.updatedAt.getTime() - client.updatedAt.getTime());
if (diff > 1000) {
  // > 1 second = conflict
  throw new ConflictException();
}
// Allows for clock skew
```

#### Client Experience

```javascript
// Must include exact timestamp
const editTime = response.updatedAt; // ISO string or Date

await updateResponse({
  content: newContent,
  expectedUpdatedAt: editTime, // Send exact timestamp
});
```

#### Limitations

- No version tracking (harder to implement caching)
- Timestamp comparison fragile (precision issues)
- Harder to reason about (what is "updated_at"?)
- Less explicit (implicit semantics)

#### When It Fails

```
Scenario: Database replication with clock skew
─────────────────────────────────────────────
Primary:   updatedAt = 2026-01-27 10:15:30.123
Replica:   updatedAt = 2026-01-27 10:15:30.456  (clock skew)

Client sends: expectedUpdatedAt = 10:15:30.123
Database gets: current = 10:15:30.456
Result: CONFLICT (but shouldn't be)
```

---

### 3. ROW-LEVEL PESSIMISTIC LOCKING

#### Use When:

- Conflicts are **expected to be common**
- You want **guaranteed mutual exclusion**
- You have **low concurrency** (few simultaneous writers)
- You **accept blocking writes**

#### Mechanism

```
Client                          Database
├─ Request lock ────────────────→ ├─ Acquire exclusive lock
│                                  ├─ Hold lock (blocks others)
├─ Fetch response
├─ Modify locally
├─ Send update ─────────────────→ ├─ Update (lock held)
│                                  ├─ Release lock
├─ Receive success
└─ Complete
```

#### Implementation Effort

```
Schema:           0 min
Migration:        0 min
Service Layer:    60 min (transaction + raw query)
DTOs:             0 min
Tests:            45 min
Client:           15 min (handling timeouts)
─────────────────────────
Total:            ~2 hours
```

#### Why NOT Recommended for This Use Case

**Problem 1: Blocking Behavior**

```
Time  User A Edits     User B Edits        User C Views
──────────────────────────────────────────────────────
10:00 Lock acquired    Queued (blocked)    Can read
10:05 Update sent      Still waiting...    Can read
10:10 Lock released    Lock acquired       Can read
10:15                  Update sent         Can read
10:20                  Lock released       Can read
```

- User B waits 15 seconds for User A
- In discussions with many users, this multiplies
- Creates bottlenecks during peak activity

**Problem 2: Timeout Complexity**

```typescript
// Must handle timeout scenarios
try {
  await updateWithLock(responseId);
} catch (err) {
  if (err.code === 'LOCK_TIMEOUT') {
    // Retry? Abort? Tell user to wait?
    // Bad UX either way
  }
}
```

**Problem 3: Deadlock Risk**

```
Thread A: Lock Response 1 → wants Lock Response 2 → WAIT
Thread B: Lock Response 2 → wants Lock Response 1 → DEADLOCK!
```

#### When Pessimistic Locking IS Good

- High-contention resources (bank account balance)
- Consistency > availability (financial transactions)
- Few concurrent writers (single editor per document)
- But NOT for discussion responses (many writers)

#### Performance Comparison at Scale

```
10 users editing responses simultaneously:

Version-based (Optimistic):
  ├─ User 1: 3ms update ✓
  ├─ User 2: 3ms update (possibly conflict, retry) ✓
  ├─ User 3: 3ms update ✓
  ├─ ...all in parallel...
  └─ Total time: ~100ms (parallel)

Row-level (Pessimistic):
  ├─ User 1: Acquires lock (3ms)
  ├─ User 2: BLOCKED, waiting...
  ├─ User 3: BLOCKED, waiting...
  ├─ User 1: Updates (3ms), releases lock
  ├─ User 2: Now acquires lock (3ms)
  ├─ User 3: BLOCKED...
  ├─ ...sequential...
  └─ Total time: ~300ms+ (sequential)
```

---

## Decision Framework

### Choose VERSION-BASED if:

1. ✓ Schema migrations are allowed
2. ✓ You want best user experience
3. ✓ High concurrency expected
4. ✓ Conflicts should be rare but handled gracefully
5. ✓ You want clear version semantics
6. ✓ Future: version history, caching, audit trails

**Score: 10/10 for this use case** ⭐

### Choose TIMESTAMP-BASED if:

1. ✓ Cannot add schema columns
2. ✓ Existing timestamp infrastructure solid
3. ✓ Minimal code changes acceptable
4. ✓ Conflicts still rare
5. ✓ Clock skew not a concern

**Score: 7/10 for this use case**

### Choose ROW-LEVEL if:

1. ✓ High contention is EXPECTED (not rare)
2. ✓ Consistency > availability
3. ✓ Few concurrent writers
4. ✓ Blocking is acceptable

**Score: 2/10 for this use case** ❌

---

## Implementation Decision Matrix

| Scenario                        | Recommended   | Why                                   |
| ------------------------------- | ------------- | ------------------------------------- |
| **Typical discussion platform** | Version-based | High concurrency, rare conflicts      |
| **Financial system**            | Row-level     | High value, consistency critical      |
| **Collaborative doc editor**    | Version-based | Many users, optimistic better         |
| **Inventory management**        | Row-level     | High contention, must be accurate     |
| **Social media comments**       | Version-based | Very high concurrency, edits rare     |
| **Game state**                  | Row-level     | High contention, consistency required |
| **Blog comment moderation**     | Version-based | Low concurrency, conflict rare        |

---

## Cost-Benefit Analysis

### Version-Based: 2.5 hour implementation

**Costs:**

- Schema migration (minimal risk)
- 4 bytes storage per response
- Code review and testing (1-2 hours)

**Benefits:**

- Clear conflict detection
- Excellent UX with error dialogs
- Scales to any concurrency level
- Foundation for versioning features
- Better monitoring/debugging
- Reduced database load (no locks)

**ROI:** Very high (benefits >> costs)

### Timestamp-Based: 2 hour implementation

**Costs:**

- Fragile timestamp comparisons (risk)
- Clock skew handling complexity
- Less explicit semantics
- No foundation for versioning

**Benefits:**

- No schema changes needed
- Quick to implement
- Works with existing timestamps

**ROI:** Moderate (faster but less robust)

### Row-Level: 2 hour implementation + ongoing pain

**Costs:**

- Lock contention and blocking
- Timeout complexity
- Poor user experience
- Database lock overhead
- Deadlock risk
- Ongoing operational headaches

**Benefits:**

- No schema changes
- Guaranteed consistency

**ROI:** Very low (benefits not worth the costs)

---

## Recommendation Summary

### Primary Recommendation: **VERSION-BASED OPTIMISTIC LOCKING**

**Confidence Level:** 95%

**Rationale:**

1. Discussion responses have **many potential editors** (high concurrency)
2. Actual **conflicts are rare** (different responses, different timestamps)
3. When conflicts occur, **clear error handling is critical** (UX)
4. Version field enables **future features** (history, caching, audit)
5. Excellent **performance at scale** (no blocking)
6. **Migration cost is minimal** (2.5 hours)

**Long-term benefits:**

- Foundation for version history feature
- Better logging and monitoring
- API contract clarity
- Client-side caching support
- Audit trail for compliance

**Implementation Path:**

1. Add `version` column to Response model
2. Run migration
3. Update `updateResponse()` with version check
4. Update client to send/handle version
5. Monitor conflict rates in production

**Expected Outcomes:**

- Conflict detection rate: 0.1-0.5% (very rare)
- User retry rate: <5% (clear error messaging)
- No data loss or corruption
- Clean error logs
- Happy users

---

## References

### Optimistic Locking Patterns

- Martin Fowler: Optimistic Offline Lock
- PostgreSQL: Application-Level Concurrency Control
- Prisma: Managing Concurrent Updates

### Real-World Examples

- Google Docs: Version-based with operational transforms
- GitHub: Version headers in API responses
- AWS DynamoDB: Version attribute support
- Stripe: idempotency keys with versioning

### Deployment Guides

- Prisma Migration Best Practices
- PostgreSQL Concurrent Control
- Error Handling in REST APIs
- Testing Concurrent Scenarios

---

## Next Steps

1. **Approve Strategy:** Version-based (requires stakeholder agreement)
2. **Plan Implementation:** Use implementation guide (2.5 hour estimate)
3. **Development:** Follow checklist in implementation guide
4. **Testing:** Run unit and integration tests
5. **Staging:** Test concurrent edits with multiple users
6. **Production:** Deploy with monitoring
7. **Monitoring:** Track conflict rates, user behavior

---

**Final Answer:** Use **version-based optimistic locking** with Prisma's built-in integer field and version increment pattern. It's the best fit for discussion responses, provides excellent UX, scales well, and has minimal implementation cost.
