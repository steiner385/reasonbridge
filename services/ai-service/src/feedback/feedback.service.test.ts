import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackService } from './feedback.service.js';
import { NotFoundException } from '@nestjs/common';
import { FeedbackType } from '@unite-discord/db-models';
import { FeedbackSensitivity } from './dto/request-feedback.dto.js';

const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
  },
  feedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const createMockAnalyzerService = () => ({
  analyzeContent: vi.fn(),
});

const createMockFeedback = (overrides = {}) => ({
  id: 'feedback-1',
  responseId: 'response-1',
  type: FeedbackType.INFLAMMATORY,
  subtype: 'hostile_tone',
  suggestionText: 'Consider using more neutral language.',
  reasoning: 'Detected potentially inflammatory language.',
  confidenceScore: 0.85,
  educationalResources: { links: [{ title: 'Guide', url: 'https://example.com' }] },
  displayedToUser: true,
  userAcknowledged: false,
  userRevised: false,
  createdAt: new Date('2026-01-01'),
  dismissedAt: null,
  dismissalReason: null,
  ...overrides,
});

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockAnalyzer: ReturnType<typeof createMockAnalyzerService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockAnalyzer = createMockAnalyzerService();
    service = new FeedbackService(mockPrisma as any, mockAnalyzer as any);
  });

  describe('requestFeedback', () => {
    const requestDto = {
      responseId: 'response-1',
      content: 'This is test content',
    };

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.requestFeedback(requestDto)).rejects.toThrow(NotFoundException);
    });

    it('should create feedback for valid response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        subtype: 'hostile_tone',
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.85,
        educationalResources: null,
      });
      mockPrisma.feedback.create.mockResolvedValue(createMockFeedback());

      const result = await service.requestFeedback(requestDto);

      expect(mockPrisma.feedback.create).toHaveBeenCalled();
      expect(result.id).toBe('feedback-1');
    });

    it('should use default MEDIUM sensitivity when not provided', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.65, // Below MEDIUM threshold of 0.7
      });
      mockPrisma.feedback.create.mockResolvedValue(createMockFeedback({ displayedToUser: false }));

      await service.requestFeedback(requestDto);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayedToUser: false,
        }),
      });
    });

    it('should use LOW sensitivity threshold', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.55, // Above LOW threshold of 0.5
      });
      mockPrisma.feedback.create.mockResolvedValue(createMockFeedback({ displayedToUser: true }));

      await service.requestFeedback({
        ...requestDto,
        sensitivity: FeedbackSensitivity.LOW,
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayedToUser: true,
        }),
      });
    });

    it('should use HIGH sensitivity threshold', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.8, // Below HIGH threshold of 0.85
      });
      mockPrisma.feedback.create.mockResolvedValue(createMockFeedback({ displayedToUser: false }));

      await service.requestFeedback({
        ...requestDto,
        sensitivity: FeedbackSensitivity.HIGH,
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayedToUser: false,
        }),
      });
    });

    it('should store subtype when present', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        subtype: 'personal_attack',
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.85,
      });
      mockPrisma.feedback.create.mockResolvedValue(
        createMockFeedback({ subtype: 'personal_attack' }),
      );

      await service.requestFeedback(requestDto);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtype: 'personal_attack',
        }),
      });
    });

    it('should store educational resources when present', async () => {
      const resources = { links: [{ title: 'Test', url: 'https://test.com' }] };
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: FeedbackType.UNSOURCED,
        suggestionText: 'Consider...',
        reasoning: 'Detected...',
        confidenceScore: 0.75,
        educationalResources: resources,
      });
      mockPrisma.feedback.create.mockResolvedValue(
        createMockFeedback({ educationalResources: resources }),
      );

      await service.requestFeedback(requestDto);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          educationalResources: resources,
        }),
      });
    });
  });

  describe('getFeedbackById', () => {
    it('should throw NotFoundException if feedback not found', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(service.getFeedbackById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return feedback by ID', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(createMockFeedback());

      const result = await service.getFeedbackById('feedback-1');

      expect(result.id).toBe('feedback-1');
      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should map confidence score correctly', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(createMockFeedback());

      const result = await service.getFeedbackById('feedback-1');

      expect(typeof result.confidenceScore).toBe('number');
      expect(result.confidenceScore).toBe(0.85);
    });
  });

  describe('dismissFeedback', () => {
    const dismissDto = {
      dismissalReason: 'Not applicable to my content',
    };

    it('should throw NotFoundException if feedback not found', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(service.dismissFeedback('nonexistent', dismissDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should dismiss feedback with reason', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(createMockFeedback());
      mockPrisma.feedback.update.mockResolvedValue(
        createMockFeedback({
          dismissedAt: new Date(),
          dismissalReason: 'Not applicable',
        }),
      );

      await service.dismissFeedback('feedback-1', dismissDto);

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith({
        where: { id: 'feedback-1' },
        data: expect.objectContaining({
          dismissedAt: expect.any(Date),
          dismissalReason: 'Not applicable to my content',
        }),
      });
    });

    it('should dismiss feedback without reason', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(createMockFeedback());
      mockPrisma.feedback.update.mockResolvedValue(createMockFeedback({ dismissedAt: new Date() }));

      await service.dismissFeedback('feedback-1', {});

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith({
        where: { id: 'feedback-1' },
        data: expect.objectContaining({
          dismissalReason: null,
        }),
      });
    });
  });
});
