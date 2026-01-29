# Frontend Testing Guide

This document explains how to write and run tests for the frontend application.

## Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) v2.1.9
- **Component Testing**: [React Testing Library](https://testing-library.com/react) v16.3.2
- **DOM Simulation**: [jsdom](https://github.com/jsdom/jsdom) v27.4.0
- **API Mocking**: [Mock Service Worker (MSW)](https://mswjs.io/) v2.12.7
- **Coverage**: [@vitest/coverage-v8](https://vitest.dev/guide/coverage) v2.1.9

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (auto-rerun on changes)
pnpm test:watch

# Run a specific test file
pnpm test:watch path/to/test.spec.tsx

# Run tests with coverage
pnpm test --coverage

# Run E2E tests with Playwright
pnpm test:e2e
```

## Test Structure

Tests should be colocated with components in `__tests__` directories or as `.test.tsx` / `.spec.tsx` files:

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   └── Modal/
│       ├── Modal.tsx
│       └── Modal.spec.tsx
└── hooks/
    ├── useAuth.ts
    └── useAuth.test.ts
```

## Writing Component Tests

### Basic Example

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing with TanStack Query

For components that use TanStack Query:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import UserProfile from '../UserProfile';

describe('UserProfile', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // Disable retries for tests
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should display user data from API', async () => {
    server.use(
      http.get('/api/users/me', () => {
        return HttpResponse.json({
          id: '123',
          displayName: 'John Doe',
          email: 'john@example.com',
        });
      }),
    );

    render(<UserProfile />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display error message on API failure', async () => {
    server.use(
      http.get('/api/users/me', () => {
        return HttpResponse.error();
      }),
    );

    render(<UserProfile />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## API Mocking with MSW

Mock Service Worker (MSW) intercepts network requests and returns mock responses. This allows testing components that make API calls without hitting real endpoints.

### Default Handlers

Common API endpoints are mocked by default in `src/test/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.get('/api/users/me', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      displayName: 'Test User',
    });
  }),
];
```

### Custom Handlers in Tests

Override or add custom handlers in specific tests:

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('custom API response', async () => {
  // Add custom handler for this test
  server.use(
    http.get('/api/custom', () => {
      return HttpResponse.json({ custom: 'data' });
    }),
  );

  // Test code...
});

test('API error response', async () => {
  // Override default handler
  server.use(
    http.get('/api/users/me', () => {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }),
  );

  // Test code...
});
```

### POST/PUT/DELETE Requests

```typescript
test('create discussion', async () => {
  server.use(
    http.post('/api/discussions', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json(
        {
          id: 'new-id',
          title: body.title,
        },
        { status: 201 },
      );
    }),
  );

  // Test code...
});
```

### Network Errors

```typescript
test('handles network error', async () => {
  server.use(
    http.get('/api/users/me', () => {
      return HttpResponse.error();
    }),
  );

  // Test code...
});
```

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

❌ **Bad**: Testing internal state

```tsx
test('increments counter', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.count).toBe(0);
  result.current.increment();
  expect(result.current.count).toBe(1);
});
```

✅ **Good**: Testing what the user sees

```tsx
test('shows incremented count', async () => {
  render(<Counter />);
  expect(screen.getByText('0')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /increment/i }));

  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### 2. Use Accessible Queries

Prefer queries that reflect how users interact with your app:

```tsx
// ✅ Good - accessible queries
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');
screen.getByText('Welcome back');
screen.getByPlaceholderText('Enter your name');

// ❌ Bad - implementation details
screen.getByClassName('btn-primary');
screen.getByTestId('submit-button');
```

### 3. Use `data-testid` Sparingly

Only use `data-testid` when no other query works:

```tsx
// Last resort when no accessible query is available
<div data-testid="complex-visualization">...</div>
```

### 4. Clean Up After Tests

Handlers are automatically reset after each test via `setupTests.ts`. But for other resources:

```tsx
afterEach(() => {
  // Clean up subscriptions, timers, etc.
  cleanup();
});
```

### 5. Async Testing

Always use `waitFor` for async operations:

```tsx
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Or use findBy queries (built-in waitFor)
expect(await screen.findByText('Loaded')).toBeInTheDocument();
```

## Configuration

### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // No need to import describe, it, expect
    environment: 'jsdom', // DOM simulation
    setupFiles: ['./src/setupTests.ts'], // MSW setup
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    },
  },
});
```

### setupTests.ts

```typescript
import '@testing-library/jest-dom';
import { server } from './test/mocks/server';

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

## Coverage Reports

Coverage reports are generated in `../coverage/frontend/`:

```bash
# Generate coverage report
pnpm test --coverage

# View HTML report
open ../coverage/frontend/index.html
```

## Debugging Tests

### Using Vitest UI

```bash
pnpm add -D @vitest/ui
pnpm test:watch --ui
```

### Console Logs

```tsx
import { screen } from '@testing-library/react';

// Print DOM tree
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

### VS Code Debugging

Add breakpoints in test files and use VS Code's Jest extension or run tests with:

```bash
node --inspect-brk node_modules/.bin/vitest
```

## Common Issues

### "Unable to find an element..."

- Ensure component is fully rendered: use `await waitFor()`
- Check if element is hidden: use `*ByRole` with `{ hidden: true }`
- Print DOM: `screen.debug()`

### "Network request was not handled"

- Add handler to `src/test/mocks/handlers.ts`
- Or add custom handler in your test using `server.use()`

### "Cannot read property of undefined"

- Component might not be receiving required props
- API might not be mocked properly - check MSW handlers

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
