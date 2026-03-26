/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

import { InvitationsService } from './invitations.service.js';

const createMockPrismaService = () => ({
  topicInvitation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
});

const createMockDiscussionClient = () => ({
  grantTopicAccess: vi.fn(),
  getTopicById: vi.fn(),
  canUserAccessTopic: vi.fn(),
});

const createMockInvitation = (overrides = {}) => ({
  id: 'inv-1',
  topicId: 'topic-1',
  inviterId: 'inviter-1',
  inviteeUserId: 'user-1',
  inviteeEmail: null,
  status: 'PENDING',
  token: 'test-token',
  message: null,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  respondedAt: null,
  ...overrides,
});

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockDiscussionClient: ReturnType<typeof createMockDiscussionClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockDiscussionClient = createMockDiscussionClient();
    service = new InvitationsService(mockPrisma as any, mockDiscussionClient as any);
  });

  describe('createInvitation', () => {
    it('should create a new invitation', async () => {
      const createdInvitation = createMockInvitation();

      mockPrisma.topicInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.topicInvitation.create.mockResolvedValue(createdInvitation);

      const result = await service.createInvitation('inviter-1', {
        topicId: 'topic-1',
        inviteeUserId: 'user-1',
      });

      expect(result.id).toBe('inv-1');
      expect(result.topicId).toBe('topic-1');
      expect(result.status).toBe('PENDING');
    });

    it('should prevent self-invitation', async () => {
      await expect(
        service.createInvitation('user-1', {
          topicId: 'topic-1',
          inviteeUserId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate pending invitations', async () => {
      mockPrisma.topicInvitation.findFirst.mockResolvedValue(createMockInvitation());

      await expect(
        service.createInvitation('inviter-1', {
          topicId: 'topic-1',
          inviteeUserId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept a pending invitation and grant topic access', async () => {
      const invitation = createMockInvitation();

      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);
      mockPrisma.topicInvitation.update.mockResolvedValue({
        ...invitation,
        status: 'ACCEPTED',
        respondedAt: new Date(),
      });
      mockDiscussionClient.grantTopicAccess.mockResolvedValue(true);

      const result = await service.acceptInvitation('inv-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.topicId).toBe('topic-1');
      expect(mockDiscussionClient.grantTopicAccess).toHaveBeenCalledWith(
        'topic-1',
        'user-1',
        'inv-1',
      );
    });

    it('should still succeed if grantTopicAccess fails (fire-and-forget)', async () => {
      const invitation = createMockInvitation();

      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);
      mockPrisma.topicInvitation.update.mockResolvedValue({
        ...invitation,
        status: 'ACCEPTED',
      });
      mockDiscussionClient.grantTopicAccess.mockResolvedValue(false);

      const result = await service.acceptInvitation('inv-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.topicId).toBe('topic-1');
    });

    it('should throw NotFoundException for non-existent invitation', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the invitee', async () => {
      const invitation = createMockInvitation({ inviteeUserId: 'other-user' });
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);

      await expect(service.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for expired invitation', async () => {
      const invitation = createMockInvitation({
        expiresAt: new Date(Date.now() - 1000), // Expired
      });
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);

      await expect(service.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already accepted invitation', async () => {
      const invitation = createMockInvitation({ status: 'ACCEPTED' });
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);

      await expect(service.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('declineInvitation', () => {
    it('should decline a pending invitation', async () => {
      const invitation = createMockInvitation();

      mockPrisma.topicInvitation.findUnique.mockResolvedValue(invitation);
      mockPrisma.topicInvitation.update.mockResolvedValue({
        ...invitation,
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

    it('should throw NotFoundException for non-existent invitation', async () => {
      mockPrisma.topicInvitation.findUnique.mockResolvedValue(null);

      await expect(service.declineInvitation('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSentInvitations', () => {
    it('should return paginated sent invitations', async () => {
      const invitations = [createMockInvitation(), createMockInvitation({ id: 'inv-2' })];

      mockPrisma.topicInvitation.findMany.mockResolvedValue(invitations);
      mockPrisma.topicInvitation.count.mockResolvedValue(2);

      const result = await service.getSentInvitations('inviter-1', { page: 1, limit: 50 });

      expect(result.invitations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getReceivedInvitations', () => {
    it('should return paginated received invitations', async () => {
      const invitations = [createMockInvitation()];

      mockPrisma.topicInvitation.findMany.mockResolvedValue(invitations);
      mockPrisma.topicInvitation.count.mockResolvedValue(1);

      const result = await service.getReceivedInvitations('user-1', { page: 1, limit: 50 });

      expect(result.invitations).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
