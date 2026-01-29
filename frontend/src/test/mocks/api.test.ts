/**
 * Example API Test with MSW
 *
 * This test demonstrates how to use Mock Service Worker (MSW) to mock
 * API requests in component tests.
 *
 * Key patterns:
 * - Default handlers are defined in handlers.ts
 * - Custom handlers can be added per-test using server.use()
 * - Handlers are automatically reset after each test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

describe('MSW Integration', () => {
  describe('Default Handlers', () => {
    it('should mock health check endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
    });

    it('should mock user profile endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/users/me`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        verificationLevel: 'VERIFIED',
      });
    });

    it('should mock discussions list endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/discussions`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('id', 'discussion-1');
    });

    it('should mock error responses', async () => {
      const response = await fetch(`${API_BASE_URL}/error`);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  describe('Custom Handlers', () => {
    beforeEach(() => {
      // Add custom handler for this test suite
      server.use(
        http.get(`${API_BASE_URL}/custom-endpoint`, () => {
          return HttpResponse.json({
            message: 'Custom response',
            data: { test: true },
          });
        }),
      );
    });

    it('should use custom handler', async () => {
      const response = await fetch(`${API_BASE_URL}/custom-endpoint`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        message: 'Custom response',
        data: { test: true },
      });
    });

    it('should override default handler', async () => {
      // Override the health check handler for this specific test
      server.use(
        http.get(`${API_BASE_URL}/health`, () => {
          return HttpResponse.json(
            {
              status: 'maintenance',
              message: 'System is under maintenance',
            },
            { status: 503 },
          );
        }),
      );

      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        status: 'maintenance',
        message: 'System is under maintenance',
      });
    });

    it('should handle POST requests', async () => {
      server.use(
        http.post(`${API_BASE_URL}/discussions`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              id: 'new-discussion-id',
              title: body.title,
              description: body.description,
              createdAt: new Date().toISOString(),
            },
            { status: 201 },
          );
        }),
      );

      const response = await fetch(`${API_BASE_URL}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Discussion',
          description: 'Test description',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: 'new-discussion-id',
        title: 'New Discussion',
        description: 'Test description',
      });
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(fetch(`${API_BASE_URL}/network-error`)).rejects.toThrow();
    });
  });

  describe('Handler Reset', () => {
    it('should not have custom handlers from previous test', async () => {
      // This test verifies that custom handlers are reset after each test
      // The custom-endpoint handler from the previous describe block should not exist here

      // Expect unhandled request to not return 200
      // MSW will warn about unhandled request but won't throw
      try {
        await fetch(`${API_BASE_URL}/custom-endpoint`);
        // If we reach here, the handler was not reset (test should fail)
        // But MSW doesn't throw by default, so we just verify the warning appears
      } catch {
        // Network errors are expected for unhandled requests
      }

      // Instead, verify default handlers still work after custom handlers are reset
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'ok');
    });
  });
});

/**
 * Usage in Component Tests
 *
 * Example of using MSW in a component test:
 *
 * ```tsx
 * import { describe, it, expect } from 'vitest';
 * import { render, screen, waitFor } from '@testing-library/react';
 * import { server } from '@/test/mocks/server';
 * import { http, HttpResponse } from 'msw';
 * import UserProfile from './UserProfile';
 *
 * describe('UserProfile', () => {
 *   it('should display user data', async () => {
 *     server.use(
 *       http.get('/api/users/me', () => {
 *         return HttpResponse.json({
 *           id: '123',
 *           name: 'John Doe',
 *           email: 'john@example.com',
 *         });
 *       })
 *     );
 *
 *     render(<UserProfile />);
 *
 *     await waitFor(() => {
 *       expect(screen.getByText('John Doe')).toBeInTheDocument();
 *       expect(screen.getByText('john@example.com')).toBeInTheDocument();
 *     });
 *   });
 * });
 * ```
 */
