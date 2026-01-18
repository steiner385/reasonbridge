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

## Contract Testing Strategy

These specifications are used for:

1. **Code Generation**: Generate TypeScript types and API clients
2. **Pact Testing**: Consumer-driven contract tests between services
3. **Documentation**: Auto-generate API documentation
4. **Validation**: Runtime request/response validation

### Test File Structure

```
services/api/tests/contract/
├── openapi-validation.test.ts     # Schema validation tests
├── user-service.pact.test.ts      # Consumer contracts for user-service
├── ai-service.pact.test.ts        # Consumer contracts for ai-service
└── fixtures/
    ├── user-service.responses.json
    ├── ai-service.responses.json
    └── error-responses.json
```

### OpenAPI Validation Tests

Each service must include validation tests that verify:

```typescript
// openapi-validation.test.ts
import { validate } from '@readme/openapi-parser';
import { loadSpec } from './helpers';

describe('OpenAPI Contract Validation', () => {
  const specs = [
    'user-service.openapi.yaml',
    'discussion-service.openapi.yaml',
    'ai-service.openapi.yaml',
    'moderation-service.openapi.yaml',
    'fact-check-service.openapi.yaml',
    'notification-service.openapi.yaml',
  ];

  specs.forEach((specFile) => {
    describe(specFile, () => {
      it('should be valid OpenAPI 3.1', async () => {
        const spec = loadSpec(specFile);
        await expect(validate(spec)).resolves.not.toThrow();
      });

      it('should have error responses for all endpoints', async () => {
        const spec = loadSpec(specFile);
        Object.entries(spec.paths).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, operation]) => {
            expect(operation.responses['400']).toBeDefined();
            expect(operation.responses['401']).toBeDefined();
            expect(operation.responses['500']).toBeDefined();
          });
        });
      });

      it('should use consistent error schema', async () => {
        const spec = loadSpec(specFile);
        const errorSchema = spec.components.schemas.ErrorResponse;
        expect(errorSchema.required).toContain('code');
        expect(errorSchema.required).toContain('message');
      });
    });
  });
});
```

### Pact Consumer Tests

Consumer-driven contracts ensure service compatibility:

```typescript
// user-service.pact.test.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike, regex } = MatchersV3;

describe('User Service Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'DiscussionService',
    provider: 'UserService',
  });

  describe('GET /users/:id', () => {
    it('returns user profile for valid ID', async () => {
      await provider
        .given('user exists', { userId: 'test-user-id' })
        .uponReceiving('a request for user profile')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/test-user-id',
          headers: { Authorization: 'Bearer valid-token' },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: like('test-user-id'),
            displayName: like('Test User'),
            verificationLevel: regex('basic|enhanced|verified_human', 'basic'),
            trustScore: {
              ability: like(0.75),
              benevolence: like(0.80),
              integrity: like(0.85),
            },
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await userClient.getUser('test-user-id', mockServer.url);
        expect(response.displayName).toBeDefined();
      });
    });

    it('returns 404 for non-existent user', async () => {
      await provider
        .given('user does not exist')
        .uponReceiving('a request for non-existent user')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/non-existent-id',
          headers: { Authorization: 'Bearer valid-token' },
        })
        .willRespondWith({
          status: 404,
          body: {
            code: 'USER_001',
            message: like('User not found'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        await expect(userClient.getUser('non-existent-id', mockServer.url))
          .rejects.toThrow(/USER_001/);
      });
    });
  });
});
```

### Integration Test Helpers

```typescript
// test-helpers/api-contract.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { loadSpec } from './spec-loader';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

export function validateResponse(specFile: string, path: string, method: string, status: number, body: unknown) {
  const spec = loadSpec(specFile);
  const responseSchema = spec.paths[path][method].responses[status].content['application/json'].schema;
  const validate = ajv.compile(responseSchema);
  const valid = validate(body);
  if (!valid) {
    throw new Error(`Response validation failed: ${JSON.stringify(validate.errors)}`);
  }
  return true;
}

// Usage in integration tests
describe('GET /discussions/:id', () => {
  it('should return response matching OpenAPI schema', async () => {
    const response = await request(app).get('/api/v1/discussions/test-id');

    expect(
      validateResponse('discussion-service.openapi.yaml', '/discussions/{id}', 'get', 200, response.body)
    ).toBe(true);
  });
});
```

### Error Code Contract Tests

Verify error responses match the taxonomy:

```typescript
// error-codes.contract.test.ts
import { ERROR_CODES } from '@uniteDiscord/shared';

describe('Error Code Contracts', () => {
  const errorScenarios = [
    { endpoint: 'POST /auth/login', scenario: 'invalid credentials', expectedCode: 'AUTH_001' },
    { endpoint: 'GET /discussions/:id', scenario: 'not found', expectedCode: 'DISCUSSION_001' },
    { endpoint: 'POST /responses', scenario: 'missing required field', expectedCode: 'VALIDATION_001' },
    { endpoint: 'POST /responses', scenario: 'rate limited', expectedCode: 'RATE_LIMIT_001' },
  ];

  errorScenarios.forEach(({ endpoint, scenario, expectedCode }) => {
    it(`${endpoint} returns ${expectedCode} when ${scenario}`, async () => {
      const response = await triggerErrorScenario(endpoint, scenario);
      expect(response.body.code).toBe(expectedCode);
      expect(ERROR_CODES[expectedCode]).toBeDefined();
    });
  });
});
```

## Generating Types

```bash
# From repository root
npx openapi-typescript specs/001-rational-discussion-platform/contracts/*.yaml -o packages/shared/src/types/api/
```

### Generated Type Usage

```typescript
// Using generated types for type-safe API clients
import type { paths } from '@uniteDiscord/shared/types/api/discussion-service';

type GetDiscussionResponse = paths['/discussions/{id}']['get']['responses']['200']['content']['application/json'];
type CreateResponseBody = paths['/discussions/{id}/responses']['post']['requestBody']['content']['application/json'];
```

## Related Documents

- [Data Model](../data-model.md) - Entity definitions and relationships
- [Plan](../plan.md) - Implementation plan and service boundaries
- [Research](../research.md) - Technology decisions
