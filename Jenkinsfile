#!/usr/bin/env groovy
/**
 * uniteDiscord CI/CD Pipeline Stub
 *
 * This minimal stub loads the actual pipeline definition from the jenkins-lib repository.
 * Keeping the real Jenkinsfile in jenkins-lib avoids chicken-and-egg problems with protected branches.
 *
 * Architecture:
 *   - This stub: Lives in main uniteDiscord repo (rarely changes)
 *   - Real pipeline: Lives in unitediscord-jenkins-lib repo (frequently updated)
 *   - Jenkins scans: Main repo branches, finds this stub, loads real pipeline from jenkins-lib
 *
 * Note: jenkins-lib updated with fixed container cleanup (grep instead of broken docker name filter)
 */

// Load the shared library and execute the real pipeline
library identifier: 'unitediscord-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/unitediscord-jenkins-lib.git',
        credentialsId: 'github-credentials'
    ])

// Execute the real pipeline from jenkins-lib
unitediscordMultibranchPipeline()
