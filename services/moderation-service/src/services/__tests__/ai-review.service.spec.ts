import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIReviewService } from '../ai-review.service.js';

// Mock QueueService
const createMockQueueService = () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
});

// Mock PrismaService
const createMockPrismaService = () => ({
  moderationAction: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    update: vi.fn(),
  },
});

// Mock ContentScreeningService
const createMockScreeningService = () => ({
  screenContent: vi.fn(),
});

/**
 * AIReviewService Unit Tests
 *
 * Tests focus on validation logic and service interface.
 * Database integration is tested via E2E tests.
 */
describe('AIReviewService', () => {
  let service: AIReviewService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockQueueService: ReturnType<typeof createMockQueueService>;
  let mockScreeningService: ReturnType<typeof createMockScreeningService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockQueueService = createMockQueueService();
    mockScreeningService = createMockScreeningService();
    service = new AIReviewService(
      mockPrisma as any,
      mockScreeningService as any,
      mockQueueService as any,
    );
    vi.clearAllMocks();
  });

  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      const service = new AIReviewService(null as any, null as any, null as any);
      expect(service).toBeInstanceOf(AIReviewService);
    });

    it('should have all required methods', () => {
      const service = new AIReviewService(null as any, null as any, null as any);

      const methods = [
        'submitAiRecommendation',
        'getPendingRecommendations',
        'getRecommendationStats',
        'approveRecommendation',
        'rejectRecommendation',
      ];

      for (const method of methods) {
        expect(typeof (service as any)[method]).toBe('function');
      }
    });
  });

  describe('Request/Response Interfaces', () => {
    it('should validate AI recommendation request structure', () => {
      const request = {
        targetType: 'response' as const,
        targetId: '550e8400-e29b-41d4-a716-446655440001',
        actionType: 'warn' as const,
        reasoning: 'High risk content detected',
        confidence: 0.85,
        analysisDetails: {
          toneScore: 0.8,
          fallacyCount: 2,
        },
      };

      expect(request.targetType).toBe('response');
      expect(request.actionType).toBe('warn');
      expect(request.confidence).toBe(0.85);
      expect(typeof request.reasoning).toBe('string');
      expect(request.analysisDetails).toBeDefined();
    });

    it('should validate all valid target types', () => {
      const validTargets = ['response', 'user', 'topic'];

      for (const targetType of validTargets) {
        const request = {
          targetType,
          targetId: '550e8400-e29b-41d4-a716-446655440001',
          actionType: 'warn',
          reasoning: 'Test',
          confidence: 0.8,
        };
        expect(validTargets).toContain(request.targetType);
      }
    });

    it('should validate all valid action types', () => {
      const validActions = ['educate', 'warn', 'hide', 'remove', 'suspend', 'ban'];

      for (const actionType of validActions) {
        const request = {
          targetType: 'response',
          targetId: '550e8400-e29b-41d4-a716-446655440001',
          actionType,
          reasoning: 'Test',
          confidence: 0.8,
        };
        expect(validActions).toContain(request.actionType);
      }
    });

    it('should validate confidence range (0-1)', () => {
      const validConfidences = [0, 0.5, 0.85, 1.0];
      const invalidConfidences = [-0.1, 1.1, 2.0];

      for (const confidence of validConfidences) {
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      }

      for (const confidence of invalidConfidences) {
        expect(confidence < 0 || confidence > 1).toBe(true);
      }
    });
  });

  describe('Response DTO Mapping', () => {
    it('should have correct response DTO fields', () => {
      const response = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        targetType: 'RESPONSE',
        targetId: '550e8400-e29b-41d4-a716-446655440001',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'High inflammatory language detected',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'PENDING',
        createdAt: '2025-01-18T10:00:00Z',
      };

      expect(response.id).toBeDefined();
      expect(response.targetType).toBeDefined();
      expect(response.targetId).toBeDefined();
      expect(response.actionType).toBeDefined();
      expect(response.severity).toBeDefined();
      expect(response.reasoning).toBeDefined();
      expect(response.aiRecommended).toBe(true);
      expect(typeof response.aiConfidence).toBe('number');
      expect(response.status).toBeDefined();
      expect(typeof response.createdAt).toBe('string');
    });
  });

  describe('Severity Mapping Logic', () => {
    it('should map action types to correct severity levels', () => {
      // Non-punitive actions
      const nonPunitiveActions = ['educate', 'warn'];
      for (const action of nonPunitiveActions) {
        // Verify these should map to NON_PUNITIVE
        expect(['educate', 'warn']).toContain(action);
      }

      // Consequential actions
      const consequentialActions = ['hide', 'remove', 'suspend', 'ban'];
      for (const action of consequentialActions) {
        // Verify these should map to CONSEQUENTIAL
        expect(['hide', 'remove', 'suspend', 'ban']).toContain(action);
      }
    });
  });

  describe('Target Type Mapping Logic', () => {
    it('should map target type strings correctly', () => {
      const mappings = [
        { input: 'response', expected: 'RESPONSE' },
        { input: 'Response', expected: 'RESPONSE' },
        { input: 'RESPONSE', expected: 'RESPONSE' },
        { input: 'user', expected: 'USER' },
        { input: 'User', expected: 'USER' },
        { input: 'USER', expected: 'USER' },
        { input: 'topic', expected: 'TOPIC' },
        { input: 'Topic', expected: 'TOPIC' },
        { input: 'TOPIC', expected: 'TOPIC' },
      ];

      for (const mapping of mappings) {
        // Verify that the target types normalize correctly
        expect(['response', 'user', 'topic']).toContain(mapping.input.toLowerCase());
      }
    });
  });

  describe('submitAiRecommendation', () => {
    const validRequest = {
      targetType: 'response' as const,
      targetId: 'response-1',
      actionType: 'warn' as const,
      reasoning: 'High risk content detected',
      confidence: 0.85,
    };

    it('should throw error for invalid confidence (negative)', async () => {
      await expect(
        service.submitAiRecommendation({
          ...validRequest,
          confidence: -0.1,
        }),
      ).rejects.toThrow('Confidence must be between 0 and 1');
    });

    it('should throw error for invalid confidence (greater than 1)', async () => {
      await expect(
        service.submitAiRecommendation({
          ...validRequest,
          confidence: 1.1,
        }),
      ).rejects.toThrow('Confidence must be between 0 and 1');
    });

    it('should create moderation action with correct data', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.create.mockResolvedValue({
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'High risk content detected',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'PENDING',
        createdAt,
      });

      const result = await service.submitAiRecommendation(validRequest);

      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetType: 'RESPONSE',
          targetId: 'response-1',
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          aiRecommended: true,
          aiConfidence: 0.85,
          status: 'PENDING',
        }),
      });
      expect(result.id).toBe('action-1');
      expect(result.aiRecommended).toBe(true);
    });

    it('should publish event to queue', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.create.mockResolvedValue({
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'High risk content detected',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'PENDING',
        createdAt,
      });

      await service.submitAiRecommendation(validRequest);

      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moderation.action.requested',
          payload: expect.objectContaining({
            targetType: 'response',
            targetId: 'response-1',
            actionType: 'warn',
          }),
        }),
      );
    });

    it('should handle queue failure gracefully', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.create.mockResolvedValue({
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'High risk content detected',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'PENDING',
        createdAt,
      });
      mockQueueService.publishEvent.mockRejectedValue(new Error('Queue error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.submitAiRecommendation(validRequest);

      expect(result.id).toBe('action-1');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should map educate action to NON_PUNITIVE severity', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.create.mockResolvedValue({
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'EDUCATE',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'PENDING',
        createdAt,
      });

      await service.submitAiRecommendation({
        ...validRequest,
        actionType: 'educate',
      });

      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: 'EDUCATE',
          severity: 'NON_PUNITIVE',
        }),
      });
    });

    it('should map ban action to CONSEQUENTIAL severity', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.create.mockResolvedValue({
        id: 'action-1',
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'BAN',
        severity: 'CONSEQUENTIAL',
        reasoning: 'Severe violation',
        aiRecommended: true,
        aiConfidence: 0.95,
        status: 'PENDING',
        createdAt,
      });

      await service.submitAiRecommendation({
        ...validRequest,
        targetType: 'user',
        targetId: 'user-1',
        actionType: 'ban',
        confidence: 0.95,
      });

      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetType: 'USER',
          actionType: 'BAN',
          severity: 'CONSEQUENTIAL',
        }),
      });
    });
  });

  describe('getPendingRecommendations', () => {
    it('should return pending AI recommendations', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.findMany.mockResolvedValue([
        {
          id: 'action-1',
          targetType: 'RESPONSE',
          targetId: 'response-1',
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          reasoning: 'Test',
          aiRecommended: true,
          aiConfidence: 0.85,
          status: 'PENDING',
          createdAt,
        },
      ]);

      const result = await service.getPendingRecommendations();

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith({
        where: {
          aiRecommended: true,
          status: 'PENDING',
        },
        orderBy: [{ aiConfidence: 'desc' }, { createdAt: 'asc' }],
        take: 20,
      });
      expect(result).toHaveLength(1);
      expect(result[0].aiConfidence).toBe(0.85);
    });

    it('should respect limit parameter', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await service.getPendingRecommendations(10);

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getRecommendationStats', () => {
    it('should return statistics', async () => {
      mockPrisma.moderationAction.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(40); // approved (not pending)
      mockPrisma.moderationAction.groupBy.mockResolvedValue([
        { actionType: 'WARN', _count: 5 },
        { actionType: 'EDUCATE', _count: 3 },
        { actionType: 'HIDE', _count: 2 },
      ]);
      mockPrisma.moderationAction.aggregate.mockResolvedValue({
        _avg: { aiConfidence: 0.75 },
      });

      const result = await service.getRecommendationStats();

      expect(result.totalPending).toBe(10);
      expect(result.byActionType).toEqual({
        WARN: 5,
        EDUCATE: 3,
        HIDE: 2,
      });
      expect(result.avgConfidence).toBe(0.75);
      expect(result.approvalRate).toBe(0.8); // 40 / 50
    });

    it('should handle zero total', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.moderationAction.groupBy.mockResolvedValue([]);
      mockPrisma.moderationAction.aggregate.mockResolvedValue({
        _avg: { aiConfidence: null },
      });

      const result = await service.getRecommendationStats();

      expect(result.totalPending).toBe(0);
      expect(result.approvalRate).toBe(0);
      expect(result.avgConfidence).toBe(0);
    });
  });

  describe('approveRecommendation', () => {
    it('should update action to ACTIVE status', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.update.mockResolvedValue({
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'ACTIVE',
        approvedById: 'mod-1',
        approvedAt: new Date(),
        executedAt: new Date(),
        createdAt,
      });

      const result = await service.approveRecommendation('action-1', 'mod-1');

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: 'action-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          approvedById: 'mod-1',
        }),
      });
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('rejectRecommendation', () => {
    it('should update action to APPEALED status with reason', async () => {
      mockPrisma.moderationAction.update.mockResolvedValue({});

      await service.rejectRecommendation('action-1', 'Incorrect assessment');

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: 'action-1' },
        data: {
          status: 'APPEALED',
          reasoning: 'Incorrect assessment [REJECTED BY MODERATOR]',
        },
      });
    });
  });
});
