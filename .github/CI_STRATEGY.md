# CI/CD Strategy - Jenkins Consolidation

## Overview

All CI/CD operations have been consolidated into **self-hosted Jenkins** as the single source of truth. GitHub Actions is used only for Jenkins coordination and status reporting.

## Architecture

### Self-Hosted Jenkins (Primary CI)
- **Job**: `unitediscord-ci`
- **Runs on**: Self-hosted runners
- **Responsible for**:
  - Security scanning (secrets, duplication, file sizes)
  - Code quality (linting, type checking)
  - Building (TypeScript compilation, shared packages)
  - Testing (unit, integration, contract, E2E)
  - Build verification

### GitHub Actions (Jenkins Coordination Only)
1. **jenkins-trigger.yml**
   - Triggers Jenkins job on push/PR
   - Monitors Jenkins build progress
   - Fails if Jenkins job fails

2. **jenkins-status.yml**
   - Reports Jenkins results back to GitHub
   - Sets commit status checks based on Jenkins outcome
   - Enables branch protection to require Jenkins checks

## Benefits

✅ Single source of truth for CI/CD (Jenkins)
✅ No GitHub Actions runner costs
✅ Self-hosted runners for sensitive operations
✅ Consistent environment across all builds
✅ Full control over CI/CD pipeline
✅ Reduced GitHub Actions API usage

## For Developers

When you push or create a PR:

1. **GitHub Actions triggers Jenkins** (via jenkins-trigger.yml)
2. **Jenkins runs full CI pipeline**:
   - Security checks
   - Build compilation
   - All test suites
   - Production build
3. **Jenkins status reported to GitHub** (via jenkins-status.yml)
4. **PR/commit shows Jenkins result** as required check

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
