/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserServiceClient } from '../user-service.client.js';

/**
 * Create a mock Response object with proper headers
 */
function createMockResponse(data: unknown, ok = true, status = 200): Partial<Response> {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-length') {
          return data ? JSON.stringify(data).length.toString() : '0';
        }
        return null;
      },
    } as Headers,
    json: () => Promise.resolve(data),
  };
}

describe('UserServiceClient', () => {
  let client: UserServiceClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new UserServiceClient();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findDiscoverableUsersByEmailHashes', () => {
    it('should call user-service with email hashes', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          users: [{ id: 'user-1', displayName: 'John', emailHash: 'hash1' }],
        }),
      );

      const result = await client.findDiscoverableUsersByEmailHashes(['hash1', 'hash2']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/discoverable'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ emailHashes: ['hash1', 'hash2'] }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.findDiscoverableUsersByEmailHashes(['hash1']);

      expect(result).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 500));

      const result = await client.findDiscoverableUsersByEmailHashes(['hash1']);

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          id: 'user-1',
          displayName: 'John Smith',
          avatarUrl: 'https://example.com/avatar.jpg',
        }),
      );

      const result = await client.getUserById('user-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-1'),
        expect.any(Object),
      );
      expect(result?.displayName).toBe('John Smith');
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.getUserById('user-1');

      expect(result).toBeNull();
    });
  });
});
