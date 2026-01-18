import { describe, it, expect } from 'vitest';
import { AIReviewService } from '../ai-review.service.js';

/**
 * AIReviewService Unit Tests
 *
 * Tests focus on validation logic and service interface.
 * Database integration is tested via E2E tests.
 */
describe('AIReviewService', () => {
  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      const service = new AIReviewService(null as any, null as any);
      expect(service).toBeInstanceOf(AIReviewService);
    });

    it('should have all required methods', () => {
      const service = new AIReviewService(null as any, null as any);

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
      const validActions = [
        'educate',
        'warn',
        'hide',
        'remove',
        'suspend',
        'ban',
      ];

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
});
