/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { ModerationServiceClient, BotFlagRequest } from '../moderation-service.client.js';
// Import server from testing-utils setup (using relative path due to Vitest 4.x alias resolution)
import { server } from '../../../../../packages/testing-utils/dist/setup/index.js';

// Store original fetch and create mock
const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

// Disable MSW for these tests since we're testing with direct fetch mocks
beforeAll(() => {
  server.close();
  globalThis.fetch = mockFetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  server.listen({ onUnhandledRequest: 'warn' });
});

describe('ModerationServiceClient', () => {
  let client: ModerationServiceClient;

  const createMockRequest = (overrides: Partial<BotFlagRequest> = {}): BotFlagRequest => ({
    userId: 'user-123',
    riskScore: 0.75,
    patterns: ['rapid_posting', 'topic_concentration'],
    reasoning: 'High risk of automated behavior.',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable for testing
    process.env['MODERATION_SERVICE_URL'] = 'http://moderation-service:3000';
    client = new ModerationServiceClient();
  });

  afterEach(() => {
    delete process.env['MODERATION_SERVICE_URL'];
  });

  describe('flagUserAsBot', () => {
    it('should successfully flag user as bot', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            reportId: 'report-456',
          }),
      });

      const request = createMockRequest();
      const result = await client.flagUserAsBot(request);

      expect(result).toEqual({
        success: true,
        reportId: 'report-456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://moderation-service:3000/internal/bot-flagged',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        }),
      );

      // Verify the body contains the request data plus detectedAt
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.userId).toBe('user-123');
      expect(callBody.riskScore).toBe(0.75);
      expect(callBody.patterns).toEqual(['rapid_posting', 'topic_concentration']);
      expect(callBody.detectedAt).toBeDefined();
    });

    it('should return null on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const request = createMockRequest();
      const result = await client.flagUserAsBot(request);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest();
      const result = await client.flagUserAsBot(request);

      expect(result).toBeNull();
    });

    it('should handle error response from service', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'User not found',
          }),
      });

      const request = createMockRequest();
      const result = await client.flagUserAsBot(request);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should include all request fields in API call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, reportId: 'report-789' }),
      });

      const request = createMockRequest({
        userId: 'custom-user',
        riskScore: 0.95,
        patterns: ['very_new_account', 'rapid_posting', 'topic_concentration'],
        reasoning: 'Custom reasoning for high-risk user.',
      });

      await client.flagUserAsBot(request);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.userId).toBe('custom-user');
      expect(callBody.riskScore).toBe(0.95);
      expect(callBody.patterns).toHaveLength(3);
      expect(callBody.reasoning).toContain('Custom reasoning');
    });
  });
});
