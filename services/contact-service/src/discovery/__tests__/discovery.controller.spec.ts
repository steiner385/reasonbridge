/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryController } from '../discovery.controller.js';
import type { JwtPayload } from '../../auth/jwt-auth.guard.js';

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let mockService: any;
  let mockUser: JwtPayload;

  beforeEach(() => {
    mockService = {
      discoverUsers: vi.fn(),
    };
    controller = new DiscoveryController(mockService);
    mockUser = {
      sub: 'test-user-id',
      email: 'test@example.com',
      userId: 'test-user-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };
  });

  describe('discoverUsers', () => {
    it('should call service with query parameters', async () => {
      mockService.discoverUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      const query = { limit: 20, offset: 10 };
      await controller.discoverUsers(mockUser, query);

      expect(mockService.discoverUsers).toHaveBeenCalledWith('test-user-id', query);
    });

    it('should return discovered users', async () => {
      mockService.discoverUsers.mockResolvedValue({
        users: [{ userId: 'user-1', displayName: 'John Smith', mutualContacts: 3 }],
        total: 1,
      });

      const result = await controller.discoverUsers(mockUser, {});

      expect(result.users).toHaveLength(1);
      expect(result.users[0].displayName).toBe('John Smith');
    });
  });
});
