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

// Execute the real pipeline from jenkins-lib
reasonbridgeMultibranchPipeline()
