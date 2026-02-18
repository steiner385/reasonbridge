# Test Naming Conventions

This guide establishes naming conventions for tests across the reasonBridge codebase to ensure consistency, discoverability, and maintainability.

## File Naming Patterns

### Unit Tests

```
<module>.test.ts           # Standard unit tests
<module>.spec.ts           # Alternative (used in some services)
```

**Location**: Adjacent to source files or in `__tests__/` directories

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.controller.test.ts      # Adjacent pattern
│   └── __tests__/
│       └── auth.service.test.ts     # Directory pattern
```

### Integration Tests

```
<module>.integration.test.ts    # Primary pattern
<module>.integration.spec.ts    # Alternative
```

**Location**: `src/__tests__/integration/` or `tests/integration/`

### Golden Tests

```
<module>.golden.test.ts
```

**Location**: `src/__golden__/` directories

Golden tests use fixed input/output fixtures for regression testing. They verify that outputs remain stable across refactoring.

### E2E Tests

```
<feature-name>.spec.ts
```

**Location**: `frontend/e2e/` for Playwright browser tests

## Test Block Naming

### describe() Blocks

Use noun phrases describing the unit under test:

```typescript
// Good - describes the subject
describe('AuthController', () => {
describe('ToneAnalyzerService', () => {
describe('useDebounce hook', () => {

// Good - nested describe for method/feature grouping
describe('AuthController', () => {
  describe('login', () => {
  describe('register', () => {
```

Avoid:
```typescript
// Bad - verb phrases in describe
describe('testing AuthController', () => {
describe('should handle authentication', () => {
```

### it() / test() Blocks

Use verb phrases starting with "should":

```typescript
// Good - clear behavior description
it('should authenticate user and return tokens', async () => {
it('should reject invalid credentials with 401', async () => {
it('should rate limit after 5 failed attempts', async () => {

// Good - specific expected behavior
it('should detect personal attacks with confidence >= 0.75', () => {
it('should emit common-ground:generated event to correct room', () => {
```

Avoid:
```typescript
// Bad - too vague
it('works', () => {
it('handles error', () => {

// Bad - noun phrase instead of verb
it('valid login', () => {

// Bad - implementation details
it('calls bcrypt.compare with password', () => {
```

### Context-Specific Describe Blocks

For testing variations or edge cases:

```typescript
describe('AuthController', () => {
  describe('login', () => {
    describe('with valid credentials', () => {
      it('should return access token', async () => {
      it('should return refresh token', async () => {
    });

    describe('with invalid credentials', () => {
      it('should return 401 Unauthorized', async () => {
      it('should not reveal which field was wrong', async () => {
    });
  });
});
```

## E2E Test Naming (Playwright)

E2E tests use `test.describe` and `test`:

```typescript
test.describe('Login Modal', () => {
  test('should render the login modal with all required elements', async ({ page }) => {
  test('should auto-fill credentials when clicking demo account', async ({ page }) => {
  test('should display error message for invalid credentials', async ({ page }) => {
});
```

## Golden Test Naming

Golden tests use descriptive IDs for fixtures:

```typescript
describe('ToneAnalyzerService Golden Tests', () => {
  describe('Inflammatory Language Detection - Golden Fixtures', () => {
    const PERSONAL_ATTACKS_DIRECT = [
      {
        id: 'PA-D-001',  // Category-Type-Number
        input: "You're stupid if you believe that.",
        expectedMatch: "You're stupid",
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(PERSONAL_ATTACKS_DIRECT)(
      'should detect: $id',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
```

## Fixture and Factory Naming

### Test Fixtures

```typescript
// Location: __tests__/fixtures/ or test/fixtures/
// Naming: <entity>-fixtures.ts or test-data.ts

// fixtures/test-data.ts
export const testTopicId = 'topic-uuid-123';
export const testCreatorId = 'user-uuid-456';

export const mockCommonGroundGeneratedEvent = {
  topicId: testTopicId,
  version: 1,
  // ...
};
```

### Test Factories

```typescript
// Location: test/factories/ or __tests__/factories/
// Naming: <entity>.factory.ts

// factories/user.factory.ts
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}
```

## Mock Naming

### Mock Functions

```typescript
// Prefix with 'mock' for clarity
const mockCognitoService = createMockCognitoService();
const mockPrismaClient = createMockPrismaClient();

// Or inline mocks
vi.mock('../services/auth.service', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    login: vi.fn(),
    register: vi.fn(),
  })),
}));
```

### Mock Data

```typescript
// Prefix variables with 'mock' or 'fake'
const mockUser = createTestUser();
const fakeToken = 'fake-jwt-token';
const mockApiResponse = { success: true, data: [] };
```

## Directory Structure Summary

```
service-name/
├── src/
│   ├── __tests__/                    # Unit tests
│   │   ├── auth.service.test.ts
│   │   ├── fixtures/
│   │   │   └── test-data.ts
│   │   └── integration/              # Integration tests
│   │       └── auth-flow.integration.test.ts
│   ├── __golden__/                   # Golden tests
│   │   └── tone-analyzer.golden.test.ts
│   └── auth/
│       ├── auth.controller.ts
│       └── auth.controller.test.ts   # Adjacent unit test
├── tests/
│   └── integration/                  # Alternative integration location
│       └── cognito-integration.spec.ts
└── vitest.config.ts

frontend/
├── src/
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useDebounce.spec.ts       # Hook tests
│   └── components/
│       └── __tests__/
│           └── Button.test.tsx
├── e2e/                              # Playwright E2E tests
│   ├── login-form.spec.ts
│   └── visual/                       # Visual regression tests
│       └── brand-colors.spec.ts
└── playwright.config.ts
```

## Quick Reference

| Test Type | File Pattern | Location | Framework |
|-----------|-------------|----------|-----------|
| Unit | `.test.ts` | Adjacent or `__tests__/` | Vitest |
| Integration | `.integration.test.ts` | `__tests__/integration/` | Vitest |
| Golden | `.golden.test.ts` | `__golden__/` | Vitest |
| E2E | `.spec.ts` | `frontend/e2e/` | Playwright |
| Visual | `.spec.ts` | `frontend/e2e/visual/` | Playwright |

## Best Practices

1. **Be specific**: Test names should explain what's being tested and the expected outcome
2. **Avoid duplication**: Don't repeat the describe block name in it blocks
3. **Focus on behavior**: Test what the code does, not how it does it
4. **Use consistent language**: "should" for expectations, present tense for descriptions
5. **Group related tests**: Use nested describe blocks for logical grouping
6. **Keep tests isolated**: Each test should be independent and not rely on others
