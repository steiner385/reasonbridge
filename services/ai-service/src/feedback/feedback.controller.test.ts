import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackController } from './feedback.controller.js';

const createMockFeedbackService = () => ({
  requestFeedback: vi.fn(),
  getFeedbackById: vi.fn(),
  dismissFeedback: vi.fn(),
});

const createMockAnalyticsService = () => ({
  getAnalytics: vi.fn(),
});

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let mockFeedbackService: ReturnType<typeof createMockFeedbackService>;
  let mockAnalyticsService: ReturnType<typeof createMockAnalyticsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedbackService = createMockFeedbackService();
    mockAnalyticsService = createMockAnalyticsService();
    controller = new FeedbackController(mockFeedbackService as any, mockAnalyticsService as any);
  });

  describe('requestFeedback', () => {
    it('should request feedback for a response', async () => {
      const requestDto = { responseId: 'response-1', content: 'Test content for feedback' };
      const feedbackResponse = {
        id: 'feedback-1',
        responseId: 'response-1',
        type: 'INFLAMMATORY',
        suggestionText: 'Consider more neutral language',
        createdAt: new Date(),
      };
      mockFeedbackService.requestFeedback.mockResolvedValue(feedbackResponse);

      const result = await controller.requestFeedback(requestDto as any);

      expect(result).toEqual(feedbackResponse);
      expect(mockFeedbackService.requestFeedback).toHaveBeenCalledWith(requestDto);
    });

    it('should handle content with fallacies', async () => {
      const requestDto = { responseId: 'response-2', content: 'Content with ad hominem' };
      const feedbackResponse = {
        id: 'feedback-2',
        type: 'FALLACY',
        subtype: 'ad_hominem',
        suggestionText: 'Focus on the argument, not the person',
      };
      mockFeedbackService.requestFeedback.mockResolvedValue(feedbackResponse);

      const result = await controller.requestFeedback(requestDto as any);

      expect(result.type).toBe('FALLACY');
      expect(result.subtype).toBe('ad_hominem');
    });

    it('should return affirmation for constructive content', async () => {
      const requestDto = { responseId: 'response-3', content: 'Well-reasoned content' };
      const feedbackResponse = {
        id: 'feedback-3',
        type: 'AFFIRMATION',
        suggestionText: 'Great contribution!',
      };
      mockFeedbackService.requestFeedback.mockResolvedValue(feedbackResponse);

      const result = await controller.requestFeedback(requestDto as any);

      expect(result.type).toBe('AFFIRMATION');
    });
  });

  describe('getAnalytics', () => {
    it('should return feedback analytics', async () => {
      const query = { startDate: '2026-01-01', endDate: '2026-01-20' };
      const analyticsData = {
        totalFeedback: 100,
        feedbackByType: {
          AFFIRMATION: 50,
          INFLAMMATORY: 25,
          FALLACY: 15,
          UNSOURCED: 10,
        },
        acceptanceRate: 0.75,
        averageConfidenceScore: 0.82,
      };
      mockAnalyticsService.getAnalytics.mockResolvedValue(analyticsData);

      const result = await controller.getAnalytics(query as any);

      expect(result).toEqual(analyticsData);
      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith(query);
    });

    it('should handle analytics query with type filter', async () => {
      const query = { type: 'INFLAMMATORY', limit: 50 };
      mockAnalyticsService.getAnalytics.mockResolvedValue({ totalFeedback: 25 });

      await controller.getAnalytics(query as any);

      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith(query);
    });

    it('should return empty analytics for no data', async () => {
      const query = { startDate: '2026-01-01', endDate: '2026-01-01' };
      mockAnalyticsService.getAnalytics.mockResolvedValue({
        totalFeedback: 0,
        feedbackByType: {},
        acceptanceRate: 0,
        averageConfidenceScore: 0,
      });

      const result = await controller.getAnalytics(query as any);

      expect(result.totalFeedback).toBe(0);
    });
  });

  describe('getFeedback', () => {
    it('should return feedback by ID', async () => {
      const feedbackRecord = {
        id: 'feedback-1',
        responseId: 'response-1',
        type: 'INFLAMMATORY',
        suggestionText: 'Consider more neutral language',
        confidenceScore: 0.85,
        createdAt: new Date(),
      };
      mockFeedbackService.getFeedbackById.mockResolvedValue(feedbackRecord);

      const result = await controller.getFeedback('feedback-1');

      expect(result).toEqual(feedbackRecord);
      expect(mockFeedbackService.getFeedbackById).toHaveBeenCalledWith('feedback-1');
    });

    it('should handle non-existent feedback', async () => {
      mockFeedbackService.getFeedbackById.mockRejectedValue(new Error('Feedback not found'));

      await expect(controller.getFeedback('non-existent')).rejects.toThrow('Feedback not found');
    });
  });

  describe('dismissFeedback', () => {
    it('should dismiss feedback with reason', async () => {
      const dismissDto = { reason: 'False positive' };
      const dismissedFeedback = {
        id: 'feedback-1',
        status: 'DISMISSED',
        dismissedAt: new Date(),
        dismissReason: 'False positive',
      };
      mockFeedbackService.dismissFeedback.mockResolvedValue(dismissedFeedback);

      const result = await controller.dismissFeedback('feedback-1', dismissDto as any);

      expect(result).toEqual(dismissedFeedback);
      expect(mockFeedbackService.dismissFeedback).toHaveBeenCalledWith('feedback-1', dismissDto);
    });

    it('should dismiss feedback without reason', async () => {
      const dismissDto = {};
      const dismissedFeedback = {
        id: 'feedback-1',
        status: 'DISMISSED',
        dismissedAt: new Date(),
      };
      mockFeedbackService.dismissFeedback.mockResolvedValue(dismissedFeedback);

      const result = await controller.dismissFeedback('feedback-1', dismissDto as any);

      expect(result.status).toBe('DISMISSED');
    });

    it('should handle already dismissed feedback', async () => {
      const dismissDto = { reason: 'Already handled' };
      mockFeedbackService.dismissFeedback.mockRejectedValue(
        new Error('Feedback already dismissed'),
      );

      await expect(controller.dismissFeedback('feedback-1', dismissDto as any)).rejects.toThrow(
        'Feedback already dismissed',
      );
    });
  });
});
