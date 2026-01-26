# Integration Tests Guide

Integration tests in this project are separate from unit tests because they test interactions between components and may require external infrastructure (Docker services).

## What Are Integration Tests?

Integration tests verify that multiple services/components work together correctly. They're located in `**/__tests__/**/*.integration.test.ts` files across services.

Current integration test files:

- `services/ai-service/src/__tests__/feedback-api.integration.test.ts`
- `services/notification-service/src/__tests__/integration/*.integration.test.ts`
- `services/user-service/src/__tests__/*.integration.test.ts`

## Infrastructure Requirements

Integration tests can use these Docker services (defined in `docker-compose.test.yml`):

- **PostgreSQL 15** (port 5433)

  - User: `unite_test`
  - Password: `unite_test`
  - Database: `unite_test`

- **Redis 7** (port 6380)

  - Used for caching and session storage

- **LocalStack 3.0** (port 4567)
  - Emulates AWS services: S3, SQS, SNS
  - Credentials: `test` / `test`

## Running Integration Tests Locally

### 1. Start Docker Services

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Run Integration Tests

```bash
# Using npm script
npm run test:integration

# Or directly with vitest
npx vitest run --config vitest.config.integration.ts
```

### 3. Watch Mode (for development)

```bash
npm run test:integration:watch
```

### 4. Stop Docker Services

```bash
docker-compose -f docker-compose.test.yml down
```

## Environment Setup

Integration tests use `.env.test` which is committed to version control (it contains only non-sensitive test defaults).

The configuration includes:

- Test database connection strings
- Redis connection on test ports
- LocalStack endpoint for AWS emulation
- Bedrock and Cognito disabled (use mocks)

## CI/CD Integration

**Currently:** Integration tests are NOT enabled in the main CI pipeline by default.

**Why:** To prevent breaking the build before all integration tests are verified to work.

**To enable in CI:**

- Update Jenkins pipeline to run: `npx vitest run --config vitest.config.integration.ts`
- Ensure Docker services are available in the CI environment
- Or run integration tests in a separate, isolated CI stage

## Test Structure

Integration tests typically:

- Use NestJS TestingModule for dependency injection
- Mock external APIs (AWS Bedrock, Cognito) since they can't be emulated
- May use real Prisma client for database operations
- Verify service interactions and business logic flows

## Adding New Integration Tests

1. Create test file: `services/my-service/src/__tests__/my-feature.integration.test.ts`
2. Use vitest: `import { describe, it, expect } from 'vitest'`
3. Set up mocks for external services (AWS, AI APIs)
4. Test against real database/Redis if needed
5. Add to version control - no sensitive data!

Example:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from '../my.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MyService - Integration', () => {
  let service: MyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService, PrismaService],
    }).compile();

    service = module.get<MyService>(MyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should integrate with database', async () => {
    const result = await service.createSomething();
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### "Cannot connect to database" error

- Ensure Docker services are running: `docker-compose -f docker-compose.test.yml up -d`
- Check port 5433 is not in use: `lsof -i :5433`

### "Redis connection refused"

- Check Redis service is running: `docker ps | grep redis`
- Verify port 6380: `docker-compose -f docker-compose.test.yml logs redis-test`

### "LocalStack not accessible"

- Check LocalStack is running: `docker ps | grep localstack`
- Test connection: `curl http://localhost:4567/`

### Tests timeout

- Increase Vitest timeout: `it('test', () => { ... }, 10000)`
- Or set globally in config: `testTimeout: 10000`

## Best Practices

1. **Keep mocks for external APIs** - Don't make real AWS/Bedrock calls in tests
2. **Use test data factories** - Create consistent test fixtures
3. **Clean up after tests** - Use `afterEach` to clear databases
4. **Isolate tests** - Each test should be independent
5. **Mock time** - Use `vi.useFakeTimers()` for date/time dependent tests
6. **Document infrastructure** - What services does this test need?

## References

- [Vitest Configuration](https://vitest.dev/config/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Docker Compose](https://docs.docker.com/compose/)
- [LocalStack](https://docs.localstack.cloud/)
