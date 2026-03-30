#!/usr/bin/env groovy
/**
 * reasonBridge CI/CD Pipeline Stub
 *
 * This minimal stub loads the pipeline definition from the consolidated jenkins-config repository.
 * All shared functions AND project-specific pipelines now live in jenkins-shared-lib.
 *
 * Architecture:
 *   - This stub: Lives in main reasonBridge repo (rarely changes)
 *   - All pipeline code: Lives in jenkins-config repo (jenkins-shared-lib)
 *     - Shared functions: githubStatusReporter, dockerCleanup, runUnitTests, etc.
 *     - Project pipeline: reasonbridgeMultibranchPipeline
 *   - Jenkins scans: Main repo branches, finds this stub, loads library, executes pipeline
 *
 * Consolidation (2026-03):
 *   - reasonbridge-jenkins-lib merged into jenkins-config
 *   - Single library load simplifies dependency management
 */

// Load the consolidated shared library
// Contains both shared functions AND reasonbridgeMultibranchPipeline
library identifier: 'jenkins-shared-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/jenkins-config.git',
        credentialsId: 'github-credentials'
    ])

// With ONLY_PRS discovery strategy, branch jobs only exist when PRs are open
// So any branch that Jenkins discovers has an open PR for it
// Therefore, run CI for all branches (the discovery strategy handles filtering)
echo "Running CI for branch ${env.BRANCH_NAME}"
reasonbridgeMultibranchPipeline()
