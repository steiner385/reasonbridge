# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #21-#29 (T021-T029) - All schema entities defined + initial migration
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issues #43-#49 (T047-T053) - Frontend setup (React, Tailwind, Router, Query, UI, E2E)
- Completed issues #50-#53 (T054-T057) - Complete CDK infrastructure with tests
- Completed issue #64 (T068) - Avatar upload with S3
- Completed issue #65 (T069) - GET /topics endpoint with filtering
- Completed issue #66 (T070) - GET /topics/:id detail endpoint
- Completed issue #67 (T071) - Topic search endpoint
- Completed issue #68 (T072) - Topic list page with filtering and pagination
- Completed issue #69 (T073) - Reusable TopicCard component
- Completed issue #70 (T074) - Topic detail page
- Completed issue #71 (T075) - Search bar component
- Completed issue #72 (T076) - Topic filtering UI component
- Completed issue #73 (T077) - POST /responses endpoint
- Completed issue #74 (T078) - GET /responses for topic
- Completed issue #75 (T079) - Response threading (parentId)
- Completed issue #76 (T080) - Response edit endpoint (PUT)
- Completed issue #77 (T081) - Response composer component
- Completed issue #78 (T082) - Response card component
- ~211 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Iteration Summary (2026-01-17)
**Completed Issues #21-#29:**
- Issues #21-#28 (T021-T028): Verified all Prisma entity definitions
  - All entities were already implemented in initial schema setup (#13)
  - Verified: Proposition, Response, ResponseProposition, Alignment, Feedback, FactCheckResult, CommonGroundAnalysis, ModerationAction, Appeal
  - Closed all as already complete
- Issue #29 (T029): Created initial Prisma migration ✅
  - Set up PostgreSQL database (unite_discord)
  - Created database user (unite/localdev)
  - Generated migration: `20260117204909_initial/migration.sql` (519 lines)
  - All tables, indexes, and constraints applied successfully
  - Merged via PR #417

**Database Setup Notes:**
- System PostgreSQL running on localhost:5432 (not Docker)
- Database: unite_discord
- User: unite (password: localdev, has CREATEDB permission)
- Migration system initialized and working

## Next Steps
Run `npm run next-issue` to claim and implement the next highest priority issue.

## Notes
- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main
- Local npm registry (Verdaccio) is running at localhost:4873

## Workflow
1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
