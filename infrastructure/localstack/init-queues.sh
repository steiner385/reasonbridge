#!/bin/bash

# LocalStack SQS Queue Initialization Script
# Creates all SQS queues required for the ReasonBridge platform
# This script runs automatically when LocalStack starts via docker-compose

set -e

echo "Initializing SQS queues in LocalStack..."

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s "${LOCALSTACK_ENDPOINT}/_localstack/health" | grep -q '"sqs": "available"'; do
  echo "Waiting for SQS service..."
  sleep 2
done
echo "LocalStack is ready!"

# Function to create a queue with standard attributes
create_queue() {
  local queue_name=$1
  local visibility_timeout=${2:-30}
  local message_retention=${3:-1209600}  # 14 days default
  local receive_wait_time=${4:-0}

  echo "Creating queue: ${queue_name}"

  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
      --region="${AWS_REGION}" \
      sqs create-queue \
      --queue-name "${queue_name}" \
      --attributes "{
        \"VisibilityTimeout\": \"${visibility_timeout}\",
        \"MessageRetentionPeriod\": \"${message_retention}\",
        \"ReceiveMessageWaitTimeSeconds\": \"${receive_wait_time}\",
        \"DelaySeconds\": \"0\"
      }" > /dev/null

  echo "✓ Created queue: ${queue_name}"
}

# Function to create a FIFO queue
create_fifo_queue() {
  local queue_name=$1
  local visibility_timeout=${2:-30}
  local message_retention=${3:-1209600}

  echo "Creating FIFO queue: ${queue_name}.fifo"

  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
      --region="${AWS_REGION}" \
      sqs create-queue \
      --queue-name "${queue_name}.fifo" \
      --attributes "{
        \"FifoQueue\": \"true\",
        \"ContentBasedDeduplication\": \"true\",
        \"VisibilityTimeout\": \"${visibility_timeout}\",
        \"MessageRetentionPeriod\": \"${message_retention}\"
      }" > /dev/null

  echo "✓ Created FIFO queue: ${queue_name}.fifo"
}

# Function to create a dead-letter queue and its main queue
create_queue_with_dlq() {
  local queue_name=$1
  local visibility_timeout=${2:-30}
  local max_receive_count=${3:-3}

  echo "Creating DLQ for: ${queue_name}"

  # Create the dead-letter queue first
  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
      --region="${AWS_REGION}" \
      sqs create-queue \
      --queue-name "${queue_name}-dlq" \
      --attributes "{
        \"MessageRetentionPeriod\": \"1209600\"
      }" > /dev/null

  # Get the DLQ ARN
  dlq_url=$(aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
                --region="${AWS_REGION}" \
                sqs get-queue-url \
                --queue-name "${queue_name}-dlq" \
                --query 'QueueUrl' \
                --output text)

  dlq_arn=$(aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
                --region="${AWS_REGION}" \
                sqs get-queue-attributes \
                --queue-url "${dlq_url}" \
                --attribute-names QueueArn \
                --query 'Attributes.QueueArn' \
                --output text)

  echo "✓ Created DLQ: ${queue_name}-dlq"

  # Create the main queue with DLQ policy
  echo "Creating main queue: ${queue_name}"

  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
      --region="${AWS_REGION}" \
      sqs create-queue \
      --queue-name "${queue_name}" \
      --attributes "{
        \"VisibilityTimeout\": \"${visibility_timeout}\",
        \"MessageRetentionPeriod\": \"1209600\",
        \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"${max_receive_count}\\\"}\"
      }" > /dev/null

  echo "✓ Created main queue: ${queue_name} (with DLQ)"
}

echo ""
echo "=========================================="
echo "Creating Event Processing Queues"
echo "=========================================="
echo ""

# Response Analysis Queue (AI Service)
# Processes response.created events for bias detection, feedback generation
create_queue_with_dlq "response-analysis-queue" 300 3

# Discussion Events Queue (Discussion Service)
# Processes response.analyzed events to update feedback
create_queue_with_dlq "discussion-events-queue" 60 3

# Moderation Queue (Moderation Service)
# Processes moderation.action.requested events
create_queue_with_dlq "moderation-queue" 120 3

# Notification Queue (Notification Service)
# Processes notification events (common-ground.generated, etc.)
create_queue_with_dlq "notification-queue" 60 5

# User Trust Update Queue (User Service)
# Processes user.trust.updated events
create_queue_with_dlq "user-trust-queue" 30 3

# Recommendation Queue (Recommendation Service)
# Processes topic.participant.joined events for diversity checks
create_queue_with_dlq "recommendation-queue" 90 3

# Common Ground Queue (Discussion + Notification Services)
# Processes common-ground.generated events
create_queue_with_dlq "common-ground-queue" 60 3

echo ""
echo "=========================================="
echo "Creating Utility Queues"
echo "=========================================="
echo ""

# Global Dead Letter Queue for unroutable messages
create_queue "global-dlq" 30 1209600

# Email Queue for async email sending
create_queue_with_dlq "email-queue" 60 3

# Audit Log Queue for system audit events
create_queue_with_dlq "audit-log-queue" 30 5

echo ""
echo "=========================================="
echo "Queue Creation Complete"
echo "=========================================="
echo ""

# List all created queues
echo "Listing all queues:"
aws --endpoint-url="${LOCALSTACK_ENDPOINT}" \
    --region="${AWS_REGION}" \
    sqs list-queues \
    --query 'QueueUrls[*]' \
    --output text | tr '\t' '\n'

echo ""
echo "✓ All SQS queues initialized successfully!"
echo ""
echo "Queue endpoints available at: ${LOCALSTACK_ENDPOINT}"
echo "AWS Region: ${AWS_REGION}"
