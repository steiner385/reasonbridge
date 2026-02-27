/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactsController } from '../contacts.controller.js';
import { SocialProviderDto } from '../../connections/dto/initiate-connection.dto.js';

describe('ContactsController', () => {
  let controller: ContactsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      importContacts: vi.fn(),
      getContacts: vi.fn(),
    };
    controller = new ContactsController(mockService);
  });

  describe('importContacts', () => {
    it('should call service with provider from DTO', async () => {
      mockService.importContacts.mockResolvedValue({
        imported: 10,
        matched: 2,
        provider: 'GOOGLE',
      });

      const result = await controller.importContacts({ provider: SocialProviderDto.GOOGLE });

      expect(mockService.importContacts).toHaveBeenCalledWith(expect.any(String), 'GOOGLE');
      expect(result.imported).toBe(10);
    });

    it('should default to GOOGLE if no provider specified', async () => {
      mockService.importContacts.mockResolvedValue({
        imported: 5,
        matched: 1,
        provider: 'GOOGLE',
      });

      const result = await controller.importContacts({});

      expect(mockService.importContacts).toHaveBeenCalledWith(expect.any(String), 'GOOGLE');
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
      await controller.getContacts(query);

      expect(mockService.getContacts).toHaveBeenCalledWith(expect.any(String), query);
    });

    it('should return paginated contacts', async () => {
      mockService.getContacts.mockResolvedValue({
        contacts: [{ id: '1', displayName: 'John S.' }],
        total: 50,
        hasMore: true,
      });

      const result = await controller.getContacts({ limit: 10, offset: 0 });

      expect(result.contacts).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });
  });
});
