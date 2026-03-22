#!/usr/bin/env groovy
/**
 * reasonBridge CI/CD Pipeline Stub
 *
 * This minimal stub loads the actual pipeline definition from the jenkins-lib repository.
 * Keeping the real Jenkinsfile in jenkins-lib avoids chicken-and-egg problems with protected branches.
 *
 * Architecture:
 *   - This stub: Lives in main reasonBridge repo (rarely changes)
 *   - Shared functions: Lives in jenkins-config repo (jenkins-shared-lib)
 *   - Project pipeline: Lives in reasonbridge-jenkins-lib repo (reasonbridgeMultibranchPipeline)
 *   - Jenkins scans: Main repo branches, finds this stub, loads libraries, executes pipeline
 *
 * Library Loading Order:
 *   1. jenkins-shared-lib (common functions: githubStatusReporter, dockerCleanup, etc.)
 *   2. reasonbridge-lib (project-specific: reasonbridgeMultibranchPipeline)
 */

// First, load the shared library with common functions
// This must be loaded first so functions are available to reasonbridge-lib
library identifier: 'jenkins-shared-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/jenkins-config.git',
        credentialsId: 'github-credentials'
    ])

// Then load the project-specific library
library identifier: 'reasonbridge-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/reasonbridge-jenkins-lib.git',
        credentialsId: 'github-credentials'
    ])

// With ONLY_PRS discovery strategy, branch jobs only exist when PRs are open
// So any branch that Jenkins discovers has an open PR for it
// Therefore, run CI for all branches (the discovery strategy handles filtering)
echo "Running CI for branch ${env.BRANCH_NAME}"
reasonbridgeMultibranchPipeline()
