# Tasks: ReasonBridge Rebrand & Infrastructure Configuration

**Input**: Design documents from `/specs/003-rebrand-infrastructure/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Visual regression tests will be added to validate brand consistency.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo project with:
- **Frontend**: `frontend/src/`, `frontend/public/`
- **Backend Services**: `services/[service-name]/src/`
- **Infrastructure**: `infrastructure/`, `.jenkins/`, `.github/`
- **Documentation**: `docs/`, `README.md`, `CLAUDE.md`

---

## Phase 1: Setup (Brand Asset Preparation)

**Purpose**: Create and optimize all brand assets before code integration

- [X] T001 Install asset generation tools: `cd frontend && pnpm add -D svgo sharp`
- [X] T002 [P] Create build script `frontend/scripts/build-icons.sh` for logo optimization
- [X] T003 [P] Create PNG generation script `frontend/scripts/generate-pngs.js` using sharp
- [X] T004 Add npm scripts to `frontend/package.json`: `build:icons`, `optimize:svg`
- [X] T005 Create logo source directory `frontend/public/assets/logos/source/`
- [X] T006 Place source SVG logo at `frontend/public/assets/logos/source/reasonbridge-logo-source.svg`
- [X] T007 Place icon-only SVG at `frontend/public/assets/logos/source/reasonbridge-icon-source.svg`

---

## Phase 2: Foundational (Typography & Build Infrastructure)

**Purpose**: Core typography and build infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Install font packages: `cd frontend && pnpm add @fontsource/nunito @fontsource/fira-code`
- [X] T009 Generate optimized logo assets: `cd frontend && pnpm run build:icons`
- [X] T010 Verify generated assets in `frontend/public/assets/logos/`: reasonbridge-logo.svg, reasonbridge-icon.svg, 6 PNG files
- [X] T011 Update Tailwind config `frontend/tailwind.config.js` with brand color palette (Teal #2A9D8F, Soft Blue #6B9AC4, Light Sky #A8DADC)
- [X] T012 Import fonts in `frontend/src/index.css`: Nunito (400, 500, 600, 700), Fira Code (400, 700)
- [X] T013 Update font-family in Tailwind config `frontend/tailwind.config.js`: sans → Nunito, mono → Fira Code

**Checkpoint**: Foundation ready - brand assets exist, typography configured, colors available

---

## Phase 3: User Story 1 - Brand Identity Consistency Across All Touchpoints (Priority: P1) 🎯 MVP

**Goal**: Establish professional brand presence with consistent naming, logo, and color palette across all user-facing interfaces

**Independent Test**: Visit homepage, view GitHub repository, check documentation - all should display "ReasonBridge" name, logo, and brand colors consistently

### Visual Regression Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US1] Create visual regression test `frontend/e2e/visual/brand-logo.spec.ts` for logo display in header
- [X] T015 [P] [US1] Create visual regression test `frontend/e2e/visual/brand-colors.spec.ts` for primary button colors
- [X] T016 [P] [US1] Create visual regression test `frontend/e2e/visual/brand-typography.spec.ts` for Nunito font usage in headings

### Frontend Brand Integration for User Story 1

- [X] T017 [P] [US1] Update HTML metadata in `frontend/index.html`: page title, meta description, theme-color
- [X] T018 [P] [US1] Update favicon references in `frontend/index.html`: reasonbridge-icon.svg, reasonbridge-icon-32.png, reasonbridge-icon-16.png
- [X] T019 [P] [US1] Update Apple Touch Icon in `frontend/index.html`: reasonbridge-icon-180.png
- [X] T020 [P] [US1] Update PWA manifest `frontend/public/manifest.json`: name, short_name, theme_color, background_color
- [X] T021 [US1] Update header logo component to use `frontend/public/assets/logos/reasonbridge-logo.svg`
- [X] T022 [US1] Apply brand-primary color to all primary buttons in `frontend/src/components/ui/Button.tsx`
- [X] T023 [US1] Apply brand-secondary color to all secondary buttons in `frontend/src/components/ui/Button.tsx`
- [X] T024 [US1] Apply rounded corners (rounded-lg) to buttons in `frontend/src/components/ui/Button.tsx`
- [X] T025 [US1] Apply rounded corners (rounded-lg) to cards in `frontend/src/components/ui/Card.tsx`
- [X] T026 [US1] Update link colors to brand-primary in `frontend/src/index.css`

### Codebase Renaming for User Story 1

- [X] T027 [US1] Search for all "ReasonBridge" references: `rg "ReasonBridge" --type ts --type js --type md -l`
- [X] T028 [US1] Bulk replace "ReasonBridge" with "ReasonBridge" using: `find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) ! -path "*/node_modules/*" ! -path "*/.git/*" -exec sed -i.bak 's/ReasonBridge/ReasonBridge/g' {} +`
- [X] T029 [US1] Verify no remaining references: `rg "ReasonBridge" --type ts --type js --type md | wc -l` (should be 0)
- [X] T030 [US1] Clean up backup files: `find . -name "*.bak" -delete`

### Documentation Updates for User Story 1

- [X] T031 [P] [US1] Update README.md header with ReasonBridge logo, name, and tagline ("Find common ground")
- [X] T032 [P] [US1] Update CLAUDE.md: replace all "ReasonBridge" references with "ReasonBridge"
- [X] T033 [P] [US1] Update all spec files in `specs/` directories
- [X] T034 [P] [US1] Update API contract titles in `specs/001-rational-discussion-platform/contracts/*.openapi.yaml`

### Validation for User Story 1

- [X] T035 [US1] Run visual regression tests: `cd frontend && pnpm exec playwright test e2e/visual/`
- [X] T036 [US1] Run WCAG contrast verification script: `node frontend/scripts/verify-contrast.js`
- [X] T037 [US1] Verify all existing tests pass: `pnpm test:unit && pnpm test:integration`
- [X] T038 [US1] Manual verification: Open homepage, check logo displays, colors match brand palette

**Checkpoint**: At this point, User Story 1 should be fully functional - all user-facing interfaces show ReasonBridge branding consistently

---

## Phase 4: User Story 2 - Emotional Brand Experience Alignment (Priority: P2)

**Goal**: Create warm, trustworthy, and approachable visual design that encourages user participation

**Independent Test**: UX testing sessions where participants describe emotional response to interface design (target: 80% use "warm"/"trustworthy"/"approachable")

### Implementation for User Story 2

- [X] T039 [P] [US2] Apply brand-accent (Light Sky) color to success states in `frontend/src/components/notifications/Toast.tsx`
- [X] T040 [P] [US2] Update error message tone in `frontend/src/components/notifications/Toast.tsx` to be warm and encouraging
- [X] T041 [P] [US2] Add soft shadows to elevated UI components in `frontend/src/components/ui/Card.tsx`
- [X] T042 [P] [US2] Update hover states for buttons to use brand-secondary in `frontend/src/components/ui/Button.tsx`
- [X] T043 [P] [US2] Apply consistent border-radius to form inputs in `frontend/src/components/ui/Input.tsx`
- [X] T044 [US2] Update modal dialogs with brand colors and rounded corners in `frontend/src/components/ui/Modal.tsx`
- [X] T045 [US2] Apply brand typography (Nunito) to all heading elements in `frontend/src/index.css`
- [X] T046 [US2] Ensure body text uses Nunito with proper line-height (1.6) in `frontend/src/index.css`

### Polish for User Story 2

- [X] T047 [US2] Add transition animations to interactive elements (buttons, links) for smooth feel
- [X] T048 [US2] Review all user-facing text for brand voice alignment (warm, encouraging, clear)
- [X] T049 [US2] Conduct internal UX review session with team members
- [X] T050 [US2] Update component documentation with brand personality guidelines

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - interface is visually consistent AND emotionally aligned with brand

---

## Phase 5: User Story 3 - Developer Experience with Updated Infrastructure (Priority: P3)

**Goal**: Update all infrastructure components (Jenkins, nginx, GitHub) to reflect ReasonBridge brand for developer clarity

**Independent Test**: Clone repository, run local development, trigger CI/CD pipeline - all configuration should reference "ReasonBridge"

### Jenkins Configuration for User Story 3

- [ ] T051 [US3] Backup Jenkins job configuration: `ssh jenkins-server 'sudo cp -r /var/lib/jenkins/jobs/OLD_NAME /tmp/jenkins-backup-$(date +%Y%m%d)'`
- [ ] T052 [US3] Stop Jenkins: `ssh jenkins-server 'sudo systemctl stop jenkins'`
- [ ] T053 [US3] Rename Jenkins job directory: `ssh jenkins-server 'sudo mv /var/lib/jenkins/jobs/OLD_NAME /var/lib/jenkins/jobs/ReasonBridge-multibranch'`
- [ ] T054 [US3] Start Jenkins: `ssh jenkins-server 'sudo systemctl start jenkins'`
- [ ] T055 [US3] Update Jenkinsfile display names and artifact names in `.jenkins/Jenkinsfile`
- [ ] T056 [US3] Verify Jenkins job appears as "ReasonBridge-multibranch" in Jenkins UI

### nginx Configuration for User Story 3

- [ ] T057 [US3] Backup current nginx config: `ssh web-server 'sudo cp /etc/nginx/sites-available/old.conf /etc/nginx/sites-available/reasonbridge.conf.backup'`
- [ ] T058 [US3] Create nginx config `infrastructure/nginx/reasonbridge.conf` with server_name "reasonbridge.org" and "www.reasonbridge.org"
- [ ] T059 [US3] Update SSL certificate paths in nginx config to reference reasonbridge.org certificates
- [ ] T060 [US3] Test nginx configuration syntax: `ssh web-server 'sudo nginx -t'`
- [ ] T061 [US3] Reload nginx (zero downtime): `ssh web-server 'sudo systemctl reload nginx'`
- [ ] T062 [US3] Verify nginx serving reasonbridge.org: `curl -I https://reasonbridge.org`

### GitHub Repository Configuration for User Story 3

- [ ] T063 [US3] Navigate to GitHub repository settings: `https://github.com/steiner385/reasonbridge/settings`
- [ ] T064 [US3] Rename repository to "reasonbridge" in Danger Zone → Rename repository
- [ ] T065 [US3] Update local git remote: `git remote set-url origin https://github.com/steiner385/reasonbridge.git`
- [ ] T066 [US3] Update branch protection status check contexts to reference "reasonbridge" in job names
- [ ] T067 [P] [US3] Update GitHub Actions workflow names in `.github/workflows/*.yml`
- [ ] T068 [P] [US3] Update workflow job descriptions and artifact names in all `.github/workflows/*.yml` files
- [ ] T069 [P] [US3] Update issue templates in `.github/ISSUE_TEMPLATE/` to reference ReasonBridge

### AWS Infrastructure Updates for User Story 3

- [ ] T070 [P] [US3] Update Cognito user pool name in `infrastructure/cdk/lib/cognito-stack.ts`
- [ ] T071 [P] [US3] Update EKS cluster name in `infrastructure/cdk/lib/eks-stack.ts`
- [ ] T072 [P] [US3] Update RDS database identifier in `infrastructure/cdk/lib/rds-stack.ts`
- [ ] T073 [P] [US3] Update ElastiCache cluster name in `infrastructure/cdk/lib/elasticache-stack.ts`
- [ ] T074 [US3] Update CDK app name in `infrastructure/cdk/bin/app.ts`

### Service Package Updates for User Story 3

- [ ] T075 [P] [US3] Update service names in `services/ai-service/package.json`
- [ ] T076 [P] [US3] Update service names in `services/discussion-service/package.json`
- [ ] T077 [P] [US3] Update service names in `services/user-service/package.json`
- [ ] T078 [P] [US3] Update service names in `services/fact-check-service/package.json`
- [ ] T079 [P] [US3] Update service names in `services/moderation-service/package.json`
- [ ] T080 [P] [US3] Update service names in `services/notification-service/package.json`
- [ ] T081 [P] [US3] Update service names in `services/recommendation-service/package.json`
- [ ] T082 [P] [US3] Update service names in `services/api-gateway/package.json`

### Validation for User Story 3

- [ ] T083 [US3] Trigger Jenkins build and verify "ReasonBridge-multibranch" job name appears in console output
- [ ] T084 [US3] Verify DNS resolution: `nslookup reasonbridge.org` and `nslookup jenkins.reasonbridge.org`
- [ ] T085 [US3] Verify SSL certificates: `openssl s_client -connect reasonbridge.org:443 -servername reasonbridge.org`
- [ ] T086 [US3] Clone repository fresh and verify git remote URLs work correctly
- [ ] T087 [US3] Run full CI/CD pipeline and verify all status checks reference "reasonbridge" contexts

**Checkpoint**: All user stories should now be independently functional - brand consistency, emotional design, and infrastructure alignment complete

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, performance optimization, and documentation completion

- [ ] T088 [P] Run complete test suite: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration`
- [ ] T089 [P] Generate Lighthouse performance report for homepage (target: score >90)
- [ ] T090 [P] Verify font loading performance: DevTools → Network → Fonts tab (target: <500ms)
- [ ] T091 [P] Run accessibility audit: `pnpm exec playwright test --grep @a11y`
- [ ] T092 Update quickstart.md with final validation steps completed
- [ ] T093 Create WCAG contrast verification report documenting all AA compliance
- [ ] T094 Update CHANGELOG.md with rebrand release notes
- [ ] T095 Create brand asset usage documentation in `docs/brand-guidelines.md`
- [ ] T096 Archive old brand assets in `frontend/public/assets/logos/archive/` for 90-day rollback window
- [ ] T097 Create git tag for pre-rebrand state: `git tag pre-rebrand-backup && git push origin pre-rebrand-backup`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - No dependencies on US1 (independent)
  - User Story 3 (P3): Can start after Foundational - No dependencies on US1/US2 (independent)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Brand Identity Consistency**: ✅ INDEPENDENT - Can start after Foundational (Phase 2)
- **User Story 2 (P2) - Emotional Brand Experience**: ✅ INDEPENDENT - Can start after Foundational (Phase 2), builds on US1 visually but not technically dependent
- **User Story 3 (P3) - Developer Infrastructure**: ✅ INDEPENDENT - Can start after Foundational (Phase 2), completely separate from frontend UI work

### Within Each User Story

- **User Story 1**: Visual tests (T014-T016) → Frontend integration (T017-T026) → Renaming (T027-T030) → Docs (T031-T034) → Validation (T035-T038)
- **User Story 2**: Implementation tasks (T039-T046) are all parallel, Polish (T047-T050) runs after implementation
- **User Story 3**: Jenkins/nginx/GitHub/AWS/Services can all proceed in parallel as marked [P]

### Parallel Opportunities

- **Phase 1 (Setup)**: T002-T003 can run in parallel
- **Phase 2 (Foundational)**: All tasks sequential due to dependencies
- **User Story 1**: T014-T016 (tests) in parallel, T017-T020 (HTML updates) in parallel, T031-T034 (docs) in parallel
- **User Story 2**: T039-T043 (UI components) in parallel
- **User Story 3**: T067-T069 (GitHub) in parallel, T070-T074 (AWS) in parallel, T075-T082 (services) in parallel
- **Phase 6 (Polish)**: T088-T091 (validation) in parallel
- **Across User Stories**: US1, US2, US3 can ALL proceed in parallel after Foundational phase (if team capacity allows)

---

## Parallel Example: User Story 1 Frontend Integration

```bash
# Launch all HTML metadata updates in parallel:
Task: T017 - Update HTML metadata in frontend/index.html
Task: T018 - Update favicon references in frontend/index.html
Task: T019 - Update Apple Touch Icon in frontend/index.html
Task: T020 - Update PWA manifest frontend/public/manifest.json

# Launch all documentation updates in parallel:
Task: T031 - Update README.md
Task: T032 - Update CLAUDE.md
Task: T033 - Update spec files
Task: T034 - Update API contracts
```

---

## Parallel Example: User Story 3 Infrastructure

```bash
# Launch all service package.json updates in parallel:
Task: T075 - Update services/ai-service/package.json
Task: T076 - Update services/discussion-service/package.json
Task: T077 - Update services/user-service/package.json
Task: T078 - Update services/fact-check-service/package.json
Task: T079 - Update services/moderation-service/package.json
Task: T080 - Update services/notification-service/package.json
Task: T081 - Update services/recommendation-service/package.json
Task: T082 - Update services/api-gateway/package.json

# Launch all GitHub Actions updates in parallel:
Task: T067 - Update workflow names in .github/workflows/*.yml
Task: T068 - Update job descriptions in .github/workflows/*.yml
Task: T069 - Update issue templates
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T007) - ~30 minutes
2. Complete Phase 2: Foundational (T008-T013) - ~15 minutes
3. Complete Phase 3: User Story 1 (T014-T038) - ~2 hours
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Visit homepage - see ReasonBridge logo and brand colors
   - Check GitHub repository - see updated name
   - Review documentation - no "ReasonBridge" references
5. **DEPLOY MVP**: Merge US1 to production

### Incremental Delivery

1. **Foundation Ready** (Phases 1-2): Brand assets exist, typography configured → ~45 minutes
2. **MVP: Brand Identity Consistency** (Phase 3): User-facing interfaces show ReasonBridge → Test independently → Deploy → ~2 hours
3. **Emotional Design** (Phase 4): Interface feels warm and trustworthy → Test independently → Deploy → ~1.5 hours
4. **Infrastructure Alignment** (Phase 5): Jenkins, nginx, GitHub reflect new brand → Test independently → Deploy → ~3 hours
5. **Production Ready** (Phase 6): Full validation and polish → Final deployment → ~1 hour

**Total Estimated Time**: ~8-9 hours for complete rebrand

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Phases 1-2) → ~45 minutes
2. **Once Foundational is done, split into 3 parallel tracks**:
   - **Developer A**: User Story 1 (Frontend branding) - T014-T038
   - **Developer B**: User Story 2 (Emotional design) - T039-T050
   - **Developer C**: User Story 3 (Infrastructure) - T051-T087
3. **Reconvene for Phase 6 Polish** (T088-T097)

**Total Estimated Time with Parallelization**: ~4-5 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Visual regression tests use Playwright snapshots to verify brand consistency
- Infrastructure changes (Jenkins, nginx) require server access and careful validation
- Bulk renaming (T028) creates .bak files automatically - clean up with T030
- WCAG AA contrast verified via automated script (T036)
- All existing tests must continue passing throughout rebrand (T037, T088)
- Git history is preserved during all renaming operations
- 90-day rollback window via archived assets and pre-rebrand git tag
