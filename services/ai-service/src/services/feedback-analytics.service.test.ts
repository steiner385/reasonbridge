import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackAnalyticsService } from './feedback-analytics.service.js';

const createMockPrismaService = () => ({
  feedback: {
    findMany: vi.fn(),
  },
});

describe('FeedbackAnalyticsService', () => {
  let service: FeedbackAnalyticsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new FeedbackAnalyticsService(mockPrisma as any);
  });

  describe('getAnalytics', () => {
    it('should return analytics for empty dataset', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics({});

      expect(result.totalFeedback).toBe(0);
      expect(result.acknowledgmentRate).toBe(0);
      expect(result.revisionRate).toBe(0);
      expect(result.dismissalRate).toBe(0);
      expect(result.averageHelpfulScore).toBe(0);
      expect(result.byType).toHaveLength(0);
      expect(result.topDismissalReasons).toHaveLength(0);
    });

    it('should calculate acknowledgment rate correctly', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.8,
        },
        {
          id: '2',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.7,
        },
        {
          id: '3',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.9,
        },
        {
          id: '4',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.6,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.totalFeedback).toBe(4);
      expect(result.acknowledgedCount).toBe(2);
      expect(result.acknowledgmentRate).toBe(50);
    });

    it('should calculate revision rate correctly', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'CLARITY',
          userAcknowledged: true,
          userRevised: true,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.8,
        },
        {
          id: '2',
          type: 'CLARITY',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.7,
        },
        {
          id: '3',
          type: 'CLARITY',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.9,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.revisionCount).toBe(1);
      expect(result.revisionRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate dismissal rate correctly', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'FALLACY',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: new Date(),
          dismissalReason: 'Not relevant',
          confidenceScore: 0.5,
        },
        {
          id: '2',
          type: 'FALLACY',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.8,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.dismissedCount).toBe(1);
      expect(result.dismissalRate).toBe(50);
    });

    it('should calculate helpful ratings distribution', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: 'HELPFUL',
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.9,
        },
        {
          id: '2',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: 'HELPFUL',
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.8,
        },
        {
          id: '3',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: 'NOT_HELPFUL',
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.7,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.helpfulRatings.HELPFUL).toBe(2);
      expect(result.helpfulRatings.NOT_HELPFUL).toBe(1);
      expect(result.averageHelpfulScore).toBeCloseTo(0.67, 1);
    });

    it('should group analytics by feedback type', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'TONE',
          userAcknowledged: true,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.8,
        },
        {
          id: '2',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.7,
        },
        {
          id: '3',
          type: 'CLARITY',
          userAcknowledged: true,
          userRevised: true,
          userHelpfulRating: null,
          dismissedAt: null,
          dismissalReason: null,
          confidenceScore: 0.9,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.byType).toHaveLength(2);
      const toneStats = result.byType.find((t: any) => t.type === 'TONE');
      const clarityStats = result.byType.find((t: any) => t.type === 'CLARITY');

      expect(toneStats?.count).toBe(2);
      expect(toneStats?.acknowledgedCount).toBe(1);
      expect(clarityStats?.count).toBe(1);
      expect(clarityStats?.revisionCount).toBe(1);
    });

    it('should return top dismissal reasons', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: new Date(),
          dismissalReason: 'Not relevant',
          confidenceScore: 0.5,
        },
        {
          id: '2',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: new Date(),
          dismissalReason: 'Not relevant',
          confidenceScore: 0.5,
        },
        {
          id: '3',
          type: 'TONE',
          userAcknowledged: false,
          userRevised: false,
          userHelpfulRating: null,
          dismissedAt: new Date(),
          dismissalReason: 'Too complex',
          confidenceScore: 0.5,
        },
      ]);

      const result = await service.getAnalytics({});

      expect(result.topDismissalReasons).toHaveLength(2);
      expect(result.topDismissalReasons[0]).toEqual({ reason: 'Not relevant', count: 2 });
      expect(result.topDismissalReasons[1]).toEqual({ reason: 'Too complex', count: 1 });
    });

    it('should filter by date range', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);

      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      await service.getAnalytics({ startDate, endDate });

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
        select: expect.any(Object),
      });
    });

    it('should filter by feedback type', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);

      await service.getAnalytics({ feedbackType: 'TONE' });

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          type: 'TONE',
        }),
        select: expect.any(Object),
      });
    });

    it('should filter by response ID', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);

      await service.getAnalytics({ responseId: 'response-123' });

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          responseId: 'response-123',
        }),
        select: expect.any(Object),
      });
    });

    it('should use default date range of last 30 days when not specified', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics({});

      expect(result.dateRange.start).toBeInstanceOf(Date);
      expect(result.dateRange.end).toBeInstanceOf(Date);

      // Check that the date range is approximately 30 days
      const diffMs = result.dateRange.end.getTime() - result.dateRange.start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 1);
    });
  });
});
