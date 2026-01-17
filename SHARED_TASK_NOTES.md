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
- Completed issue #54 (T058) - Cognito user pool configuration
- ~210 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Iteration Summary (2026-01-17)
**Completed Issue #54 (T058):**
- Implemented Cognito user pool configuration for authentication ✅
  - Created CognitoStack in CDK infrastructure
  - Email-based authentication with self-registration
  - Custom attributes: displayName, verificationLevel
  - Optional MFA (SMS and TOTP)
  - OAuth 2.0 authorization code grant
  - Token validity: 1h (access/ID), 30d (refresh)
  - Comprehensive test coverage (all tests pass)
  - Merged via PR #432

**Authentication Setup:**
- User Pool: unite-user-pool
- Hosted UI domain: unite-discord-{account-id}.auth.us-east-1.amazoncognito.com
- Verification levels: basic (email), enhanced (phone), verified_human (ID)
- Password policy: 12+ chars with complexity requirements

## Next Steps
**In Progress: Issue #55 (T059) - /auth/register endpoint**
- Branch created: `feature/t059-auth-register-endpoint`
- Dependencies added: @aws-sdk/client-cognito-identity-provider, class-validator, class-transformer
- Remaining work:
  1. Create auth module with DTOs (RegisterDto, LoginDto, etc.)
  2. Implement CognitoService to interact with user pool
  3. Implement AuthService with register/login logic
  4. Create user records in DB after successful Cognito registration
  5. Implement AuthController with /auth/register endpoint
  6. Add tests for auth endpoints
  7. Create PR and merge

**For next iteration:**
Continue implementing issue #55 or run `npm run next-issue` to select a different task.

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
