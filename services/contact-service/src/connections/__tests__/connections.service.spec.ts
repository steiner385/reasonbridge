/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ConnectionsService } from '../connections.service.js';

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      socialConnection: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      importedContact: {
        count: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    service = new ConnectionsService(mockPrisma);
  });

  describe('initiateConnection', () => {
    it('should generate OAuth URL for Google', async () => {
      const result = await service.initiateConnection('user-123', 'GOOGLE');

      expect(result.authUrl).toContain('accounts.google.com');
      expect(result.state).toBeDefined();
    });

    it('should generate OAuth URL for Facebook', async () => {
      const result = await service.initiateConnection('user-123', 'FACEBOOK');

      expect(result.authUrl).toContain('facebook.com');
      expect(result.state).toBeDefined();
    });
  });

  describe('getConnections', () => {
    it('should return user connections with contact counts', async () => {
      mockPrisma.socialConnection.findMany.mockResolvedValue([
        { id: 'conn-1', provider: 'GOOGLE', createdAt: new Date() },
      ]);
      mockPrisma.importedContact.count.mockResolvedValue(42);

      const result = await service.getConnections('user-123');

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].contactCount).toBe(42);
    });

    it('should return empty array when no connections', async () => {
      mockPrisma.socialConnection.findMany.mockResolvedValue([]);

      const result = await service.getConnections('user-123');

      expect(result.connections).toHaveLength(0);
    });
  });

  describe('disconnectProvider', () => {
    it('should delete connection and imported contacts', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue({ id: 'conn-1' });
      mockPrisma.socialConnection.delete.mockResolvedValue({});
      mockPrisma.importedContact.deleteMany.mockResolvedValue({ count: 10 });

      await service.disconnectProvider('user-123', 'GOOGLE');

      expect(mockPrisma.importedContact.deleteMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123', provider: 'GOOGLE' },
      });
      expect(mockPrisma.socialConnection.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when connection not found', async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue(null);

      await expect(service.disconnectProvider('user-123', 'GOOGLE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
