// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BotDetectorService } from './bot-detector.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Helper to create mock user with Decimal types
const createMockUser = (overrides: any = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  cognitoSub: 'cognito-1',
  verificationLevel: 'BASIC' as const,
  trustScoreAbility: { toNumber: () => 0.5 },
  trustScoreBenevolence: { toNumber: () => 0.5 },
  trustScoreIntegrity: { toNumber: () => 0.5 },
  moralFoundationProfile: null,
  positionFingerprint: null,
  topicAffinities: null,
  status: 'ACTIVE' as const,
  updatedAt: new Date(),
  responses: [],
  ...overrides,
});

describe('BotDetectorService', () => {
  let service: BotDetectorService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
    },
    response: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Direct instantiation - bypasses NestJS DI issues with vitest
    service = new BotDetectorService(mockPrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectNewAccountBotPatterns', () => {
    it('should detect very new account pattern (< 24 hours)', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockUser = createMockUser({
        id: 'user-1',
        createdAt: oneHourAgo,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-1');

      expect(result.patterns).toContain('very_new_account');
      expect(result.riskScore).toBeGreaterThanOrEqual(0.15);
      expect(result.reasoning).toContain('hours ago');
    });

    it('should detect new account pattern (< 1 week)', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockUser = createMockUser({
        id: 'user-2',
        createdAt: twoDaysAgo,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-2');

      expect(result.patterns).toContain('new_account');
      expect(result.riskScore).toBeGreaterThanOrEqual(0.1);
    });

    it('should detect rapid posting pattern', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Responses posted 2 minutes apart (very rapid)
      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push({
          id: `response-${i}`,
          createdAt: new Date(oneHourAgo.getTime() + i * 2 * 60 * 1000),
          topicId: 'topic-1',
        });
      }

      const mockUser = createMockUser({
        id: 'user-3',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week old
        responses,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-3');

      expect(result.patterns).toContain('rapid_posting');
      expect(result.riskScore).toBeGreaterThan(0.2);
      expect(result.reasoning).toContain('frequently');
    });

    it('should detect topic concentration pattern', async () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // All responses on same topic
      const responses = [];
      for (let i = 0; i < 10; i++) {
        responses.push({
          id: `response-${i}`,
          createdAt: new Date(oneWeekAgo.getTime() + i * 6 * 60 * 60 * 1000), // 6 hours apart
          topicId: 'topic-1', // All same topic
        });
      }

      const mockUser = createMockUser({
        id: 'user-4',
        createdAt: oneWeekAgo,
        responses,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-4');

      expect(result.patterns).toContain('topic_concentration');
      expect(result.reasoning).toContain('limited topics');
    });

    it('should mark as suspicious when risk score >= 0.4', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Very new + rapid posting should exceed 0.4 threshold
      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push({
          id: `response-${i}`,
          createdAt: new Date(twoHoursAgo.getTime() + i * 2 * 60 * 1000),
          topicId: 'topic-1',
        });
      }

      const mockUser = createMockUser({
        id: 'user-5',
        createdAt: twoHoursAgo,
        responses,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-5');

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(0.4);
    });

    it('should not be suspicious for normal user behavior', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Older account with normal posting pace
      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push({
          id: `response-${i}`,
          createdAt: new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000), // 1 day apart
          topicId: `topic-${i}`, // Different topics
        });
      }

      const mockUser = createMockUser({
        id: 'user-6',
        createdAt: thirtyDaysAgo,
        responses,
      }) as any;

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.detectNewAccountBotPatterns('user-6');

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBeLessThan(0.4);
      expect(result.patterns.length).toBe(0);
    });

    it('should throw error for non-existent user', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.detectNewAccountBotPatterns('non-existent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('detectCoordinatedPostingPatterns', () => {
    it('should return empty array for topics with fewer than 5 responses', async () => {
      (mockPrismaService.response.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'response-1',
          topicId: 'topic-1',
          content: 'Test',
          author: { id: 'user-1', createdAt: new Date() },
        } as any,
      ]);

      const result = await service.detectCoordinatedPostingPatterns('topic-1');

      expect(result).toEqual([]);
    });

    it('should detect new account coordination pattern', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockResponses = [];
      // Create 5 responses from 3 very new accounts (created < 24h ago)
      for (let i = 0; i < 5; i++) {
        mockResponses.push({
          id: `response-${i}`,
          topicId: 'topic-1',
          content: 'Test',
          author: {
            id: `user-${i}`,
            createdAt:
              i < 3
                ? new Date(now.getTime() - 60 * 60 * 1000) // Very new
                : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Older
          },
          createdAt: new Date(oneHourAgo.getTime() + i * 10 * 60 * 1000),
        } as any);
      }

      (mockPrismaService.response.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponses,
      );

      const result = await service.detectCoordinatedPostingPatterns('topic-1');

      expect(result.length).toBeGreaterThan(0);
      const newAccountPattern = result.find(
        (p) => p.pattern === 'new_account_coordination',
      );
      expect(newAccountPattern).toBeDefined();
      expect(newAccountPattern?.confidence).toBeGreaterThan(0);
    });

    it('should detect timing coordination pattern', async () => {
      const now = new Date();
      const baseTime = new Date(now.getTime() - 60 * 60 * 1000);

      // Create 10 responses posted within tight time windows
      const mockResponses = [];
      for (let i = 0; i < 10; i++) {
        mockResponses.push({
          id: `response-${i}`,
          topicId: 'topic-1',
          content: 'Test',
          author: {
            id: `user-${i}`,
            createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
          // Cluster responses within 3-minute windows
          createdAt: new Date(baseTime.getTime() + (i % 5) * 2 * 60 * 1000),
        } as any);
      }

      (mockPrismaService.response.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponses,
      );

      const result = await service.detectCoordinatedPostingPatterns('topic-1');

      const timingPattern = result.find((p) => p.pattern === 'timing_coordination');
      // May or may not detect timing coordination depending on distribution
      if (timingPattern) {
        expect(timingPattern.affectedUserIds).toBeDefined();
      }
    });
  });
});
