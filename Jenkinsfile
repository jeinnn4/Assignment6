pipeline {
    agent any

    environment {
        // ── Docker Hub ──────────────────────────────────────────────
        DOCKER_HUB_USERNAME  = 'sornsomavatey'          // ← change this
        IMAGE_NAME           = "${DOCKER_HUB_USERNAME}/devops-api"
        IMAGE_TAG            = "${BUILD_NUMBER}"
        CONTAINER_NAME       = 'devops-api-container'

        // ── SonarQube ───────────────────────────────────────────────
        SONAR_PROJECT_KEY    = 'devops-api'
        SONAR_PROJECT_NAME   = 'DevOps API'

        // ── Credentials (configured in Jenkins Credentials store) ───
        // DOCKER_CREDENTIALS   → Docker Hub username + password
        // SONAR_TOKEN          → SonarQube token (Secret Text)
        // MONGO_URI_SECRET     → MongoDB URI (Secret Text)
    }

    tools {
        nodejs 'NodeJS-18'          // must match the name in Jenkins → Global Tool Config
    }

    stages {

        // ────────────────────────────────────────────────────────────
        // STAGE 1 – Checkout
        // ────────────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo '========== Checking out source code =========='
                checkout scm
                sh 'echo "Branch: ${GIT_BRANCH}" && echo "Commit: ${GIT_COMMIT}"'
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 2 – Install Dependencies
        // ────────────────────────────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo '========== Installing Node dependencies =========='
                sh 'npm install'
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 3 – Run Tests
        // ────────────────────────────────────────────────────────────
        stage('Run Tests') {
            steps {
                echo '========== Running unit tests =========='
                sh 'npm test'
            }
            post {
                always {
                    // Publish Jest coverage if available
                    publishHTML(target: [
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'coverage/lcov-report',
                        reportFiles          : 'index.html',
                        reportName           : 'Code Coverage Report'
                    ])
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 4 – SonarQube Analysis
        // ────────────────────────────────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                echo '========== Running SonarQube Analysis =========='
                withSonarQubeEnv('SonarQube-Server') {   // name set in Jenkins → Configure System
                    sh """
                        npx sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.projectName="${SONAR_PROJECT_NAME}" \
                          -Dsonar.sources=src \
                          -Dsonar.tests=tests \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                          -Dsonar.exclusions=node_modules/**,coverage/**
                    """
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 5 – Quality Gate
        // ────────────────────────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                echo '========== Waiting for SonarQube Quality Gate =========='
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 6 – Trivy FS Scan (source code)
        // ────────────────────────────────────────────────────────────
        stage('Trivy FS Scan') {
            steps {
                echo '========== Trivy filesystem / dependency scan =========='
                sh """
                    trivy fs \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      -o trivy-fs-report.txt \
                      .
                """
                sh 'cat trivy-fs-report.txt'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-fs-report.txt', allowEmptyArchive: true
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 7 – Build Docker Image
        // ────────────────────────────────────────────────────────────
        stage('Build Docker Image') {
            steps {
                echo "========== Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG} =========="
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
                sh "docker images | grep ${DOCKER_HUB_USERNAME}"
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 8 – Trivy Image Scan
        // ────────────────────────────────────────────────────────────
        stage('Trivy Image Scan') {
            steps {
                echo '========== Trivy Docker image vulnerability scan =========='
                sh """
                    trivy image \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      -o trivy-image-report.txt \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """
                sh 'cat trivy-image-report.txt'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-image-report.txt', allowEmptyArchive: true
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 9 – Push Docker Image to Docker Hub
        // ────────────────────────────────────────────────────────────
        stage('Push Docker Image') {
            steps {
                echo '========== Pushing image to Docker Hub =========='
                withCredentials([usernamePassword(
                    credentialsId: 'DOCKER_CREDENTIALS',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${IMAGE_NAME}:latest"
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // STAGE 10 – Deploy Container on EC2
        // ────────────────────────────────────────────────────────────
        stage('Deploy Container') {
            steps {
                echo '========== Deploying Docker container on EC2 =========='
                withCredentials([string(
                    credentialsId: 'MONGO_URI_SECRET',
                    variable: 'MONGO_URI'
                )]) {
                    sh """
                        # Stop & remove any existing container
                        docker stop ${CONTAINER_NAME} || true
                        docker rm   ${CONTAINER_NAME} || true

                        # Pull the freshly pushed image
                        docker pull ${IMAGE_NAME}:${IMAGE_TAG}

                        # Run container with env vars from Jenkins credentials
                        docker run -d \
                          --name ${CONTAINER_NAME} \
                          -p 5000:5000 \
                          -e NODE_ENV=production \
                          -e PORT=5000 \
                          -e MONGO_URI="${MONGO_URI}" \
                          -e JWT_SECRET=\$(openssl rand -hex 32) \
                          --restart unless-stopped \
                          ${IMAGE_NAME}:${IMAGE_TAG}

                        echo "Container started:"
                        docker ps | grep ${CONTAINER_NAME}
                    """
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────────
    // POST – notifications + cleanup
    // ────────────────────────────────────────────────────────────────
    post {
        success {
            echo """
            ╔══════════════════════════════════════════╗
            ║   ✅  Pipeline SUCCEEDED  Build #${BUILD_NUMBER}   ║
            ╚══════════════════════════════════════════╝
            API running at http://<EC2-PUBLIC-IP>:5000
            """
        }
        failure {
            echo """
            ╔══════════════════════════════════════════╗
            ║   ❌  Pipeline FAILED  Build #${BUILD_NUMBER}      ║
            ╚══════════════════════════════════════════╝
            Check console output for details.
            """
        }
        always {
            // Clean up dangling images to save disk space
            sh 'docker image prune -f || true'
            // Clean workspace
            cleanWs()
        }
    }
}
