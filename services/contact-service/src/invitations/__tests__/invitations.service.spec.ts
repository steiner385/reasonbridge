/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationsService } from '../invitations.service.js';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      topicInvitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };
    service = new InvitationsService(mockPrisma);
  });

  describe('createInvitation', () => {
    it('should create invitation with token and 7-day expiry', async () => {
      mockPrisma.topicInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.topicInvitation.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'inv-1',
          ...data,
          createdAt: new Date(),
        }),
      );

      const result = await service.createInvitation('inviter-1', {
        topicId: 'topic-1',
        inviteeUserId: 'invitee-1',
      });

      expect(result.id).toBe('inv-1');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.topicInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          topicId: 'topic-1',
          inviterId: 'inviter-1',
          inviteeUserId: 'invitee-1',
          status: 'PENDING',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw error for self-invitation', async () => {
      await expect(
        service.createInvitation('user-1', {
          topicId: 'topic-1',
          inviteeUserId: 'user-1',
        }),
      ).rejects.toThrow('Cannot invite yourself');
    });

    it('should throw error for duplicate pending invitation', async () => {
      mockPrisma.topicInvitation.findFirst.mockResolvedValue({
        id: 'existing-inv',
        status: 'PENDING',
      });

      await expect(
        service.createInvitation('inviter-1', {
          topicId: 'topic-1',
          inviteeUserId: 'invitee-1',
        }),
      ).rejects.toThrow('Invitation already sent');
    });

    it('should allow invitation via email', async () => {
      mockPrisma.topicInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.topicInvitation.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv-1', ...data, createdAt: new Date() }),
      );

      const result = await service.createInvitation('inviter-1', {
        topicId: 'topic-1',
        inviteeEmail: 'newuser@example.com',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.topicInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviteeEmail: 'newuser@example.com',
          inviteeUserId: null,
        }),
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should update invitation status to ACCEPTED', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        topicId: 'topic-1',
        inviteeUserId: 'user-1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.topicInvitation.update.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
        topicId: 'topic-1',
      });

      const result = await service.acceptInvitation('inv-1', 'user-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.topicInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          status: 'ACCEPTED',
          respondedAt: expect.any(Date),
        },
      });
    });

    it('should throw error for expired invitation', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      });

      await expect(service.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(
        'Invitation has expired',
      );
    });

    it('should throw error if invitation not found', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(
        'Invitation not found',
      );
    });

    it('should throw error if user is not the invitee', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        inviteeUserId: 'other-user',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.acceptInvitation('inv-1', 'wrong-user')).rejects.toThrow(
        'Not authorized',
      );
    });
  });

  describe('declineInvitation', () => {
    it('should update invitation status to DECLINED', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        inviteeUserId: 'user-1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.topicInvitation.update.mockResolvedValue({
        id: 'inv-1',
        status: 'DECLINED',
      });

      await service.declineInvitation('inv-1', 'user-1');

      expect(mockPrisma.topicInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          status: 'DECLINED',
          respondedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getSentInvitations', () => {
    it('should return paginated invitations sent by user', async () => {
      mockPrisma.topicInvitation.findMany.mockResolvedValue([
        { id: 'inv-1', topicId: 'topic-1', status: 'PENDING' },
      ]);
      mockPrisma.topicInvitation.count.mockResolvedValue(1);

      const result = await service.getSentInvitations('user-1', { limit: 10 });

      expect(result.invitations).toHaveLength(1);
      expect(mockPrisma.topicInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { inviterId: 'user-1' },
        }),
      );
    });
  });

  describe('getReceivedInvitations', () => {
    it('should return invitations received by user', async () => {
      mockPrisma.topicInvitation.findMany.mockResolvedValue([
        { id: 'inv-1', topicId: 'topic-1', status: 'PENDING' },
      ]);
      mockPrisma.topicInvitation.count.mockResolvedValue(1);

      const result = await service.getReceivedInvitations('user-1', {});

      expect(result.invitations).toHaveLength(1);
      expect(mockPrisma.topicInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { inviteeUserId: 'user-1' },
        }),
      );
    });
  });
});
