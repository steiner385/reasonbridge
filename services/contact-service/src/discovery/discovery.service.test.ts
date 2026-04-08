/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DiscoveryService } from './discovery.service.js';

const createMockPrismaService = () => ({
  importedContact: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
});

const createMockContact = (overrides = {}) => ({
  id: 'contact-1',
  ownerId: 'owner-1',
  emailHash: 'hash-alice',
  matchedUserId: null,
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  displayName: 'Alice Smith',
  avatarUrl: 'https://example.com/alice.jpg',
  emailHash: 'hash-alice',
  discoverableByContacts: true,
  ...overrides,
});

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new DiscoveryService(mockPrisma as any);
  });

  describe('discoverUsers', () => {
    it('should return empty results when no contacts exist', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should discover users matching contact email hashes', async () => {
      const contacts = [
        createMockContact({ emailHash: 'hash-alice' }),
        createMockContact({ emailHash: 'hash-bob' }),
      ];
      const discoveredUsers = [
        createMockUser({ id: 'alice-id', displayName: 'Alice', emailHash: 'hash-alice' }),
      ];

      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce(contacts) // First call: get contacts
        .mockResolvedValueOnce([]); // Second call: mutual contacts (owner matched)
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].userId).toBe('alice-id');
      expect(result.users[0].displayName).toBe('Alice');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          emailHash: { in: ['hash-alice', 'hash-bob'] },
          discoverableByContacts: true,
          id: { not: 'owner-1' },
        },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          emailHash: true,
        },
        take: 50,
        skip: 0,
      });
    });

    it('should exclude non-discoverable users', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]); // No discoverable users
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            discoverableByContacts: true,
          }),
        }),
      );
    });

    it('should exclude the owner from discovery results', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-owner' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'owner-1' },
          }),
        }),
      );
    });

    it('should update matchedUserId on imported contacts for discovered users', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];
      const discoveredUsers = [createMockUser({ id: 'alice-id', emailHash: 'hash-alice' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(mockPrisma.importedContact.updateMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-1',
          emailHash: 'hash-alice',
        },
        data: {
          matchedUserId: 'alice-id',
        },
      });
    });

    it('should include mutual contacts count in results', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];
      const discoveredUsers = [createMockUser({ id: 'alice-id', emailHash: 'hash-alice' })];
      const ownerMatchedContacts = [{ matchedUserId: 'friend-1' }, { matchedUserId: 'friend-2' }];

      mockPrisma.importedContact.findMany
        .mockResolvedValueOnce(contacts) // Get owner's contacts
        .mockResolvedValueOnce(ownerMatchedContacts); // Owner's matched contacts for mutual calc
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([
        { matchedUserId: 'alice-id', _count: { ownerId: 3 } },
      ]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users[0].mutualContacts).toBe(3);
    });

    it('should support pagination with limit and offset', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-1', { limit: 10, offset: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should use default limit and offset when not provided', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-1', {});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should handle users without display name or avatar', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];
      const discoveredUsers = [
        createMockUser({
          id: 'alice-id',
          displayName: null,
          avatarUrl: null,
          emailHash: 'hash-alice',
        }),
      ];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users[0].displayName).toBe('Unknown');
      expect(result.users[0].avatarUrl).toBeUndefined();
    });

    it('should not update matchedUserId for users without emailHash', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];
      const discoveredUsers = [
        createMockUser({
          id: 'alice-id',
          emailHash: null, // No email hash
        }),
      ];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(mockPrisma.importedContact.updateMany).not.toHaveBeenCalled();
    });

    it('should return 0 mutual contacts when owner has no matched contacts', async () => {
      const contacts = [createMockContact({ emailHash: 'hash-alice' })];
      const discoveredUsers = [createMockUser({ id: 'alice-id', emailHash: 'hash-alice' })];

      mockPrisma.importedContact.findMany.mockResolvedValueOnce(contacts).mockResolvedValueOnce([]); // No matched contacts
      mockPrisma.user.findMany.mockResolvedValue(discoveredUsers);
      mockPrisma.importedContact.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedContact.groupBy.mockResolvedValue([]);

      const result = await service.discoverUsers('owner-1', { limit: 50, offset: 0 });

      expect(result.users[0].mutualContacts).toBe(0);
    });
  });
});
