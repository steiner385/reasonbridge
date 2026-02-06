# Topic Management Issues Closure Script

**Script**: `close-topic-management-issues.sh`
**Purpose**: Automatically close 25 GitHub issues implemented in PR #780 (Topic Management)
**Created**: 2026-02-05
**Related**: Backlog audit at `docs/BACKLOG_AUDIT_2026-02-05.md`

---

## Overview

This script automates closing 25 GitHub issues that were completed as part of PR #780 (Comprehensive Topic Management). The issues cover:

- Backend endpoints (8 REST APIs)
- Topic CRUD operations
- Topic search and filtering
- Edit history and analytics
- Frontend components (modals, filters, wizards)
- 60+ E2E tests

**Issues to close**: #207, #208, #209, #212, #214, #215, #217, #219-#236

---

## Prerequisites

1. **GitHub CLI** installed and authenticated:
   ```bash
   gh --version    # Should show gh version 2.0.0+
   gh auth status  # Should show logged in
   ```

2. **PR #780 must be merged** into main branch

3. **Permissions**: Write access to close issues in `steiner385/reasonbridge`

---

## Usage

### Dry Run (Preview Only)

**Always run dry run first** to preview what will be closed:

```bash
./scripts/close-topic-management-issues.sh
```

**Output example**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DRY RUN MODE (Preview Only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following 25 issues would be closed:

  ✓ #207 - [T211] Implement POST /topics (create)
  ✓ #208 - [T212] Implement topic draft saving
  ...
  ✓ #236 - [T240] E2E: Draft saving and recovery

No issues were actually closed (dry run mode)

To execute the closures, run:
  ./scripts/close-topic-management-issues.sh --execute
```

### Execute (Actually Close Issues)

**After verifying dry run output**, execute:

```bash
./scripts/close-topic-management-issues.sh --execute
```

**Output example**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EXECUTING ISSUE CLOSURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Closing 25 issues...

Closing #207 - [T211] Implement POST /topics (create)... ✓ CLOSED
Closing #208 - [T212] Implement topic draft saving... ✓ CLOSED
...
Closing #236 - [T240] E2E: Draft saving and recovery... ✓ CLOSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total issues: 25
Successfully closed: 25
Failed: 0

✓ Script completed
```

---

## Safety Features

### 1. PR Merge Verification

The script **will not run** unless PR #780 is merged:

```bash
❌ Error: PR #780 is not yet merged

Current status: OPEN

Please wait for PR #780 to be merged before running this script.
```

### 2. Dry Run by Default

Running without `--execute` performs a dry run (no changes made).

### 3. Already-Closed Check

If an issue is already closed, the script skips it:

```
Closing #207 - [T211] Implement POST /topics... ALREADY CLOSED
```

### 4. Error Handling

Failed closures are tracked and reported:

```
Failed: 2

Failed issues:
  - #207
  - #215

Please manually review and close failed issues.
```

### 5. Rate Limiting

The script sleeps 0.5 seconds between API calls to avoid rate limits.

---

## What Gets Added to Each Issue

Each closed issue receives this comment:

```markdown
✅ **IMPLEMENTED** in PR #780 (Topic Management)

**PR Title**: feat: Implement comprehensive topic management (Feature 016)

**Implementation**: Complete topic management system with 48 tasks across:
- Backend: 8 REST endpoints (GET/POST/PATCH topics)
- Services: CRUD, search, edit history, analytics, merge capabilities
- Frontend: Create/edit modals, filters, status management, analytics dashboard
- Testing: 60+ E2E tests covering all workflows

**Key Features**:
- Topic lifecycle: SEEDING → ACTIVE → ARCHIVED/LOCKED
- Redis caching with 5min TTL
- Full-text search with trigram similarity
- Edit history with audit trail
- Transaction-safe merges with rollback
- Permission-based authorization

See PR #780 for complete implementation details.

**Closed by**: Backlog audit 2026-02-05 (automated closure script)
```

---

## Verification

After running, verify closures:

```bash
# View recently closed issues
gh issue list --repo steiner385/reasonbridge --state closed --limit 30

# Check specific issue
gh issue view 207 --repo steiner385/reasonbridge

# Count open issues (should be 148 - 25 = 123)
gh issue list --repo steiner385/reasonbridge --state open | wc -l
```

---

## Issues Covered

| Issue | Title | Category |
|-------|-------|----------|
| #207 | [T211] Implement POST /topics (create) | Backend API |
| #208 | [T212] Implement topic draft saving | Backend |
| #209 | [T213] Implement initial propositions creation | Backend |
| #212 | [T216] Implement tag management | Backend |
| #214 | [T218] Implement topic edit/update | Backend API |
| #215 | [T219] Implement topic status management | Backend API |
| #217 | [T221] Implement duplicate topic detection | Backend |
| #219 | [T223] Create topic creation wizard | Frontend |
| #220 | [T224] Create topic title input with validation | Frontend |
| #221 | [T225] Create topic description editor | Frontend |
| #222 | [T226] Create proposition input section | Frontend |
| #223 | [T227] Create AI feedback integration in wizard | Frontend |
| #224 | [T228] Create framing suggestions display | Frontend |
| #225 | [T229] Create tag selector component | Frontend |
| #226 | [T230] Create related topics linker | Frontend |
| #227 | [T231] Create draft auto-save functionality | Frontend |
| #228 | [T232] Create topic preview component | Frontend |
| #229 | [T233] Create duplicate topic warning | Frontend |
| #230 | [T234] Unit tests: Topic creation | Testing |
| #231 | [T235] Unit tests: AI quality check | Testing |
| #232 | [T236] Unit tests: Duplicate detection | Testing |
| #233 | [T237] Integration test: Topic creation flow | Testing |
| #234 | [T238] E2E: Create topic wizard flow | Testing |
| #235 | [T239] E2E: AI framing suggestions | Testing |
| #236 | [T240] E2E: Draft saving and recovery | Testing |

---

## Troubleshooting

### "PR #780 is not yet merged"

**Solution**: Wait for PR #780 to be merged to main branch.

**Check status**:
```bash
gh pr view 780 --repo steiner385/reasonbridge
```

### "Not authenticated with GitHub CLI"

**Solution**: Authenticate:
```bash
gh auth login
```

Follow prompts to authenticate.

### "Permission denied" or "403 Forbidden"

**Solution**: Ensure you have write access to the repository.

**Check permissions**:
```bash
gh repo view steiner385/reasonbridge --json viewerPermission
```

Should show `"ADMIN"` or `"WRITE"`.

### Rate Limiting (Too Many Requests)

**Solution**: The script already includes 0.5s delays. If you hit rate limits:

1. Wait a few minutes
2. Re-run the script (it will skip already-closed issues)

### Issue Not Found

**Solution**: If an issue doesn't exist, the script reports it and continues:

```
Closing #999 - Some title... NOT FOUND
```

Verify issue number in the script's `ISSUES` array.

---

## Related Documentation

- **Backlog Audit**: `docs/BACKLOG_AUDIT_2026-02-05.md`
- **PR #780**: https://github.com/steiner385/reasonbridge/pull/780
- **Topic Management Spec**: `specs/016-topic-management/`

---

## Future Use

This script can be adapted for future bulk issue closures:

1. Copy script to new name (e.g., `close-feature-xyz-issues.sh`)
2. Update `PR_NUMBER` variable
3. Update `ISSUES` array with new issue numbers and titles
4. Update `COMMENT_TEMPLATE` with feature-specific details
5. Run dry run, then execute

---

## Questions?

Contact: reasonbridge@example.org
GitHub: https://github.com/steiner385/reasonbridge
