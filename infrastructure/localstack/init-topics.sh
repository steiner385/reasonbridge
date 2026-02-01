#!/bin/bash

# LocalStack SNS Topic Initialization Script
# Creates all SNS topics and SNS-to-SQS subscriptions for the ReasonBridge platform
# This script runs automatically when LocalStack starts via docker-compose

set -e

echo "Initializing SNS topics in LocalStack..."

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"

# Configure AWS CLI to work with LocalStack
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="${AWS_REGION}"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."

# Wait for SNS to be available
until curl -s "${LOCALSTACK_ENDPOINT}/_localstack/health" | grep -q '"sns": "available"'; do
  echo "Waiting for SNS service..."
  sleep 2
done

# Wait for SQS to be available (or running, which means ready enough)
max_attempts=30
attempt=0
until curl -s "${LOCALSTACK_ENDPOINT}/_localstack/health" | grep -qE '"sqs": "(available|running)"'; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "WARNING: SQS service took too long to start. Proceeding anyway..."
    break
  fi
  echo "Waiting for SQS service... (attempt $attempt/$max_attempts)"
  sleep 2
done

echo "LocalStack services are ready!"

# Function to create an SNS topic
create_topic() {
  local topic_name=$1

  echo "Creating SNS topic: ${topic_name}"

  topic_arn=$(awslocal sns create-topic \
      --name "${topic_name}" \
      --query 'TopicArn' \
      --output text)

  echo "✓ Created topic: ${topic_name}"
  echo "  ARN: ${topic_arn}"

  # Return the ARN for subscription creation
  echo "${topic_arn}"
}

# Note: SNS-to-SQS subscriptions are handled by application services at startup
# due to LocalStack 3 Community Edition limitations with CLI-based subscriptions

echo ""
echo "=========================================="
echo "Creating SNS Topics"
echo "=========================================="
echo ""

# Create topics for all key events
# These topics follow the event.domain pattern from the spec

echo "--- Core Discussion Events ---"
echo ""

# response.created - Published by Discussion Service when a new response is created
response_created_arn=$(create_topic "response-created")
echo ""

# response.analyzed - Published by AI Service after analyzing a response
response_analyzed_arn=$(create_topic "response-analyzed")
echo ""

# topic.participant.joined - Published by Discussion Service when user joins a topic
topic_participant_joined_arn=$(create_topic "topic-participant-joined")
echo ""

echo "--- Moderation Events ---"
echo ""

# moderation.action.requested - Published by AI Service when moderation is needed
moderation_action_requested_arn=$(create_topic "moderation-action-requested")
echo ""

# user.trust.updated - Published by Moderation Service when user trust score changes
user_trust_updated_arn=$(create_topic "user-trust-updated")
echo ""

echo "--- AI & Analysis Events ---"
echo ""

# common-ground.generated - Published by AI Service when common ground is identified
common_ground_generated_arn=$(create_topic "common-ground-generated")
echo ""

echo "--- Notification Events ---"
echo ""

# notification.email - Published by any service to trigger email notifications
notification_email_arn=$(create_topic "notification-email")
echo ""

# notification.push - Published by any service to trigger push notifications
notification_push_arn=$(create_topic "notification-push")
echo ""

echo "--- System Events ---"
echo ""

# system.audit - Published by any service for audit logging
system_audit_arn=$(create_topic "system-audit")
echo ""

echo ""
echo "=========================================="
echo "SNS-to-SQS Subscriptions"
echo "=========================================="
echo ""

echo "NOTE: SNS-to-SQS subscriptions are managed by application services at startup."
echo "      Due to a known issue in LocalStack 3 Community Edition, subscriptions"
echo "      cannot be reliably created via CLI during initialization."
echo ""
echo "      Services will create their own subscriptions using the AWS SDK when they start."
echo "      Subscription mappings are documented in the README.md file."
echo ""

echo ""
echo "=========================================="
echo "Topic & Subscription Creation Complete"
echo "=========================================="
echo ""

# List all created topics
echo "Listing all topics:"
awslocal sns list-topics \
    --query 'Topics[*].TopicArn' \
    --output text | tr '\t' '\n'

echo ""
echo "✓ All SNS topics and subscriptions initialized successfully!"
echo ""
echo "Topic endpoints available at: ${LOCALSTACK_ENDPOINT}"
echo "AWS Region: ${AWS_REGION}"
