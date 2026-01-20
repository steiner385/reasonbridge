import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ResponsesService } from './responses.service.js';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  response: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  responseProposition: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
});

const createMockCommonGroundTrigger = () => ({
  checkAndTrigger: vi.fn().mockResolvedValue(undefined),
});

const createMockResponse = (overrides = {}) => ({
  id: 'response-1',
  topicId: 'topic-1',
  authorId: 'user-1',
  parentId: null,
  content: 'This is a test response with sufficient content.',
  clarityScore: { toNumber: () => 0.8 },
  containsOpinion: false,
  containsFactualClaims: false,
  citedSources: null,
  revisionCount: 0,
  status: 'VISIBLE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  author: { id: 'user-1', displayName: 'Test User' },
  propositions: [],
  ...overrides,
});

describe('ResponsesService', () => {
  let service: ResponsesService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCommonGroundTrigger: ReturnType<typeof createMockCommonGroundTrigger>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCommonGroundTrigger = createMockCommonGroundTrigger();
    service = new ResponsesService(mockPrisma as any, mockCommonGroundTrigger as any);
  });

  describe('getResponsesForTopic', () => {
    it('should return responses for a topic', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([createMockResponse()]);

      const result = await service.getResponsesForTopic('topic-1');

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        select: { id: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('response-1');
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getResponsesForTopic('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if topic has no responses', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([]);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result).toHaveLength(0);
    });

    it('should order responses by createdAt ascending', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([]);

      await service.getResponsesForTopic('topic-1');

      expect(mockPrisma.response.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('createResponse validation', () => {
    const validDto = {
      content: 'This is a valid response with more than 10 characters.',
    };

    it('should throw BadRequestException if content is too short', async () => {
      await expect(
        service.createResponse('topic-1', 'user-1', { content: 'short' }),
      ).rejects.toThrow('Response content must be at least 10 characters');
    });

    it('should throw BadRequestException if content is too long', async () => {
      const longContent = 'a'.repeat(10001);
      await expect(
        service.createResponse('topic-1', 'user-1', { content: longContent }),
      ).rejects.toThrow('Response content must not exceed 10000 characters');
    });

    it('should throw BadRequestException if content is empty', async () => {
      await expect(service.createResponse('topic-1', 'user-1', { content: '' })).rejects.toThrow(
        'Response content must be at least 10 characters',
      );
    });

    it('should throw BadRequestException if content is whitespace only', async () => {
      await expect(
        service.createResponse('topic-1', 'user-1', { content: '         ' }),
      ).rejects.toThrow('Response content must be at least 10 characters');
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.createResponse('nonexistent', 'user-1', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if topic is archived', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ARCHIVED',
      });

      await expect(service.createResponse('topic-1', 'user-1', validDto)).rejects.toThrow(
        'Cannot add responses to archived topics',
      );
    });

    it('should create response successfully for active topic', async () => {
      const mockResponse = createMockResponse();
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});

      const result = await service.createResponse('topic-1', 'user-1', validDto);

      expect(mockPrisma.response.create).toHaveBeenCalled();
      expect(result.id).toBe('response-1');
    });

    it('should throw NotFoundException if parentId does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(
        service.createResponse('topic-1', 'user-1', {
          ...validDto,
          parentId: 'nonexistent-parent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if parent response belongs to different topic', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'parent-1',
        topicId: 'different-topic',
      });

      await expect(
        service.createResponse('topic-1', 'user-1', {
          ...validDto,
          parentId: 'parent-1',
        }),
      ).rejects.toThrow('Parent response must belong to the same topic');
    });

    it('should create response with parentId when valid', async () => {
      const mockResponse = createMockResponse({ parentId: 'parent-1' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.findUnique
        .mockResolvedValueOnce({ id: 'parent-1', topicId: 'topic-1' })
        .mockResolvedValue(mockResponse);
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});

      const result = await service.createResponse('topic-1', 'user-1', {
        ...validDto,
        parentId: 'parent-1',
      });

      expect(result.parentId).toBe('parent-1');
    });

    it('should create response with cited sources', async () => {
      const mockResponse = createMockResponse({
        citedSources: [{ url: 'https://example.com', title: null }],
      });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});

      const result = await service.createResponse('topic-1', 'user-1', {
        ...validDto,
        citedSources: ['https://example.com'],
      });

      expect(mockPrisma.response.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            citedSources: expect.arrayContaining([
              expect.objectContaining({ url: 'https://example.com' }),
            ]),
          }),
        }),
      );
    });

    it('should create proposition associations when provided', async () => {
      const mockResponse = createMockResponse();
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});
      mockPrisma.responseProposition.createMany.mockResolvedValue({});

      await service.createResponse('topic-1', 'user-1', {
        ...validDto,
        propositionIds: ['prop-1', 'prop-2'],
      });

      expect(mockPrisma.responseProposition.createMany).toHaveBeenCalledWith({
        data: [
          { responseId: 'response-1', propositionId: 'prop-1' },
          { responseId: 'response-1', propositionId: 'prop-2' },
        ],
        skipDuplicates: true,
      });
    });

    it('should trigger common ground analysis after creating response', async () => {
      const mockResponse = createMockResponse();
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});

      await service.createResponse('topic-1', 'user-1', validDto);

      expect(mockCommonGroundTrigger.checkAndTrigger).toHaveBeenCalledWith('topic-1');
    });

    it('should increment topic response count', async () => {
      const mockResponse = createMockResponse();
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        status: 'ACTIVE',
      });
      mockPrisma.response.create.mockResolvedValue(mockResponse);
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.discussionTopic.update.mockResolvedValue({});

      await service.createResponse('topic-1', 'user-1', validDto);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: { responseCount: { increment: 1 } },
      });
    });
  });

  describe('updateResponse', () => {
    const updateDto = {
      content: 'Updated content that is long enough to pass validation.',
    };

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.updateResponse('nonexistent', 'user-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ authorId: 'different-user', topic: { status: 'ACTIVE' } }),
      );

      await expect(service.updateResponse('response-1', 'user-1', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if response is hidden', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ status: 'HIDDEN', topic: { status: 'ACTIVE' } }),
      );

      await expect(service.updateResponse('response-1', 'user-1', updateDto)).rejects.toThrow(
        'Cannot edit responses with status: HIDDEN',
      );
    });

    it('should throw BadRequestException if response is removed', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ status: 'REMOVED', topic: { status: 'ACTIVE' } }),
      );

      await expect(service.updateResponse('response-1', 'user-1', updateDto)).rejects.toThrow(
        'Cannot edit responses with status: REMOVED',
      );
    });

    it('should throw BadRequestException if topic is archived', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ARCHIVED' } }),
      );

      await expect(service.updateResponse('response-1', 'user-1', updateDto)).rejects.toThrow(
        'Cannot edit responses in archived topics',
      );
    });

    it('should throw BadRequestException if updated content is too short', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );

      await expect(
        service.updateResponse('response-1', 'user-1', { content: 'short' }),
      ).rejects.toThrow('Response content must be at least 10 characters');
    });

    it('should throw BadRequestException if updated content is too long', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );

      await expect(
        service.updateResponse('response-1', 'user-1', { content: 'a'.repeat(10001) }),
      ).rejects.toThrow('Response content must not exceed 10000 characters');
    });

    it('should update response content successfully', async () => {
      const updatedResponse = createMockResponse({
        content: 'Updated content',
        topic: { status: 'ACTIVE' },
      });
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );
      mockPrisma.response.update.mockResolvedValue(updatedResponse);

      const result = await service.updateResponse('response-1', 'user-1', updateDto);

      expect(mockPrisma.response.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: updateDto.content.trim(),
            revisionCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should update containsOpinion field', async () => {
      const updatedResponse = createMockResponse({
        containsOpinion: true,
        topic: { status: 'ACTIVE' },
      });
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );
      mockPrisma.response.update.mockResolvedValue(updatedResponse);

      await service.updateResponse('response-1', 'user-1', { containsOpinion: true });

      expect(mockPrisma.response.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            containsOpinion: true,
          }),
        }),
      );
    });

    it('should update containsFactualClaims field', async () => {
      const updatedResponse = createMockResponse({
        containsFactualClaims: true,
        topic: { status: 'ACTIVE' },
      });
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );
      mockPrisma.response.update.mockResolvedValue(updatedResponse);

      await service.updateResponse('response-1', 'user-1', { containsFactualClaims: true });

      expect(mockPrisma.response.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            containsFactualClaims: true,
          }),
        }),
      );
    });

    it('should update citedSources field', async () => {
      const updatedResponse = createMockResponse({
        citedSources: [{ url: 'https://new-source.com' }],
        topic: { status: 'ACTIVE' },
      });
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );
      mockPrisma.response.update.mockResolvedValue(updatedResponse);

      await service.updateResponse('response-1', 'user-1', {
        citedSources: ['https://new-source.com'],
      });

      expect(mockPrisma.response.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            citedSources: expect.arrayContaining([
              expect.objectContaining({ url: 'https://new-source.com' }),
            ]),
          }),
        }),
      );
    });

    it('should clear citedSources when empty array provided', async () => {
      const updatedResponse = createMockResponse({
        citedSources: null,
        topic: { status: 'ACTIVE' },
      });
      mockPrisma.response.findUnique.mockResolvedValue(
        createMockResponse({ topic: { status: 'ACTIVE' } }),
      );
      mockPrisma.response.update.mockResolvedValue(updatedResponse);

      await service.updateResponse('response-1', 'user-1', { citedSources: [] });

      expect(mockPrisma.response.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            citedSources: null,
          }),
        }),
      );
    });

    it('should update proposition associations when provided', async () => {
      const updatedResponse = createMockResponse({ topic: { status: 'ACTIVE' } });
      mockPrisma.response.findUnique
        .mockResolvedValueOnce(createMockResponse({ topic: { status: 'ACTIVE' } }))
        .mockResolvedValue(updatedResponse);
      mockPrisma.response.update.mockResolvedValue(updatedResponse);
      mockPrisma.responseProposition.deleteMany.mockResolvedValue({});
      mockPrisma.responseProposition.createMany.mockResolvedValue({});

      await service.updateResponse('response-1', 'user-1', {
        propositionIds: ['prop-1', 'prop-2'],
      });

      expect(mockPrisma.responseProposition.deleteMany).toHaveBeenCalledWith({
        where: { responseId: 'response-1' },
      });
      expect(mockPrisma.responseProposition.createMany).toHaveBeenCalledWith({
        data: [
          { responseId: 'response-1', propositionId: 'prop-1' },
          { responseId: 'response-1', propositionId: 'prop-2' },
        ],
        skipDuplicates: true,
      });
    });

    it('should clear proposition associations when empty array provided', async () => {
      const updatedResponse = createMockResponse({ topic: { status: 'ACTIVE' } });
      mockPrisma.response.findUnique
        .mockResolvedValueOnce(createMockResponse({ topic: { status: 'ACTIVE' } }))
        .mockResolvedValue(updatedResponse);
      mockPrisma.response.update.mockResolvedValue(updatedResponse);
      mockPrisma.responseProposition.deleteMany.mockResolvedValue({});

      await service.updateResponse('response-1', 'user-1', { propositionIds: [] });

      expect(mockPrisma.responseProposition.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.responseProposition.createMany).not.toHaveBeenCalled();
    });
  });

  describe('mapToResponseDto', () => {
    it('should handle response with propositions and relevanceScore', async () => {
      const responseWithPropositions = createMockResponse({
        propositions: [
          {
            proposition: { id: 'prop-1', statement: 'Statement 1' },
            relevanceScore: { toNumber: () => 0.9 },
          },
        ],
      });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([responseWithPropositions]);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result[0].propositions).toHaveLength(1);
      expect(result[0].propositions![0].id).toBe('prop-1');
    });

    it('should handle response without author', async () => {
      const responseWithoutAuthor = createMockResponse({ author: null });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([responseWithoutAuthor]);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result[0].author).toBeUndefined();
    });

    it('should lowercase status in response', async () => {
      const response = createMockResponse({ status: 'VISIBLE' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.response.findMany.mockResolvedValue([response]);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result[0].status).toBe('visible');
    });
  });
});
