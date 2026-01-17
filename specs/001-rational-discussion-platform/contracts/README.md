# API Contracts

This directory contains OpenAPI 3.1 specifications for all uniteDiscord microservices.

## Service APIs

| Service | File | Description |
|---------|------|-------------|
| **user-service** | [user-service.openapi.yaml](./user-service.openapi.yaml) | User accounts, verification, trust scores, following |
| **discussion-service** | [discussion-service.openapi.yaml](./discussion-service.openapi.yaml) | Topics, propositions, responses, alignments, common ground |
| **ai-service** | [ai-service.openapi.yaml](./ai-service.openapi.yaml) | AI feedback, analysis, suggestions |
| **moderation-service** | [moderation-service.openapi.yaml](./moderation-service.openapi.yaml) | Content moderation, actions, appeals |
| **fact-check-service** | [fact-check-service.openapi.yaml](./fact-check-service.openapi.yaml) | External fact-check integration |
| **notification-service** | [notification-service.openapi.yaml](./notification-service.openapi.yaml) | Real-time and email notifications |

## Not Included

The following services do not have REST APIs exposed to the gateway:

- **api-gateway**: Routes and aggregates calls to other services
- **recommendation-service**: Internal service consumed via events and internal APIs

## Authentication

All APIs use JWT bearer tokens for authentication:

- **bearerAuth**: User authentication via AWS Cognito
- **serviceAuth**: Service-to-service authentication for internal APIs

## Common Patterns

### Pagination

All list endpoints support cursor-based pagination:

```
GET /resource?limit=20&cursor=abc123
```

Response includes `nextCursor` for subsequent pages.

### Error Responses

All errors follow the standard format:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error message",
  "details": { /* optional structured details */ }
}
```

### API Versioning

All APIs are versioned in the URL path: `/api/v1/...`

## Contract Testing

These specifications are used for:

1. **Code Generation**: Generate TypeScript types and API clients
2. **Pact Testing**: Consumer-driven contract tests between services
3. **Documentation**: Auto-generate API documentation
4. **Validation**: Runtime request/response validation

## Generating Types

```bash
# From repository root
npx openapi-typescript specs/001-rational-discussion-platform/contracts/*.yaml -o packages/common/src/types/api/
```

## Related Documents

- [Data Model](../data-model.md) - Entity definitions and relationships
- [Plan](../plan.md) - Implementation plan and service boundaries
- [Research](../research.md) - Technology decisions
