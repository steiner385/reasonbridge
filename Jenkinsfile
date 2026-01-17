pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        PNPM_HOME = "${WORKSPACE}/.pnpm-store"
        PATH = "${PNPM_HOME}:${env.PATH}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    # Install pnpm if not available
                    npm install -g pnpm@8

                    # Install dependencies
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Lint & Type Check') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'pnpm lint'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'pnpm type-check'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'pnpm test:unit --coverage'
            }
            post {
                always {
                    junit 'coverage/junit.xml'
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Unit Test Coverage'
                    ])
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh '''
                    # Start test infrastructure
                    docker-compose -f docker-compose.test.yml up -d

                    # Wait for services to be ready
                    sleep 10

                    # Run integration tests
                    pnpm test:integration
                '''
            }
            post {
                always {
                    sh 'docker-compose -f docker-compose.test.yml down -v || true'
                }
            }
        }

        stage('Contract Tests') {
            steps {
                sh 'pnpm test:contract'
            }
        }

        stage('E2E Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest target: 'main'
                }
            }
            steps {
                sh '''
                    # Install Playwright browsers
                    pnpm --filter frontend playwright install --with-deps

                    # Start the full stack
                    docker-compose up -d

                    # Wait for services
                    sleep 15

                    # Run E2E tests
                    pnpm test:e2e
                '''
            }
            post {
                always {
                    sh 'docker-compose down -v || true'
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'frontend/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright E2E Report'
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm build'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            echo 'Pipeline failed - check test reports for details'
        }
        success {
            echo 'All tests passed successfully'
        }
    }
}
