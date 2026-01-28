import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResponsesService } from '../responses.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CommonGroundTriggerService } from '../../services/common-ground-trigger.service.js';
import type { CreateResponseDto } from '../dto/create-response.dto.js';
import type { UpdateResponseDto } from '../dto/update-response.dto.js';

describe('ResponsesService', () => {
  let service: ResponsesService;
  let prismaService: PrismaService;
  let commonGroundTrigger: CommonGroundTriggerService;

  const mockTopic = {
    id: 'topic-1',
    title: 'Climate Change',
    status: 'ACTIVE',
    responseCount: 0,
  };

  const mockUser = {
    id: 'user-1',
    displayName: 'John Doe',
  };

  const mockResponse = {
    id: 'response-1',
    topicId: 'topic-1',
    authorId: 'user-1',
    content: 'This is a response about climate change.',
    parentId: null,
    citedSources: null,
    containsOpinion: false,
    containsFactualClaims: true,
    status: 'VISIBLE',
    revisionCount: 0,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20'),
    author: mockUser,
    propositions: [],
  };

  beforeEach(() => {
    prismaService = {
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
    } as unknown as PrismaService;

    commonGroundTrigger = {
      checkAndTrigger: vi.fn().mockResolvedValue(undefined),
    } as unknown as CommonGroundTriggerService;

    service = new ResponsesService(prismaService, commonGroundTrigger);
  });

  describe('getResponsesForTopic', () => {
    it('should retrieve all responses for a topic', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      const responses = [
        mockResponse,
        { ...mockResponse, id: 'response-2', content: 'Another response' },
      ];
      prismaService.response.findMany.mockResolvedValue(responses as any);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('response-1');
      expect(result[1].id).toBe('response-2');
    });

    it('should return empty array when topic has no responses', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.findMany.mockResolvedValue([] as any);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result).toHaveLength(0);
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getResponsesForTopic('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should order responses by creation time (oldest first)', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      const newerResponse = {
        ...mockResponse,
        id: 'response-new',
        createdAt: new Date('2026-01-20'),
      };
      const olderResponse = {
        ...mockResponse,
        id: 'response-old',
        createdAt: new Date('2026-01-10'),
      };
      prismaService.response.findMany.mockResolvedValue([olderResponse, newerResponse] as any);

      const result = await service.getResponsesForTopic('topic-1');

      expect(result[0].id).toBe('response-old');
      expect(result[1].id).toBe('response-new');
    });
  });

  describe('createResponse', () => {
    const validDto: CreateResponseDto = {
      content: 'This is a valid response with sufficient content.',
      containsOpinion: false,
      containsFactualClaims: true,
    };

    it('should create a new response', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);
      prismaService.discussionTopic.update.mockResolvedValue(mockTopic as any);

      const result = await service.createResponse('topic-1', 'user-1', validDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('response-1');
      expect(result.content).toBe(mockResponse.content);
      expect(result.authorId).toBe('user-1');
    });

    it('should throw BadRequestException for content too short', async () => {
      const shortDto: CreateResponseDto = {
        content: 'Short',
        containsOpinion: false,
      };

      await expect(service.createResponse('topic-1', 'user-1', shortDto)).rejects.toThrow(
        new BadRequestException('Response content must be at least 10 characters'),
      );
    });

    it('should throw BadRequestException for content too long', async () => {
      const longDto: CreateResponseDto = {
        content: 'x'.repeat(10001),
        containsOpinion: false,
      };

      await expect(service.createResponse('topic-1', 'user-1', longDto)).rejects.toThrow(
        new BadRequestException('Response content must not exceed 10000 characters'),
      );
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.createResponse('non-existent', 'user-1', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when adding to archived topic', async () => {
      const archivedTopic = { ...mockTopic, status: 'ARCHIVED' };
      prismaService.discussionTopic.findUnique.mockResolvedValue(archivedTopic as any);

      await expect(service.createResponse('topic-1', 'user-1', validDto)).rejects.toThrow(
        new BadRequestException('Cannot add responses to archived topics'),
      );
    });

    it('should support parent response threading', async () => {
      const dtoWithParent: CreateResponseDto = {
        ...validDto,
        parentId: 'response-parent',
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      // First call for parent validation, second for full response fetch
      prismaService.response.findUnique
        .mockResolvedValueOnce({
          id: 'response-parent',
          topicId: 'topic-1',
        } as any)
        .mockResolvedValueOnce(mockResponse as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);

      const result = await service.createResponse('topic-1', 'user-1', dtoWithParent);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for non-existent parent response', async () => {
      const dtoWithParent: CreateResponseDto = {
        ...validDto,
        parentId: 'non-existent-parent',
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.findUnique.mockResolvedValue(null);

      await expect(service.createResponse('topic-1', 'user-1', dtoWithParent)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if parent response belongs to different topic', async () => {
      const dtoWithParent: CreateResponseDto = {
        ...validDto,
        parentId: 'response-other-topic',
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.findUnique.mockResolvedValue({
        id: 'response-other-topic',
        topicId: 'topic-2', // Different topic
      } as any);

      await expect(service.createResponse('topic-1', 'user-1', dtoWithParent)).rejects.toThrow(
        new BadRequestException('Parent response must belong to the same topic'),
      );
    });

    it('should create response with cited sources', async () => {
      const dtoWithSources: CreateResponseDto = {
        ...validDto,
        citedSources: ['https://example.com', 'https://another.com'],
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue({
        ...mockResponse,
        citedSources: [
          { url: 'https://example.com', title: null },
          { url: 'https://another.com', title: null },
        ],
      } as any);
      prismaService.response.findUnique.mockResolvedValue({
        ...mockResponse,
        citedSources: [
          { url: 'https://example.com', title: null },
          { url: 'https://another.com', title: null },
        ],
      } as any);

      await service.createResponse('topic-1', 'user-1', dtoWithSources);

      expect(prismaService.response.create).toHaveBeenCalled();
    });

    it('should create response with proposition associations', async () => {
      const dtoWithPropositions: CreateResponseDto = {
        ...validDto,
        propositionIds: ['prop-1', 'prop-2'],
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);

      await service.createResponse('topic-1', 'user-1', dtoWithPropositions);

      expect(prismaService.responseProposition.createMany).toHaveBeenCalledWith({
        data: [
          { responseId: 'response-1', propositionId: 'prop-1' },
          { responseId: 'response-1', propositionId: 'prop-2' },
        ],
        skipDuplicates: true,
      });
    });

    it('should increment topic response count', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);
      prismaService.discussionTopic.update.mockResolvedValue(mockTopic as any);

      await service.createResponse('topic-1', 'user-1', validDto);

      expect(prismaService.discussionTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: {
          responseCount: {
            increment: 1,
          },
        },
      });
    });

    it('should trigger common ground analysis', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);

      await service.createResponse('topic-1', 'user-1', validDto);

      expect(commonGroundTrigger.checkAndTrigger).toHaveBeenCalledWith('topic-1');
    });

    it('should handle common ground trigger errors gracefully', async () => {
      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue(mockResponse as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);
      commonGroundTrigger.checkAndTrigger.mockRejectedValue(new Error('Trigger failed'));

      const loggerSpy = vi.spyOn((service as any).logger, 'error').mockImplementation(() => {});

      const result = await service.createResponse('topic-1', 'user-1', validDto);

      // Should still create the response even if trigger fails
      expect(result).toBeDefined();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should trim content whitespace', async () => {
      const dtoWithWhitespace: CreateResponseDto = {
        content: '   This is a response with leading/trailing whitespace.   ',
        containsOpinion: false,
      };

      prismaService.discussionTopic.findUnique.mockResolvedValue(mockTopic as any);
      prismaService.response.create.mockResolvedValue({
        ...mockResponse,
        content: 'This is a response with leading/trailing whitespace.',
      } as any);
      prismaService.response.findUnique.mockResolvedValue(mockResponse as any);

      await service.createResponse('topic-1', 'user-1', dtoWithWhitespace);

      expect(prismaService.response.create).toHaveBeenCalled();
      const createCall = prismaService.response.create.mock.calls[0];
      expect(createCall[0].data.content).toMatch(/^\S.*\S$/);
    });
  });

  describe('updateResponse', () => {
    const updateDto: UpdateResponseDto = {
      content: 'Updated response content with new information.',
    };

    const responseWithTopic = {
      ...mockResponse,
      topic: mockTopic,
    };

    it('should update response content', async () => {
      const updatedResponse = {
        ...responseWithTopic,
        content: updateDto.content,
      };
      prismaService.response.findUnique.mockResolvedValue(responseWithTopic as any);
      prismaService.response.update.mockResolvedValue(updatedResponse as any);

      const result = await service.updateResponse('response-1', 'user-1', updateDto);

      expect(result.content).toBe(updateDto.content);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      prismaService.response.findUnique.mockResolvedValue(responseWithTopic as any);

      // Try to update with different user
      await expect(
        service.updateResponse('response-1', 'different-user', updateDto),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException if response does not exist', async () => {
      prismaService.response.findUnique.mockResolvedValue(null);

      await expect(service.updateResponse('non-existent', 'user-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should increment revision count', async () => {
      prismaService.response.findUnique.mockResolvedValue(responseWithTopic as any);
      prismaService.response.update.mockResolvedValue({
        ...responseWithTopic,
        revisionCount: 1,
        content: updateDto.content,
      } as any);

      await service.updateResponse('response-1', 'user-1', updateDto);

      expect(prismaService.response.update).toHaveBeenCalled();
      const updateCall = prismaService.response.update.mock.calls[0];
      expect(updateCall[0].data.revisionCount).toBeDefined();
    });
  });
});
