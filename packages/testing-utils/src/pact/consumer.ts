/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Testing Utilities
 *
 * Provides utilities for creating and configuring Pact consumer tests.
 * Consumer tests define the expectations that a consumer (client) has
 * of a provider (server) API.
 *
 * @example Basic consumer test setup
 * ```ts
 * import { createConsumerPact, ConsumerPactOptions } from '@reason-bridge/testing-utils/pact';
 *
 * const pact = createConsumerPact({
 *   consumer: 'api-gateway',
 *   provider: 'ai-service',
 * });
 *
 * await pact
 *   .addInteraction()
 *   .given('user exists')
 *   .uponReceiving('a request for user data')
 *   .withRequest('GET', '/users/123')
 *   .willRespondWith(200, (builder) => {
 *     builder.jsonBody({ id: '123', name: 'Test User' });
 *   })
 *   .executeTest(async (mockServer) => {
 *     const response = await fetch(`${mockServer.url}/users/123`);
 *     expect(response.status).toBe(200);
 *   });
 * ```
 */

import { PactV4, SpecificationVersion } from '@pact-foundation/pact';
import path from 'node:path';

/**
 * Options for creating a consumer Pact instance
 */
export interface ConsumerPactOptions {
  /**
   * Name of the consumer service (the service making API calls)
   */
  consumer: string;

  /**
   * Name of the provider service (the service being called)
   */
  provider: string;

  /**
   * Directory to write pact files to
   * @default './pacts' relative to the test file
   */
  pactDir?: string;

  /**
   * Log level for Pact
   * @default 'warn'
   */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  /**
   * Pact specification version
   * @default SpecificationVersion.SPECIFICATION_VERSION_V4
   */
  spec?: SpecificationVersion;
}

/**
 * Environment-based consumer Pact options
 */
export interface ConsumerPactEnvOptions {
  /**
   * Environment variable for consumer name
   * @default 'PACT_CONSUMER_NAME'
   */
  consumerEnvVar?: string;

  /**
   * Environment variable for provider name
   * @default 'PACT_PROVIDER_NAME'
   */
  providerEnvVar?: string;

  /**
   * Environment variable for pact directory
   * @default 'PACT_DIR'
   */
  pactDirEnvVar?: string;

  /**
   * Environment variable for log level
   * @default 'PACT_LOG_LEVEL'
   */
  logLevelEnvVar?: string;

  /**
   * Fallback options if environment variables are not set
   */
  fallback: {
    consumer: string;
    provider: string;
    pactDir?: string;
  };
}

/**
 * Creates a Pact V4 instance for consumer testing
 *
 * @param options - Configuration options for the consumer pact
 * @returns A configured PactV4 instance ready for adding interactions
 *
 * @example
 * ```ts
 * const pact = createConsumerPact({
 *   consumer: 'api-gateway',
 *   provider: 'user-service',
 *   pactDir: './pacts',
 * });
 * ```
 */
export function createConsumerPact(options: ConsumerPactOptions): PactV4 {
  return new PactV4({
    consumer: options.consumer,
    provider: options.provider,
    dir: options.pactDir ?? path.resolve(process.cwd(), 'pacts'),
    logLevel: options.logLevel ?? 'warn',
    spec: options.spec ?? SpecificationVersion.SPECIFICATION_VERSION_V4,
  });
}

/**
 * Creates a Pact V4 instance from environment variables
 *
 * @param options - Environment variable configuration
 * @returns A configured PactV4 instance
 *
 * @example
 * ```ts
 * // Uses PACT_CONSUMER_NAME, PACT_PROVIDER_NAME, etc.
 * const pact = createConsumerPactFromEnv({
 *   fallback: {
 *     consumer: 'api-gateway',
 *     provider: 'user-service',
 *   },
 * });
 * ```
 */
export function createConsumerPactFromEnv(options: ConsumerPactEnvOptions): PactV4 {
  const env = process.env;

  const consumerEnvVar = options.consumerEnvVar ?? 'PACT_CONSUMER_NAME';
  const providerEnvVar = options.providerEnvVar ?? 'PACT_PROVIDER_NAME';
  const pactDirEnvVar = options.pactDirEnvVar ?? 'PACT_DIR';
  const logLevelEnvVar = options.logLevelEnvVar ?? 'PACT_LOG_LEVEL';

  const consumer = env[consumerEnvVar] ?? options.fallback.consumer;
  const provider = env[providerEnvVar] ?? options.fallback.provider;
  const pactDir = env[pactDirEnvVar] ?? options.fallback.pactDir ?? './pacts';
  const logLevel = (env[logLevelEnvVar] as ConsumerPactOptions['logLevel']) ?? 'warn';

  return createConsumerPact({
    consumer,
    provider,
    pactDir,
    logLevel,
  });
}

/**
 * Default consumer names for ReasonBridge services
 */
export const defaultConsumerNames = {
  apiGateway: 'api-gateway',
  frontend: 'frontend',
} as const;

/**
 * Default provider names for ReasonBridge services
 */
export const defaultProviderNames = {
  aiService: 'ai-service',
  userService: 'user-service',
  discussionService: 'discussion-service',
  moderationService: 'moderation-service',
  notificationService: 'notification-service',
  factCheckService: 'fact-check-service',
  recommendationService: 'recommendation-service',
} as const;

/**
 * Helper to create a standard fetch function for Pact tests
 *
 * @param baseUrl - The mock server base URL
 * @returns A function that makes requests to the mock server
 *
 * @example
 * ```ts
 * await pact.executeTest(async (mockServer) => {
 *   const api = createPactFetcher(mockServer.url);
 *   const response = await api('/users/123');
 *   expect(response.status).toBe(200);
 * });
 * ```
 */
export function createPactFetcher(baseUrl: string) {
  return async function pactFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${baseUrl}${endpoint}`;
    return fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  };
}

/**
 * Common Pact interaction states for ReasonBridge services
 */
export const commonProviderStates = {
  // AI Service states
  aiServiceAvailable: 'the AI service is available',
  aiServiceHealthy: 'the AI service is healthy',

  // User-related states
  userExists: (userId: string) => `user with ID ${userId} exists`,
  userDoesNotExist: (userId: string) => `user with ID ${userId} does not exist`,

  // Topic-related states
  topicExists: (topicId: string) => `topic with ID ${topicId} exists`,
  topicExistsWithResponses: (topicId: string) => `topic with ID ${topicId} exists with responses`,
  topicExistsWithPropositions: (topicId: string) =>
    `topic with ID ${topicId} exists with propositions`,
  topicDoesNotExist: (topicId: string) => `topic with ID ${topicId} does not exist`,

  // Feedback-related states
  feedbackExists: (feedbackId: string) => `feedback with ID ${feedbackId} exists`,
  feedbackDoesNotExist: (feedbackId: string) => `feedback with ID ${feedbackId} does not exist`,

  // Analytics states
  analyticsDataAvailable: 'feedback analytics data is available',
} as const;
