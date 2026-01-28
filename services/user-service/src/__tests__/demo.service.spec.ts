import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoService } from '../demo/demo.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DemoService', () => {
  let service: DemoService;
  let mockPrismaService: {
    visitorSession: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrismaService = {
      visitorSession: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    // Direct instantiation with mock - bypasses NestJS DI
    service = new DemoService(mockPrismaService as unknown as PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDemoDiscussions', () => {
    it('should return demo discussions with social proof', async () => {
      const result = await service.getDemoDiscussions(5);

      expect(result).toBeDefined();
      expect(result.discussions).toHaveLength(5);
      expect(result.socialProof).toBeDefined();
      expect(result.socialProof?.averageCommonGroundScore).toBeGreaterThan(0);
      expect(result.socialProof?.totalParticipants).toBeGreaterThan(0);
      expect(result.socialProof?.platformSatisfaction).toBeGreaterThan(0);
    });

    it('should filter discussions with high common ground score', async () => {
      const result = await service.getDemoDiscussions(5);

      result.discussions.forEach((discussion) => {
        expect(discussion.commonGroundScore).toBeGreaterThan(0.65);
      });
    });

    it('should respect the limit parameter', async () => {
      const result1 = await service.getDemoDiscussions(3);
      expect(result1.discussions).toHaveLength(3);

      const result2 = await service.getDemoDiscussions(5);
      expect(result2.discussions).toHaveLength(5);
    });

    it('should include required fields in each discussion', async () => {
      const result = await service.getDemoDiscussions(1);
      const discussion = result.discussions[0];

      expect(discussion).toHaveProperty('id');
      expect(discussion).toHaveProperty('title');
      expect(discussion).toHaveProperty('topic');
      expect(discussion).toHaveProperty('participantCount');
      expect(discussion).toHaveProperty('propositionCount');
      expect(discussion).toHaveProperty('commonGroundScore');
      expect(discussion).toHaveProperty('topCommonGround');
      expect(discussion).toHaveProperty('viewsSpectrum');
      expect(discussion).toHaveProperty('createdAt');
    });

    it('should include views spectrum with all positions', async () => {
      const result = await service.getDemoDiscussions(1);
      const spectrum = result.discussions[0].viewsSpectrum;

      expect(spectrum).toHaveProperty('stronglySupport');
      expect(spectrum).toHaveProperty('support');
      expect(spectrum).toHaveProperty('neutral');
      expect(spectrum).toHaveProperty('oppose');
      expect(spectrum).toHaveProperty('stronglyOppose');
    });

    it('should track visitor session when sessionId provided', async () => {
      const sessionId = 'test-session-id';
      mockPrismaService.visitorSession.findUnique.mockResolvedValue(null);
      mockPrismaService.visitorSession.create.mockResolvedValue({
        id: 'generated-uuid',
        sessionId,
        lastActivityAt: new Date(),
        viewedDemoDiscussionIds: [],
        interactionTimestamps: [],
        createdAt: new Date(),
        referralSource: null,
        convertedToUserId: null,
      });

      await service.getDemoDiscussions(5, sessionId);

      expect(mockPrismaService.visitorSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId },
      });
      expect(mockPrismaService.visitorSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          viewedDemoDiscussionIds: [],
          interactionTimestamps: [],
        }),
      });
    });

    it('should update existing visitor session', async () => {
      const sessionId = 'existing-session-id';
      const existingSession = {
        id: 'existing-uuid',
        sessionId,
        lastActivityAt: new Date('2026-01-20'),
        viewedDemoDiscussionIds: [],
        interactionTimestamps: [],
        createdAt: new Date('2026-01-15'),
        referralSource: null,
        convertedToUserId: null,
      };

      mockPrismaService.visitorSession.findUnique.mockResolvedValue(existingSession);
      mockPrismaService.visitorSession.update.mockResolvedValue({
        ...existingSession,
        lastActivityAt: new Date(),
      });

      await service.getDemoDiscussions(5, sessionId);

      expect(mockPrismaService.visitorSession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: expect.objectContaining({
          lastActivityAt: expect.any(Date),
        }),
      });
    });

    it('should not fail if visitor session tracking errors', async () => {
      const sessionId = 'error-session-id';
      mockPrismaService.visitorSession.findUnique.mockRejectedValue(new Error('Database error'));

      // Should not throw - session tracking errors should be logged but not fail the request
      const result = await service.getDemoDiscussions(5, sessionId);

      expect(result).toBeDefined();
      expect(result.discussions).toHaveLength(5);
    });
  });

  describe('social proof metrics calculation', () => {
    it('should calculate average common ground score correctly', async () => {
      const result = await service.getDemoDiscussions(5);

      const manualAverage =
        result.discussions.reduce((sum, d) => sum + d.commonGroundScore, 0) /
        result.discussions.length;

      expect(result.socialProof?.averageCommonGroundScore).toBeCloseTo(
        Math.round(manualAverage * 100) / 100,
        2,
      );
    });

    it('should calculate total participants correctly', async () => {
      const result = await service.getDemoDiscussions(5);

      const manualTotal = result.discussions.reduce((sum, d) => sum + d.participantCount, 0);

      expect(result.socialProof?.totalParticipants).toBe(manualTotal);
    });

    it('should calculate platform satisfaction based on common ground', async () => {
      const result = await service.getDemoDiscussions(5);

      // Platform satisfaction should be derived from average common ground
      // and capped at 0.95
      expect(result.socialProof?.platformSatisfaction).toBeGreaterThan(0);
      expect(result.socialProof?.platformSatisfaction).toBeLessThanOrEqual(0.95);
    });

    it('should handle empty discussions gracefully', async () => {
      // This tests the edge case handling in the private method
      // Since we can't directly test private methods, we test the behavior
      const result = await service.getDemoDiscussions(0);

      // Should return empty array but still valid structure
      expect(result.discussions).toHaveLength(0);
    });
  });

  describe('discussion selection logic', () => {
    it('should include discussions with diverse topics', async () => {
      const result = await service.getDemoDiscussions(5);

      const topics = result.discussions.map((d) => d.topic);
      const uniqueTopics = new Set(topics);

      // Should have multiple different topics
      expect(uniqueTopics.size).toBeGreaterThan(1);
    });

    it('should include top common ground findings', async () => {
      const result = await service.getDemoDiscussions(5);

      result.discussions.forEach((discussion) => {
        expect(discussion.topCommonGround).toBeInstanceOf(Array);
        expect(discussion.topCommonGround.length).toBeGreaterThan(0);
        expect(discussion.topCommonGround.length).toBeLessThanOrEqual(3);
      });
    });

    it('should include participant and proposition counts', async () => {
      const result = await service.getDemoDiscussions(5);

      result.discussions.forEach((discussion) => {
        expect(discussion.participantCount).toBeGreaterThan(0);
        expect(discussion.propositionCount).toBeGreaterThan(0);
        // Generally participants should be less than or equal to total votes
        const totalVotes = Object.values(discussion.viewsSpectrum).reduce(
          (sum, count) => sum + count,
          0,
        );
        expect(totalVotes).toBeGreaterThan(0);
      });
    });

    it('should return discussions with valid date strings', async () => {
      const result = await service.getDemoDiscussions(5);

      result.discussions.forEach((discussion) => {
        const date = new Date(discussion.createdAt);
        expect(date.toString()).not.toBe('Invalid Date');
        expect(date.getTime()).toBeLessThan(Date.now());
      });
    });
  });
});
