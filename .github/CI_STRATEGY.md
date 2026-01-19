# CI/CD Strategy - Jenkins with GitHub Webhooks

## Overview

All CI/CD operations run on **self-hosted Jenkins**, triggered directly via **GitHub webhooks**. No GitHub Actions are required for triggering builds.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  GitHub Repo    │────▶│    Jenkins      │
│  (Push/Merge)   │     │  (Full CI)      │
│                 │◀────│                 │
└─────────────────┘     └─────────────────┘
     Webhook              Status Update
```

### Self-Hosted Jenkins (Primary CI)
- **Job**: `unitediscord-ci`
- **Trigger**: GitHub webhooks on push/merge to **any branch**
- **Responsible for**:
  - Security scanning (secrets, duplication, file sizes)
  - Code quality (linting, type checking)
  - Building (TypeScript compilation, shared packages)
  - Testing (unit, integration, contract, E2E)
  - Build verification

### GitHub Webhooks
- Configured in GitHub repository settings
- Sends push events to Jenkins webhook endpoint
- Triggers builds for all branches automatically

### GitHub Actions (Optional Status Sync)
- **jenkins-status.yml** (optional)
  - Reports Jenkins results back to GitHub commit status
  - Enables branch protection to require Jenkins checks

## Benefits

✅ Single source of truth for CI/CD (Jenkins)
✅ Direct webhook triggering (no GitHub Actions middleman)
✅ Builds triggered for ALL branches automatically
✅ Self-hosted runners for sensitive operations
✅ Consistent environment across all builds
✅ Full control over CI/CD pipeline
✅ Minimal GitHub Actions usage

## For Developers

When you push or merge to any branch:

1. **GitHub sends webhook to Jenkins** (automatic)
2. **Jenkins runs full CI pipeline**:
   - Security checks
   - Build compilation
   - All test suites
   - Production build
3. **Jenkins updates GitHub commit status** (if configured)
4. **PR/commit shows Jenkins result** as status check

## Jenkins Pipeline Stages

See [Jenkinsfile](../../Jenkinsfile) for complete pipeline definition.

Current stages:
- Notify Start
- Setup (pnpm, dependencies)
- Build Dependencies
- Security & Quality Gates (parallel)
- Lint & Type Check (parallel)
- Unit Tests
- Integration Tests
- Contract Tests
- E2E Tests (main/develop only)
- Build (final production build)
- Notify Result

## Maintenance

To disable GitHub Actions entirely (optional):
- The `jenkins-trigger.yml` and `jenkins-status.yml` workflows can be disabled if Jenkins webhook integration is set up in GitHub
- Currently, these workflows are lightweight and serve as a reliable trigger mechanism

## Configuration

No changes needed to local development. The CI/CD pipeline automatically runs when you push or create PRs, triggered via GitHub Actions → Jenkins → Report Results.
