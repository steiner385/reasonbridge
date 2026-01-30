/**
 * Tests for Pact provider configuration utilities.
 *
 * Note: These tests verify the module structure, exports, and configuration logic.
 * They don't run actual Pact verification (which requires a running provider).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProviderVerifier,
  createProviderVerifierFromEnv,
  defaultConsumerVersionSelectors,
  type ProviderVerifierOptions,
} from '../pact/provider.js';

// Mock @pact-foundation/pact
vi.mock('@pact-foundation/pact', () => ({
  Verifier: vi.fn().mockImplementation(() => ({
    verifyProvider: vi.fn().mockResolvedValue('Verification successful'),
  })),
}));

describe('Pact Provider Configuration', () => {
  describe('createProviderVerifier', () => {
    const baseOptions: ProviderVerifierOptions = {
      provider: 'test-provider',
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['./pacts/consumer-test-provider.json'],
    };

    it('should create a verifier with basic options', () => {
      const verifier = createProviderVerifier(baseOptions);

      expect(verifier).toHaveProperty('verifyProvider');
      expect(verifier).toHaveProperty('getVerifierOptions');
      expect(typeof verifier.verifyProvider).toBe('function');
      expect(typeof verifier.getVerifierOptions).toBe('function');
    });

    it('should return correct verifier options', () => {
      const verifier = createProviderVerifier(baseOptions);
      const options = verifier.getVerifierOptions();

      expect(options.provider).toBe('test-provider');
      expect(options.providerBaseUrl).toBe('http://localhost:3000');
      expect(options.pactUrls).toEqual(['./pacts/consumer-test-provider.json']);
      expect(options.logLevel).toBe('info');
      expect(options.timeout).toBe(30000);
    });

    it('should throw error when no pact source provided', () => {
      expect(() =>
        createProviderVerifier({
          provider: 'test-provider',
          providerBaseUrl: 'http://localhost:3000',
        }),
      ).toThrow('Either pactUrls or pactBrokerUrl must be provided');
    });

    it('should throw error when publishing without version', () => {
      expect(() =>
        createProviderVerifier({
          ...baseOptions,
          publishVerificationResult: true,
        }),
      ).toThrow('providerVersion is required when publishVerificationResult is true');
    });

    it('should accept broker configuration', () => {
      const verifier = createProviderVerifier({
        provider: 'test-provider',
        providerBaseUrl: 'http://localhost:3000',
        pactBrokerUrl: 'https://pact-broker.example.com',
        pactBrokerToken: 'test-token',
        consumerVersionSelectors: [{ mainBranch: true }],
        enablePending: true,
      });

      const options = verifier.getVerifierOptions();

      expect(options.pactBrokerUrl).toBe('https://pact-broker.example.com');
      expect(options.pactBrokerToken).toBe('test-token');
      expect(options.enablePending).toBe(true);
      expect(options.consumerVersionSelectors).toEqual([{ mainBranch: true }]);
    });

    it('should accept state handlers', () => {
      const stateHandlers = {
        'user exists': vi.fn(),
        'no users exist': vi.fn(),
      };

      const verifier = createProviderVerifier({
        ...baseOptions,
        stateHandlers,
      });

      const options = verifier.getVerifierOptions();
      expect(options.stateHandlers).toBe(stateHandlers);
    });

    it('should accept custom provider headers', () => {
      const verifier = createProviderVerifier({
        ...baseOptions,
        customProviderHeaders: {
          Authorization: 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
        },
      });

      const options = verifier.getVerifierOptions();
      expect(options.customProviderHeaders).toEqual([
        'Authorization: Bearer test-token',
        'X-Custom-Header: custom-value',
      ]);
    });

    it('should configure publishing options', () => {
      const verifier = createProviderVerifier({
        ...baseOptions,
        publishVerificationResult: true,
        providerVersion: '1.0.0',
        providerVersionBranch: 'main',
      });

      const options = verifier.getVerifierOptions();
      expect(options.publishVerificationResult).toBe(true);
      expect(options.providerVersion).toBe('1.0.0');
      expect(options.providerVersionBranch).toBe('main');
    });

    it('should verify provider successfully', async () => {
      const verifier = createProviderVerifier(baseOptions);
      const result = await verifier.verifyProvider();

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should handle verification failure', async () => {
      // Override the mock to simulate failure
      const { Verifier } = await import('@pact-foundation/pact');
      vi.mocked(Verifier).mockImplementationOnce(
        () =>
          ({
            verifyProvider: vi.fn().mockRejectedValue(new Error('Verification failed')),
          }) as unknown as InstanceType<typeof Verifier>,
      );

      const verifier = createProviderVerifier(baseOptions);
      const result = await verifier.verifyProvider();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification failed');
    });

    it('should accept basic auth for broker', () => {
      const verifier = createProviderVerifier({
        provider: 'test-provider',
        providerBaseUrl: 'http://localhost:3000',
        pactBrokerUrl: 'https://pact-broker.example.com',
        pactBrokerUsername: 'user',
        pactBrokerPassword: 'pass',
      });

      const options = verifier.getVerifierOptions();
      expect(options.pactBrokerUsername).toBe('user');
      expect(options.pactBrokerPassword).toBe('pass');
    });

    it('should accept WIP pacts configuration', () => {
      const verifier = createProviderVerifier({
        provider: 'test-provider',
        providerBaseUrl: 'http://localhost:3000',
        pactBrokerUrl: 'https://pact-broker.example.com',
        includeWipPactsSince: '2024-01-01',
        enablePending: true,
      });

      const options = verifier.getVerifierOptions();
      expect(options.includeWipPactsSince).toBe('2024-01-01');
      expect(options.enablePending).toBe(true);
    });
  });

  describe('createProviderVerifierFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create options from environment variables', () => {
      process.env['PACT_PROVIDER_NAME'] = 'my-provider';
      process.env['PACT_PROVIDER_URL'] = 'http://localhost:4000';
      process.env['PACT_BROKER_URL'] = 'https://broker.example.com';
      process.env['PACT_BROKER_TOKEN'] = 'env-token';
      process.env['PACT_PROVIDER_VERSION'] = '2.0.0';
      process.env['PACT_PROVIDER_BRANCH'] = 'develop';
      process.env['PACT_PUBLISH_RESULTS'] = 'true';
      process.env['PACT_LOG_LEVEL'] = 'debug';

      const options = createProviderVerifierFromEnv();

      expect(options.provider).toBe('my-provider');
      expect(options.providerBaseUrl).toBe('http://localhost:4000');
      expect(options.pactBrokerUrl).toBe('https://broker.example.com');
      expect(options.pactBrokerToken).toBe('env-token');
      expect(options.providerVersion).toBe('2.0.0');
      expect(options.providerVersionBranch).toBe('develop');
      expect(options.publishVerificationResult).toBe(true);
      expect(options.logLevel).toBe('debug');
    });

    it('should use defaults when env vars not set', () => {
      const options = createProviderVerifierFromEnv();

      expect(options.provider).toBe('unknown-provider');
      expect(options.providerBaseUrl).toBe('http://localhost:3000');
      expect(options.providerVersion).toBe('unknown');
      expect(options.publishVerificationResult).toBe(false);
      expect(options.logLevel).toBe('info');
    });

    it('should allow overrides', () => {
      process.env['PACT_PROVIDER_NAME'] = 'env-provider';

      const options = createProviderVerifierFromEnv({
        provider: 'override-provider',
        timeout: 60000,
      });

      expect(options.provider).toBe('override-provider');
      expect(options.timeout).toBe(60000);
    });

    it('should include production consumer version selectors by default', () => {
      const options = createProviderVerifierFromEnv();

      expect(options.consumerVersionSelectors).toEqual(
        defaultConsumerVersionSelectors['production'],
      );
    });

    it('should fallback to GIT_COMMIT for version', () => {
      process.env['GIT_COMMIT'] = 'abc123';

      const options = createProviderVerifierFromEnv();

      expect(options.providerVersion).toBe('abc123');
    });

    it('should fallback to GIT_BRANCH for branch', () => {
      process.env['GIT_BRANCH'] = 'feature/test';

      const options = createProviderVerifierFromEnv();

      expect(options.providerVersionBranch).toBe('feature/test');
    });
  });

  describe('defaultConsumerVersionSelectors', () => {
    it('should have production selectors', () => {
      expect(defaultConsumerVersionSelectors['production']).toEqual([
        { mainBranch: true },
        { deployedOrReleased: true },
      ]);
    });

    it('should have development selectors', () => {
      expect(defaultConsumerVersionSelectors['development']).toBeDefined();
      const devSelectors = defaultConsumerVersionSelectors['development'];
      expect(devSelectors?.[0]).toEqual({
        mainBranch: true,
      });
    });

    it('should have matchingBranch selectors', () => {
      expect(defaultConsumerVersionSelectors['matchingBranch']).toBeDefined();
    });

    it('should have all selectors', () => {
      expect(defaultConsumerVersionSelectors['all']).toEqual([{ latest: true }]);
    });
  });
});
