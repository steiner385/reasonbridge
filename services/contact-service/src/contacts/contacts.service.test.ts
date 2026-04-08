/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { ContactsService } from './contacts.service.js';

const createMockPrismaService = () => ({
  socialConnection: {
    findUnique: vi.fn(),
  },
  importedContact: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
});

const createMockHashService = () => ({
  hashEmail: vi.fn((email: string) => `hashed-${email}`),
  truncateDisplayName: vi.fn((name: string | null) =>
    name ? `${name.split(' ')[0]} ${name.split(' ')[1]?.[0] || ''}.`.trim() : null,
  ),
});

const createMockGoogleProvider = () => ({
  fetchContacts: vi.fn(),
});

const createMockConnection = (overrides = {}) => ({
  id: 'conn-1',
  userId: 'user-1',
  provider: 'GOOGLE',
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: new Date(Date.now() + 3600000),
  createdAt: new Date(),
  ...overrides,
});

const createMockContact = (overrides = {}) => ({
  id: 'contact-1',
  ownerId: 'user-1',
  emailHash: 'hashed-test@example.com',
  displayName: 'John S.',
  provider: 'GOOGLE',
  matchedUserId: null,
  importedAt: new Date(),
  ...overrides,
});

describe('ContactsService', () => {
  let service: ContactsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockHashService: ReturnType<typeof createMockHashService>;
  let mockGoogleProvider: ReturnType<typeof createMockGoogleProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockHashService = createMockHashService();
    mockGoogleProvider = createMockGoogleProvider();
    service = new ContactsService(
      mockPrisma as any,
      mockHashService as any,
      mockGoogleProvider as any,
    );
  });

  describe('importContacts', () => {
    it('should import contacts from Google and hash emails', async () => {
      const connection = createMockConnection();
      const providerContacts = {
        contacts: [
          { email: 'alice@example.com', displayName: 'Alice Smith' },
          { email: 'bob@example.com', displayName: 'Bob Jones' },
        ],
        totalFetched: 2,
      };

      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);
      mockGoogleProvider.fetchContacts.mockResolvedValue(providerContacts);
      mockPrisma.importedContact.upsert.mockResolvedValue(createMockContact());

      const result = await service.importContacts('user-1', 'GOOGLE');

      expect(result.imported).toBe(2);
      expect(result.provider).toBe('GOOGLE');
      expect(mockGoogleProvider.fetchContacts).toHaveBeenCalledWith('test-access-token');
      expect(mockHashService.hashEmail).toHaveBeenCalledTimes(2);
      expect(mockHashService.hashEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockHashService.hashEmail).toHaveBeenCalledWith('bob@example.com');
      expect(mockHashService.truncateDisplayName).toHaveBeenCalledTimes(2);
      expect(mockPrisma.importedContact.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when no connection exists', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue(null);

      await expect(service.importContacts('user-1', 'GOOGLE')).rejects.toThrow(NotFoundException);
      await expect(service.importContacts('user-1', 'GOOGLE')).rejects.toThrow(
        'No GOOGLE connection found',
      );
    });

    it('should throw Error for unsupported providers', async () => {
      const connection = createMockConnection({ provider: 'FACEBOOK' });
      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);

      await expect(service.importContacts('user-1', 'FACEBOOK')).rejects.toThrow(
        'Provider FACEBOOK not yet implemented',
      );
    });

    it('should upsert contacts with correct data structure', async () => {
      const connection = createMockConnection();
      const providerContacts = {
        contacts: [{ email: 'test@example.com', displayName: 'Test User' }],
        totalFetched: 1,
      };

      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);
      mockGoogleProvider.fetchContacts.mockResolvedValue(providerContacts);
      mockPrisma.importedContact.upsert.mockResolvedValue(createMockContact());

      await service.importContacts('user-1', 'GOOGLE');

      expect(mockPrisma.importedContact.upsert).toHaveBeenCalledWith({
        where: {
          ownerId_emailHash: { ownerId: 'user-1', emailHash: 'hashed-test@example.com' },
        },
        create: {
          ownerId: 'user-1',
          emailHash: 'hashed-test@example.com',
          displayName: 'Test U.',
          provider: 'GOOGLE',
        },
        update: {
          displayName: 'Test U.',
          provider: 'GOOGLE',
        },
      });
    });
  });

  describe('getContacts', () => {
    it('should return paginated contacts', async () => {
      const contacts = [
        createMockContact({ id: 'contact-1' }),
        createMockContact({ id: 'contact-2' }),
      ];

      mockPrisma.importedContact.findMany.mockResolvedValue(contacts);
      mockPrisma.importedContact.count.mockResolvedValue(2);

      const result = await service.getContacts('user-1', { limit: 50, offset: 0 });

      expect(result.contacts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        take: 50,
        skip: 0,
        orderBy: { importedAt: 'desc' },
      });
    });

    it('should filter by matched status when matched is true', async () => {
      const matchedContacts = [createMockContact({ matchedUserId: 'matched-user-1' })];

      mockPrisma.importedContact.findMany.mockResolvedValue(matchedContacts);
      mockPrisma.importedContact.count.mockResolvedValue(1);

      const result = await service.getContacts('user-1', { matched: true, limit: 50, offset: 0 });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].isMatched).toBe(true);
      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1', matchedUserId: { not: null } },
        take: 50,
        skip: 0,
        orderBy: { importedAt: 'desc' },
      });
    });

    it('should filter by matched status when matched is false', async () => {
      const unmatchedContacts = [createMockContact({ matchedUserId: null })];

      mockPrisma.importedContact.findMany.mockResolvedValue(unmatchedContacts);
      mockPrisma.importedContact.count.mockResolvedValue(1);

      const result = await service.getContacts('user-1', { matched: false, limit: 50, offset: 0 });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].isMatched).toBe(false);
      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1', matchedUserId: null },
        take: 50,
        skip: 0,
        orderBy: { importedAt: 'desc' },
      });
    });

    it('should filter by provider', async () => {
      const googleContacts = [createMockContact({ provider: 'GOOGLE' })];

      mockPrisma.importedContact.findMany.mockResolvedValue(googleContacts);
      mockPrisma.importedContact.count.mockResolvedValue(1);

      const result = await service.getContacts('user-1', {
        provider: 'GOOGLE',
        limit: 50,
        offset: 0,
      });

      expect(result.contacts).toHaveLength(1);
      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1', provider: 'GOOGLE' },
        take: 50,
        skip: 0,
        orderBy: { importedAt: 'desc' },
      });
    });

    it('should correctly calculate hasMore for pagination', async () => {
      const contacts = [createMockContact()];

      mockPrisma.importedContact.findMany.mockResolvedValue(contacts);
      mockPrisma.importedContact.count.mockResolvedValue(10); // More than returned

      const result = await service.getContacts('user-1', { limit: 1, offset: 0 });

      expect(result.hasMore).toBe(true);
    });

    it('should map contact fields correctly', async () => {
      const contact = createMockContact({
        id: 'contact-123',
        displayName: 'Alice S.',
        provider: 'GOOGLE',
        matchedUserId: 'user-456',
        importedAt: new Date('2025-01-01'),
      });

      mockPrisma.importedContact.findMany.mockResolvedValue([contact]);
      mockPrisma.importedContact.count.mockResolvedValue(1);

      const result = await service.getContacts('user-1', { limit: 50, offset: 0 });

      expect(result.contacts[0]).toEqual({
        id: 'contact-123',
        displayName: 'Alice S.',
        provider: 'GOOGLE',
        isMatched: true,
        importedAt: contact.importedAt,
      });
    });

    it('should use default limit and offset when not provided', async () => {
      mockPrisma.importedContact.findMany.mockResolvedValue([]);
      mockPrisma.importedContact.count.mockResolvedValue(0);

      await service.getContacts('user-1', {});

      expect(mockPrisma.importedContact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        take: 50,
        skip: 0,
        orderBy: { importedAt: 'desc' },
      });
    });
  });
});
