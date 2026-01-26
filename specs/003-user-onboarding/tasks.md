# Tasks: User Onboarding (003-user-onboarding)

**Feature**: Value-first user onboarding with authentication, email verification, topic selection, and first post guidance
**Branch**: `003-user-onboarding`
**Generated**: 2026-01-25
**User Stories**: US1 (P1), US2 (P2), US3 (P3), US4 (P4), US5 (P5)

---

## Task Checklist

### Phase 1: Setup & Infrastructure

- [ ] T001 [P] Create feature branch `003-user-onboarding` from main
- [ ] T002 [P] Add AWS Cognito environment variables to `.env.example`: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_REGION
- [ ] T003 [P] Install AWS SDK dependencies: `@aws-sdk/client-cognito-identity-provider`, `@aws-sdk/credential-providers`
- [ ] T004 [P] Install OAuth client libraries: `google-auth-library`, `apple-signin-auth`
- [ ] T005 [P] Install JWT handling dependencies: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- [ ] T006 Create Prisma migration for User model with enums (AuthMethod, AccountStatus) in `packages/db-models/prisma/migrations/`
- [ ] T007 Create Prisma migration for VerificationToken model in `packages/db-models/prisma/migrations/`
- [ ] T008 Create Prisma migration for OnboardingProgress model with OnboardingStep enum in `packages/db-models/prisma/migrations/`
- [ ] T009 Create Prisma migration for TopicInterest model in `packages/db-models/prisma/migrations/`
- [ ] T010 Create Prisma migration for Topic model with ActivityLevel enum in `packages/db-models/prisma/migrations/`
- [ ] T011 Create Prisma migration for VisitorSession model in `packages/db-models/prisma/migrations/`
- [ ] T012 Add database indexes for User (email, cognitoUserSub, emailVerified, createdAt) in migration
- [ ] T013 Add database indexes for VerificationToken (token, userId, expiresAt) in migration
- [ ] T014 Add database indexes for OnboardingProgress (currentStep, completedAt) in migration
- [ ] T015 Add composite index for TopicInterest (userId, priority) in migration
- [ ] T016 Run Prisma migrations and generate client: `pnpm prisma migrate dev && pnpm prisma generate`
- [ ] T017 Create AWS Cognito User Pool via AWS CLI or Console with email verification enabled
- [ ] T018 Configure OAuth identity providers in Cognito: Google (client ID, secret), Apple (service ID, team ID, key ID)
- [ ] T019 Set up SES (Simple Email Service) for verification email delivery in same region as Cognito
- [ ] T020 Create Cognito email templates for verification emails with 6-digit code format

### Phase 2: Foundational Services & Utilities

- [ ] T021 [P] Create password validation utility in `packages/common/src/validation/password-validator.ts` (min 8 chars, mixed case, numbers, special chars)
- [ ] T022 [P] Create email format validator in `packages/common/src/validation/email-validator.ts` (RFC 5322 compliance)
- [ ] T023 [P] Create rate limiter middleware in `services/user-service/src/middleware/rate-limiter.middleware.ts` (configurable per endpoint)
- [ ] T024 [P] Create JWT authentication guard in `services/user-service/src/auth/guards/jwt-auth.guard.ts` using Passport JWT strategy
- [ ] T025 [P] Create optional authentication guard in `services/user-service/src/auth/guards/optional-auth.guard.ts` (allows both authenticated and unauthenticated)
- [ ] T026 Create Cognito service wrapper in `services/user-service/src/auth/cognito.service.ts` with methods: signUp, confirmSignUp, resendCode, initiateAuth
- [ ] T027 Create Google OAuth service in `services/user-service/src/auth/oauth/google-oauth.service.ts` with token exchange and profile retrieval
- [ ] T028 Create Apple OAuth service in `services/user-service/src/auth/oauth/apple-oauth.service.ts` with token validation and profile parsing
- [ ] T029 Create verification token service in `services/user-service/src/auth/verification.service.ts` with create, validate, markUsed, cleanup methods
- [ ] T030 Create user repository in `services/user-service/src/repositories/user.repository.ts` for User CRUD operations
- [ ] T031 Create onboarding progress repository in `services/user-service/src/repositories/onboarding-progress.repository.ts` for progress tracking
- [ ] T032 Create topic interest repository in `services/user-service/src/repositories/topic-interest.repository.ts` for interest management
- [ ] T033 Create visitor session repository in `services/user-service/src/repositories/visitor-session.repository.ts` for pre-auth tracking
- [ ] T034 [P] Create error response DTOs in `services/user-service/src/dto/error.dto.ts` matching OpenAPI ErrorResponse schema
- [ ] T035 [P] Create common response DTOs in `services/user-service/src/dto/common.dto.ts` for success responses

### Phase 3: US1 - Experience Platform Value Before Signup (P1)

- [ ] T036 [P] [US1] Create demo discussion DTO in `services/user-service/src/demo/dto/demo-discussion.dto.ts` matching OpenAPI DemoDiscussion schema
- [ ] T037 [US1] Create demo service in `services/user-service/src/demo/demo.service.ts` with getDemoDiscussions method (curated real discussions)
- [ ] T038 [US1] Create demo controller in `services/user-service/src/demo/demo.controller.ts` implementing GET /demo/discussions endpoint
- [ ] T039 [US1] Add demo discussion selection logic: filter for high commonGroundScore (>0.65), diverse topics, recent activity
- [ ] T040 [US1] Implement visitor session tracking in demo.service.ts: record viewedDemoDiscussionIds and interactionTimestamps
- [ ] T041 [US1] Add social proof metrics calculation in demo.service.ts: averageCommonGroundScore, totalParticipants, platformSatisfaction
- [ ] T042 [P] [US1] Create LandingPage component in `frontend/src/pages/LandingPage.tsx` with demo discussion showcase
- [ ] T043 [P] [US1] Create DemoDiscussionView component in `frontend/src/components/demo/DemoDiscussionView.tsx` for browsing propositions
- [ ] T044 [P] [US1] Create DemoMetrics component in `frontend/src/components/demo/DemoMetrics.tsx` displaying social proof stats
- [ ] T045 [US1] Create InteractiveDemo component in `frontend/src/components/demo/InteractiveDemo.tsx` with click-through exploration
- [ ] T046 [US1] Implement visitor session ID generation in frontend (localStorage UUID) and pass to demo API calls
- [ ] T047 [US1] Add "Join to Participate" prompt in demo components when user attempts interaction (post, vote)
- [ ] T048 [US1] Create authService.ts in `frontend/src/services/authService.ts` for signup/login API calls
- [ ] T049 [US1] Add progressive enhancement: server-render demo content for no-JS fallback in LandingPage
- [ ] T050 [US1] Write unit tests for demo.service.ts: discussion selection, metrics calculation, visitor tracking
- [ ] T051 [US1] Write E2E test for landing page demo flow in `frontend/tests/e2e/landing-page.spec.ts`: view demos, see metrics, click signup prompt

### Phase 4: US2 - Create Account with Minimal Friction (P2)

- [ ] T052 [P] [US2] Create SignupRequest DTO in `services/user-service/src/auth/dto/signup.dto.ts` matching OpenAPI schema
- [ ] T053 [P] [US2] Create AuthSuccessResponse DTO in `services/user-service/src/auth/dto/auth-response.dto.ts` with accessToken, user, onboardingProgress
- [ ] T054 [US2] Create auth service in `services/user-service/src/auth/auth.service.ts` with signup method (email/password)
- [ ] T055 [US2] Implement signup flow in auth.service.ts: validate password strength, check email uniqueness, create Cognito user, create User record
- [ ] T056 [US2] Create OnboardingProgress record in same transaction as User creation (currentStep = VERIFICATION)
- [ ] T057 [US2] Link VisitorSession to User on signup if visitorSessionId provided
- [ ] T058 [US2] Implement verification email trigger in auth.service.ts using Cognito confirmSignUp API
- [ ] T059 [US2] Create auth controller in `services/user-service/src/auth/auth.controller.ts` implementing POST /auth/signup endpoint
- [ ] T060 [P] [US2] Create VerifyEmailRequest DTO in `services/user-service/src/auth/dto/verify-email.dto.ts`
- [ ] T061 [US2] Implement verifyEmail method in auth.service.ts: validate 6-digit code, confirm with Cognito, update User.emailVerified
- [ ] T062 [US2] Update OnboardingProgress to currentStep = TOPICS after email verification
- [ ] T063 [US2] Create POST /auth/verify-email endpoint in auth.controller.ts
- [ ] T064 [P] [US2] Create ResendVerificationRequest DTO and response DTO in `services/user-service/src/auth/dto/resend-verification.dto.ts`
- [ ] T065 [US2] Implement resendVerification method in auth.service.ts with rate limiting (3 per hour)
- [ ] T066 [US2] Create POST /auth/resend-verification endpoint in auth.controller.ts with rate limit middleware
- [ ] T067 [P] [US2] Create InitiateOAuthRequest DTO in `services/user-service/src/auth/dto/oauth.dto.ts`
- [ ] T068 [US2] Implement initiateOAuth method in auth.service.ts: generate OAuth URL with state token (CSRF protection)
- [ ] T069 [US2] Create POST /auth/oauth/initiate endpoint in auth.controller.ts
- [ ] T070 [US2] Implement OAuth callback handler in auth.service.ts: exchange code for tokens, fetch user profile, create/login User
- [ ] T071 [US2] Handle OAuth email verification: mark emailVerified=true if OAuth provider confirms email ownership
- [ ] T072 [US2] Create GET /auth/oauth/callback endpoint in auth.controller.ts with redirect logic
- [ ] T073 [P] [US2] Create LoginRequest DTO in `services/user-service/src/auth/dto/login.dto.ts`
- [ ] T074 [US2] Implement login method in auth.service.ts: authenticate with Cognito, update lastLoginAt
- [ ] T075 [US2] Create POST /auth/login endpoint in auth.controller.ts
- [ ] T076 [P] [US2] Create SignupPage component in `frontend/src/pages/SignupPage.tsx` with email/password form and OAuth buttons
- [ ] T077 [P] [US2] Create EmailSignupForm component in `frontend/src/components/auth/EmailSignupForm.tsx` with password strength indicator
- [ ] T078 [P] [US2] Create OAuthButtons component in `frontend/src/components/auth/OAuthButtons.tsx` for Google and Apple sign-in
- [ ] T079 [US2] Create EmailVerificationPage component in `frontend/src/pages/EmailVerificationPage.tsx` with 6-digit code input
- [ ] T080 [US2] Create VerificationBanner component in `frontend/src/components/auth/VerificationBanner.tsx` for unverified users with resend option
- [ ] T081 [US2] Implement form validation in EmailSignupForm: real-time password strength, email format, duplicate email check
- [ ] T082 [US2] Add OAuth redirect handling in `frontend/src/pages/AuthCallbackPage.tsx`: parse tokens, store JWT, redirect to onboarding
- [ ] T083 [US2] Implement JWT token storage in localStorage and automatic inclusion in API headers
- [ ] T084 [US2] Write unit tests for auth.service.ts: signup validation, email verification, OAuth flows, login
- [ ] T085 [US2] Write integration tests for Cognito flows in `services/user-service/tests/integration/cognito-integration.spec.ts`
- [ ] T086 [US2] Write E2E test for email signup flow in `frontend/tests/e2e/signup-flow.spec.ts`: signup, verify email, reach dashboard
- [ ] T087 [US2] Write E2E test for OAuth signup flow in `frontend/tests/e2e/oauth-flow.spec.ts`: initiate OAuth, callback, reach dashboard

### Phase 5: US3 - Select Initial Topic Interests (P3)

- [ ] T088 [P] [US3] Create Topic DTO in `services/user-service/src/topics/dto/topic.dto.ts` matching OpenAPI Topic schema
- [ ] T089 [P] [US3] Create TopicsResponse DTO in `services/user-service/src/topics/dto/topics-response.dto.ts`
- [ ] T090 [US3] Create topic service in `services/user-service/src/topics/topic.service.ts` with getTopics method
- [ ] T091 [US3] Implement topic activity level computation: HIGH (20+ discussions OR 100+ participants), MEDIUM (5+ discussions OR 20+ participants), LOW (otherwise)
- [ ] T092 [US3] Add topic filtering logic in topic.service.ts: suggestedOnly, minActivity parameters
- [ ] T093 [US3] Create topic controller in `services/user-service/src/topics/topic.controller.ts` implementing GET /topics endpoint
- [ ] T094 [P] [US3] Create SelectTopicsRequest DTO in `services/user-service/src/onboarding/dto/select-topics.dto.ts` with 2-3 topicIds validation
- [ ] T095 [P] [US3] Create SelectTopicsResponse DTO in `services/user-service/src/onboarding/dto/select-topics-response.dto.ts`
- [ ] T096 [US3] Create onboarding service in `services/user-service/src/onboarding/onboarding.service.ts` with selectTopics method
- [ ] T097 [US3] Implement topic selection logic in onboarding.service.ts: validate 2-3 topics, assign priorities (1-3), create TopicInterest records
- [ ] T098 [US3] Update OnboardingProgress.topicsSelected = true and currentStep = ORIENTATION after topic selection
- [ ] T099 [US3] Add low activity warning in onboarding.service.ts: if all topics LOW activity, suggest HIGH activity alternatives
- [ ] T100 [US3] Create onboarding controller in `services/user-service/src/onboarding/onboarding.controller.ts` implementing POST /onboarding/select-topics endpoint
- [ ] T101 [P] [US3] Create TopicSelectionPage component in `frontend/src/pages/TopicSelectionPage.tsx` with topic cards and selection UI
- [ ] T102 [P] [US3] Create TopicCard component in `frontend/src/components/onboarding/TopicCard.tsx` displaying name, description, activity level
- [ ] T103 [US3] Implement topic selection state management in TopicSelectionPage: enforce 2-3 selection limit, highlight selected topics
- [ ] T104 [US3] Add activity level indicators in TopicCard: HIGH (green badge), MEDIUM (yellow), LOW (gray) with participant counts
- [ ] T105 [US3] Display low activity warning modal if user selects all LOW activity topics
- [ ] T106 [US3] Create onboardingService.ts in `frontend/src/services/onboardingService.ts` for topic selection API calls
- [ ] T107 [US3] Write unit tests for topic.service.ts: activity level computation, filtering logic
- [ ] T108 [US3] Write unit tests for onboarding.service.ts: topic selection validation, priority assignment, low activity warnings
- [ ] T109 [US3] Write E2E test for topic selection flow in `frontend/tests/e2e/topic-selection.spec.ts`: select 2-3 topics, proceed to orientation

### Phase 6: US4 - Complete Minimal Post-Signup Orientation (P4)

- [ ] T110 [P] [US4] Create OnboardingProgressResponse DTO in `services/user-service/src/onboarding/dto/onboarding-progress.dto.ts` matching OpenAPI schema
- [ ] T111 [US4] Implement getOnboardingProgress method in onboarding.service.ts: retrieve OnboardingProgress with percentComplete calculation
- [ ] T112 [US4] Add nextAction recommendation logic in onboarding.service.ts: suggest next step based on currentStep
- [ ] T113 [US4] Create GET /onboarding/progress endpoint in onboarding.controller.ts
- [ ] T114 [P] [US4] Create MarkOrientationRequest DTO in `services/user-service/src/onboarding/dto/mark-orientation.dto.ts`
- [ ] T115 [US4] Implement markOrientationViewed method in onboarding.service.ts: update orientationViewed flag
- [ ] T116 [US4] Create PUT /onboarding/mark-orientation-viewed endpoint in onboarding.controller.ts
- [ ] T117 [P] [US4] Create OrientationPage component in `frontend/src/pages/OrientationPage.tsx` with 3-step overlay
- [ ] T118 [P] [US4] Create OrientationOverlay component in `frontend/src/components/onboarding/OrientationOverlay.tsx` with step navigation
- [ ] T119 [US4] Create orientation step content: (1) How proposition-based discussions work, (2) What AI feedback provides, (3) How to find common ground
- [ ] T120 [US4] Implement orientation navigation in OrientationOverlay: next, skip to end, dismiss entirely buttons
- [ ] T121 [US4] Add persistent help menu in main navigation for accessing orientation content after dismissal
- [ ] T122 [US4] Make orientation non-modal (overlay style) so users can still access platform features
- [ ] T123 [US4] Write unit tests for onboarding.service.ts: progress calculation, nextAction logic, orientation marking
- [ ] T124 [US4] Write E2E test for orientation flow in `frontend/tests/e2e/orientation.spec.ts`: view steps, skip, access help menu

### Phase 7: US5 - Participate in First Discussion (P5)

- [ ] T125 [P] [US5] Create MarkFirstPostRequest DTO in `services/user-service/src/onboarding/dto/mark-first-post.dto.ts`
- [ ] T126 [P] [US5] Create OnboardingCompleteResponse DTO in `services/user-service/src/onboarding/dto/onboarding-complete.dto.ts`
- [ ] T127 [US5] Implement markFirstPost method in onboarding.service.ts: update firstPostMade = true, currentStep = COMPLETE, set completedAt
- [ ] T128 [US5] Add encouragement message generation in onboarding.service.ts for first post completion
- [ ] T129 [US5] Create PUT /onboarding/mark-first-post endpoint in onboarding.controller.ts
- [ ] T130 [US5] Create feed personalization service in `services/discussion-service/src/feed/feed.service.ts` (separate service)
- [ ] T131 [US5] Implement interest-based feed filtering in feed.service.ts: prioritize discussions tagged with user's TopicInterest
- [ ] T132 [US5] Add "Add Your Perspective" call-to-action highlighting for new users in discussion UI
- [ ] T133 [US5] Create first-time AI feedback enhancement: add extra context explaining AI suggestions are helpful, not critical
- [ ] T134 [US5] Create first post celebration modal component in `frontend/src/components/onboarding/FirstPostCelebration.tsx`
- [ ] T135 [US5] Trigger FirstPostCelebration modal after successful first post submission
- [ ] T136 [US5] Call PUT /onboarding/mark-first-post API after first post creation in discussion service
- [ ] T137 [US5] Write unit tests for feed.service.ts: interest-based filtering, priority ranking
- [ ] T138 [US5] Write unit tests for onboarding.service.ts: first post marking, completion logic
- [ ] T139 [US5] Write E2E test for first post flow in `frontend/tests/e2e/first-post.spec.ts`: select discussion, compose response, see celebration

### Phase 8: Cross-Cutting Concerns & Polish

- [ ] T140 [P] Create WCAG 2.2 AA accessibility audit checklist for all onboarding components
- [ ] T141 [P] Add ARIA labels and live regions to form validation errors in EmailSignupForm, EmailVerificationPage
- [ ] T142 [P] Ensure keyboard navigation works for OrientationOverlay, TopicCard selection
- [ ] T143 [P] Add screen reader announcements for onboarding progress updates
- [ ] T144 Create cleanup job for expired VerificationTokens in `services/user-service/src/jobs/cleanup-tokens.job.ts` (delete after 7 days)
- [ ] T145 Create cleanup job for stale VisitorSessions in `services/user-service/src/jobs/cleanup-sessions.job.ts` (delete after 30 days)
- [ ] T146 Schedule cleanup jobs using NestJS cron scheduler (daily at 2 AM)
- [ ] T147 Add performance monitoring for landing page load time (<1.5s target)
- [ ] T148 Add performance monitoring for verification email delivery (<60s target)
- [ ] T149 Implement database connection pooling configuration for onboarding spikes
- [ ] T150 [P] Add error tracking for failed Cognito operations (signup, verification, OAuth)
- [ ] T151 [P] Add analytics events for onboarding funnel: signup started, email verified, topics selected, orientation viewed, first post made
- [ ] T152 Create mobile responsive CSS for all onboarding pages (320px to 1920px)
- [ ] T153 Test onboarding flow on iOS Safari, Chrome Android, Firefox Mobile
- [ ] T154 Add rate limiting to auth endpoints: 5 signups per IP per hour, 3 verification resends per hour
- [ ] T155 Implement CSRF protection for OAuth state tokens in auth.service.ts
- [ ] T156 Add correlation IDs to all log entries for traceability
- [ ] T157 [P] Create contract tests for auth API in `services/user-service/tests/contract/auth-api.contract.spec.ts` validating OpenAPI spec
- [ ] T158 [P] Create contract tests for onboarding API in `services/user-service/tests/contract/onboarding-api.contract.spec.ts`
- [ ] T159 Write comprehensive E2E test for complete onboarding journey in `frontend/tests/e2e/onboarding-journey.spec.ts`: landing → signup → verify → topics → orientation → first post
- [ ] T160 Add load testing for concurrent signups (100 simultaneous users)
- [ ] T161 Document AWS Cognito setup in `specs/003-user-onboarding/quickstart.md` (already created, verify accuracy)
- [ ] T162 Document OAuth provider configuration in quickstart.md
- [ ] T163 Add troubleshooting guide for common verification email issues
- [ ] T164 Create seed data for Topic table: 15-20 curated topics with realistic activity levels
- [ ] T165 Create seed data for demo discussions: 5-10 high-quality examples with common ground findings
- [ ] T166 Add environment variable validation on service startup (fail fast if Cognito config missing)
- [ ] T167 Create health check endpoint for Cognito connectivity in auth.controller.ts
- [ ] T168 Implement graceful degradation if SES email delivery fails (queue for retry)
- [ ] T169 Add user-facing error messages for all validation failures (e.g., "Password must include at least one uppercase letter")
- [ ] T170 Create loading states for all async operations: signup, verification, OAuth, topic selection
- [ ] T171 Add optimistic UI updates where appropriate (e.g., topic selection highlight before API response)
- [ ] T172 Implement session timeout handling with re-authentication prompt
- [ ] T173 Add "Remember me" option to login form (extended JWT expiry)
- [ ] T174 Create password reset flow (out of scope for initial onboarding but required for complete auth)
- [ ] T175 Add account deletion flow for GDPR compliance (cascade delete all related records)

---

## Dependency Graph

### Sequential Dependencies

**Setup Phase** (T001-T020) → **Foundational Services** (T021-T035) → **User Stories**

**US1** (T036-T051) can start after T021-T035 complete
**US2** (T052-T087) depends on T021-T035, can run parallel to US1 backend (T036-T041)
**US3** (T088-T109) depends on US2 authentication being complete (T052-T087)
**US4** (T110-T124) depends on US3 topic selection (T088-T109)
**US5** (T125-T139) depends on US4 orientation (T110-T124)
**Cross-Cutting** (T140-T175) can start after respective features are implemented

### Parallel Execution Opportunities

**Phase 1 (Setup):**
- T002-T005 (environment and dependencies) can run in parallel
- T006-T015 (Prisma migrations) can be created in parallel, then run sequentially
- T017-T020 (AWS Cognito setup) can run in parallel

**Phase 2 (Foundational):**
- T021-T022 (validators) can run in parallel
- T023-T025 (middleware/guards) can run in parallel
- T026-T028 (OAuth services) can run in parallel
- T030-T033 (repositories) can run in parallel
- T034-T035 (DTOs) can run in parallel

**US1 (Landing Page):**
- Backend: T036-T037 (DTOs and service) → T038-T041 (controller and logic)
- Frontend: T042-T045 (components) can run in parallel → T046-T049 (integration)
- Tests: T050-T051 can run in parallel after implementation

**US2 (Account Creation):**
- DTOs: T052-T053, T060, T064, T067, T073 can be created in parallel
- Backend services: T054-T059 (email signup), T061-T063 (verification), T068-T072 (OAuth), T074-T075 (login) can run in parallel after DTOs
- Frontend: T076-T078 (signup components), T079-T080 (verification components) can run in parallel
- Tests: T084-T087 can run in parallel after implementation

**US3 (Topic Selection):**
- Backend: T088-T089 (DTOs), T090-T093 (topic service), T094-T095 (onboarding DTOs) can run in parallel
- Frontend: T101-T102 (components) can run in parallel
- Tests: T107-T109 can run in parallel after implementation

**US4 (Orientation):**
- Backend: T110-T113 (progress endpoint), T114-T116 (orientation marking) can run in parallel
- Frontend: T117-T120 (orientation components) can run in parallel
- Tests: T123-T124 can run in parallel after implementation

**US5 (First Post):**
- Backend: T125-T129 (first post marking) and T130-T131 (feed service) can run in parallel
- Frontend: T134-T136 (celebration components) can run in parallel
- Tests: T137-T139 can run in parallel after implementation

**Cross-Cutting:**
- Accessibility: T140-T143 can run in parallel
- Cleanup jobs: T144-T146 can run in parallel
- Monitoring: T147-T149 can run in parallel
- Error tracking/analytics: T150-T151 can run in parallel
- Contract tests: T157-T158 can run in parallel
- Documentation: T161-T163 can run in parallel
- Seed data: T164-T165 can run in parallel

---

## Summary Statistics

**Total Tasks**: 175
**Parallelizable Tasks**: 68 (marked with [P])
**Story Tasks Breakdown**:
- US1 (Experience Platform Value): 16 tasks (T036-T051)
- US2 (Create Account): 36 tasks (T052-T087)
- US3 (Select Topic Interests): 22 tasks (T088-T109)
- US4 (Complete Orientation): 15 tasks (T110-T124)
- US5 (Participate in First Discussion): 15 tasks (T125-T139)
- Setup: 20 tasks (T001-T020)
- Foundational: 15 tasks (T021-T035)
- Cross-Cutting: 36 tasks (T140-T175)

**Estimated Complexity**:
- Setup & Foundational: 2-3 days (parallel execution)
- US1 (P1): 2-3 days
- US2 (P2): 4-5 days (most complex - authentication flows)
- US3 (P3): 2-3 days
- US4 (P4): 1-2 days
- US5 (P5): 2-3 days
- Cross-Cutting: 2-3 days (ongoing throughout)

**Total Estimated Duration**: 15-20 days with 2-3 developers working in parallel

---

## Implementation Notes

1. **Task ID Format**: T### (3-digit sequential)
2. **[P] Marker**: Indicates task can be parallelized with others in same phase
3. **[Story] Marker**: US1-US5 labels indicate which user story the task belongs to
4. **File Paths**: All paths are relative to repository root (`/mnt/ssk-ssd/tony/GitHub/uniteDiscord2/`)
5. **Testing Strategy**: Unit tests for services, integration tests for Cognito/OAuth, contract tests for API spec compliance, E2E tests for user journeys
6. **Database Migrations**: Run sequentially even though creation can be parallel
7. **AWS Setup**: T017-T020 require AWS Console/CLI access and may need coordination with DevOps
8. **OAuth Configuration**: T018 requires developer accounts with Google Cloud Console and Apple Developer Portal
9. **Progressive Enhancement**: T049 ensures landing page works without JavaScript for accessibility and SEO
10. **WCAG Compliance**: T140-T143 should be continuously validated during development, not just at end

---

## Next Steps

1. **Create feature branch**: Start with T001
2. **Environment setup**: Complete T002-T005 to enable local development
3. **Database schema**: Execute T006-T016 to establish data model
4. **AWS configuration**: Coordinate T017-T020 with infrastructure team
5. **Begin parallel development**: Split team across foundational services (T021-T035) and US1 backend (T036-T041)
6. **Iterative testing**: Run tests after each user story phase completes
7. **Integration checkpoint**: After US2 completes, verify full signup → verification → login flow
8. **Performance validation**: Monitor T147-T148 metrics throughout development
9. **Accessibility audit**: Conduct T140-T143 reviews before final PR

---

**Generated by**: `/speckit.tasks` command
**Based on**: spec.md, plan.md, data-model.md, contracts/openapi.yaml
**Ready for**: `/speckit.implement` command to execute tasks
