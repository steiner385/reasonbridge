# LocalStack Infrastructure

This directory contains initialization scripts and configuration for LocalStack, which provides local AWS service emulation for development and testing.

## Overview

LocalStack is configured via `docker-compose.yml` to emulate the following AWS services:

- **SNS**: Pub/sub notifications for event broadcasting (topics defined in `init-topics.sh`)
- **SQS**: Message queuing for event consumption (queues defined in `init-queues.sh`)
- **S3**: Object storage for file uploads
- **DynamoDB**: NoSQL database (if needed)

## SNS Topics

The `init-topics.sh` script creates all required SNS topics and SNS-to-SQS subscriptions for the platform's event-driven pub/sub architecture.

### Event Topics

| Topic Name                    | Publisher Service(s) | Event Type   | Description                                   |
| ----------------------------- | -------------------- | ------------ | --------------------------------------------- |
| `response-created`            | Discussion Service   | Core Event   | New response submitted by user                |
| `response-analyzed`           | AI Service           | Core Event   | Response analysis completed with feedback     |
| `topic-participant-joined`    | Discussion Service   | Core Event   | User joins a discussion topic                 |
| `moderation-action-requested` | AI Service           | Moderation   | AI detects content requiring moderation       |
| `user-trust-updated`          | Moderation Service   | Moderation   | User trust score changed                      |
| `common-ground-generated`     | AI Service           | Analysis     | Common ground identified between perspectives |
| `notification-email`          | Any Service          | Notification | Email notification requested                  |
| `notification-push`           | Any Service          | Notification | Push notification requested                   |
| `system-audit`                | Any Service          | System       | Audit event for compliance logging            |

### Topic-to-Queue Subscriptions

SNS-to-SQS subscriptions are **managed by application services at startup** due to LocalStack 3 Community Edition limitations with CLI-based subscription creation. Each service creates its own subscriptions programmatically using the AWS SDK.

The following subscription mappings should be implemented by services:

| SNS Topic                     | Subscribed SQS Queue(s)                     | Consuming Service(s)                     | Created By                        |
| ----------------------------- | ------------------------------------------- | ---------------------------------------- | --------------------------------- |
| `response-created`            | `response-analysis-queue`                   | AI Service                               | AI Service on startup             |
| `response-analyzed`           | `discussion-events-queue`                   | Discussion Service                       | Discussion Service on startup     |
| `topic-participant-joined`    | `recommendation-queue`                      | Recommendation Service                   | Recommendation Service on startup |
| `moderation-action-requested` | `moderation-queue`                          | Moderation Service                       | Moderation Service on startup     |
| `user-trust-updated`          | `user-trust-queue`                          | User Service                             | User Service on startup           |
| `common-ground-generated`     | `common-ground-queue`, `notification-queue` | Discussion Service, Notification Service | Both services on startup          |
| `notification-email`          | `email-queue`                               | Notification Service (email worker)      | Notification Service on startup   |
| `notification-push`           | `notification-queue`                        | Notification Service (push worker)       | Notification Service on startup   |
| `system-audit`                | `audit-log-queue`                           | Audit Service                            | Audit Service on startup          |

**Implementation Note**: Each service should create its SNS-to-SQS subscriptions during initialization using code similar to:

```typescript
// Example: AI Service subscribing to response-created topic
await snsClient.subscribe({
  TopicArn: 'arn:aws:sns:us-east-1:000000000000:response-created',
  Protocol: 'sqs',
  Endpoint: 'arn:aws:sqs:us-east-1:000000000000:response-analysis-queue',
});
```

### Pub/Sub Benefits

Using SNS topics with SQS subscribers provides:

- **Fan-out**: Single event can trigger multiple services (e.g., `common-ground-generated` → Discussion + Notification)
- **Decoupling**: Publishers don't need to know about consumers
- **Reliability**: Messages persisted in SQS until processed
- **Scalability**: Multiple consumers can process messages in parallel
- **Filtering**: Subscription filter policies can route specific events (future enhancement)

## SQS Queues

The `init-queues.sh` script creates all required SQS queues for the platform's event-driven architecture.

### Event Processing Queues

| Queue Name                | Purpose                                                                        | Visibility Timeout | Max Receive Count |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------ | ----------------- |
| `response-analysis-queue` | AI service processes `response.created` events for bias detection and feedback | 300s (5min)        | 3                 |
| `discussion-events-queue` | Discussion service processes `response.analyzed` events to update feedback     | 60s                | 3                 |
| `moderation-queue`        | Moderation service processes `moderation.action.requested` events              | 120s (2min)        | 3                 |
| `notification-queue`      | Notification service processes notification events (common-ground, etc.)       | 60s                | 5                 |
| `user-trust-queue`        | User service processes `user.trust.updated` events                             | 30s                | 3                 |
| `recommendation-queue`    | Recommendation service processes `topic.participant.joined` events             | 90s                | 3                 |
| `common-ground-queue`     | Discussion/Notification services process `common-ground.generated` events      | 60s                | 3                 |

### Utility Queues

| Queue Name        | Purpose                                          | Visibility Timeout | Max Receive Count |
| ----------------- | ------------------------------------------------ | ------------------ | ----------------- |
| `email-queue`     | Async email sending                              | 60s                | 3                 |
| `audit-log-queue` | System audit events                              | 30s                | 5                 |
| `global-dlq`      | Global dead letter queue for unroutable messages | 30s                | N/A               |

### Dead Letter Queues (DLQ)

Each primary queue has an associated DLQ (e.g., `response-analysis-queue-dlq`) that receives messages that fail processing after the max receive count is exceeded. This allows for:

- Failed message inspection and debugging
- Manual retry or discard decisions
- Alerting on systematic failures

## Event Flow

The platform uses an event-driven architecture with the following key events:

```
response.created
  → response-analysis-queue → AI Service
    → response.analyzed
      → discussion-events-queue → Discussion Service

topic.participant.joined
  → recommendation-queue → Recommendation Service

moderation.action.requested
  → moderation-queue → Moderation Service
    → user.trust.updated
      → user-trust-queue → User Service

common-ground.generated
  → common-ground-queue → Discussion Service, Notification Service
```

## Usage

### Automatic Initialization

The queues are automatically created when you start the docker-compose stack:

```bash
docker-compose up -d
```

The `init-queues.sh` and `init-topics.sh` scripts run as part of LocalStack's startup process.

### Manual Re-initialization

To manually re-run the initialization scripts:

```bash
# From the project root
# Re-initialize queues
docker-compose exec localstack /bin/bash -c "bash /etc/localstack/init/ready.d/init-queues.sh"

# Re-initialize topics and subscriptions
docker-compose exec localstack /bin/bash -c "bash /etc/localstack/init/ready.d/init-topics.sh"
```

### Accessing SNS Topics

All topics are accessible via the AWS CLI or SDKs using the LocalStack endpoint:

```bash
# List all topics
aws --endpoint-url=http://localhost:4566 sns list-topics

# Publish a test event
aws --endpoint-url=http://localhost:4566 sns publish \
  --topic-arn arn:aws:sns:us-east-1:000000000000:response-created \
  --message '{"eventType":"response.created","data":{"responseId":"123","content":"test"}}'

# List subscriptions for a topic
aws --endpoint-url=http://localhost:4566 sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:000000000000:response-created
```

### Accessing Queues

All queues are accessible via the AWS CLI or SDKs using the LocalStack endpoint:

```bash
# List all queues
aws --endpoint-url=http://localhost:4566 sqs list-queues

# Get queue URL
aws --endpoint-url=http://localhost:4566 sqs get-queue-url --queue-name response-analysis-queue

# Send a test message
aws --endpoint-url=http://localhost:4566 sqs send-message \
  --queue-url http://localhost:4566/000000000000/response-analysis-queue \
  --message-body '{"event": "test"}'

# Receive messages
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://localhost:4566/000000000000/response-analysis-queue
```

### Checking Queue Attributes

```bash
# Get all attributes of a queue
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/response-analysis-queue \
  --attribute-names All
```

### Monitoring Dead Letter Queues

```bash
# Check DLQ depth
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/response-analysis-queue-dlq \
  --attribute-names ApproximateNumberOfMessages

# Receive failed messages from DLQ
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://localhost:4566/000000000000/response-analysis-queue-dlq \
  --max-number-of-messages 10
```

## Configuration

### Queue Parameters

The queues are configured with the following standard attributes:

- **VisibilityTimeout**: Time a message is hidden after being received (varies by queue based on expected processing time)
- **MessageRetentionPeriod**: 1209600 seconds (14 days) - how long messages are retained
- **ReceiveMessageWaitTimeSeconds**: 0 (short polling by default)
- **DelaySeconds**: 0 (no delivery delay)
- **MaxReceiveCount**: 3-5 (varies by queue) - number of receive attempts before sending to DLQ

### Customizing Queues

To modify queue attributes, edit the parameters in `init-queues.sh`:

```bash
# Syntax: create_queue_with_dlq "queue-name" visibility_timeout max_receive_count
create_queue_with_dlq "my-queue" 120 5
```

## Integration with Services

Services integrate with these queues using the `packages/common/src/events/` utilities:

- **EventPublisher**: Publishes events to SNS topics (which fan out to SQS queues via subscriptions)
- **EventSubscriber**: Subscribes to SQS queues and processes messages
- **DLQHandler**: Monitors and processes dead letter queue messages

See the following packages for event infrastructure:

- `packages/common/src/events/` - Base event publishing/consuming classes
- `packages/event-schemas/src/` - Event type definitions

## Troubleshooting

### Queues Not Created

1. Check LocalStack logs: `docker-compose logs localstack`
2. Verify LocalStack health: `curl http://localhost:4566/_localstack/health`
3. Manually run init script: `docker-compose exec localstack /bin/bash -c "bash /etc/localstack/init/ready.d/init-queues.sh"`

### Can't Connect to Queues

1. Ensure LocalStack container is running: `docker-compose ps`
2. Check port mapping: LocalStack should be accessible on `localhost:4566`
3. Verify AWS CLI configuration uses correct endpoint: `--endpoint-url=http://localhost:4566`

### Messages Not Being Processed

1. Check queue depth: messages accumulating indicates consumer issues
2. Check DLQ: messages in DLQ indicate repeated processing failures
3. Review service logs for error messages
4. Verify event schema matches between publisher and consumer

## References

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS SQS Developer Guide](https://docs.aws.amazon.com/sqs/)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)
