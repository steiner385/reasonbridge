/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW (Mock Service Worker) exports for API mocking in tests
 *
 * @example
 * ```typescript
 * import { server, addHandlers, resetHandlers } from '@reason-bridge/testing-utils/msw';
 * import { http, HttpResponse } from 'msw';
 *
 * // In test setup
 * beforeAll(() => server.listen());
 * afterEach(() => resetHandlers());
 * afterAll(() => server.close());
 *
 * // Add test-specific handler
 * test('custom mock', () => {
 *   addHandlers(
 *     http.get('/api/custom', () => HttpResponse.json({ custom: 'data' }))
 *   );
 *   // ... test code
 * });
 * ```
 */

// Re-export MSW types and utilities for convenience
export { http, HttpResponse, type RequestHandler } from 'msw';

// Server setup and utilities
export {
  server,
  mswServer,
  createServer,
  addHandlers,
  resetHandlers,
  startServer,
  stopServer,
  startServerWithOptions,
  type ServerListenOptions,
} from './server.js';

// Default handlers and mock data
export {
  API_BASE_URL,
  mockUser,
  mockAuthToken,
  authHandlers,
  userHandlers,
  discussionHandlers,
  healthHandlers,
  defaultHandlers,
  createHandlersWithBaseUrl,
} from './handlers.js';
