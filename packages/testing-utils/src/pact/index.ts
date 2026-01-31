/**
 * Pact Contract Testing Utilities
 *
 * This module provides utilities for consumer-driven contract testing
 * using Pact. It includes:
 *
 * - **Consumer Testing**: Create consumer contracts that define API expectations
 * - **Provider Verification**: Verify that a provider meets consumer contracts
 * - **Pact Publishing**: Publish consumer pacts to a Pact Broker
 * - **Environment Configuration**: Create configurations from environment variables
 *
 * @example Consumer contract test
 * ```ts
 * import { createConsumerPact } from '@reason-bridge/testing-utils/pact';
 *
 * const pact = createConsumerPact({
 *   consumer: 'api-gateway',
 *   provider: 'ai-service',
 * });
 *
 * await pact
 *   .addInteraction()
 *   .given('the AI service is available')
 *   .uponReceiving('a request for feedback')
 *   .withRequest('POST', '/feedback/request')
 *   .willRespondWith(201, (builder) => {
 *     builder.jsonBody({ id: 'uuid', type: 'BIAS' });
 *   })
 *   .executeTest(async (mockServer) => {
 *     const response = await fetch(`${mockServer.url}/feedback/request`);
 *     expect(response.status).toBe(201);
 *   });
 * ```
 *
 * @example Provider verification
 * ```ts
 * import { createProviderVerifier } from '@reason-bridge/testing-utils/pact';
 *
 * const verifier = createProviderVerifier({
 *   provider: 'user-service',
 *   providerBaseUrl: 'http://localhost:3000',
 *   pactUrls: ['./pacts/consumer-user-service.json'],
 *   stateHandlers: {
 *     'user exists': async () => {
 *       await seedUser({ id: 'test-user' });
 *     },
 *   },
 * });
 *
 * const result = await verifier.verifyProvider();
 * expect(result.success).toBe(true);
 * ```
 *
 * @example Publishing pacts
 * ```ts
 * import { createPactPublisher } from '@reason-bridge/testing-utils/pact';
 *
 * const publisher = createPactPublisher({
 *   pactBrokerUrl: process.env.PACT_BROKER_URL,
 *   pactBrokerToken: process.env.PACT_BROKER_TOKEN,
 *   consumerVersion: process.env.GIT_COMMIT,
 *   pactFilesOrDirs: ['./pacts'],
 * });
 *
 * await publisher.publishPacts();
 * ```
 *
 * @see https://docs.pact.io/ - Pact documentation
 */

// Provider verification
export {
  createProviderVerifier,
  createProviderVerifierFromEnv,
  defaultConsumerVersionSelectors,
  type ProviderVerifierOptions,
  type StateHandler,
  type StateHandlers,
  type ConsumerVersionSelector,
  type VerificationResult,
} from './provider.js';

// Pact publishing
export {
  generatePublishCommand,
  createPactPublisherFromEnv,
  recordDeployment,
  generateDeploymentCommand,
  type PactPublisherOptions,
  type PublishResult,
  type DeploymentRecordOptions,
} from './publisher.js';

// Consumer testing
export {
  createConsumerPact,
  createConsumerPactFromEnv,
  createPactFetcher,
  defaultConsumerNames,
  defaultProviderNames,
  commonProviderStates,
  type ConsumerPactOptions,
  type ConsumerPactEnvOptions,
} from './consumer.js';

// Re-export commonly used types from @pact-foundation/pact
export type { LogLevel, VerifierOptions } from '@pact-foundation/pact';
export { PactV4, MatchersV3, SpecificationVersion } from '@pact-foundation/pact';
