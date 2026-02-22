/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DiscussionServiceClient } from '../discussion-service.client.js';

describe('DiscussionServiceClient', () => {
  let client: DiscussionServiceClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new DiscussionServiceClient();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTopicById', () => {
    it('should fetch topic by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'topic-123',
            title: 'Climate Change Discussion',
            status: 'active',
          }),
      });

      const result = await client.getTopicById('topic-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/topics/topic-123'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual({
        id: 'topic-123',
        title: 'Climate Change Discussion',
        status: 'active',
      });
    });

    it('should return null when topic not found (404)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await client.getTopicById('non-existent-topic');

      expect(result).toBeNull();
    });

    it('should return null on server error (500)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await client.getTopicById('topic-123');

      expect(result).toBeNull();
    });

    it('should return null on fetch error (fire-and-forget)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.getTopicById('topic-123');

      expect(result).toBeNull();
    });

    it('should not throw on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Should not throw - fire-and-forget pattern
      await expect(client.getTopicById('topic-123')).resolves.toBeNull();
    });
  });

  describe('canUserAccessTopic', () => {
    it('should return true when user can access topic', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            canAccess: true,
          }),
      });

      const result = await client.canUserAccessTopic('topic-123', 'user-456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/topics/topic-123/access/user-456'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toBe(true);
    });

    it('should return false when user cannot access topic', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            canAccess: false,
          }),
      });

      const result = await client.canUserAccessTopic('topic-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should return false on 403 forbidden', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      const result = await client.canUserAccessTopic('topic-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should return false on 404 not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await client.canUserAccessTopic('topic-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should return false on fetch error (fire-and-forget)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.canUserAccessTopic('topic-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should not throw on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Should not throw - fire-and-forget pattern
      await expect(client.canUserAccessTopic('topic-123', 'user-456')).resolves.toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use DISCUSSION_SERVICE_URL env var when set', async () => {
      const originalEnv = process.env['DISCUSSION_SERVICE_URL'];
      process.env['DISCUSSION_SERVICE_URL'] = 'http://custom-host:8888';

      const customClient = new DiscussionServiceClient();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'topic-1', title: 'Test', status: 'active' }),
      });

      await customClient.getTopicById('topic-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom-host:8888/topics/topic-1',
        expect.any(Object),
      );

      // Restore env
      if (originalEnv !== undefined) {
        process.env['DISCUSSION_SERVICE_URL'] = originalEnv;
      } else {
        delete process.env['DISCUSSION_SERVICE_URL'];
      }
    });
  });
});
