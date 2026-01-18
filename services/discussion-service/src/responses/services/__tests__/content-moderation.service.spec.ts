import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentModerationService } from '../content-moderation.service.js';

describe('ContentModerationService', () => {
  let service: ContentModerationService;
  let mockPrisma: any;
  let lastUpdateCall: any;
  let lastFindManyCall: any;

  beforeEach(() => {
    lastUpdateCall = null;
    lastFindManyCall = null;

    mockPrisma = {
      response: {
        findUnique: async (_args: any) => null,
        update: async (args: any) => {
          lastUpdateCall = args;
          return { id: args.where.id, status: args.data.status };
        },
        findMany: async (args: any) => {
          lastFindManyCall = args;
          return [];
        },
      },
      discussionTopic: {
        findUnique: async (_args: any) => null,
      },
    };

    service = new ContentModerationService(mockPrisma);
  });

  describe('hideResponse', () => {
    it('should hide a visible response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';
      const reason = 'Violates community guidelines';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'VISIBLE',
        authorId: 'user-123',
        topicId: 'topic-123',
      });

      const result = await service.hideResponse(responseId, moderatorId, {
        action: 'hide',
        reason,
      });

      expect(result.responseId).toBe(responseId);
      expect(result.action).toBe('hide');
      expect(result.newStatus).toBe('hidden');
      expect(result.moderatorId).toBe(moderatorId);
      expect(result.reason).toBe(reason);
      expect(result.appealable).toBe(true);
      expect(lastUpdateCall).toEqual({
        where: { id: responseId },
        data: { status: 'HIDDEN' },
      });
    });

    it('should be idempotent when hiding already hidden response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';
      const reason = 'Violates community guidelines';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'HIDDEN',
        authorId: 'user-123',
        topicId: 'topic-123',
      });

      const result = await service.hideResponse(responseId, moderatorId, {
        action: 'hide',
        reason,
      });

      expect(result.responseId).toBe(responseId);
      expect(lastUpdateCall).toBe(null);
    });

    it('should throw when hiding removed response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'REMOVED',
        authorId: 'user-123',
        topicId: 'topic-123',
      });

      await expect(
        service.hideResponse(responseId, moderatorId, {
          action: 'hide',
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when response not found', async () => {
      const responseId = 'nonexistent';
      const moderatorId = 'mod-123';

      mockPrisma.response.findUnique = async () => null;

      await expect(
        service.hideResponse(responseId, moderatorId, {
          action: 'hide',
          reason: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when action is not hide', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';

      await expect(
        service.hideResponse(responseId, moderatorId, {
          action: 'remove',
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeResponse', () => {
    it('should remove a visible response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';
      const reason = 'Spam content';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'VISIBLE',
        authorId: 'user-123',
        topicId: 'topic-123',
      });

      const result = await service.removeResponse(responseId, moderatorId, {
        action: 'remove',
        reason,
      });

      expect(result.responseId).toBe(responseId);
      expect(result.action).toBe('remove');
      expect(result.newStatus).toBe('removed');
      expect(result.moderatorId).toBe(moderatorId);
      expect(result.reason).toBe(reason);
      expect(result.appealable).toBe(false);
      expect(lastUpdateCall).toEqual({
        where: { id: responseId },
        data: { status: 'REMOVED' },
      });
    });

    it('should remove a hidden response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';
      const reason = 'Escalated removal';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'HIDDEN',
        authorId: 'user-123',
        topicId: 'topic-123',
      });

      const result = await service.removeResponse(responseId, moderatorId, {
        action: 'remove',
        reason,
      });

      expect(result.newStatus).toBe('removed');
      expect(lastUpdateCall).not.toBe(null);
    });

    it('should throw when response not found', async () => {
      mockPrisma.response.findUnique = async () => null;

      await expect(
        service.removeResponse('nonexistent', 'mod-123', {
          action: 'remove',
          reason: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when action is not remove', async () => {
      await expect(
        service.removeResponse('response-123', 'mod-123', {
          action: 'hide',
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('restoreResponse', () => {
    it('should restore a hidden response', async () => {
      const responseId = 'response-123';
      const moderatorId = 'mod-123';
      const reason = 'Restored on appeal';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'HIDDEN',
        authorId: 'user-123',
      });

      const result = await service.restoreResponse(responseId, moderatorId, reason);

      expect(result.responseId).toBe(responseId);
      expect(result.moderatorId).toBe(moderatorId);
      expect(result.reason).toBe(reason);
      expect(lastUpdateCall).toEqual({
        where: { id: responseId },
        data: { status: 'VISIBLE' },
      });
    });

    it('should throw when response is not hidden', async () => {
      mockPrisma.response.findUnique = async () => ({
        id: 'response-123',
        status: 'VISIBLE',
        authorId: 'user-123',
      });

      await expect(service.restoreResponse('response-123', 'mod-123', 'test')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when response not found', async () => {
      mockPrisma.response.findUnique = async () => null;

      await expect(service.restoreResponse('nonexistent', 'mod-123', 'test')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResponseModerationStatus', () => {
    it('should return moderation status for visible response', async () => {
      const responseId = 'response-123';
      const now = new Date();

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'VISIBLE',
        authorId: 'user-123',
        topicId: 'topic-123',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getResponseModerationStatus(responseId);

      expect(result.responseId).toBe(responseId);
      expect(result.status).toBe('VISIBLE');
      expect(result.isHidden).toBe(false);
      expect(result.isRemoved).toBe(false);
      expect(result.isVisible).toBe(true);
    });

    it('should return moderation status for hidden response', async () => {
      const responseId = 'response-123';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        status: 'HIDDEN',
        authorId: 'user-123',
        topicId: 'topic-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getResponseModerationStatus(responseId);

      expect(result.isHidden).toBe(true);
      expect(result.isRemoved).toBe(false);
      expect(result.isVisible).toBe(false);
    });

    it('should throw when response not found', async () => {
      mockPrisma.response.findUnique = async () => null;

      await expect(service.getResponseModerationStatus('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResponsesByStatus', () => {
    it('should return hidden responses for a topic', async () => {
      const topicId = 'topic-123';

      mockPrisma.discussionTopic.findUnique = async () => ({ id: topicId });

      mockPrisma.response.findMany = async (args: any) => {
        lastFindManyCall = args;
        return [
          {
            id: 'response-1',
            status: 'HIDDEN',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'response-2',
            status: 'HIDDEN',
            authorId: 'user-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      };

      const result = await service.getResponsesByStatus(topicId, 'HIDDEN');

      expect(result).toHaveLength(2);
      expect(result[0]!.status).toBe('HIDDEN');
      expect(lastFindManyCall).toEqual({
        where: { topicId, status: 'HIDDEN' },
        select: {
          id: true,
          status: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw when topic not found', async () => {
      mockPrisma.discussionTopic.findUnique = async () => null;

      await expect(service.getResponsesByStatus('nonexistent', 'VISIBLE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
