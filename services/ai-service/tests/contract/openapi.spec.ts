/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Service OpenAPI Contract Tests
 *
 * Validates that ai-service API responses conform to the OpenAPI specification.
 * These tests ensure API contract stability and catch breaking changes early.
 *
 * @remarks
 * - Tests validate response structure, not business logic
 * - Uses golden test fixtures for deterministic validation
 * - Run as part of CI to catch contract regressions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createValidator, type OpenAPIValidator } from '@reason-bridge/testing-utils/openapi';
import { resolve } from 'path';

const SPEC_PATH = resolve(__dirname, '../../docs/api/feedback.openapi.yaml');

describe('AI Service OpenAPI Contract Tests', () => {
  let validator: OpenAPIValidator;

  beforeAll(async () => {
    validator = await createValidator(SPEC_PATH);
  });

  describe('Schema Availability', () => {
    it('should have all expected schemas', () => {
      const schemas = validator.getSchemaNames();

      expect(schemas).toContain('FeedbackType');
      expect(schemas).toContain('PreviewFeedbackDto');
      expect(schemas).toContain('PreviewFeedbackResult');
      expect(schemas).toContain('PreviewFeedbackItem');
      expect(schemas).toContain('RequestFeedbackDto');
      expect(schemas).toContain('FeedbackResponse');
      expect(schemas).toContain('DismissFeedbackDto');
      expect(schemas).toContain('FeedbackAnalytics');
    });
  });

  describe('FeedbackType Schema', () => {
    it('should validate all feedback types', () => {
      const types = ['FALLACY', 'INFLAMMATORY', 'UNSOURCED', 'BIAS', 'AFFIRMATION'];
      for (const type of types) {
        const result = validator.validateResponse('FeedbackType', type);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid feedback type', () => {
      const result = validator.validateResponse('FeedbackType', 'INVALID_TYPE');
      expect(result.valid).toBe(false);
    });
  });

  describe('PreviewFeedbackDto Schema', () => {
    it('should validate valid preview request', () => {
      const dto = {
        content: 'This is draft content that needs feedback.',
      };
      const result = validator.validateResponse('PreviewFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate request with optional fields', () => {
      const dto = {
        content: 'Draft content for analysis.',
        context: 'Previous discussion context here.',
        feedbackTypes: ['FALLACY', 'BIAS'],
      };
      const result = validator.validateResponse('PreviewFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should require content field', () => {
      const dto = {};
      const result = validator.validateResponse('PreviewFeedbackDto', dto);
      expect(result.valid).toBe(false);
    });
  });

  describe('PreviewFeedbackResult Schema', () => {
    it('should validate empty results', () => {
      const result = {
        items: [],
        analyzedAt: '2025-01-15T12:00:00Z',
      };
      const validationResult = validator.validateResponse('PreviewFeedbackResult', result);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate results with items', () => {
      const result = {
        items: [
          {
            type: 'FALLACY',
            subtype: 'ad_hominem',
            suggestionText: 'Consider focusing on the argument rather than the person.',
            reasoning: 'The statement attacks the person instead of their argument.',
            confidenceScore: 0.85,
            highlightRange: { start: 10, end: 50 },
          },
        ],
        analyzedAt: '2025-01-15T12:00:00Z',
        processingTimeMs: 150,
      };
      const validationResult = validator.validateResponse('PreviewFeedbackResult', result);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate multiple feedback items', () => {
      const result = {
        items: [
          {
            type: 'INFLAMMATORY',
            suggestionText: 'Consider using more neutral language.',
            reasoning: 'The tone may come across as hostile.',
            confidenceScore: 0.72,
          },
          {
            type: 'UNSOURCED',
            suggestionText: 'Consider adding a source for this claim.',
            reasoning: 'This factual claim would benefit from citation.',
            confidenceScore: 0.68,
          },
        ],
        analyzedAt: '2025-01-15T12:00:00Z',
      };
      const validationResult = validator.validateResponse('PreviewFeedbackResult', result);
      expect(validationResult.valid).toBe(true);
    });
  });

  describe('PreviewFeedbackItem Schema', () => {
    it('should validate minimal feedback item', () => {
      const item = {
        type: 'BIAS',
        suggestionText: 'Consider alternative perspectives.',
        reasoning: 'The argument shows confirmation bias.',
        confidenceScore: 0.75,
      };
      const result = validator.validateResponse('PreviewFeedbackItem', item);
      expect(result.valid).toBe(true);
    });

    it('should validate confidence score boundaries', () => {
      const itemMin = {
        type: 'FALLACY',
        suggestionText: 'Test',
        reasoning: 'Test',
        confidenceScore: 0,
      };
      const itemMax = {
        type: 'FALLACY',
        suggestionText: 'Test',
        reasoning: 'Test',
        confidenceScore: 1,
      };
      expect(validator.validateResponse('PreviewFeedbackItem', itemMin).valid).toBe(true);
      expect(validator.validateResponse('PreviewFeedbackItem', itemMax).valid).toBe(true);
    });

    it('should reject confidence score out of bounds', () => {
      const item = {
        type: 'FALLACY',
        suggestionText: 'Test',
        reasoning: 'Test',
        confidenceScore: 1.5,
      };
      const result = validator.validateResponse('PreviewFeedbackItem', item);
      expect(result.valid).toBe(false);
    });
  });

  describe('RequestFeedbackDto Schema', () => {
    it('should validate valid request', () => {
      const dto = {
        responseId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Content to analyze for feedback.',
      };
      const result = validator.validateResponse('RequestFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate request with feedback types', () => {
      const dto = {
        responseId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Content to analyze.',
        feedbackTypes: ['FALLACY', 'INFLAMMATORY'],
      };
      const result = validator.validateResponse('RequestFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should require responseId and content', () => {
      const dto = {
        responseId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = validator.validateResponse('RequestFeedbackDto', dto);
      expect(result.valid).toBe(false);
    });
  });

  describe('FeedbackResponse Schema', () => {
    const validFeedback = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      responseId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'FALLACY',
      subtype: 'strawman',
      suggestionText: 'The argument misrepresents the opposing view.',
      reasoning: 'This is a strawman fallacy because it distorts the original argument.',
      confidenceScore: 0.88,
      educationalResources: {
        links: ['https://example.com/strawman'],
        articles: ['Understanding Strawman Fallacies'],
      },
      displayedToUser: true,
      createdAt: '2025-01-15T10:00:00Z',
      dismissedAt: null,
      dismissReason: null,
    };

    it('should validate complete feedback response', () => {
      const result = validator.validateResponse('FeedbackResponse', validFeedback);
      expect(result.valid).toBe(true);
    });

    it('should validate all feedback types', () => {
      const types = ['FALLACY', 'INFLAMMATORY', 'UNSOURCED', 'BIAS', 'AFFIRMATION'];
      for (const type of types) {
        const feedback = { ...validFeedback, type };
        const result = validator.validateResponse('FeedbackResponse', feedback);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate dismissed feedback', () => {
      const dismissedFeedback = {
        ...validFeedback,
        dismissedAt: '2025-01-15T12:00:00Z',
        dismissReason: 'NOT_APPLICABLE',
      };
      const result = validator.validateResponse('FeedbackResponse', dismissedFeedback);
      expect(result.valid).toBe(true);
    });

    it('should allow null educational resources', () => {
      const feedbackNoResources = {
        ...validFeedback,
        educationalResources: null,
      };
      const result = validator.validateResponse('FeedbackResponse', feedbackNoResources);
      expect(result.valid).toBe(true);
    });
  });

  describe('DismissFeedbackDto Schema', () => {
    it('should validate dismissal with reason', () => {
      const dto = {
        reason: 'NOT_APPLICABLE',
      };
      const result = validator.validateResponse('DismissFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate all dismiss reasons', () => {
      const reasons = ['NOT_APPLICABLE', 'ALREADY_ADDRESSED', 'DISAGREE', 'OTHER'];
      for (const reason of reasons) {
        const dto = { reason };
        const result = validator.validateResponse('DismissFeedbackDto', dto);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate dismissal with details', () => {
      const dto = {
        reason: 'OTHER',
        details: 'The feedback was generated for the wrong section of my response.',
      };
      const result = validator.validateResponse('DismissFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate empty dismissal', () => {
      const dto = {};
      const result = validator.validateResponse('DismissFeedbackDto', dto);
      expect(result.valid).toBe(true);
    });
  });

  describe('FeedbackAnalytics Schema', () => {
    it('should validate analytics response', () => {
      const analytics = {
        totalGenerated: 1500,
        totalDismissed: 300,
        totalAccepted: 1000,
        acceptanceRate: 0.67,
        averageConfidence: 0.78,
        byType: {
          FALLACY: { count: 500, dismissed: 100, acceptanceRate: 0.8 },
          INFLAMMATORY: { count: 300, dismissed: 80, acceptanceRate: 0.73 },
          UNSOURCED: { count: 400, dismissed: 70, acceptanceRate: 0.82 },
          BIAS: { count: 200, dismissed: 40, acceptanceRate: 0.8 },
          AFFIRMATION: { count: 100, dismissed: 10, acceptanceRate: 0.9 },
        },
        dismissalReasons: {
          NOT_APPLICABLE: 150,
          ALREADY_ADDRESSED: 80,
          DISAGREE: 50,
          OTHER: 20,
        },
        dailyTrends: [
          {
            date: '2025-01-15',
            generated: 50,
            accepted: 35,
            dismissed: 10,
          },
        ],
      };
      const result = validator.validateResponse('FeedbackAnalytics', analytics);
      expect(result.valid).toBe(true);
    });

    it('should validate minimal analytics', () => {
      const analytics = {
        totalGenerated: 0,
        totalDismissed: 0,
        acceptanceRate: 0,
        byType: {},
      };
      const result = validator.validateResponse('FeedbackAnalytics', analytics);
      expect(result.valid).toBe(true);
    });
  });

  describe('Endpoint Response Validation', () => {
    it('should validate POST /feedback/preview response', () => {
      const response = {
        items: [],
        analyzedAt: '2025-01-15T12:00:00Z',
      };
      const result = validator.validateEndpointResponse('post', '/feedback/preview', 200, response);
      expect(result.valid).toBe(true);
    });

    it('should validate POST /feedback/request response', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        responseId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'BIAS',
        suggestionText: 'Consider alternative viewpoints.',
        reasoning: 'The argument may benefit from more balanced consideration.',
        confidenceScore: 0.72,
        displayedToUser: true,
        createdAt: '2025-01-15T10:00:00Z',
      };
      const result = validator.validateEndpointResponse('post', '/feedback/request', 201, response);
      expect(result.valid).toBe(true);
    });

    it('should validate GET /feedback/analytics response', () => {
      const response = {
        totalGenerated: 100,
        totalDismissed: 20,
        acceptanceRate: 0.8,
        byType: {},
      };
      const result = validator.validateEndpointResponse(
        'get',
        '/feedback/analytics',
        200,
        response,
      );
      expect(result.valid).toBe(true);
    });
  });
});
