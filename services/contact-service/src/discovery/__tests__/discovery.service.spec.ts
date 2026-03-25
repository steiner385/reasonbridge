/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryService } from '../discovery.service.js';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      importedContact: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        groupBy: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    };
    service = new DiscoveryService(mockPrisma);
  });

  describe('discoverUsers', () => {
    it('should find users matching imported contact email hashes', async () => {
      // User's imported contacts (first call)
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([
          { id: 'c1', emailHash: 'hash1', matchedUserId: null },
          { id: 'c2', emailHash: 'hash2', matchedUserId: null },
          { id: 'c3', emailHash: 'hash3', matchedUserId: null },
        ])
        // Second call for mutual contacts calculation (matched contacts)
        .mockResolvedValueOnce([]);

      // Discoverable users matching those hashes
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          displayName: 'John Smith',
          avatarUrl: 'https://example.com/avatar1.jpg',
          emailHash: 'hash1',
        },
        { id: 'user-2', displayName: 'Jane Doe', avatarUrl: null, emailHash: 'hash2' },
      ]);

      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-123', { limit: 50, offset: 0 });

      expect(result.users).toHaveLength(2);
      expect(result.users[0].userId).toBe('user-1');
      expect(result.users[0].displayName).toBe('John Smith');
      expect(result.total).toBe(2);
    });

    it('should only find users with discoverableByContacts=true', async () => {
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([{ id: 'c1', emailHash: 'hash1' }])
        .mockResolvedValueOnce([]); // For mutual contacts
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-123', {});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            discoverableByContacts: true,
          }),
        }),
      );
    });

    it('should update matchedUserId on imported contacts', async () => {
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([{ id: 'c1', emailHash: 'hash1' }])
        .mockResolvedValueOnce([]); // For mutual contacts
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', displayName: 'John', emailHash: 'hash1' },
      ]);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-123', {});

      expect(mockPrisma.importedContact.updateMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-123',
          emailHash: 'hash1',
        },
        data: {
          matchedUserId: 'user-1',
        },
      });
    });

    it('should return empty result when no contacts imported', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-123', {});

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should exclude the owner from discovered users', async () => {
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([{ id: 'c1', emailHash: 'owner-hash' }])
        .mockResolvedValueOnce([]); // For mutual contacts
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-123', {});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'owner-123' },
          }),
        }),
      );
    });

    it('should respect pagination parameters', async () => {
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([{ id: 'c1', emailHash: 'hash1' }])
        .mockResolvedValueOnce([]); // For mutual contacts
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-123', { limit: 10, offset: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should calculate mutual contacts correctly', async () => {
      // User's imported contacts (first call)
      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce([
          { id: 'c1', emailHash: 'hash1', matchedUserId: null },
          { id: 'c2', emailHash: 'hash2', matchedUserId: 'contact-user-1' },
        ])
        // Second call: owner's matched contacts for mutual calculation
        .mockResolvedValueOnce([{ matchedUserId: 'contact-user-1' }]);

      // Discovered user
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'discovered-user-1', displayName: 'John', emailHash: 'hash1' },
      ]);

      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });

      // groupBy returns that contact-user-1 also has discovered-user-1 as a contact
      mockPrisma.importedContact.groupBy.mockResolvedValue([
        { matchedUserId: 'discovered-user-1', _count: { ownerId: 1 } },
      ]);

      const result = await service.discoverUsers('owner-123', {});

      expect(result.users).toHaveLength(1);
      expect(result.users[0].mutualContacts).toBe(1);
    });
  });
});
