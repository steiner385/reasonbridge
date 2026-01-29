/**
 * MSW Server Setup for Tests
 *
 * This file configures the Mock Service Worker server for use in Vitest tests.
 * The server intercepts network requests and returns mock responses defined in handlers.
 *
 * @see https://mswjs.io/docs/integrations/node
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Create MSW server instance with default handlers
 *
 * This server will be started before all tests and stopped after all tests
 * in the setupTests.ts file.
 */
export const server = setupServer(...handlers);

/**
 * Export for convenience in tests
 *
 * Usage:
 * ```ts
 * import { server } from '@/test/mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * beforeEach(() => {
 *   // Add custom handlers for specific tests
 *   server.use(
 *     http.get('/api/custom', () => {
 *       return HttpResponse.json({ data: 'test' });
 *     })
 *   );
 * });
 *
 * afterEach(() => {
 *   // Reset handlers to defaults after each test
 *   server.resetHandlers();
 * });
 * ```
 */
