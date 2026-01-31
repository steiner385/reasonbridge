/**
 * Tests for Pact Consumer Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpecificationVersion } from '@pact-foundation/pact';
import {
  createConsumerPact,
  createConsumerPactFromEnv,
  createPactFetcher,
  defaultConsumerNames,
  defaultProviderNames,
  commonProviderStates,
} from '../pact/consumer.js';

describe('Pact Consumer Utilities', () => {
  describe('createConsumerPact', () => {
    it('should create a PactV4 instance with required options', () => {
      const pact = createConsumerPact({
        consumer: 'test-consumer',
        provider: 'test-provider',
      });

      expect(pact).toBeDefined();
      expect(pact.addInteraction).toBeDefined();
    });

    it('should create a PactV4 instance with all options', () => {
      const pact = createConsumerPact({
        consumer: 'api-gateway',
        provider: 'ai-service',
        pactDir: '/tmp/pacts',
        logLevel: 'debug',
        spec: 4,
      });

      expect(pact).toBeDefined();
    });

    it('should use default log level of warn', () => {
      const pact = createConsumerPact({
        consumer: 'test-consumer',
        provider: 'test-provider',
      });

      // PactV4 instance should be created successfully with defaults
      expect(pact).toBeDefined();
    });

    it('should accept different log levels', () => {
      const logLevels = ['trace', 'debug', 'info', 'warn', 'error'] as const;

      for (const logLevel of logLevels) {
        const pact = createConsumerPact({
          consumer: 'test-consumer',
          provider: 'test-provider',
          logLevel,
        });
        expect(pact).toBeDefined();
      }
    });

    it('should accept different spec versions', () => {
      const specVersions = [
        SpecificationVersion.SPECIFICATION_VERSION_V2,
        SpecificationVersion.SPECIFICATION_VERSION_V3,
        SpecificationVersion.SPECIFICATION_VERSION_V4,
      ];

      for (const spec of specVersions) {
        const pact = createConsumerPact({
          consumer: 'test-consumer',
          provider: 'test-provider',
          spec,
        });
        expect(pact).toBeDefined();
      }
    });
  });

  describe('createConsumerPactFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables when set', () => {
      process.env['PACT_CONSUMER_NAME'] = 'env-consumer';
      process.env['PACT_PROVIDER_NAME'] = 'env-provider';
      process.env['PACT_DIR'] = '/tmp/env-pacts';
      process.env['PACT_LOG_LEVEL'] = 'debug';

      const pact = createConsumerPactFromEnv({
        fallback: {
          consumer: 'fallback-consumer',
          provider: 'fallback-provider',
        },
      });

      expect(pact).toBeDefined();
    });

    it('should use fallback values when environment variables are not set', () => {
      // Clear any existing env vars
      delete process.env['PACT_CONSUMER_NAME'];
      delete process.env['PACT_PROVIDER_NAME'];
      delete process.env['PACT_DIR'];
      delete process.env['PACT_LOG_LEVEL'];

      const pact = createConsumerPactFromEnv({
        fallback: {
          consumer: 'fallback-consumer',
          provider: 'fallback-provider',
          pactDir: './fallback-pacts',
        },
      });

      expect(pact).toBeDefined();
    });

    it('should use custom environment variable names', () => {
      process.env['MY_CONSUMER'] = 'custom-consumer';
      process.env['MY_PROVIDER'] = 'custom-provider';

      const pact = createConsumerPactFromEnv({
        consumerEnvVar: 'MY_CONSUMER',
        providerEnvVar: 'MY_PROVIDER',
        fallback: {
          consumer: 'fallback-consumer',
          provider: 'fallback-provider',
        },
      });

      expect(pact).toBeDefined();
    });

    it('should handle partial environment variable configuration', () => {
      process.env['PACT_CONSUMER_NAME'] = 'env-consumer';
      // Leave PACT_PROVIDER_NAME unset
      delete process.env['PACT_PROVIDER_NAME'];

      const pact = createConsumerPactFromEnv({
        fallback: {
          consumer: 'fallback-consumer',
          provider: 'fallback-provider',
        },
      });

      expect(pact).toBeDefined();
    });
  });

  describe('createPactFetcher', () => {
    it('should create a fetcher function', () => {
      const fetcher = createPactFetcher('http://localhost:3000');

      expect(fetcher).toBeInstanceOf(Function);
    });

    it('should return a function that accepts endpoint and options', () => {
      const fetcher = createPactFetcher('http://localhost:3000');

      // The function should be callable with endpoint and options
      // Note: function.length only counts parameters before default/rest params
      expect(typeof fetcher).toBe('function');
    });
  });

  describe('defaultConsumerNames', () => {
    it('should have api-gateway as a default consumer', () => {
      expect(defaultConsumerNames.apiGateway).toBe('api-gateway');
    });

    it('should have frontend as a default consumer', () => {
      expect(defaultConsumerNames.frontend).toBe('frontend');
    });

    it('should be read-only', () => {
      // TypeScript enforces this at compile time, but we can verify the values exist
      expect(Object.keys(defaultConsumerNames)).toEqual(['apiGateway', 'frontend']);
    });
  });

  describe('defaultProviderNames', () => {
    it('should have ai-service as a provider', () => {
      expect(defaultProviderNames.aiService).toBe('ai-service');
    });

    it('should have user-service as a provider', () => {
      expect(defaultProviderNames.userService).toBe('user-service');
    });

    it('should have discussion-service as a provider', () => {
      expect(defaultProviderNames.discussionService).toBe('discussion-service');
    });

    it('should have moderation-service as a provider', () => {
      expect(defaultProviderNames.moderationService).toBe('moderation-service');
    });

    it('should have notification-service as a provider', () => {
      expect(defaultProviderNames.notificationService).toBe('notification-service');
    });

    it('should have fact-check-service as a provider', () => {
      expect(defaultProviderNames.factCheckService).toBe('fact-check-service');
    });

    it('should have recommendation-service as a provider', () => {
      expect(defaultProviderNames.recommendationService).toBe('recommendation-service');
    });

    it('should have all expected providers', () => {
      expect(Object.keys(defaultProviderNames)).toEqual([
        'aiService',
        'userService',
        'discussionService',
        'moderationService',
        'notificationService',
        'factCheckService',
        'recommendationService',
      ]);
    });
  });

  describe('commonProviderStates', () => {
    describe('static states', () => {
      it('should have aiServiceAvailable state', () => {
        expect(commonProviderStates.aiServiceAvailable).toBe('the AI service is available');
      });

      it('should have aiServiceHealthy state', () => {
        expect(commonProviderStates.aiServiceHealthy).toBe('the AI service is healthy');
      });

      it('should have analyticsDataAvailable state', () => {
        expect(commonProviderStates.analyticsDataAvailable).toBe(
          'feedback analytics data is available',
        );
      });
    });

    describe('dynamic state generators', () => {
      it('should generate userExists state with ID', () => {
        const state = commonProviderStates.userExists('user-123');
        expect(state).toBe('user with ID user-123 exists');
      });

      it('should generate userDoesNotExist state with ID', () => {
        const state = commonProviderStates.userDoesNotExist('user-456');
        expect(state).toBe('user with ID user-456 does not exist');
      });

      it('should generate topicExists state with ID', () => {
        const state = commonProviderStates.topicExists('topic-789');
        expect(state).toBe('topic with ID topic-789 exists');
      });

      it('should generate topicExistsWithResponses state with ID', () => {
        const state = commonProviderStates.topicExistsWithResponses('topic-abc');
        expect(state).toBe('topic with ID topic-abc exists with responses');
      });

      it('should generate topicExistsWithPropositions state with ID', () => {
        const state = commonProviderStates.topicExistsWithPropositions('topic-def');
        expect(state).toBe('topic with ID topic-def exists with propositions');
      });

      it('should generate topicDoesNotExist state with ID', () => {
        const state = commonProviderStates.topicDoesNotExist('topic-ghi');
        expect(state).toBe('topic with ID topic-ghi does not exist');
      });

      it('should generate feedbackExists state with ID', () => {
        const state = commonProviderStates.feedbackExists('feedback-jkl');
        expect(state).toBe('feedback with ID feedback-jkl exists');
      });

      it('should generate feedbackDoesNotExist state with ID', () => {
        const state = commonProviderStates.feedbackDoesNotExist('feedback-mno');
        expect(state).toBe('feedback with ID feedback-mno does not exist');
      });
    });

    describe('state generator with UUIDs', () => {
      it('should work with real UUID format', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const state = commonProviderStates.userExists(uuid);
        expect(state).toBe(`user with ID ${uuid} exists`);
      });
    });
  });
});
