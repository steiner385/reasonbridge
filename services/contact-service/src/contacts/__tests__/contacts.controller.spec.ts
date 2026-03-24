/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactsController } from '../contacts.controller.js';
import { SocialProviderDto } from '../../connections/dto/initiate-connection.dto.js';
import type { JwtPayload } from '../../auth/jwt-auth.guard.js';

describe('ContactsController', () => {
  let controller: ContactsController;
  let mockService: any;
  let mockUser: JwtPayload;

  beforeEach(() => {
    mockService = {
      importContacts: vi.fn(),
      getContacts: vi.fn(),
    };
    controller = new ContactsController(mockService);
    mockUser = {
      sub: 'test-user-id',
      email: 'test@example.com',
      userId: 'test-user-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };
  });

  describe('importContacts', () => {
    it('should call service with provider from DTO', async () => {
      mockService.importContacts.mockResolvedValue({
        imported: 10,
        matched: 2,
        provider: 'GOOGLE',
      });

      const result = await controller.importContacts(mockUser, {
        provider: SocialProviderDto.GOOGLE,
      });

      expect(mockService.importContacts).toHaveBeenCalledWith('test-user-id', 'GOOGLE');
      expect(result.imported).toBe(10);
    });

    it('should default to GOOGLE if no provider specified', async () => {
      mockService.importContacts.mockResolvedValue({
        imported: 5,
        matched: 1,
        provider: 'GOOGLE',
      });

      const result = await controller.importContacts(mockUser, {});

      expect(mockService.importContacts).toHaveBeenCalledWith('test-user-id', 'GOOGLE');
      expect(result.provider).toBe('GOOGLE');
    });
  });

  describe('getContacts', () => {
    it('should call service with query parameters', async () => {
      mockService.getContacts.mockResolvedValue({
        contacts: [],
        total: 0,
        hasMore: false,
      });

      const query = { matched: true, provider: SocialProviderDto.GOOGLE, limit: 20, offset: 10 };
      await controller.getContacts(mockUser, query);

      expect(mockService.getContacts).toHaveBeenCalledWith('test-user-id', query);
    });

    it('should return paginated contacts', async () => {
      mockService.getContacts.mockResolvedValue({
        contacts: [{ id: '1', displayName: 'John S.' }],
        total: 50,
        hasMore: true,
      });

      const result = await controller.getContacts(mockUser, { limit: 10, offset: 0 });

      expect(result.contacts).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });
  });
});
