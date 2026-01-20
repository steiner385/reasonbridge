import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponsesController } from './responses.controller.js';

const createMockResponsesService = () => ({
  getResponsesForTopic: vi.fn(),
  createResponse: vi.fn(),
  updateResponse: vi.fn(),
});

const createMockContentModerationService = () => ({
  hideResponse: vi.fn(),
  removeResponse: vi.fn(),
  restoreResponse: vi.fn(),
  getResponseModerationStatus: vi.fn(),
  getResponsesByStatus: vi.fn(),
});

describe('ResponsesController', () => {
  let controller: ResponsesController;
  let mockResponsesService: ReturnType<typeof createMockResponsesService>;
  let mockContentModerationService: ReturnType<typeof createMockContentModerationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsesService = createMockResponsesService();
    mockContentModerationService = createMockContentModerationService();
    controller = new ResponsesController(
      mockResponsesService as any,
      mockContentModerationService as any,
    );
  });

  describe('getResponsesForTopic', () => {
    it('should return responses for a topic', async () => {
      const responses = [
        { id: 'response-1', content: 'First response' },
        { id: 'response-2', content: 'Second response' },
      ];
      mockResponsesService.getResponsesForTopic.mockResolvedValue(responses);

      const result = await controller.getResponsesForTopic('topic-1');

      expect(result).toEqual(responses);
      expect(mockResponsesService.getResponsesForTopic).toHaveBeenCalledWith('topic-1');
    });

    it('should return empty array when no responses exist', async () => {
      mockResponsesService.getResponsesForTopic.mockResolvedValue([]);

      const result = await controller.getResponsesForTopic('topic-1');

      expect(result).toEqual([]);
    });
  });

  describe('createResponse', () => {
    it('should create a new response', async () => {
      const createDto = { content: 'New response content' };
      const createdResponse = { id: 'response-1', ...createDto };
      mockResponsesService.createResponse.mockResolvedValue(createdResponse);

      const result = await controller.createResponse('topic-1', createDto as any);

      expect(result).toEqual(createdResponse);
      expect(mockResponsesService.createResponse).toHaveBeenCalledWith(
        'topic-1',
        '00000000-0000-0000-0000-000000000000', // Placeholder authorId
        createDto,
      );
    });

    it('should use placeholder authorId', async () => {
      const createDto = { content: 'Test' };
      mockResponsesService.createResponse.mockResolvedValue({ id: 'response-1' });

      await controller.createResponse('topic-1', createDto as any);

      expect(mockResponsesService.createResponse).toHaveBeenCalledWith(
        expect.any(String),
        '00000000-0000-0000-0000-000000000000',
        expect.any(Object),
      );
    });
  });

  describe('updateResponse', () => {
    it('should update an existing response', async () => {
      const updateDto = { content: 'Updated content' };
      const updatedResponse = { id: 'response-1', content: 'Updated content' };
      mockResponsesService.updateResponse.mockResolvedValue(updatedResponse);

      const result = await controller.updateResponse('topic-1', 'response-1', updateDto as any);

      expect(result).toEqual(updatedResponse);
      expect(mockResponsesService.updateResponse).toHaveBeenCalledWith(
        'response-1',
        '00000000-0000-0000-0000-000000000000',
        updateDto,
      );
    });

    it('should use placeholder authorId for updates', async () => {
      const updateDto = { content: 'Updated' };
      mockResponsesService.updateResponse.mockResolvedValue({ id: 'response-1' });

      await controller.updateResponse('topic-1', 'response-1', updateDto as any);

      expect(mockResponsesService.updateResponse).toHaveBeenCalledWith(
        'response-1',
        '00000000-0000-0000-0000-000000000000',
        updateDto,
      );
    });
  });

  describe('moderateResponse', () => {
    it('should hide a response when action is hide', async () => {
      const moderateDto = { action: 'hide', reason: 'Violates guidelines' };
      const moderationResult = { responseId: 'response-1', action: 'hide', success: true };
      mockContentModerationService.hideResponse.mockResolvedValue(moderationResult);

      const result = await controller.moderateResponse('topic-1', 'response-1', moderateDto as any);

      expect(result).toEqual(moderationResult);
      expect(mockContentModerationService.hideResponse).toHaveBeenCalledWith(
        'response-1',
        '00000000-0000-0000-0000-000000000000',
        moderateDto,
      );
    });

    it('should remove a response when action is remove', async () => {
      const moderateDto = { action: 'remove', reason: 'Spam content' };
      const moderationResult = { responseId: 'response-1', action: 'remove', success: true };
      mockContentModerationService.removeResponse.mockResolvedValue(moderationResult);

      const result = await controller.moderateResponse('topic-1', 'response-1', moderateDto as any);

      expect(result).toEqual(moderationResult);
      expect(mockContentModerationService.removeResponse).toHaveBeenCalledWith(
        'response-1',
        '00000000-0000-0000-0000-000000000000',
        moderateDto,
      );
    });

    it('should throw error when reason is missing', async () => {
      const moderateDto = { action: 'hide', reason: '' };

      await expect(
        controller.moderateResponse('topic-1', 'response-1', moderateDto as any),
      ).rejects.toThrow('Reason is required for moderation actions');
    });

    it('should throw error when reason is only whitespace', async () => {
      const moderateDto = { action: 'hide', reason: '   ' };

      await expect(
        controller.moderateResponse('topic-1', 'response-1', moderateDto as any),
      ).rejects.toThrow('Reason is required for moderation actions');
    });

    it('should throw error when reason is undefined', async () => {
      const moderateDto = { action: 'hide' };

      await expect(
        controller.moderateResponse('topic-1', 'response-1', moderateDto as any),
      ).rejects.toThrow('Reason is required for moderation actions');
    });

    it('should throw error for invalid moderation action', async () => {
      const moderateDto = { action: 'invalid', reason: 'Some reason' };

      await expect(
        controller.moderateResponse('topic-1', 'response-1', moderateDto as any),
      ).rejects.toThrow('Invalid moderation action');
    });
  });

  describe('restoreResponse', () => {
    it('should restore a hidden response', async () => {
      const body = { reason: 'False positive' };
      const restoreResult = { responseId: 'response-1', action: 'restore', success: true };
      mockContentModerationService.restoreResponse.mockResolvedValue(restoreResult);

      const result = await controller.restoreResponse('topic-1', 'response-1', body);

      expect(result).toEqual(restoreResult);
      expect(mockContentModerationService.restoreResponse).toHaveBeenCalledWith(
        'response-1',
        '00000000-0000-0000-0000-000000000000',
        'False positive',
      );
    });

    it('should throw error when reason is missing', async () => {
      const body = { reason: '' };

      await expect(controller.restoreResponse('topic-1', 'response-1', body)).rejects.toThrow(
        'Reason is required for restoration',
      );
    });

    it('should throw error when reason is only whitespace', async () => {
      const body = { reason: '   ' };

      await expect(controller.restoreResponse('topic-1', 'response-1', body)).rejects.toThrow(
        'Reason is required for restoration',
      );
    });

    it('should throw error when reason is undefined', async () => {
      const body = {} as { reason: string };

      await expect(controller.restoreResponse('topic-1', 'response-1', body)).rejects.toThrow(
        'Reason is required for restoration',
      );
    });
  });

  describe('getResponseModerationStatus', () => {
    it('should return moderation status for a response', async () => {
      const status = {
        responseId: 'response-1',
        status: 'HIDDEN',
        moderatedAt: new Date(),
        reason: 'Guideline violation',
      };
      mockContentModerationService.getResponseModerationStatus.mockResolvedValue(status);

      const result = await controller.getResponseModerationStatus('topic-1', 'response-1');

      expect(result).toEqual(status);
      expect(mockContentModerationService.getResponseModerationStatus).toHaveBeenCalledWith(
        'response-1',
      );
    });

    it('should return null for unmoderated response', async () => {
      mockContentModerationService.getResponseModerationStatus.mockResolvedValue(null);

      const result = await controller.getResponseModerationStatus('topic-1', 'response-1');

      expect(result).toBeNull();
    });
  });

  describe('getResponsesByStatus', () => {
    it('should return responses with VISIBLE status', async () => {
      const responses = [{ id: 'response-1', status: 'VISIBLE' }];
      mockContentModerationService.getResponsesByStatus.mockResolvedValue(responses);

      const result = await controller.getResponsesByStatus('topic-1', 'VISIBLE');

      expect(result).toEqual(responses);
      expect(mockContentModerationService.getResponsesByStatus).toHaveBeenCalledWith(
        'topic-1',
        'VISIBLE',
      );
    });

    it('should return responses with HIDDEN status', async () => {
      const responses = [{ id: 'response-1', status: 'HIDDEN' }];
      mockContentModerationService.getResponsesByStatus.mockResolvedValue(responses);

      const result = await controller.getResponsesByStatus('topic-1', 'HIDDEN');

      expect(result).toEqual(responses);
      expect(mockContentModerationService.getResponsesByStatus).toHaveBeenCalledWith(
        'topic-1',
        'HIDDEN',
      );
    });

    it('should return responses with REMOVED status', async () => {
      const responses = [{ id: 'response-1', status: 'REMOVED' }];
      mockContentModerationService.getResponsesByStatus.mockResolvedValue(responses);

      const result = await controller.getResponsesByStatus('topic-1', 'REMOVED');

      expect(result).toEqual(responses);
      expect(mockContentModerationService.getResponsesByStatus).toHaveBeenCalledWith(
        'topic-1',
        'REMOVED',
      );
    });

    it('should handle lowercase status and convert to uppercase', async () => {
      mockContentModerationService.getResponsesByStatus.mockResolvedValue([]);

      await controller.getResponsesByStatus('topic-1', 'visible');

      expect(mockContentModerationService.getResponsesByStatus).toHaveBeenCalledWith(
        'topic-1',
        'VISIBLE',
      );
    });

    it('should handle mixed case status', async () => {
      mockContentModerationService.getResponsesByStatus.mockResolvedValue([]);

      await controller.getResponsesByStatus('topic-1', 'Hidden');

      expect(mockContentModerationService.getResponsesByStatus).toHaveBeenCalledWith(
        'topic-1',
        'HIDDEN',
      );
    });

    it('should throw error for invalid status', async () => {
      await expect(controller.getResponsesByStatus('topic-1', 'INVALID')).rejects.toThrow(
        'Invalid status. Must be one of: VISIBLE, HIDDEN, REMOVED',
      );
    });

    it('should throw error for empty status', async () => {
      await expect(controller.getResponsesByStatus('topic-1', '')).rejects.toThrow(
        'Invalid status. Must be one of: VISIBLE, HIDDEN, REMOVED',
      );
    });
  });
});
