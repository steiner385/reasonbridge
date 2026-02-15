/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service-Specific MSW Handlers
 *
 * This module exports domain-specific mock handlers for each microservice.
 * These handlers provide realistic mock responses for integration testing.
 *
 * @example
 * ```typescript
 * import { factCheckHandlers, userServiceHandlers } from '@reason-bridge/testing-utils/msw/handlers';
 * import { server } from '@reason-bridge/testing-utils/msw';
 *
 * // Use specific service handlers
 * beforeAll(() => {
 *   server.use(...factCheckHandlers, ...userServiceHandlers);
 * });
 * ```
 */

// Fact-Check Service (T299)
export {
  FACT_CHECK_BASE_URL,
  mockFactCheckSources,
  mockFactCheckResults,
  factCheckHandlers,
  addMockFactCheckResult,
  clearMockFactCheckCache,
} from './fact-check.js';

// User Service (T300)
export {
  USER_SERVICE_BASE_URL,
  mockAuthToken as userServiceMockAuthToken,
  mockRefreshToken,
  mockUsers,
  mockOnboardingProgress,
  userServiceHandlers,
  setMockAuthenticatedUser,
  addMockUser,
  resetUserServiceMocks,
  type MockUser,
} from './user-service.js';

// Discussion Service (T301)
export {
  DISCUSSION_SERVICE_BASE_URL,
  mockAuthor,
  mockTopics,
  mockResponses,
  mockPropositions,
  mockCommonGround,
  discussionServiceHandlers,
  addMockTopic,
  addMockResponse,
  resetDiscussionServiceMocks,
  type MockAuthor,
  type MockTopic,
  type MockResponse,
} from './discussion-service.js';

// Combined service handlers for convenience
import { factCheckHandlers } from './fact-check.js';
import { userServiceHandlers } from './user-service.js';
import { discussionServiceHandlers } from './discussion-service.js';
import type { RequestHandler } from 'msw';

/**
 * All service handlers combined
 *
 * Use this when you need to mock all microservices at once
 */
export const allServiceHandlers: RequestHandler[] = [
  ...factCheckHandlers,
  ...userServiceHandlers,
  ...discussionServiceHandlers,
];
