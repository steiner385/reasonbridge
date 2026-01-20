import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentModerationService } from './content-moderation.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  discussionTopic: {
    findUnique: vi.fn(),
  },
});

const createMockResponse = (overrides = {}) => ({
  id: 'response-1',
  status: 'VISIBLE',
  authorId: 'author-1',
  topicId: 'topic-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  ...overrides,
});

describe('ContentModerationService', () => {
  let service: ContentModerationService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new ContentModerationService(mockPrisma as any);
  });

  describe('hideResponse', () => {
    const hideDto = { action: 'hide' as const, reason: 'Inappropriate content' };

    it('should throw BadRequestException if action is not "hide"', async () => {
      await expect(
        service.hideResponse('response-1', 'mod-1', { action: 'remove' as any, reason: 'test' }),
      ).rejects.toThrow('Action must be "hide" for this operation');
    });

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.hideResponse('nonexistent', 'mod-1', hideDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if response is already removed', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'REMOVED' }));

      await expect(service.hideResponse('response-1', 'mod-1', hideDto)).rejects.toThrow(
        'Cannot hide a response that has been removed',
      );
    });

    it('should return idempotent response if already hidden', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'HIDDEN' }));

      const result = await service.hideResponse('response-1', 'mod-1', hideDto);

      expect(mockPrisma.response.update).not.toHaveBeenCalled();
      expect(result.responseId).toBe('response-1');
      expect(result.action).toBe('hide');
    });

    it('should hide visible response successfully', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.hideResponse('response-1', 'mod-1', hideDto);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        data: { status: 'HIDDEN' },
      });
      expect(result.responseId).toBe('response-1');
      expect(result.action).toBe('hide');
      expect(result.moderatorId).toBe('mod-1');
      expect(result.reason).toBe('Inappropriate content');
      expect(result.newStatus).toBe('hidden');
      expect(result.appealable).toBe(true);
    });

    it('should include actionTimestamp in result', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.hideResponse('response-1', 'mod-1', hideDto);

      expect(result.actionTimestamp).toBeInstanceOf(Date);
    });
  });

  describe('removeResponse', () => {
    const removeDto = { action: 'remove' as const, reason: 'Violates guidelines' };

    it('should throw BadRequestException if action is not "remove"', async () => {
      await expect(
        service.removeResponse('response-1', 'mod-1', { action: 'hide' as any, reason: 'test' }),
      ).rejects.toThrow('Action must be "remove" for this operation');
    });

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.removeResponse('nonexistent', 'mod-1', removeDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove visible response successfully', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.removeResponse('response-1', 'mod-1', removeDto);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        data: { status: 'REMOVED' },
      });
      expect(result.responseId).toBe('response-1');
      expect(result.action).toBe('remove');
      expect(result.newStatus).toBe('removed');
      expect(result.appealable).toBe(false);
    });

    it('should remove hidden response successfully', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'HIDDEN' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.removeResponse('response-1', 'mod-1', removeDto);

      expect(result.newStatus).toBe('removed');
    });

    it('should mark removed content as not appealable', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.removeResponse('response-1', 'mod-1', removeDto);

      expect(result.appealable).toBe(false);
    });
  });

  describe('restoreResponse', () => {
    const reason = 'Appeal approved';

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.restoreResponse('nonexistent', 'mod-1', reason)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if response is not hidden', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));

      await expect(service.restoreResponse('response-1', 'mod-1', reason)).rejects.toThrow(
        'Cannot restore response with status: VISIBLE',
      );
    });

    it('should throw BadRequestException if response is removed', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'REMOVED' }));

      await expect(service.restoreResponse('response-1', 'mod-1', reason)).rejects.toThrow(
        'Cannot restore response with status: REMOVED',
      );
    });

    it('should restore hidden response successfully', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'HIDDEN' }));
      mockPrisma.response.update.mockResolvedValue({});

      const result = await service.restoreResponse('response-1', 'mod-1', reason);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        data: { status: 'VISIBLE' },
      });
      expect(result.responseId).toBe('response-1');
      expect(result.action).toBe('restore');
      expect(result.reason).toBe('Appeal approved');
    });
  });

  describe('getResponseModerationStatus', () => {
    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.getResponseModerationStatus('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return status for visible response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'VISIBLE' }));

      const result = await service.getResponseModerationStatus('response-1');

      expect(result.responseId).toBe('response-1');
      expect(result.status).toBe('VISIBLE');
      expect(result.isVisible).toBe(true);
      expect(result.isHidden).toBe(false);
      expect(result.isRemoved).toBe(false);
    });

    it('should return status for hidden response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'HIDDEN' }));

      const result = await service.getResponseModerationStatus('response-1');

      expect(result.isVisible).toBe(false);
      expect(result.isHidden).toBe(true);
      expect(result.isRemoved).toBe(false);
    });

    it('should return status for removed response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(createMockResponse({ status: 'REMOVED' }));

      const result = await service.getResponseModerationStatus('response-1');

      expect(result.isVisible).toBe(false);
      expect(result.isHidden).toBe(false);
      expect(result.isRemoved).toBe(true);
    });

    it('should include timestamps', async () => {
      const createdAt = new Date('2026-01-01');
      const updatedAt = new Date('2026-01-02');
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ createdAt, updatedAt }),
      );

      const result = await service.getResponseModerationStatus('response-1');

      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });
  });

  describe('getResponsesByStatus', () => {
    it('should throw NotFoundException if topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getResponsesByStatus('nonexistent', 'VISIBLE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return responses filtered by status', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([
        createMockResponse({ status: 'HIDDEN' }),
        createMockResponse({ id: 'response-2', status: 'HIDDEN' }),
      ]);

      const result = await service.getResponsesByStatus('topic-1', 'HIDDEN');

      expect(mockPrisma.response.findMany).toHaveBeenCalledWith({
        where: {
          topicId: 'topic-1',
          status: 'HIDDEN',
        },
        select: {
          id: true,
          status: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no responses match status', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([]);

      const result = await service.getResponsesByStatus('topic-1', 'REMOVED');

      expect(result).toHaveLength(0);
    });

    it('should order responses by createdAt descending', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([]);

      await service.getResponsesByStatus('topic-1', 'VISIBLE');

      expect(mockPrisma.response.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
