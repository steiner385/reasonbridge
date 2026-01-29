/**
 * MSW Request Handlers for API Mocking
 *
 * This file contains Mock Service Worker (MSW) handlers for intercepting
 * and mocking API requests during tests.
 *
 * @see https://mswjs.io/docs/
 */

import { http, HttpResponse } from 'msw';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Default request handlers for common API endpoints
 *
 * Add handlers here for API endpoints that need to be mocked across
 * multiple test files.
 */
export const handlers = [
  // Example: Mock health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),

  // Example: Mock user profile endpoint
  http.get(`${API_BASE_URL}/users/me`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      verificationLevel: 'VERIFIED',
    });
  }),

  // Example: Mock discussions list endpoint
  http.get(`${API_BASE_URL}/discussions`, () => {
    return HttpResponse.json([
      {
        id: 'discussion-1',
        title: 'Test Discussion',
        description: 'This is a test discussion',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  // Example: Mock error response
  http.get(`${API_BASE_URL}/error`, () => {
    return HttpResponse.json(
      {
        message: 'Internal Server Error',
        statusCode: 500,
      },
      { status: 500 },
    );
  }),
];

/**
 * Export handlers for use in tests
 *
 * Usage in test files:
 * ```ts
 * import { server } from '@/test/mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * test('custom handler', () => {
 *   server.use(
 *     http.get('/api/custom', () => {
 *       return HttpResponse.json({ custom: 'data' });
 *     })
 *   );
 * });
 * ```
 */
