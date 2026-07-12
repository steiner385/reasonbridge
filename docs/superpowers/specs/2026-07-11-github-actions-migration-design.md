# CI/CD Migration: Jenkins → GitHub Actions

**Date**: 2026-07-11
**Status**: Approved (autonomous session — decisions recorded here for review)

## Problem

The Jenkins server (`jenkins.local`) no longer exists. All CI is dead:

- The `Jenkinsfile` stub loads `reasonbridgeMultibranchPipeline` from the
  `steiner385/jenkins-config` shared library, targeting infrastructure that is gone.
- Branch protection on `main` requires five `jenkins/*` status contexts that can
  never be reported again, so every PR is permanently blocked.
- The only registered self-hosted GitHub Actions runner (`jenkins-unitediscord`)
  is **offline**, so the two existing workflows (`auto-merge.yml`,
  `delete-merged-branch.yml`) never run either.
- Because CI has been dead, recent dependency-bump merges (TypeScript 6, Vitest 4,
  msw 2.15) landed unverified and broke the package build on `main`.

## Goal

Reproduce the Jenkins pipeline's guarantees on GitHub Actions using GitHub-hosted
runners (the repo is public → free minutes, 4 vCPU / 16 GB `ubuntu-latest`),
with no dependency on home-lab infrastructure.

## Approaches considered

1. **Sequential port** — one job mirroring Jenkins stages in order. Simple, but
   ~20 min serial and wastes free parallelism.
2. **Parallel fan-out (chosen)** — one `ci.yml`; independent jobs share a
   composite setup action; an aggregate `CI` gate job reproduces `jenkins/ci`.
3. **Self-hosted GHA runners** — rejected; the point is escaping dead home-lab infra.

## Design

### Workflow: `.github/workflows/ci.yml`

- **Triggers**: `pull_request`, `push` to `main`, `workflow_dispatch`.
  (Jenkins only ran full CI for PRs and protected branches; its branch-discovery
  strategy meant non-PR feature branches got nothing — so this is parity.)
- **Concurrency**: cancel in-progress runs per ref (parity with
  `disableConcurrentBuilds(abortPrevious: true)`).
- **Env**: `CI=true`, `NODE_OPTIONS=--max-old-space-size=4096`.

### Composite action: `.github/actions/setup/action.yml`

pnpm via `packageManager` field (pnpm 9.15.0) → Node 20 with pnpm store cache →
`pnpm install --frozen-lockfile` → build `packages/*` (includes Prisma client
generation). Used by every job; replaces Jenkins' Install/Build Packages stages.

### Jobs (job *name* = required status context)

| Job | Context | Command | Notes |
| --- | --- | --- | --- |
| lint | `Lint` | `pnpm run lint` + `pnpm typecheck` | replaces `jenkins/lint` |
| unit | `Unit Tests` | `pnpm run test:unit -- --coverage` | replaces `jenkins/unit-tests`; **no AWS credentials** (see below) |
| integration | `Integration Tests` | compose up `docker-compose.test.yml` → `prisma db push` → vitest integration config | replaces `jenkins/integration`; env: `DATABASE_URL` (localhost:5433), `INTEGRATION_TEST_DB_READY=true` |
| contract | `Contract Tests` | `pnpm run test:contract` | no services needed (Pact mock servers) |
| e2e | `E2E Tests` | compose up e2e stack + local overlay → wait ready → `npx playwright test` from `frontend/` | replaces `jenkins/e2e`; skipped for `staging/*` head branches (skipped required checks count as satisfied) |
| build | `Build` | `pnpm --filter "./packages/*" -r build` + frontend production build | Jenkins' Build stage ran the root `build` script, which is a no-op echo; this makes it real |
| ci | `CI` | aggregate gate: fails if any needed job failed/cancelled | replaces `jenkins/ci` |

### E2E simplification

Jenkins ran Playwright inside an `mcr.microsoft.com/playwright` container
tar-copied with test specs, because Jenkins agents were themselves containers
that couldn't reach the compose network. This required the npm package and the
Docker image versions to match exactly and caused 8 documented incident classes.

GHA runners are VMs with Docker, so instead:

1. `docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.local.yml up -d`
   (the local overlay publishes `frontend` on `:9080`; safe because each GHA run
   owns the whole VM — the port-conflict rationale for headless compose doesn't apply).
2. Wait for `db-migrate`/`db-seed` completion (`scripts/jenkins-e2e-db-setup.sh`)
   and service health.
3. `npx playwright install --with-deps chromium`, then run tests from `frontend/`
   with `PLAYWRIGHT_BASE_URL=http://localhost:9080`. The Playwright version is the
   workspace-pinned one — the image/package version-match failure class disappears.
4. Accessibility tests run as a non-blocking step (`continue-on-error`), parity
   with Jenkins' `jenkins/accessibility` advisory status.
5. Playwright HTML report + test-results uploaded as artifacts; compose logs
   dumped on failure.

### AWS credentials

Jenkins injected real Bedrock credentials into unit tests (`withAwsCredentials`).
On a public repo, fork PRs never receive secrets, so CI must pass without them.
Tests already use Bedrock mocks (`.env.test` sets `BEDROCK_ENABLED=false`);
unit tests are verified locally to pass with no AWS credentials.

### Branch protection

Required contexts change from
`jenkins/lint, jenkins/unit-tests, jenkins/integration, jenkins/e2e, jenkins/ci`
to `Lint, Unit Tests, Integration Tests, E2E Tests, CI` (strict mode kept).
`Contract Tests` and `Build` stay non-required, matching Jenkins (contract tests
were `catchError`-soft).

### Cleanup

- Delete `Jenkinsfile`.
- `auto-merge.yml` / `delete-merged-branch.yml`: `runs-on: [self-hosted, linux]`
  → `ubuntu-latest`.
- CLAUDE.md: replace Jenkins sections with GitHub Actions equivalents.
- Repair the broken `main` build (TS 6 fallout): explicit `"types"` fields in
  `packages/shared`, `packages/ai-client`, `packages/testing-utils` tsconfigs;
  `@types/node` added to `ai-client`; msw `SetupServer` type fix.

### Dropped (intentionally)

- Allure reporting (already disabled in Jenkins).
- Flaky-test quarantine stage (Jenkins-lib specific; Playwright retries + JUnit
  output remain, so it can be rebuilt on GHA later if wanted).
- `jenkins/accessibility` as a separate status (now a non-blocking step in e2e).

## Error handling

- Every job has an explicit `timeout-minutes` (Jenkins had a global 90-min cap).
- E2E dumps `docker compose logs` and uploads artifacts on failure.
- The `ci` gate treats **skipped** needed jobs as success (staging/* E2E skip)
  but fails on `failure`/`cancelled`.

## Testing / verification

- Package build, lint, typecheck, and unit tests verified locally before the
  workflow lands (same commands the workflow runs).
- Workflow YAML validated with `actionlint`.
- First real validation is the migration PR itself: it must go green end-to-end
  before branch protection contexts are swapped.
