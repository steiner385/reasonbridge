/**
 * Tests for Pact publisher configuration utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePublishCommand,
  createPactPublisherFromEnv,
  recordDeployment,
  generateDeploymentCommand,
  type PactPublisherOptions,
} from '../pact/publisher.js';

// Mock fetch for deployment recording
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Pact Publisher Configuration', () => {
  describe('generatePublishCommand', () => {
    const baseOptions: PactPublisherOptions = {
      pactBrokerUrl: 'https://pact-broker.example.com',
      consumerVersion: '1.0.0',
      pactFilesOrDirs: ['./pacts'],
    };

    it('should generate basic publish command', () => {
      const command = generatePublishCommand(baseOptions);

      expect(command).toContain('npx pact-broker publish');
      expect(command).toContain('./pacts');
      expect(command).toContain('--consumer-app-version 1.0.0');
      expect(command).toContain('--broker-base-url https://pact-broker.example.com');
    });

    it('should include token authentication', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        pactBrokerToken: 'test-token',
      });

      expect(command).toContain('--broker-token test-token');
    });

    it('should include basic authentication', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        pactBrokerUsername: 'user',
        pactBrokerPassword: 'pass',
      });

      expect(command).toContain('--broker-username user');
      expect(command).toContain('--broker-password pass');
    });

    it('should include branch', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        branch: 'main',
      });

      expect(command).toContain('--branch main');
    });

    it('should include tags', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        tags: ['production', 'v1'],
      });

      expect(command).toContain('--tag production');
      expect(command).toContain('--tag v1');
    });

    it('should include build URL', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        buildUrl: 'https://ci.example.com/builds/123',
      });

      expect(command).toContain('--build-url https://ci.example.com/builds/123');
    });

    it('should handle multiple pact directories', () => {
      const command = generatePublishCommand({
        ...baseOptions,
        pactFilesOrDirs: ['./pacts', './more-pacts'],
      });

      expect(command).toContain('./pacts');
      expect(command).toContain('./more-pacts');
    });
  });

  describe('createPactPublisherFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create options from environment variables', () => {
      process.env['PACT_BROKER_URL'] = 'https://broker.example.com';
      process.env['PACT_BROKER_TOKEN'] = 'env-token';
      process.env['PACT_CONSUMER_VERSION'] = '2.0.0';
      process.env['PACT_BRANCH'] = 'develop';
      process.env['PACT_TAGS'] = 'tag1,tag2,tag3';
      process.env['PACT_FILES_DIR'] = './custom-pacts';
      process.env['BUILD_URL'] = 'https://ci.example.com/123';

      const options = createPactPublisherFromEnv();

      expect(options.pactBrokerUrl).toBe('https://broker.example.com');
      expect(options.pactBrokerToken).toBe('env-token');
      expect(options.consumerVersion).toBe('2.0.0');
      expect(options.branch).toBe('develop');
      expect(options.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(options.pactFilesOrDirs).toEqual(['./custom-pacts']);
      expect(options.buildUrl).toBe('https://ci.example.com/123');
    });

    it('should use defaults when env vars not set', () => {
      const options = createPactPublisherFromEnv();

      expect(options.pactBrokerUrl).toBe('');
      expect(options.consumerVersion).toBe('unknown');
      expect(options.pactFilesOrDirs).toEqual(['./pacts']);
    });

    it('should allow overrides', () => {
      process.env['PACT_BROKER_URL'] = 'https://env-broker.example.com';

      const options = createPactPublisherFromEnv({
        pactBrokerUrl: 'https://override-broker.example.com',
        consumerVersion: '3.0.0',
      });

      expect(options.pactBrokerUrl).toBe('https://override-broker.example.com');
      expect(options.consumerVersion).toBe('3.0.0');
    });

    it('should fallback to GIT_COMMIT for version', () => {
      process.env['GIT_COMMIT'] = 'def456';

      const options = createPactPublisherFromEnv();

      expect(options.consumerVersion).toBe('def456');
    });

    it('should fallback to GIT_BRANCH for branch', () => {
      process.env['GIT_BRANCH'] = 'feature/test';

      const options = createPactPublisherFromEnv();

      expect(options.branch).toBe('feature/test');
    });

    it('should handle empty tags string', () => {
      process.env['PACT_TAGS'] = '';

      const options = createPactPublisherFromEnv();

      expect(options.tags).toBeUndefined();
    });

    it('should trim whitespace from tags', () => {
      process.env['PACT_TAGS'] = ' tag1 , tag2 , tag3 ';

      const options = createPactPublisherFromEnv();

      expect(options.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('recordDeployment', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should call broker API to record deployment', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await recordDeployment({
        pactBrokerUrl: 'https://broker.example.com',
        pactBrokerToken: 'test-token',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://broker.example.com/pacticipants/my-service/versions/1.0.0/deployed-versions/environment/production',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should include application instance when provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await recordDeployment({
        pactBrokerUrl: 'https://broker.example.com',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
        applicationInstance: 'instance-1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('applicationInstance=instance-1'),
        expect.any(Object),
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        recordDeployment({
          pactBrokerUrl: 'https://broker.example.com',
          pacticipant: 'my-service',
          version: '1.0.0',
          environment: 'production',
        }),
      ).rejects.toThrow('Failed to record deployment: 500 Internal Server Error');
    });

    it('should handle trailing slash in broker URL', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await recordDeployment({
        pactBrokerUrl: 'https://broker.example.com/',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://broker.example.com/pacticipants/my-service/versions/1.0.0/deployed-versions/environment/production',
        expect.any(Object),
      );
    });

    it('should URL encode special characters', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await recordDeployment({
        pactBrokerUrl: 'https://broker.example.com',
        pacticipant: 'my service',
        version: '1.0.0+build.123',
        environment: 'pre-production',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('my%20service'),
        expect.any(Object),
      );
    });
  });

  describe('generateDeploymentCommand', () => {
    it('should generate deployment command', () => {
      const command = generateDeploymentCommand({
        pactBrokerUrl: 'https://broker.example.com',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
      });

      expect(command).toContain('npx pact-broker record-deployment');
      expect(command).toContain('--pacticipant my-service');
      expect(command).toContain('--version 1.0.0');
      expect(command).toContain('--environment production');
      expect(command).toContain('--broker-base-url https://broker.example.com');
    });

    it('should include token when provided', () => {
      const command = generateDeploymentCommand({
        pactBrokerUrl: 'https://broker.example.com',
        pactBrokerToken: 'test-token',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
      });

      expect(command).toContain('--broker-token test-token');
    });

    it('should include application instance when provided', () => {
      const command = generateDeploymentCommand({
        pactBrokerUrl: 'https://broker.example.com',
        pacticipant: 'my-service',
        version: '1.0.0',
        environment: 'production',
        applicationInstance: 'instance-1',
      });

      expect(command).toContain('--application-instance instance-1');
    });
  });
});
