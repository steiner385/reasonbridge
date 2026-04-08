/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { ConnectionsService } from './connections.service.js';

const createMockPrismaService = () => ({
  socialConnection: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  importedContact: {
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
});

const createMockConnection = (overrides = {}) => ({
  id: 'conn-1',
  userId: 'user-1',
  provider: 'GOOGLE',
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: new Date(Date.now() + 3600000),
  createdAt: new Date('2025-01-01'),
  ...overrides,
});

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
      FACEBOOK_CLIENT_ID: 'facebook-client-id',
      FACEBOOK_REDIRECT_URI: 'http://localhost:3000/auth/facebook/callback',
    };
    mockPrisma = createMockPrismaService();
    service = new ConnectionsService(mockPrisma as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initiateConnection', () => {
    it('should generate OAuth URL for Google with correct parameters', async () => {
      const result = await service.initiateConnection('user-1', 'GOOGLE');

      expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.authUrl).toContain('client_id=google-client-id');
      expect(result.authUrl).toContain('redirect_uri=http://localhost:3000/auth/google/callback');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain(
        'scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcontacts.readonly',
      );
      expect(result.authUrl).toContain('access_type=offline');
      expect(result.authUrl).toContain(`state=${result.state}`);
    });

    it('should generate OAuth URL for Facebook with correct parameters', async () => {
      const result = await service.initiateConnection('user-1', 'FACEBOOK');

      expect(result.authUrl).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(result.authUrl).toContain('client_id=facebook-client-id');
      expect(result.authUrl).toContain('redirect_uri=http://localhost:3000/auth/facebook/callback');
      expect(result.authUrl).toContain('scope=email');
      expect(result.authUrl).toContain(`state=${result.state}`);
    });

    it('should generate unique state token', async () => {
      const result1 = await service.initiateConnection('user-1', 'GOOGLE');
      const result2 = await service.initiateConnection('user-1', 'GOOGLE');

      expect(result1.state).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(result2.state).toHaveLength(32);
      expect(result1.state).not.toBe(result2.state);
    });

    it('should handle missing environment variables gracefully', async () => {
      process.env['GOOGLE_CLIENT_ID'] = '';
      process.env['GOOGLE_REDIRECT_URI'] = '';

      const result = await service.initiateConnection('user-1', 'GOOGLE');

      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('redirect_uri=');
      expect(result.state).toHaveLength(32);
    });
  });

  describe('getConnections', () => {
    it('should return connections with contact counts', async () => {
      const connections = [
        createMockConnection({ id: 'conn-1', provider: 'GOOGLE' }),
        createMockConnection({ id: 'conn-2', provider: 'FACEBOOK' }),
      ];

      mockPrisma.socialConnection.findMany.mockResolvedValue(connections);
      mockPrisma.importedContact.count
        .mockResolvedValueOnce(50) // Google contacts
        .mockResolvedValueOnce(30); // Facebook contacts

      const result = await service.getConnections('user-1');

      expect(result.connections).toHaveLength(2);
      expect(result.connections[0]).toEqual({
        id: 'conn-1',
        provider: 'GOOGLE',
        connectedAt: connections[0].createdAt,
        contactCount: 50,
      });
      expect(result.connections[1]).toEqual({
        id: 'conn-2',
        provider: 'FACEBOOK',
        connectedAt: connections[1].createdAt,
        contactCount: 30,
      });
    });

    it('should return empty array when no connections exist', async () => {
      mockPrisma.socialConnection.findMany.mockResolvedValue([]);

      const result = await service.getConnections('user-1');

      expect(result.connections).toEqual([]);
    });

    it('should query contacts for the correct user and provider', async () => {
      const connection = createMockConnection({ provider: 'GOOGLE' });
      mockPrisma.socialConnection.findMany.mockResolvedValue([connection]);
      mockPrisma.importedContact.count.mockResolvedValue(10);

      await service.getConnections('user-1');

      expect(mockPrisma.importedContact.count).toHaveBeenCalledWith({
        where: { ownerId: 'user-1', provider: 'GOOGLE' },
      });
    });
  });

  describe('disconnectProvider', () => {
    it('should delete connection and associated contacts', async () => {
      const connection = createMockConnection();

      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);
      mockPrisma.importedContact.deleteMany.mockResolvedValue({ count: 50 });
      mockPrisma.socialConnection.delete.mockResolvedValue(connection);

      await service.disconnectProvider('user-1', 'GOOGLE');

      expect(mockPrisma.importedContact.deleteMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1', provider: 'GOOGLE' },
      });
      expect(mockPrisma.socialConnection.delete).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
    });

    it('should throw NotFoundException when connection does not exist', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue(null);

      await expect(service.disconnectProvider('user-1', 'GOOGLE')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.disconnectProvider('user-1', 'GOOGLE')).rejects.toThrow(
        'Connection not found',
      );
    });

    it('should delete contacts before deleting connection', async () => {
      const connection = createMockConnection();
      const callOrder: string[] = [];

      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);
      mockPrisma.importedContact.deleteMany.mockImplementation(async () => {
        callOrder.push('deleteContacts');
        return { count: 10 };
      });
      mockPrisma.socialConnection.delete.mockImplementation(async () => {
        callOrder.push('deleteConnection');
        return connection;
      });

      await service.disconnectProvider('user-1', 'GOOGLE');

      expect(callOrder).toEqual(['deleteContacts', 'deleteConnection']);
    });

    it('should use compound key to find connection', async () => {
      const connection = createMockConnection();
      mockPrisma.socialConnection.findUnique.mockResolvedValue(connection);
      mockPrisma.importedContact.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.socialConnection.delete.mockResolvedValue(connection);

      await service.disconnectProvider('user-1', 'GOOGLE');

      expect(mockPrisma.socialConnection.findUnique).toHaveBeenCalledWith({
        where: { userId_provider: { userId: 'user-1', provider: 'GOOGLE' } },
      });
    });
  });
});
