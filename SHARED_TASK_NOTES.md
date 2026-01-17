# Shared Task Notes

## Current Status
- Completed tasks T001-T098 (Setup phase + most of US1 - Join and Participate)
- GitHub issues #1-#96 are closed, issues #97-#400 don't exist
- Open issues start at #401+ (Polish/test tasks T342+)
- Issue #55 still open but has wrong description

## CRITICAL ISSUE: GitHub Issues Have Wrong Descriptions

The GitHub issues were created with mismatched descriptions. For example:
- Issue #95 title says "[T099] Implement Bedrock client wrapper" but tasks.md shows T099 should be "Unit test ResponseAnalyzer"
- Issue #55 title says "[T059] Implement /auth/register endpoint" but tasks.md shows T059 should be "Unit test DiscussionService"

**Root cause**: The `scripts/create-issues.sh` script created issues with descriptions that don't match the current tasks.md file.

**Impact**: Cannot reliably work from GitHub issues - must use tasks.md as source of truth.

## CRITICAL ISSUE: Missing Source Files

Service `src/` directories were missing from the working tree (only `dist/` and `node_modules/` present). Had to restore them with:
```bash
for svc in services/*/; do git checkout origin/main -- "$svc/src" 2>/dev/null; done
git checkout origin/main -- frontend/src frontend/tests
```

This suggests either:
1. A build process that deletes source files
2. A .gitignore issue
3. Accidental deletion

## Next Steps

1. **Audit the repository state** - verify all source files are present and tracked
2. **Fix GitHub issues** - either:
   - Close all issues #15-#400 and recreate them from current tasks.md
   - Update issue descriptions to match tasks.md
   - Work directly from tasks.md and ignore GitHub issue descriptions
3. **Identify next task** - Based on tasks.md, find the first incomplete task after T098

## Notes
- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main
- Local npm registry (Verdaccio) is running at localhost:4873

## Workflow (Currently Broken)
The intended workflow doesn't work due to GitHub issue mismatches:
1. ~~`npm run next-issue` - claims highest priority issue~~ (Issues have wrong descriptions)
2. Instead: Check tasks.md directly for next incomplete task
3. Create feature branch from main
4. Implement, commit, push
5. Create PR via `gh pr create`
6. Merge via `gh pr merge --squash`
7. Pull main, repeat
