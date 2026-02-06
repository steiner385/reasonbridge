/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Server Configuration for Node.js Test Environment
 *
 * This module provides the MSW server setup for API mocking in tests.
 */
import { setupServer, type SetupServerApi } from 'msw/node';
import { type RequestHandler } from 'msw';
import { defaultHandlers } from './handlers.js';

/**
 * MSW server instance for Node.js tests
 * Initialized with default handlers
 */
export const server: SetupServerApi = setupServer(...defaultHandlers);

/**
 * Create a new MSW server with custom handlers
 */
export function createServer(handlers: RequestHandler[] = defaultHandlers): SetupServerApi {
  return setupServer(...handlers);
}

/**
 * Add request handlers to the server at runtime
 * Useful for test-specific mocks
 */
export function addHandlers(...handlers: RequestHandler[]): void {
  server.use(...handlers);
}

/**
 * Reset all handlers to their initial state
 * Call this in afterEach() to clean up test-specific handlers
 */
export function resetHandlers(): void {
  server.resetHandlers();
}

/**
 * Start the MSW server
 * Call this in beforeAll()
 */
export function startServer(): void {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests in tests
  });
}

/**
 * Stop the MSW server
 * Call this in afterAll()
 */
export function stopServer(): void {
  server.close();
}

/**
 * Configure server listening options
 */
export interface ServerListenOptions {
  /**
   * How to handle unhandled requests
   * - 'bypass': Let them through (default for development)
   * - 'warn': Log a warning
   * - 'error': Throw an error (strictest)
   */
  onUnhandledRequest?: 'bypass' | 'warn' | 'error';
}

/**
 * Start the server with custom options
 */
export function startServerWithOptions(options: ServerListenOptions = {}): void {
  server.listen({
    onUnhandledRequest: options.onUnhandledRequest ?? 'warn',
  });
}

export { server as mswServer };
