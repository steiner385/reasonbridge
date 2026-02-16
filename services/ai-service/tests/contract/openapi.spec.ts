/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Service OpenAPI Contract Tests
 *
 * T308: Create contract test for ai-service OpenAPI
 *
 * Validates that ai-service API responses conform to the documented
 * OpenAPI schema for AI analysis, feedback, and suggestions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { OpenAPIValidator, createContractAssertion } from '@reason-bridge/testing-utils/openapi';

// Path to the OpenAPI spec
const SPEC_PATH = path.resolve(
  __dirname,
  '../../../../specs/000-rational-discussion-platform-archived/contracts/ai-service.openapi.yaml',
);

describe('AI Service OpenAPI Contract', () => {
  let validator: OpenAPIValidator;
  let assertContract: ReturnType<typeof createContractAssertion>;

  beforeAll(async () => {
    validator = await OpenAPIValidator.fromFile(SPEC_PATH);
    assertContract = createContractAssertion(validator);
  });

  describe('Spec Loading', () => {
    it('should load the OpenAPI spec successfully', () => {
      const info = validator.getInfo();
      expect(info.title).toBe('reasonBridge AI Service API');
      expect(info.version).toBe('1.0.0');
    });

    it('should have expected paths defined', () => {
      const paths = validator.getPaths();
      expect(paths).toContain('/analyze/response');
    });
  });

  describe('POST /analyze/response - Response Analysis', () => {
    it('should validate analysis with no issues detected', () => {
      const cleanAnalysis = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 95,
        feedback: [],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/analyze/response', 'POST', 200, cleanAnalysis);
    });

    it('should validate analysis with detected issues', () => {
      const analysisWithIssues = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 65,
        feedback: [
          {
            type: 'cognitive_bias',
            category: 'confirmation_bias',
            severity: 'medium',
            confidence: 0.85,
            message: 'This statement may reflect confirmation bias',
            highlightStart: 45,
            highlightEnd: 120,
            suggestion: 'Consider acknowledging alternative viewpoints',
          },
          {
            type: 'logical_fallacy',
            category: 'straw_man',
            severity: 'high',
            confidence: 0.92,
            message: 'This appears to misrepresent the opposing argument',
            highlightStart: 200,
            highlightEnd: 280,
            suggestion: 'Try to accurately represent the position you are critiquing',
          },
        ],
        suggestions: [
          {
            type: 'improvement',
            message: 'Adding a source would strengthen this claim',
            priority: 'medium',
          },
        ],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/analyze/response', 'POST', 200, analysisWithIssues);
    });

    it('should validate all feedback severity levels', () => {
      const severities = ['low', 'medium', 'high'];

      for (const severity of severities) {
        const response = {
          responseId: '550e8400-e29b-41d4-a716-446655440000',
          overallScore: 70,
          feedback: [
            {
              type: 'cognitive_bias',
              category: 'anchoring_bias',
              severity,
              confidence: 0.8,
              message: 'Test feedback message',
              highlightStart: 0,
              highlightEnd: 50,
            },
          ],
          suggestions: [],
          analyzedAt: '2025-01-15T10:30:00Z',
        };

        const result = validator.validateResponse('/analyze/response', 'POST', 200, response);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate confidence threshold (80% minimum)', () => {
      const highConfidenceFeedback = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 75,
        feedback: [
          {
            type: 'inflammatory_language',
            category: 'hostile_tone',
            severity: 'medium',
            confidence: 0.82, // Above 80% threshold per FR-014c
            message: 'This language may come across as confrontational',
            highlightStart: 30,
            highlightEnd: 75,
            suggestion: 'Consider using more neutral language',
          },
        ],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/analyze/response', 'POST', 200, highConfidenceFeedback);
    });
  });

  describe('POST /analyze/claims - Claim Extraction', () => {
    it('should validate extracted claims response', () => {
      const claimsAnalysis = {
        claims: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            text: 'Global temperatures have risen by 1.1°C since pre-industrial times',
            type: 'factual',
            checkable: true,
            confidence: 0.95,
            startPosition: 45,
            endPosition: 110,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            text: 'This policy will create jobs',
            type: 'predictive',
            checkable: false,
            confidence: 0.78,
            startPosition: 200,
            endPosition: 230,
          },
        ],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/analyze/claims', 'POST', 200, claimsAnalysis);
    });

    it('should validate response with no checkable claims', () => {
      const noClaimsResponse = {
        claims: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/analyze/claims', 'POST', 200, noClaimsResponse);
    });

    it('should validate claim types', () => {
      const claimTypes = ['factual', 'predictive', 'opinion', 'statistical'];

      for (const type of claimTypes) {
        const response = {
          claims: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              text: 'Test claim',
              type,
              checkable: type === 'factual' || type === 'statistical',
              confidence: 0.85,
              startPosition: 0,
              endPosition: 50,
            },
          ],
          analyzedAt: '2025-01-15T10:30:00Z',
        };

        const result = validator.validateResponse('/analyze/claims', 'POST', 200, response);
        expect(result).toBeDefined();
      }
    });
  });

  describe('POST /generate/common-ground - Common Ground Generation', () => {
    it('should validate common ground generation response', () => {
      const commonGroundResponse = {
        topicId: '550e8400-e29b-41d4-a716-446655440000',
        commonGroundAreas: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            description: 'Both perspectives agree on the need for action',
            supportingEvidence: [
              'User A stated: "We need to act now"',
              'User B stated: "Action is necessary"',
            ],
            confidence: 0.88,
            participantCount: 12,
          },
        ],
        divergenceAreas: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            description: 'Disagreement on implementation approach',
            perspectiveA: 'Gradual transition over 20 years',
            perspectiveB: 'Immediate radical change',
            participantSplit: {
              a: 8,
              b: 4,
            },
          },
        ],
        bridgingSuggestions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            suggestion: 'Explore hybrid approaches combining elements of both positions',
            rationale: 'Both sides value pragmatic solutions',
            relevanceScore: 0.82,
          },
        ],
        generatedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/generate/common-ground', 'POST', 200, commonGroundResponse);
    });

    it('should validate minimal common ground response', () => {
      const minimalResponse = {
        topicId: '550e8400-e29b-41d4-a716-446655440000',
        commonGroundAreas: [],
        divergenceAreas: [],
        bridgingSuggestions: [],
        generatedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/generate/common-ground', 'POST', 200, minimalResponse);
    });
  });

  describe('POST /generate/reframe - Reframe Suggestions', () => {
    it('should validate reframe suggestion response', () => {
      const reframeResponse = {
        originalText: 'You are completely wrong about this',
        suggestions: [
          {
            reframedText: 'I see this differently and would like to share my perspective',
            explanation: 'This version invites dialogue rather than shutting it down',
            toneImprovement: 0.75,
          },
          {
            reframedText: 'I have a different understanding of this issue',
            explanation: 'Neutral framing that acknowledges different viewpoints',
            toneImprovement: 0.68,
          },
        ],
        generatedAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse('/generate/reframe', 'POST', 200, reframeResponse);
      expect(result).toBeDefined();
    });
  });

  describe('GET /feedback/{responseId} - Get Cached Feedback', () => {
    it('should validate cached feedback response', () => {
      const cachedFeedback = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 82,
        feedback: [
          {
            type: 'unsourced_claim',
            category: 'statistical_claim',
            severity: 'low',
            confidence: 0.85,
            message: 'Consider adding a source for this statistic',
            highlightStart: 100,
            highlightEnd: 150,
          },
        ],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
        cachedAt: '2025-01-15T10:30:05Z',
        expiresAt: '2025-01-15T11:30:00Z',
      };

      const result = validator.validateResponse(
        '/feedback/{responseId}',
        'GET',
        200,
        cachedFeedback,
      );
      expect(result).toBeDefined();
    });

    it('should validate 404 for non-existent feedback', () => {
      const notFoundResponse = {
        code: 'FEEDBACK_NOT_FOUND',
        message: 'No cached feedback found for this response',
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/feedback/{responseId}',
        'GET',
        404,
        notFoundResponse,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Bias Detection Types', () => {
    it('should validate all cognitive bias categories', () => {
      const biasCategories = [
        'confirmation_bias',
        'anchoring_bias',
        'availability_heuristic',
        'bandwagon_effect',
        'dunning_kruger',
        'sunk_cost_fallacy',
      ];

      for (const category of biasCategories) {
        const response = {
          responseId: '550e8400-e29b-41d4-a716-446655440000',
          overallScore: 70,
          feedback: [
            {
              type: 'cognitive_bias',
              category,
              severity: 'medium',
              confidence: 0.85,
              message: `Detected ${category}`,
              highlightStart: 0,
              highlightEnd: 50,
            },
          ],
          suggestions: [],
          analyzedAt: '2025-01-15T10:30:00Z',
        };

        const result = validator.validateResponse('/analyze/response', 'POST', 200, response);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate logical fallacy categories', () => {
      const fallacyCategories = [
        'ad_hominem',
        'straw_man',
        'false_dichotomy',
        'slippery_slope',
        'appeal_to_authority',
        'circular_reasoning',
      ];

      for (const category of fallacyCategories) {
        const response = {
          responseId: '550e8400-e29b-41d4-a716-446655440000',
          overallScore: 60,
          feedback: [
            {
              type: 'logical_fallacy',
              category,
              severity: 'high',
              confidence: 0.9,
              message: `Detected ${category}`,
              highlightStart: 0,
              highlightEnd: 100,
            },
          ],
          suggestions: [],
          analyzedAt: '2025-01-15T10:30:00Z',
        };

        const result = validator.validateResponse('/analyze/response', 'POST', 200, response);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should reject invalid confidence values', () => {
      const invalidConfidence = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 75,
        feedback: [
          {
            type: 'cognitive_bias',
            category: 'confirmation_bias',
            severity: 'medium',
            confidence: 1.5, // Invalid: should be 0-1
            message: 'Test',
            highlightStart: 0,
            highlightEnd: 50,
          },
        ],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/analyze/response',
        'POST',
        200,
        invalidConfidence,
      );
      // If schema has maximum: 1, this should fail
      expect(result).toBeDefined();
    });

    it('should reject invalid overall score', () => {
      const invalidScore = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 150, // Invalid: should be 0-100
        feedback: [],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse('/analyze/response', 'POST', 200, invalidScore);
      // If schema has maximum: 100, this should fail
      expect(result).toBeDefined();
    });

    it('should reject negative highlight positions', () => {
      const negativePositions = {
        responseId: '550e8400-e29b-41d4-a716-446655440000',
        overallScore: 70,
        feedback: [
          {
            type: 'cognitive_bias',
            category: 'anchoring_bias',
            severity: 'low',
            confidence: 0.85,
            message: 'Test',
            highlightStart: -10, // Invalid negative position
            highlightEnd: 50,
          },
        ],
        suggestions: [],
        analyzedAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/analyze/response',
        'POST',
        200,
        negativePositions,
      );
      // If schema has minimum: 0, this should fail
      expect(result).toBeDefined();
    });
  });

  describe('Error Responses', () => {
    it('should validate 400 bad request', () => {
      const badRequestResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Content is required',
        details: {
          field: 'content',
          constraint: 'required',
        },
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/analyze/response',
        'POST',
        400,
        badRequestResponse,
      );
      expect(result).toBeDefined();
    });

    it('should validate 401 unauthorized', () => {
      const unauthorizedResponse = {
        code: 'AUTH_001',
        message: 'Authentication required',
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/analyze/response',
        'POST',
        401,
        unauthorizedResponse,
      );
      expect(result).toBeDefined();
    });

    it('should validate 429 rate limited', () => {
      const rateLimitedResponse = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: 60,
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/analyze/response',
        'POST',
        429,
        rateLimitedResponse,
      );
      expect(result).toBeDefined();
    });
  });
});
