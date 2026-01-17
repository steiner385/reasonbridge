# Tasks: uniteDiscord - Rational Discussion Platform

**Input**: Design documents from `/specs/001-rational-discussion-platform/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests included per Constitution II (80% coverage for business logic)

**Organization**: Tasks grouped by user story (US1-US6) to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6) for traceability
- Exact file paths included in all descriptions

## Path Conventions (from plan.md)

```
services/           # Backend microservices (NestJS)
packages/           # Shared packages
frontend/           # React SPA
infrastructure/     # CDK, Helm, Docker
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization, tooling, and development environment

- [ ] T001 Create monorepo structure with pnpm workspaces in pnpm-workspace.yaml
- [ ] T002 Initialize root package.json with TypeScript 5.x, shared dev dependencies
- [ ] T003 [P] Configure ESLint with Airbnb config in .eslintrc.js
- [ ] T004 [P] Configure Prettier in .prettierrc
- [ ] T005 [P] Configure TypeScript base config in tsconfig.base.json with strict: true
- [ ] T006 Create docker-compose.yml with postgres:15, redis:7, localstack, mailhog, jaeger
- [ ] T007 Create docker-compose.test.yml for isolated test environment
- [ ] T008 Create Makefile with setup, dev, test, lint, build targets
- [ ] T009 Create .env.example with DATABASE_URL, REDIS_URL, AWS_ENDPOINT, AI_MOCK_ENABLED
- [ ] T010 [P] Create packages/common/ with shared types and utilities
- [ ] T011 [P] Create packages/event-schemas/ with event type definitions
- [ ] T012 [P] Create packages/testing-utils/ with shared test helpers
- [ ] T013 Create packages/db-models/ with Prisma schema initialization
- [ ] T014 [P] Create packages/ai-client/ with Bedrock client wrapper stub

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [ ] T015 Define User entity in packages/db-models/prisma/schema.prisma
- [ ] T016 [P] Define VerificationRecord entity in packages/db-models/prisma/schema.prisma
- [ ] T017 [P] Define UserFollow entity in packages/db-models/prisma/schema.prisma
- [ ] T018 Define DiscussionTopic entity in packages/db-models/prisma/schema.prisma
- [ ] T019 [P] Define Tag and TopicTag entities in packages/db-models/prisma/schema.prisma
- [ ] T020 [P] Define TopicLink entity in packages/db-models/prisma/schema.prisma
- [ ] T021 Define Proposition entity in packages/db-models/prisma/schema.prisma
- [ ] T022 Define Response and ResponseProposition entities in packages/db-models/prisma/schema.prisma
- [ ] T023 [P] Define Alignment entity in packages/db-models/prisma/schema.prisma
- [ ] T024 [P] Define Feedback entity in packages/db-models/prisma/schema.prisma
- [ ] T025 [P] Define FactCheckResult entity in packages/db-models/prisma/schema.prisma
- [ ] T026 [P] Define CommonGroundAnalysis entity in packages/db-models/prisma/schema.prisma
- [ ] T027 [P] Define ModerationAction entity in packages/db-models/prisma/schema.prisma
- [ ] T028 [P] Define Appeal entity in packages/db-models/prisma/schema.prisma
- [ ] T029 Run prisma migrate dev to create initial migration

### Service Scaffolding

- [ ] T030 Scaffold services/api-gateway/ with NestJS, Fastify adapter, health check
- [ ] T031 [P] Scaffold services/user-service/ with NestJS base, Prisma module, health check
- [ ] T032 [P] Scaffold services/discussion-service/ with NestJS base, Prisma module, health check
- [ ] T033 [P] Scaffold services/ai-service/ with NestJS base, Bedrock client stub, health check
- [ ] T034 [P] Scaffold services/moderation-service/ with NestJS base, Prisma module, health check
- [ ] T035 [P] Scaffold services/recommendation-service/ with NestJS base, health check
- [ ] T036 [P] Scaffold services/notification-service/ with NestJS base, Socket.io, health check
- [ ] T037 [P] Scaffold services/fact-check-service/ with NestJS base, health check

### API Gateway Infrastructure

- [ ] T038 Implement JWT validation middleware in services/api-gateway/src/middleware/auth.middleware.ts
- [ ] T039 Implement rate limiting with Redis in services/api-gateway/src/middleware/rate-limit.middleware.ts
- [ ] T040 Implement request routing to microservices in services/api-gateway/src/app.module.ts
- [ ] T041 Create OpenAPI aggregation endpoint in services/api-gateway/src/swagger/

### Event Infrastructure

- [ ] T042 Implement SNS/SQS event publisher in packages/common/src/events/publisher.ts
- [ ] T043 Implement SQS event consumer base class in packages/common/src/events/consumer.ts
- [ ] T044 Define event types for response.created, response.analyzed in packages/event-schemas/src/
- [ ] T045 [P] Define event types for moderation.action.requested in packages/event-schemas/src/
- [ ] T046 [P] Define event types for common-ground.generated in packages/event-schemas/src/

### Frontend Scaffolding

- [ ] T047 Scaffold frontend/ with Vite, React 18, TypeScript
- [ ] T048 Configure TanStack Query in frontend/src/providers/QueryProvider.tsx
- [ ] T049 Configure Zustand stores structure in frontend/src/stores/
- [ ] T050 Configure Tailwind CSS in frontend/tailwind.config.js
- [ ] T051 Create design system primitives: Button, Input, Card in frontend/src/components/ui/
- [ ] T052 Create Modal, Toast components in frontend/src/components/ui/
- [ ] T053 Configure React Router in frontend/src/router.tsx

### Infrastructure Setup

- [ ] T054 Create infrastructure/docker/ Dockerfiles for each service
- [ ] T055 [P] Create infrastructure/helm/unite-services/ base chart
- [ ] T056 [P] Create infrastructure/helm/unite-frontend/ chart
- [ ] T057 Create infrastructure/jenkins/Jenkinsfile with pipeline stages

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Join and Participate in Discussion (Priority: P1) 🎯 MVP

**Goal**: Users can create accounts, browse topics, post responses, and see discussion structure

**Independent Test**: New user creates account → browses topics → posts response → sees contribution in discussion

### Tests for User Story 1

- [ ] T058 [P] [US1] Unit test UserService in services/user-service/tests/unit/user.service.spec.ts
- [ ] T059 [P] [US1] Unit test DiscussionService in services/discussion-service/tests/unit/discussion.service.spec.ts
- [ ] T060 [P] [US1] Integration test user registration flow in services/user-service/tests/integration/registration.spec.ts
- [ ] T061 [P] [US1] Integration test topic browsing in services/discussion-service/tests/integration/topics.spec.ts
- [ ] T062 [P] [US1] Contract test user-service API in services/user-service/tests/pact/user.provider.spec.ts
- [ ] T063 [P] [US1] Contract test discussion-service API in services/discussion-service/tests/pact/discussion.provider.spec.ts
- [ ] T064 [US1] E2E test user journey in frontend/tests/e2e/user-story-1.spec.ts

### User Service Implementation (US1)

- [ ] T065 [P] [US1] Create User DTOs in services/user-service/src/dto/user.dto.ts
- [ ] T066 [P] [US1] Create Verification DTOs in services/user-service/src/dto/verification.dto.ts
- [ ] T067 [US1] Implement UserRepository in services/user-service/src/repositories/user.repository.ts
- [ ] T068 [US1] Implement UserService with create, findById, update in services/user-service/src/services/user.service.ts
- [ ] T069 [US1] Implement Cognito integration in services/user-service/src/auth/cognito.service.ts
- [ ] T070 [US1] Implement UserController with /me, /{userId} endpoints in services/user-service/src/controllers/user.controller.ts
- [ ] T071 [US1] Add email verification trigger on signup in services/user-service/src/events/user-created.handler.ts

### Discussion Service Implementation (US1)

- [ ] T072 [P] [US1] Create Topic DTOs in services/discussion-service/src/dto/topic.dto.ts
- [ ] T073 [P] [US1] Create Response DTOs in services/discussion-service/src/dto/response.dto.ts
- [ ] T074 [P] [US1] Create Tag DTOs in services/discussion-service/src/dto/tag.dto.ts
- [ ] T075 [US1] Implement TopicRepository in services/discussion-service/src/repositories/topic.repository.ts
- [ ] T076 [P] [US1] Implement TagRepository in services/discussion-service/src/repositories/tag.repository.ts
- [ ] T077 [P] [US1] Implement ResponseRepository in services/discussion-service/src/repositories/response.repository.ts
- [ ] T078 [US1] Implement TopicService with list, getById, browse in services/discussion-service/src/services/topic.service.ts
- [ ] T079 [US1] Implement ResponseService with create, list in services/discussion-service/src/services/response.service.ts
- [ ] T080 [US1] Implement TopicsController with /topics endpoints in services/discussion-service/src/controllers/topics.controller.ts
- [ ] T081 [US1] Implement ResponsesController with /topics/{id}/responses in services/discussion-service/src/controllers/responses.controller.ts
- [ ] T082 [US1] Implement TagsController with /tags endpoints in services/discussion-service/src/controllers/tags.controller.ts
- [ ] T083 [US1] Publish response.created event in ResponseService

### Frontend Implementation (US1)

- [ ] T084 [P] [US1] Create API client for user-service in frontend/src/services/userApi.ts
- [ ] T085 [P] [US1] Create API client for discussion-service in frontend/src/services/discussionApi.ts
- [ ] T086 [US1] Create useAuth hook with Cognito integration in frontend/src/hooks/useAuth.ts
- [ ] T087 [US1] Create auth store in frontend/src/stores/authStore.ts
- [ ] T088 [US1] Create HomePage with topic discovery in frontend/src/pages/home/HomePage.tsx
- [ ] T089 [P] [US1] Create TopicCard component in frontend/src/components/discussion/TopicCard.tsx
- [ ] T090 [P] [US1] Create TopicList component in frontend/src/components/discussion/TopicList.tsx
- [ ] T091 [US1] Create TopicPage with discussion view in frontend/src/pages/topic/TopicPage.tsx
- [ ] T092 [P] [US1] Create ResponseCard component in frontend/src/components/discussion/ResponseCard.tsx
- [ ] T093 [P] [US1] Create ResponseList component in frontend/src/components/discussion/ResponseList.tsx
- [ ] T094 [US1] Create ResponseComposer component in frontend/src/components/discussion/ResponseComposer.tsx
- [ ] T095 [US1] Create SignupPage with OAuth buttons in frontend/src/pages/onboarding/SignupPage.tsx
- [ ] T096 [US1] Create LoginPage in frontend/src/pages/onboarding/LoginPage.tsx
- [ ] T097 [US1] Create OnboardingPage for topic interest selection in frontend/src/pages/onboarding/OnboardingPage.tsx
- [ ] T098 [US1] Implement protected route wrapper in frontend/src/components/auth/ProtectedRoute.tsx

**Checkpoint**: US1 complete - users can register, browse topics, and post responses

---

## Phase 4: User Story 2 - Constructive Communication Feedback (Priority: P2)

**Goal**: Users receive AI feedback on logical fallacies, inflammatory language, unsourced claims

**Independent Test**: User submits response with ad hominem → receives specific feedback → can revise or acknowledge

### Tests for User Story 2

- [ ] T099 [P] [US2] Unit test ResponseAnalyzer in services/ai-service/tests/unit/response-analyzer.spec.ts
- [ ] T100 [P] [US2] Unit test FeedbackService in services/ai-service/tests/unit/feedback.service.spec.ts
- [ ] T101 [P] [US2] Integration test feedback flow in services/ai-service/tests/integration/feedback-flow.spec.ts
- [ ] T102 [US2] E2E test feedback journey in frontend/tests/e2e/user-story-2.spec.ts

### AI Service Implementation (US2)

- [ ] T103 [P] [US2] Create Feedback DTOs in services/ai-service/src/dto/feedback.dto.ts
- [ ] T104 [P] [US2] Create Analysis DTOs in services/ai-service/src/dto/analysis.dto.ts
- [ ] T105 [US2] Implement FeedbackRepository in services/ai-service/src/repositories/feedback.repository.ts
- [ ] T106 [US2] Implement ToneAnalyzer (local ONNX) in services/ai-service/src/analyzers/tone.analyzer.ts
- [ ] T107 [US2] Implement FallacyDetector (local ONNX) in services/ai-service/src/analyzers/fallacy.detector.ts
- [ ] T108 [US2] Implement BiasDetector (Kahneman System 1/2) in services/ai-service/src/analyzers/bias.detector.ts
- [ ] T109 [US2] Implement ClaimExtractor in services/ai-service/src/analyzers/claim.extractor.ts
- [ ] T110 [US2] Implement ResponseAnalyzer orchestrator in services/ai-service/src/services/response-analyzer.service.ts
- [ ] T111 [US2] Implement FeedbackService with confidence thresholding in services/ai-service/src/services/feedback.service.ts
- [ ] T112 [US2] Implement AnalyzeController with /analyze/response in services/ai-service/src/controllers/analyze.controller.ts
- [ ] T113 [US2] Implement FeedbackController with /feedback/{id}/rating in services/ai-service/src/controllers/feedback.controller.ts
- [ ] T114 [US2] Subscribe to response.created event in services/ai-service/src/events/response-created.handler.ts
- [ ] T115 [US2] Publish response.analyzed event after analysis

### Frontend Implementation (US2)

- [ ] T116 [P] [US2] Create API client for ai-service in frontend/src/services/aiApi.ts
- [ ] T117 [US2] Create useFeedback hook in frontend/src/hooks/useFeedback.ts
- [ ] T118 [US2] Create FeedbackPanel component in frontend/src/components/moderation/FeedbackPanel.tsx
- [ ] T119 [US2] Create FeedbackCard component in frontend/src/components/moderation/FeedbackCard.tsx
- [ ] T120 [US2] Create EducationalTooltip component in frontend/src/components/moderation/EducationalTooltip.tsx
- [ ] T121 [US2] Integrate real-time feedback in ResponseComposer in frontend/src/components/discussion/ResponseComposer.tsx
- [ ] T122 [US2] Add feedback acknowledgment UI in ResponseComposer
- [ ] T123 [US2] Add positive affirmation display for quality contributions

**Checkpoint**: US2 complete - users receive AI feedback during composition

---

## Phase 5: User Story 3 - Common Ground Analysis (Priority: P3)

**Goal**: Users view synthesized analysis showing agreement zones, misunderstandings, genuine disagreements

**Independent Test**: Discussion with 10+ participants → user clicks "View Common Ground" → sees analysis with moral foundations

### Tests for User Story 3

- [ ] T124 [P] [US3] Unit test CommonGroundSynthesizer in services/ai-service/tests/unit/common-ground.spec.ts
- [ ] T125 [P] [US3] Unit test MoralFoundationAnalyzer in services/ai-service/tests/unit/moral-foundations.spec.ts
- [ ] T126 [P] [US3] Integration test Bedrock synthesis in services/ai-service/tests/integration/bedrock-synthesis.spec.ts
- [ ] T127 [US3] E2E test common ground view in frontend/tests/e2e/user-story-3.spec.ts

### AI Service Implementation (US3)

- [ ] T128 [P] [US3] Create CommonGroundAnalysis DTOs in services/ai-service/src/dto/common-ground.dto.ts
- [ ] T129 [P] [US3] Create MoralFoundation DTOs in services/ai-service/src/dto/moral-foundation.dto.ts
- [ ] T130 [US3] Implement BedrockClient in packages/ai-client/src/bedrock.client.ts
- [ ] T131 [US3] Implement MoralFoundationAnalyzer (Haidt) in services/ai-service/src/synthesizers/moral-foundation.analyzer.ts
- [ ] T132 [US3] Implement CommonGroundSynthesizer using Bedrock in services/ai-service/src/synthesizers/common-ground.synthesizer.ts
- [ ] T133 [US3] Implement ArgumentTranslator (cross-foundation) in services/ai-service/src/synthesizers/argument.translator.ts
- [ ] T134 [US3] Implement CommonGroundService in services/ai-service/src/services/common-ground.service.ts
- [ ] T135 [US3] Implement CommonGroundController in services/ai-service/src/controllers/common-ground.controller.ts
- [ ] T136 [US3] Store CommonGroundAnalysis in discussion-service via event

### Discussion Service Implementation (US3)

- [ ] T137 [P] [US3] Create Proposition DTOs in services/discussion-service/src/dto/proposition.dto.ts
- [ ] T138 [P] [US3] Create Alignment DTOs in services/discussion-service/src/dto/alignment.dto.ts
- [ ] T139 [US3] Implement PropositionRepository in services/discussion-service/src/repositories/proposition.repository.ts
- [ ] T140 [US3] Implement AlignmentRepository in services/discussion-service/src/repositories/alignment.repository.ts
- [ ] T141 [US3] Implement CommonGroundRepository in services/discussion-service/src/repositories/common-ground.repository.ts
- [ ] T142 [US3] Implement PropositionService in services/discussion-service/src/services/proposition.service.ts
- [ ] T143 [US3] Implement AlignmentService in services/discussion-service/src/services/alignment.service.ts
- [ ] T144 [US3] Implement PropositionsController in services/discussion-service/src/controllers/propositions.controller.ts
- [ ] T145 [US3] Implement AlignmentsController in services/discussion-service/src/controllers/alignments.controller.ts
- [ ] T146 [US3] Add /topics/{id}/common-ground endpoint to TopicsController
- [ ] T147 [US3] Subscribe to common-ground.generated event

### Frontend Implementation (US3)

- [ ] T148 [P] [US3] Create PropositionCard component in frontend/src/components/discussion/PropositionCard.tsx
- [ ] T149 [P] [US3] Create ConsensusMeter component in frontend/src/components/analysis/ConsensusMeter.tsx
- [ ] T150 [P] [US3] Create AlignmentSelector component in frontend/src/components/discussion/AlignmentSelector.tsx
- [ ] T151 [US3] Create CommonGroundView component in frontend/src/components/analysis/CommonGroundView.tsx
- [ ] T152 [US3] Create AgreementZoneCard component in frontend/src/components/analysis/AgreementZoneCard.tsx
- [ ] T153 [US3] Create MisunderstandingCard component in frontend/src/components/analysis/MisunderstandingCard.tsx
- [ ] T154 [US3] Create DisagreementCard component in frontend/src/components/analysis/DisagreementCard.tsx
- [ ] T155 [US3] Create MoralFoundationChart component in frontend/src/components/analysis/MoralFoundationChart.tsx
- [ ] T156 [US3] Add view mode selector (Proposition/Contributor/CommonGround) to TopicPage
- [ ] T157 [US3] Implement PropositionView in frontend/src/pages/topic/views/PropositionView.tsx
- [ ] T158 [US3] Implement ContributorView in frontend/src/pages/topic/views/ContributorView.tsx
- [ ] T159 [US3] Implement CommonGroundViewPage in frontend/src/pages/topic/views/CommonGroundViewPage.tsx

**Checkpoint**: US3 complete - users can view common ground analysis with moral foundation insights

---

## Phase 6: User Story 4 - Human Authenticity Verification (Priority: P4)

**Goal**: Users see trust indicators, complete verification, bot patterns detected

**Independent Test**: Bot-like behavior triggered → CAPTCHA required → verified user shows trust badge

### Tests for User Story 4

- [ ] T160 [P] [US4] Unit test TrustScoreCalculator in services/user-service/tests/unit/trust-score.spec.ts
- [ ] T161 [P] [US4] Unit test BotDetector in services/user-service/tests/unit/bot-detector.spec.ts
- [ ] T162 [P] [US4] Integration test verification flow in services/user-service/tests/integration/verification.spec.ts
- [ ] T163 [US4] E2E test trust indicators in frontend/tests/e2e/user-story-4.spec.ts

### User Service Implementation (US4)

- [ ] T164 [P] [US4] Create TrustScore DTOs in services/user-service/src/dto/trust-score.dto.ts
- [ ] T165 [US4] Implement TrustScoreCalculator (Mayer ABI) in services/user-service/src/services/trust-score.calculator.ts
- [ ] T166 [US4] Implement VerificationService with phone, ID in services/user-service/src/services/verification.service.ts
- [ ] T167 [US4] Implement BotDetector in services/user-service/src/services/bot-detector.service.ts
- [ ] T168 [US4] Implement VerificationController in services/user-service/src/controllers/verification.controller.ts
- [ ] T169 [US4] Add /{userId}/trust endpoint to UserController
- [ ] T170 [US4] Implement CAPTCHA challenge trigger in services/api-gateway/src/middleware/captcha.middleware.ts

### Frontend Implementation (US4)

- [ ] T171 [P] [US4] Create TrustBadge component in frontend/src/components/ui/TrustBadge.tsx
- [ ] T172 [P] [US4] Create TrustScoreDisplay component in frontend/src/components/ui/TrustScoreDisplay.tsx
- [ ] T173 [US4] Create VerificationPage in frontend/src/pages/profile/VerificationPage.tsx
- [ ] T174 [US4] Create PhoneVerificationForm in frontend/src/components/auth/PhoneVerificationForm.tsx
- [ ] T175 [US4] Create IDVerificationFlow in frontend/src/components/auth/IDVerificationFlow.tsx
- [ ] T176 [US4] Add trust indicators to user displays across app
- [ ] T177 [US4] Create ProfilePage with trust score display in frontend/src/pages/profile/ProfilePage.tsx

**Checkpoint**: US4 complete - users have trust indicators and verification options

---

## Phase 7: User Story 5 - Productive Debate Moderation (Priority: P5)

**Goal**: Escalation detection, cooling-off prompts, graduated interventions, appeals

**Independent Test**: Escalating discussion → cooling-off prompt shown → moderator reviews flagged content → user appeals

### Tests for User Story 5

- [ ] T178 [P] [US5] Unit test EscalationDetector in services/ai-service/tests/unit/escalation.spec.ts
- [ ] T179 [P] [US5] Unit test ModerationService in services/moderation-service/tests/unit/moderation.spec.ts
- [ ] T180 [P] [US5] Integration test moderation flow in services/moderation-service/tests/integration/moderation-flow.spec.ts
- [ ] T181 [US5] E2E test moderation journey in frontend/tests/e2e/user-story-5.spec.ts

### AI Service Implementation (US5)

- [ ] T182 [P] [US5] Create Escalation DTOs in services/ai-service/src/dto/escalation.dto.ts
- [ ] T183 [US5] Implement EscalationDetector (Gross Process Model) in services/ai-service/src/analyzers/escalation.detector.ts
- [ ] T184 [US5] Implement ReappraisalGenerator in services/ai-service/src/synthesizers/reappraisal.generator.ts
- [ ] T185 [US5] Implement EscalationController in services/ai-service/src/controllers/escalation.controller.ts

### Moderation Service Implementation (US5)

- [ ] T186 [P] [US5] Create ModerationAction DTOs in services/moderation-service/src/dto/moderation-action.dto.ts
- [ ] T187 [P] [US5] Create Appeal DTOs in services/moderation-service/src/dto/appeal.dto.ts
- [ ] T188 [US5] Implement ModerationActionRepository in services/moderation-service/src/repositories/moderation-action.repository.ts
- [ ] T189 [US5] Implement AppealRepository in services/moderation-service/src/repositories/appeal.repository.ts
- [ ] T190 [US5] Implement ModerationService with graduated actions in services/moderation-service/src/services/moderation.service.ts
- [ ] T191 [US5] Implement AppealService in services/moderation-service/src/services/appeal.service.ts
- [ ] T192 [US5] Implement ModerationQueueService in services/moderation-service/src/services/moderation-queue.service.ts
- [ ] T193 [US5] Implement ActionsController in services/moderation-service/src/controllers/actions.controller.ts
- [ ] T194 [US5] Implement AppealsController in services/moderation-service/src/controllers/appeals.controller.ts
- [ ] T195 [US5] Implement QueueController for moderator dashboard in services/moderation-service/src/controllers/queue.controller.ts
- [ ] T196 [US5] Implement human-in-the-loop approval workflow
- [ ] T197 [US5] Subscribe to moderation.action.requested event

### Notification Service Implementation (US5)

- [ ] T198 [P] [US5] Create Notification DTOs in services/notification-service/src/dto/notification.dto.ts
- [ ] T199 [US5] Implement NotificationService in services/notification-service/src/services/notification.service.ts
- [ ] T200 [US5] Implement WebSocket gateway in services/notification-service/src/gateways/notification.gateway.ts
- [ ] T201 [US5] Implement NotificationsController in services/notification-service/src/controllers/notifications.controller.ts
- [ ] T202 [US5] Implement cooling-off prompt delivery via WebSocket

### Frontend Implementation (US5)

- [ ] T203 [P] [US5] Create API client for moderation-service in frontend/src/services/moderationApi.ts
- [ ] T204 [US5] Create CoolingOffPrompt component in frontend/src/components/moderation/CoolingOffPrompt.tsx
- [ ] T205 [US5] Create ReappraisalScaffold component in frontend/src/components/moderation/ReappraisalScaffold.tsx
- [ ] T206 [US5] Create AppealForm component in frontend/src/components/moderation/AppealForm.tsx
- [ ] T207 [US5] Create ModerationDashboard page in frontend/src/pages/moderation/ModerationDashboard.tsx
- [ ] T208 [US5] Create ActionReviewCard component in frontend/src/components/moderation/ActionReviewCard.tsx
- [ ] T209 [US5] Implement WebSocket notification listener in frontend/src/hooks/useNotifications.ts
- [ ] T210 [US5] Add moderation explanation display to affected content

**Checkpoint**: US5 complete - moderation system operational with human-in-the-loop

---

## Phase 8: User Story 6 - Topic Creation and Management (Priority: P6)

**Goal**: Users create topics with guided framing, seeding phase, diversity threshold activation

**Independent Test**: User creates topic → sets parameters → invites initial participants → topic activates when diverse

### Tests for User Story 6

- [ ] T211 [P] [US6] Unit test TopicCreationService in services/discussion-service/tests/unit/topic-creation.spec.ts
- [ ] T212 [P] [US6] Unit test DiversityCalculator in services/discussion-service/tests/unit/diversity.spec.ts
- [ ] T213 [P] [US6] Integration test topic lifecycle in services/discussion-service/tests/integration/topic-lifecycle.spec.ts
- [ ] T214 [US6] E2E test topic creation journey in frontend/tests/e2e/user-story-6.spec.ts

### Discussion Service Implementation (US6)

- [ ] T215 [P] [US6] Create TopicCreation DTOs in services/discussion-service/src/dto/topic-creation.dto.ts
- [ ] T216 [P] [US6] Create TopicLink DTOs in services/discussion-service/src/dto/topic-link.dto.ts
- [ ] T217 [US6] Implement TopicLinkRepository in services/discussion-service/src/repositories/topic-link.repository.ts
- [ ] T218 [US6] Implement DiversityCalculator in services/discussion-service/src/services/diversity.calculator.ts
- [ ] T219 [US6] Implement TopicCreationService with guided framing in services/discussion-service/src/services/topic-creation.service.ts
- [ ] T220 [US6] Implement TopicActivationService in services/discussion-service/src/services/topic-activation.service.ts
- [ ] T221 [US6] Implement TopicLinkService in services/discussion-service/src/services/topic-link.service.ts
- [ ] T222 [US6] Add POST /topics endpoint for topic creation
- [ ] T223 [US6] Add /topics/{id}/links endpoints
- [ ] T224 [US6] Add /topic-links/{id}/vote endpoint
- [ ] T225 [US6] Publish topic.participant.joined event

### AI Service Implementation (US6)

- [ ] T226 [P] [US6] Implement TagSuggester in services/ai-service/src/synthesizers/tag.suggester.ts
- [ ] T227 [P] [US6] Implement TopicLinkSuggester in services/ai-service/src/synthesizers/topic-link.suggester.ts
- [ ] T228 [US6] Add /suggest/tags endpoint in services/ai-service/src/controllers/suggestions.controller.ts
- [ ] T229 [US6] Add /suggest/topic-links endpoint

### Recommendation Service Implementation (US6)

- [ ] T230 [P] [US6] Create Recommendation DTOs in services/recommendation-service/src/dto/recommendation.dto.ts
- [ ] T231 [US6] Implement RecommendationService in services/recommendation-service/src/services/recommendation.service.ts
- [ ] T232 [US6] Implement PerspectiveExpandingRecommender in services/recommendation-service/src/services/perspective.recommender.ts
- [ ] T233 [US6] Subscribe to topic.participant.joined for diversity tracking

### Frontend Implementation (US6)

- [ ] T234 [US6] Create TopicCreationPage in frontend/src/pages/topic/TopicCreationPage.tsx
- [ ] T235 [US6] Create TopicFramingWizard component in frontend/src/components/discussion/TopicFramingWizard.tsx
- [ ] T236 [US6] Create EvidenceStandardSelector component in frontend/src/components/discussion/EvidenceStandardSelector.tsx
- [ ] T237 [US6] Create TagSelector with AI suggestions in frontend/src/components/discussion/TagSelector.tsx
- [ ] T238 [US6] Create SeedingProgressIndicator component in frontend/src/components/discussion/SeedingProgressIndicator.tsx
- [ ] T239 [US6] Create RelatedTopicsPanel component in frontend/src/components/discussion/RelatedTopicsPanel.tsx
- [ ] T240 [US6] Create TopicLinkProposer component in frontend/src/components/discussion/TopicLinkProposer.tsx

**Checkpoint**: US6 complete - full topic lifecycle management working

---

## Phase 9: User Following & Personalization

**Goal**: Users follow contributors, view following feed, receive perspective-expanding recommendations

### Tests for Following Features

- [ ] T241 [P] Unit test FollowService in services/user-service/tests/unit/follow.service.spec.ts
- [ ] T242 [P] Unit test FollowRecommender in services/recommendation-service/tests/unit/follow.recommender.spec.ts
- [ ] T243 Integration test following flow in services/user-service/tests/integration/following.spec.ts

### Implementation

- [ ] T244 Create UserFollow DTOs in services/user-service/src/dto/follow.dto.ts
- [ ] T245 Implement FollowRepository in services/user-service/src/repositories/follow.repository.ts
- [ ] T246 Implement FollowService in services/user-service/src/services/follow.service.ts
- [ ] T247 Implement FollowController in services/user-service/src/controllers/follow.controller.ts
- [ ] T248 Implement FollowRecommender (anti-echo-chamber) in services/recommendation-service/src/services/follow.recommender.ts
- [ ] T249 Add /recommendations/follow endpoint

### Frontend Implementation

- [ ] T250 [P] Create FollowButton component in frontend/src/components/ui/FollowButton.tsx
- [ ] T251 [P] Create FollowingFeed page in frontend/src/pages/home/FollowingFeed.tsx
- [ ] T252 Create FollowRecommendations component in frontend/src/components/ui/FollowRecommendations.tsx

---

## Phase 10: Fact-Check Integration

**Goal**: Claims identified, external fact-checks retrieved, displayed as "Related Context"

### Tests for Fact-Check

- [ ] T253 [P] Unit test FactCheckService in services/fact-check-service/tests/unit/fact-check.spec.ts
- [ ] T254 [P] Integration test fact-check APIs in services/fact-check-service/tests/integration/external-apis.spec.ts

### Implementation

- [ ] T255 Create FactCheck DTOs in services/fact-check-service/src/dto/fact-check.dto.ts
- [ ] T256 Implement FactCheckRepository in services/fact-check-service/src/repositories/fact-check.repository.ts
- [ ] T257 Implement ExternalApiClient (Snopes, PolitiFact) in services/fact-check-service/src/clients/
- [ ] T258 Implement FactCheckService in services/fact-check-service/src/services/fact-check.service.ts
- [ ] T259 Implement SourceCredibilityService in services/fact-check-service/src/services/source-credibility.service.ts
- [ ] T260 Implement FactCheckController in services/fact-check-service/src/controllers/fact-check.controller.ts

### Frontend Implementation

- [ ] T261 Create RelatedContextPanel component in frontend/src/components/discussion/RelatedContextPanel.tsx
- [ ] T262 Create SourceCredibilityIndicator component in frontend/src/components/discussion/SourceCredibilityIndicator.tsx
- [ ] T263 Integrate fact-check display in ResponseCard

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, performance optimization, documentation

- [ ] T264 [P] Add comprehensive error codes in packages/common/src/errors/
- [ ] T265 [P] Add OpenAPI spec generation to all services
- [ ] T266 [P] Add Prometheus metrics endpoints to all services
- [ ] T267 Implement distributed tracing with X-Ray across services
- [ ] T268 Add request correlation IDs in api-gateway
- [ ] T269 [P] Performance optimize database queries with EXPLAIN ANALYZE
- [ ] T270 [P] Add Redis caching layer to high-traffic endpoints
- [ ] T271 Implement graceful degradation for AI service failures
- [ ] T272 [P] Add skeleton loaders for all async content in frontend
- [ ] T273 [P] Accessibility audit and WCAG 2.1 AA fixes
- [ ] T274 Security audit: OWASP top 10 checklist
- [ ] T275 Load testing with k6 against 10,000 concurrent users target
- [ ] T276 Run quickstart.md validation end-to-end
- [ ] T277 Update CLAUDE.md with implemented architecture

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup                    → No dependencies
Phase 2: Foundational             → Depends on Setup (BLOCKS all user stories)
Phase 3-8: User Stories (US1-US6) → All depend on Foundational
Phase 9-10: Extensions            → Depend on relevant user stories
Phase 11: Polish                  → After all stories complete
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (P1) | Foundational only | Phase 2 complete |
| US2 (P2) | US1 (needs response submission) | US1 checkpoint |
| US3 (P3) | US1 (needs responses to analyze) | US1 checkpoint |
| US4 (P4) | US1 (needs users) | US1 checkpoint |
| US5 (P5) | US2 (needs feedback system) | US2 checkpoint |
| US6 (P6) | US1 (needs topic browsing) | US1 checkpoint |

### Parallel Opportunities

**Within Setup/Foundational:**
- All [P] tasks can run in parallel
- Service scaffolding (T030-T037) can all run in parallel

**After Foundational:**
- US3, US4, US6 can start in parallel after US1 completes
- US5 can start after US2 completes

**Within Each Story:**
- All tests marked [P] can run in parallel
- All DTOs/models marked [P] can run in parallel
- Frontend components marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: "Unit test UserService" [T058]
Task: "Unit test DiscussionService" [T059]
Task: "Integration test registration" [T060]
Task: "Integration test topic browsing" [T061]
Task: "Contract test user-service" [T062]
Task: "Contract test discussion-service" [T063]

# Launch all DTOs for US1 together:
Task: "Create User DTOs" [T065]
Task: "Create Verification DTOs" [T066]
Task: "Create Topic DTOs" [T072]
Task: "Create Response DTOs" [T073]
Task: "Create Tag DTOs" [T074]

# Launch all frontend components for US1 together:
Task: "Create API client user-service" [T084]
Task: "Create API client discussion-service" [T085]
Task: "Create TopicCard component" [T089]
Task: "Create TopicList component" [T090]
Task: "Create ResponseCard component" [T092]
Task: "Create ResponseList component" [T093]
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test end-to-end independently
5. Deploy/demo if ready - users can register, browse, and post

### Incremental Delivery

| Milestone | Stories Included | Capability Added |
|-----------|------------------|------------------|
| MVP | US1 | Basic discussion participation |
| Alpha | US1 + US2 | AI feedback during composition |
| Beta | US1-US3 | Common ground analysis |
| v1.0 | US1-US6 | Full platform with moderation |

### Parallel Team Strategy (3 developers)

After Foundational phase:
- **Dev A**: US1 → US2 → US5
- **Dev B**: US3 → US6
- **Dev C**: US4 → US9-10 (extensions)

---

## Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Setup | T001-T014 (14 tasks) | 6 parallel |
| Foundational | T015-T057 (43 tasks) | 24 parallel |
| US1 (MVP) | T058-T098 (41 tasks) | 22 parallel |
| US2 | T099-T123 (25 tasks) | 8 parallel |
| US3 | T124-T159 (36 tasks) | 14 parallel |
| US4 | T160-T177 (18 tasks) | 6 parallel |
| US5 | T178-T210 (33 tasks) | 8 parallel |
| US6 | T211-T240 (30 tasks) | 8 parallel |
| Following | T241-T252 (12 tasks) | 5 parallel |
| Fact-Check | T253-T263 (11 tasks) | 3 parallel |
| Polish | T264-T277 (14 tasks) | 7 parallel |
| **Total** | **277 tasks** | **111 parallel** |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance checked at each story checkpoint
