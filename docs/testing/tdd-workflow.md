# Test-Driven Development (TDD) Workflow

This guide documents the test-first development workflow used across reasonBridge, following an outside-in approach from E2E tests through unit tests.

## Core Philosophy

**Write tests first, then write the minimum code to pass them.**

TDD is not about testing—it's about design. Tests written first force you to think about interfaces, dependencies, and expected behavior before implementation.

## The Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────────┐     ┌─────────┐     ┌──────────┐         │
│   │   RED   │────▶│  GREEN  │────▶│ REFACTOR │──┐      │
│   │  Write  │     │  Make   │     │  Clean   │  │      │
│   │ failing │     │   it    │     │   up     │  │      │
│   │  test   │     │  pass   │     │   code   │  │      │
│   └─────────┘     └─────────┘     └──────────┘  │      │
│        ▲                                        │      │
│        └────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum code necessary to make the test pass
3. **REFACTOR**: Improve the code while keeping tests green

## Outside-In Development: E2E → Integration → Unit

Start with high-level tests that describe user behavior, then work inward to implementation details.

### Level 1: E2E Tests (User Stories)

E2E tests describe complete user journeys. Write these first to define the feature's acceptance criteria.

**Example**: User login feature

```typescript
// frontend/e2e/login-flow.spec.ts

test.describe('User Login', () => {
  test('should allow user to log in with valid credentials', async ({ page }) => {
    // Arrange: Navigate to login page
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();

    // Act: Fill and submit login form
    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('SecurePassword123!');
    await page.getByRole('button', { name: /^log in$/i }).click();

    // Assert: User is logged in
    await expect(page.getByText('Welcome, Alice')).toBeVisible();
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();

    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword');
    await page.getByRole('button', { name: /^log in$/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});
```

### Level 2: Integration Tests (API Contracts)

Integration tests verify that services work together correctly. They test API endpoints with real or test databases.

```typescript
// services/user-service/src/__tests__/auth-flow.integration.test.ts

describe('Auth API Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaClient);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange: Create test user
      await prisma.user.create({
        data: {
          email: 'alice@example.com',
          passwordHash: await hash('SecurePassword123!'),
          name: 'Alice',
        },
      });

      // Act: Login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'SecurePassword123!',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid password', async () => {
      await prisma.user.create({
        data: {
          email: 'alice@example.com',
          passwordHash: await hash('SecurePassword123!'),
          name: 'Alice',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid credentials/i);
    });
  });
});
```

### Level 3: Unit Tests (Business Logic)

Unit tests verify individual functions and classes in isolation, using mocks for dependencies.

```typescript
// services/user-service/src/auth/auth.service.test.ts

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: MockType<UserRepository>;
  let mockJwtService: MockType<JwtService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = createMockUserRepository();
    mockJwtService = createMockJwtService();

    service = new AuthService(mockUserRepository, mockJwtService);
  });

  describe('validateCredentials', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      const user = createTestUser({
        email: 'alice@example.com',
        passwordHash: await hash('SecurePassword123!'),
      });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      // Act
      const result = await service.validateCredentials(
        'alice@example.com',
        'SecurePassword123!'
      );

      // Assert
      expect(result).toEqual(user);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('alice@example.com');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const user = createTestUser({
        email: 'alice@example.com',
        passwordHash: await hash('SecurePassword123!'),
      });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      await expect(
        service.validateCredentials('alice@example.com', 'WrongPassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateCredentials('unknown@example.com', 'AnyPassword')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

## Golden Tests for AI Services

AI-powered features use golden tests to ensure consistent outputs across refactoring.

```typescript
// services/ai-service/src/__golden__/tone-analyzer.golden.test.ts

describe('ToneAnalyzerService Golden Tests', () => {
  let service: ToneAnalyzerService;

  beforeEach(() => {
    service = new ToneAnalyzerService();
  });

  describe('Inflammatory Language Detection', () => {
    const GOLDEN_FIXTURES = [
      {
        id: 'PA-D-001',
        input: "You're stupid if you believe that.",
        expectedMatch: "You're stupid",
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-D-002',
        input: "Only an idiot would think this works.",
        expectedMatch: "Only an idiot",
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.80,
      },
    ];

    it.each(GOLDEN_FIXTURES)(
      'should detect: $id - $input',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyzeText(input);

        expect(result.inflammatoryLanguage).toContainEqual(
          expect.objectContaining({
            text: expectedMatch,
            subtype: expectedSubtype,
            confidence: expect.closeTo(expectedConfidence, 0.1),
          })
        );
      }
    );
  });
});
```

## Workflow Example: Adding a New Feature

### Step 1: Write E2E Test (RED)

```bash
# Create the E2E test file
touch frontend/e2e/topic-bookmark.spec.ts
```

```typescript
// frontend/e2e/topic-bookmark.spec.ts
test.describe('Topic Bookmarking', () => {
  test('should allow logged-in user to bookmark a topic', async ({ page }) => {
    // Login
    await loginAs(page, 'alice@example.com');

    // Navigate to topic
    await page.goto('/topics/climate-change');

    // Bookmark
    await page.getByRole('button', { name: /bookmark/i }).click();

    // Verify
    await expect(page.getByRole('button', { name: /bookmarked/i })).toBeVisible();
  });
});
```

Run and verify it fails:
```bash
pnpm test:e2e frontend/e2e/topic-bookmark.spec.ts
# Expected: FAIL (button doesn't exist yet)
```

### Step 2: Write Integration Test (RED)

```typescript
// services/discussion-service/src/__tests__/bookmarks.integration.test.ts
describe('Bookmarks API', () => {
  it('POST /topics/:id/bookmark should create bookmark', async () => {
    const topic = await createTestTopic();
    const user = await createTestUser();

    const response = await request(app.getHttpServer())
      .post(`/topics/${topic.id}/bookmark`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(201);
    expect(response.body.bookmarked).toBe(true);
  });
});
```

### Step 3: Write Unit Tests (RED)

```typescript
// services/discussion-service/src/bookmarks/bookmark.service.test.ts
describe('BookmarkService', () => {
  describe('createBookmark', () => {
    it('should create bookmark for user and topic', async () => {
      const result = await service.createBookmark('user-1', 'topic-1');

      expect(result.userId).toBe('user-1');
      expect(result.topicId).toBe('topic-1');
      expect(mockBookmarkRepository.create).toHaveBeenCalled();
    });

    it('should throw if bookmark already exists', async () => {
      mockBookmarkRepository.findByUserAndTopic.mockResolvedValue(existingBookmark);

      await expect(
        service.createBookmark('user-1', 'topic-1')
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

### Step 4: Implement (GREEN)

Now implement the minimum code to pass each level:

1. **BookmarkService** - Pass unit tests
2. **BookmarkController** - Pass integration tests
3. **Frontend button** - Pass E2E tests

### Step 5: Refactor

With all tests passing, clean up:

- Extract shared logic
- Improve error handling
- Add TypeScript types
- Remove duplication

## Running Tests

### Watch Mode (Development)

```bash
# Unit tests in watch mode
pnpm test:unit:watch

# Specific file
pnpm test:unit:watch services/user-service/src/auth/auth.service.test.ts
```

### Full Test Suite

```bash
# All unit tests
pnpm test:unit

# Integration tests (requires Docker services)
pnpm test:integration

# E2E tests (requires full environment)
pnpm test:e2e
```

### Coverage

```bash
# Generate coverage report
pnpm test:unit:coverage

# View HTML report
open coverage/index.html
```

## Test Isolation Guidelines

### Unit Tests

- Mock all external dependencies
- No database, network, or file system access
- Fast: < 10ms per test

### Integration Tests

- Use test database (reset between tests)
- Real service instances
- Mock external APIs (Cognito, etc.)

### E2E Tests

- Full application stack
- Test database with seed data
- Mock only external third-party services

## Common Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should calculate total with discount', () => {
  // Arrange
  const cart = createCart([
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ]);
  const discount = 0.1; // 10%

  // Act
  const total = calculateTotal(cart, discount);

  // Assert
  expect(total).toBe(225); // (200 + 50) * 0.9
});
```

### Test Factories

```typescript
// test/factories/user.factory.ts
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage
const admin = createTestUser({ role: 'admin' });
const moderator = createTestUser({ role: 'moderator', name: 'Mod' });
```

### Parameterized Tests

```typescript
describe('validateEmail', () => {
  const validEmails = [
    'user@example.com',
    'user.name@example.com',
    'user+tag@example.com',
  ];

  const invalidEmails = [
    'invalid',
    '@example.com',
    'user@',
    'user@.com',
  ];

  it.each(validEmails)('should accept valid email: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each(invalidEmails)('should reject invalid email: %s', (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});
```

## Best Practices

1. **One assertion per test** (when practical): Makes failures easy to diagnose
2. **Descriptive test names**: Should read like documentation
3. **Test behavior, not implementation**: Tests survive refactoring
4. **Keep tests fast**: Unit tests < 10ms, integration < 1s
5. **Avoid test interdependence**: Each test should run in isolation
6. **Use meaningful test data**: Not just "foo" and "bar"
7. **Clean up after tests**: Reset database, clear mocks
8. **Don't test framework code**: Focus on your business logic

## When to Skip TDD

TDD is not always practical:

- **Exploratory code**: Prototypes, spikes, proof-of-concepts
- **UI layout**: Visual design often needs iteration
- **Integration with external APIs**: Test the adapter, not the API

But always backfill tests before merging to main.
