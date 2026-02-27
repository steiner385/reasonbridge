/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryController } from '../discovery.controller.js';

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      discoverUsers: vi.fn(),
    };
    controller = new DiscoveryController(mockService);
  });

  describe('discoverUsers', () => {
    it('should call service with query parameters', async () => {
      mockService.discoverUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      const query = { limit: 20, offset: 10 };
      await controller.discoverUsers(query);

      expect(mockService.discoverUsers).toHaveBeenCalledWith(expect.any(String), query);
    });

    it('should return discovered users', async () => {
      mockService.discoverUsers.mockResolvedValue({
        users: [{ userId: 'user-1', displayName: 'John Smith', mutualContacts: 3 }],
        total: 1,
      });

      const result = await controller.discoverUsers({});

      expect(result.users).toHaveLength(1);
      expect(result.users[0].displayName).toBe('John Smith');
    });
  });
});
