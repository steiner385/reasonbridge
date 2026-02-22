/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactsService } from '../contacts.service.js';

describe('ContactsService', () => {
  let service: ContactsService;
  let mockPrisma: any;
  let mockHashService: any;
  let mockGoogleProvider: any;

  beforeEach(() => {
    mockPrisma = {
      socialConnection: {
        findUnique: vi.fn(),
      },
      importedContact: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockHashService = {
      hashEmail: vi.fn((email) => `hashed_${email}`),
      truncateDisplayName: vi.fn((name) =>
        name ? `${name.split(' ')[0]} ${name.split(' ').pop()?.charAt(0)}.` : null,
      ),
    };

    mockGoogleProvider = {
      fetchContacts: vi.fn(),
    };

    service = new ContactsService(mockPrisma, mockHashService, mockGoogleProvider);
  });

  describe('importContacts', () => {
    it('should import contacts from Google and store with hashed emails', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        accessToken: 'test-token',
        provider: 'GOOGLE',
      });

      mockGoogleProvider.fetchContacts.mockResolvedValue({
        contacts: [
          { email: 'john@example.com', displayName: 'John Smith' },
          { email: 'jane@example.com', displayName: 'Jane Doe' },
        ],
        totalFetched: 2,
      });

      mockPrisma.importedContact.upsert.mockResolvedValue({});

      const result = await service.importContacts('user-123', 'GOOGLE');

      expect(result.imported).toBe(2);
      expect(result.provider).toBe('GOOGLE');
      expect(mockHashService.hashEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockHashService.hashEmail).toHaveBeenCalledWith('jane@example.com');
      expect(mockPrisma.importedContact.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no connection exists', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue(null);

      await expect(service.importContacts('user-123', 'GOOGLE')).rejects.toThrow(
        'No GOOGLE connection found',
      );
    });
  });

  describe('getContacts', () => {
    it('should return paginated contacts for user', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          displayName: 'John S.',
          provider: 'GOOGLE',
          matchedUserId: null,
          importedAt: new Date(),
        },
        {
          id: 'contact-2',
          displayName: 'Jane D.',
          provider: 'GOOGLE',
          matchedUserId: 'user-456',
          importedAt: new Date(),
        },
      ];

      mockPrisma.importedContact.findMany.mockResolvedValue(mockContacts);
      mockPrisma.importedContact.count.mockResolvedValue(2);

      const result = await service.getContacts('user-123', {
        limit: 50,
        offset: 0,
      });

      expect(result.contacts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by matched status', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.count.mockResolvedValue(0);

      await service.getContacts('user-123', { matched: true });

      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchedUserId: { not: null },
          }),
        }),
      );
    });

    it('should filter by provider', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.count.mockResolvedValue(0);

      await service.getContacts('user-123', { provider: 'GOOGLE' });

      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: 'GOOGLE',
          }),
        }),
      );
    });

    it('should indicate hasMore when more contacts exist', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.importedContact.count.mockResolvedValue(100);

      const result = await service.getContacts('user-123', { limit: 10, offset: 0 });

      expect(result.hasMore).toBe(true);
    });
  });
});
