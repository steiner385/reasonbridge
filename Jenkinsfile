#!/usr/bin/env groovy
/**
 * reasonBridge CI/CD Pipeline Stub
 *
 * This minimal stub loads the actual pipeline definition from the jenkins-lib repository.
 * Keeping the real Jenkinsfile in jenkins-lib avoids chicken-and-egg problems with protected branches.
 *
 * Architecture:
 *   - This stub: Lives in main reasonBridge repo (rarely changes)
 *   - Real pipeline: Lives in reasonbridge-jenkins-lib repo (frequently updated)
 *   - Jenkins scans: Main repo branches, finds this stub, loads real pipeline from jenkins-lib
 *
 * Note: jenkins-lib updated with fixed container cleanup (grep instead of broken docker name filter)
 */

// Load the shared library and execute the real pipeline
library identifier: 'reasonbridge-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/reasonbridge-jenkins-lib.git',
        credentialsId: 'github-credentials'
    ])

// Determine if this build is for a PR
// With ONLY_PRS discovery strategy, branch jobs only exist when PRs are open
// Check both CHANGE_ID (PR jobs) and build cause (PR events on branch jobs)
def isPRBuild = env.CHANGE_ID != null
def isMainBranch = env.BRANCH_NAME == 'main'
def isPREvent = false

// Check if build was triggered by a PR event (for branch jobs with ONLY_PRS strategy)
def causes = currentBuild.rawBuild?.getCauses()
causes?.each { cause ->
    def description = cause.getShortDescription()
    if (description?.contains('Pull request')) {
        isPREvent = true
    }
}

if (isPRBuild || isMainBranch || isPREvent) {
    // Execute the real pipeline from jenkins-lib
    reasonbridgeMultibranchPipeline()
} else {
    echo "Skipping build for branch ${env.BRANCH_NAME} - only main branch and PRs trigger CI"
}
