# E2E Test Configuration Update

## Summary

Updated Jenkins pipeline to enable E2E tests for ALL Pull Requests and main branch pushes, as requested.

## Current Configuration

### ✅ Main Repository (Already Correct)

**File**: `Jenkinsfile` (lines 24-30)

```groovy
// Only trigger on main branch or pull requests
if (env.CHANGE_ID || env.BRANCH_NAME == 'main') {
    reasonbridgeMultibranchPipeline()
} else {
    echo "Skipping build for branch ${env.BRANCH_NAME} - only main branch and PRs trigger CI"
}
```

**Behavior**:
- ✅ All PRs run full CI
- ✅ Main branch runs full CI
- ✅ All other branches skip CI completely

## Required Change - Jenkins-lib Repository

### Manual Push Required

The pipeline changes have been committed to `/tmp/reasonbridge-jenkins-lib` but require manual push with your Git credentials.

**Repository**: `steiner385/reasonbridge-jenkins-lib`
**Branch**: `main`
**File**: `vars/reasonbridgeMultibranchPipeline.groovy`
**Commit**: `00fc095`

### Changes Made

1. **Removed E2E skip condition for staging branches** (lines 217-224)
2. **Updated documentation** to reflect E2E runs on PRs and main branch
3. **Added explanatory comments** about pipeline filtering

### How to Apply

#### Option 1: Push from local machine

```bash
# Clone or update jenkins-lib repo
cd ~/projects  # or your preferred directory
git clone https://github.com/steiner385/reasonbridge-jenkins-lib.git
cd reasonbridge-jenkins-lib

# Apply the patch
git am < /tmp/reasonbridge-jenkins-lib/0001-Enable-E2E-tests-for-all-PRs-and-main-branch.patch

# Push to main
git push origin main
```

#### Option 2: Manual edit via GitHub UI

1. Go to: https://github.com/steiner385/reasonbridge-jenkins-lib/edit/main/vars/reasonbridgeMultibranchPipeline.groovy

2. Find line 17 and change:
   ```groovy
   - *   - E2E Tests: End-to-end browser tests with Playwright - 301 tests (all branches except staging/*)
   + *   - E2E Tests: End-to-end browser tests with Playwright - 301 tests (PRs and main branch)
   ```

3. Find lines 217-224 and replace:
   ```groovy
   stage('E2E Environment') {
       when {
           // Skip E2E for staging branches (dependency updates that passed lint/unit/integration)
           expression {
               def sourceBranch = env.CHANGE_BRANCH ?: env.BRANCH_NAME
               return !(sourceBranch?.startsWith('staging/'))
           }
       }
       options {
   ```
   
   With:
   ```groovy
   stage('E2E Environment') {
       // No 'when' clause - E2E runs for all builds that reach this pipeline
       // (PRs and main branch only, as filtered by Jenkinsfile)
       options {
   ```

4. Commit with message: "Enable E2E tests for all PRs and main branch"

## Testing After Push

1. **Trigger new build on this PR**:
   - Push empty commit or re-run Jenkins build
   - E2E tests should now execute (previously skipped)
   - Build time will increase by ~20 minutes

2. **Verify main branch**:
   - E2E continues to run (no change in behavior)

3. **Verify other branches**:
   - CI should skip entirely (no change in behavior)

## Expected Results

After applying the jenkins-lib changes:

| Branch Type | Lint | Unit | Integration | E2E | Overall CI |
|-------------|------|------|-------------|-----|------------|
| Pull Requests | ✅ | ✅ | ✅ | ✅ **NEW** | ✅ |
| Main branch | ✅ | ✅ | ✅ | ✅ | ✅ |
| Other branches | ❌ | ❌ | ❌ | ❌ | ❌ Skipped |

## Rollback Plan

If issues arise after pushing:

```bash
cd ~/projects/reasonbridge-jenkins-lib
git revert 00fc095
git push origin main
```

## Patch File Location

The complete patch is saved at:
- `/tmp/reasonbridge-jenkins-lib/0001-Enable-E2E-tests-for-all-PRs-and-main-branch.patch`

You can also view the diff at:
- `/tmp/reasonbridge-jenkins-lib` (git diff HEAD^)
