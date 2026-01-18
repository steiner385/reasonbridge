import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from '../feedback/feedback.service.js';
import { FeedbackAnalyticsService } from '../services/feedback-analytics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedbackSensitivity } from '../feedback/dto/request-feedback.dto.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { ClarityAnalyzerService } from '../services/clarity-analyzer.service.js';

/**
 * Integration tests for the Feedback API flow
 * Tests the complete feedback pipeline from request through analytics
 */
describe('Feedback API Integration Tests', () => {
  let feedbackService: FeedbackService;
  let analyticsService: FeedbackAnalyticsService;
  let mockPrisma: any;

  // Test data
  const mockResponseId = '550e8400-e29b-41d4-a716-446655440000';
  const mockFeedbackId = '650e8400-e29b-41d4-a716-446655440000';

  const mockResponse = {
    id: mockResponseId,
    topicId: '850e8400-e29b-41d4-a716-446655440000',
    authorId: '750e8400-e29b-41d4-a716-446655440000',
    parentId: null,
    content: 'Test response content',
    citedSources: null,
    containsOpinion: true,
    containsFactualClaims: false,
    status: 'VISIBLE',
    revisionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFeedback = {
    id: mockFeedbackId,
    responseId: mockResponseId,
    type: 'INFLAMMATORY',
    subtype: 'personal_attack',
    suggestionText: 'Consider rephrasing to focus on ideas rather than individuals.',
    reasoning: 'The response contains language that may be perceived as attacking.',
    confidenceScore: 0.85,
    educationalResources: null,
    userAcknowledged: false,
    userRevised: false,
    userHelpfulRating: null,
    dismissedAt: null,
    dismissalReason: null,
    displayedToUser: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock Prisma with proper mock functions
    mockPrisma = {
      response: {
        findUnique: async () => mockResponse,
      },
      feedback: {
        create: async () => mockFeedback,
        findUnique: async () => mockFeedback,
        update: async (args: any) => ({ ...mockFeedback, ...args.data }),
        findMany: async () => [mockFeedback],
        groupBy: async () => [{ type: 'INFLAMMATORY', _count: { type: 1 }, _avg: { confidenceScore: 0.85 } }],
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        FeedbackAnalyticsService,
        ResponseAnalyzerService,
        ToneAnalyzerService,
        FallacyDetectorService,
        ClarityAnalyzerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    feedbackService = module.get<FeedbackService>(FeedbackService);
    analyticsService = module.get<FeedbackAnalyticsService>(FeedbackAnalyticsService);
  });

  describe('POST /feedback/request', () => {
    it('should successfully request feedback for a valid response', async () => {
      const result = await feedbackService.requestFeedback({
        responseId: mockResponseId,
        content: 'This is inflammatory content that attacks people.',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result).toBeDefined();
      expect(result.responseId).toBe(mockResponseId);
      expect(result.type).toBeDefined();
      expect(result.suggestionText).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should throw NotFoundException when response does not exist', async () => {
      mockPrisma.response.findUnique = async () => null;

      await expect(
        feedbackService.requestFeedback({
          responseId: 'non-existent-id',
          content: 'Test content',
        })
      ).rejects.toThrow();
    });

    it('should apply LOW sensitivity threshold', async () => {
      const result = await feedbackService.requestFeedback({
        responseId: mockResponseId,
        content: 'Slightly problematic content.',
        sensitivity: FeedbackSensitivity.LOW,
      });

      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    });

    it('should apply MEDIUM sensitivity threshold', async () => {
      const result = await feedbackService.requestFeedback({
        responseId: mockResponseId,
        content: 'Moderately problematic content.',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    });

    it('should apply HIGH sensitivity threshold', async () => {
      const result = await feedbackService.requestFeedback({
        responseId: mockResponseId,
        content: 'Very problematic content with clear issues.',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /feedback/:id', () => {
    it('should successfully retrieve feedback by ID', async () => {
      const result = await feedbackService.getFeedbackById(mockFeedbackId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFeedbackId);
      expect(result.responseId).toBe(mockResponseId);
      expect(result.type).toBe('INFLAMMATORY');
    });

    it('should throw NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.findUnique = async () => null;

      await expect(feedbackService.getFeedbackById('non-existent-id')).rejects.toThrow();
    });

    it('should return all feedback fields correctly', async () => {
      const result = await feedbackService.getFeedbackById(mockFeedbackId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('responseId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('suggestionText');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('displayedToUser');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('PATCH /feedback/:id/dismiss', () => {
    it('should successfully dismiss feedback with reason', async () => {
      const dismissDto = {
        dismissalReason: 'Not applicable to my response',
      };

      const result = await feedbackService.dismissFeedback(mockFeedbackId, dismissDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFeedbackId);
    });

    it('should successfully dismiss feedback without reason', async () => {
      const result = await feedbackService.dismissFeedback(mockFeedbackId, {});

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFeedbackId);
    });

    it('should throw NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.update = async () => {
        throw new Error('Record not found');
      };

      await expect(
        feedbackService.dismissFeedback('non-existent-id', { dismissalReason: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('GET /feedback/analytics', () => {
    it('should return analytics for default date range', async () => {
      const result = await analyticsService.getAnalytics({});

      expect(result).toBeDefined();
      expect(result.totalFeedback).toBeGreaterThanOrEqual(0);
      expect(result).toHaveProperty('acknowledgedCount');
      expect(result).toHaveProperty('acknowledgmentRate');
      expect(result).toHaveProperty('revisionCount');
      expect(result).toHaveProperty('revisionRate');
      expect(result).toHaveProperty('dismissedCount');
      expect(result).toHaveProperty('dismissalRate');
    });

    it('should filter analytics by feedback type', async () => {
      const result = await analyticsService.getAnalytics({
        feedbackType: 'INFLAMMATORY',
      });

      expect(result).toBeDefined();
      expect(result.totalFeedback).toBeGreaterThanOrEqual(0);
    });

    it('should filter analytics by response ID', async () => {
      const result = await analyticsService.getAnalytics({
        responseId: mockResponseId,
      });

      expect(result).toBeDefined();
      expect(result.totalFeedback).toBeGreaterThanOrEqual(0);
    });

    it('should filter analytics by date range', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-17T23:59:59Z';

      const result = await analyticsService.getAnalytics({
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.start).toBeDefined();
      expect(result.dateRange.end).toBeDefined();
    });

    it('should calculate helpful ratings correctly', async () => {
      const result = await analyticsService.getAnalytics({});

      expect(result.helpfulRatings).toBeDefined();
      expect(result.averageHelpfulScore).toBeGreaterThanOrEqual(0);
      expect(result.averageHelpfulScore).toBeLessThanOrEqual(1);
    });

    it('should aggregate feedback by type', async () => {
      const result = await analyticsService.getAnalytics({});

      expect(result.byType).toBeDefined();
      expect(Array.isArray(result.byType)).toBe(true);
    });

    it('should extract top dismissal reasons', async () => {
      const result = await analyticsService.getAnalytics({});

      expect(result.topDismissalReasons).toBeDefined();
      expect(Array.isArray(result.topDismissalReasons)).toBe(true);
    });
  });

  describe('Complete Feedback Flow Integration', () => {
    it('should complete full feedback lifecycle: request -> retrieve -> dismiss', async () => {
      // Step 1: Request feedback
      const createdFeedback = await feedbackService.requestFeedback({
        responseId: mockResponseId,
        content: 'This is problematic content.',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });
      expect(createdFeedback).toBeDefined();
      expect(createdFeedback.responseId).toBe(mockResponseId);

      // Step 2: Retrieve feedback
      const retrievedFeedback = await feedbackService.getFeedbackById(createdFeedback.id);
      expect(retrievedFeedback).toBeDefined();
      expect(retrievedFeedback.id).toBe(createdFeedback.id);

      // Step 3: Dismiss feedback
      const finalFeedback = await feedbackService.dismissFeedback(createdFeedback.id, {
        dismissalReason: 'Not applicable',
      });
      expect(finalFeedback).toBeDefined();
      expect(finalFeedback.id).toBe(createdFeedback.id);
    });
  });
});
