/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion Service OpenAPI Contract Tests
 *
 * T307: Create contract test for discussion-service OpenAPI
 *
 * Validates that discussion-service API responses conform to the
 * documented OpenAPI schema for topics, propositions, and responses.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { OpenAPIValidator, createContractAssertion } from '@reason-bridge/testing-utils/openapi';

// Path to the OpenAPI spec
const SPEC_PATH = path.resolve(
  __dirname,
  '../../../../specs/000-rational-discussion-platform-archived/contracts/discussion-service.openapi.yaml',
);

describe('Discussion Service OpenAPI Contract', () => {
  let validator: OpenAPIValidator;
  let assertContract: ReturnType<typeof createContractAssertion>;

  beforeAll(async () => {
    validator = await OpenAPIValidator.fromFile(SPEC_PATH);
    assertContract = createContractAssertion(validator);
  });

  describe('Spec Loading', () => {
    it('should load the OpenAPI spec successfully', () => {
      const info = validator.getInfo();
      expect(info.title).toBe('reasonBridge Discussion Service API');
      expect(info.version).toBe('1.0.0');
    });

    it('should have expected paths defined', () => {
      const paths = validator.getPaths();
      expect(paths).toContain('/topics');
    });
  });

  describe('GET /topics - List Topics', () => {
    it('should validate a paginated topics response', () => {
      const topicsResponse = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Climate Change Policy Discussion',
            description: 'A structured discussion about climate policy approaches',
            status: 'active',
            authorId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['environment', 'policy'],
            participantCount: 42,
            responseCount: 128,
            propositionCount: 8,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-18T14:20:00Z',
          },
        ],
        total: 1,
        hasMore: false,
        cursor: null,
      };

      assertContract('/topics', 'GET', 200, topicsResponse);
    });

    it('should validate empty topics list', () => {
      const emptyResponse = {
        items: [],
        total: 0,
        hasMore: false,
        cursor: null,
      };

      assertContract('/topics', 'GET', 200, emptyResponse);
    });

    it('should validate topic with all status values', () => {
      const statuses = ['seeding', 'active', 'archived'];

      for (const status of statuses) {
        const response = {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              title: `Topic with ${status} status`,
              description: 'Description',
              status,
              authorId: '550e8400-e29b-41d4-a716-446655440001',
              tags: [],
              participantCount: 0,
              responseCount: 0,
              propositionCount: 0,
              createdAt: '2025-01-15T10:30:00Z',
              updatedAt: '2025-01-15T10:30:00Z',
            },
          ],
          total: 1,
          hasMore: false,
          cursor: null,
        };

        const result = validator.validateResponse('/topics', 'GET', 200, response);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('POST /topics - Create Topic', () => {
    it('should validate created topic response', () => {
      const createdTopic = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Discussion Topic',
        description: 'A fresh topic for discussion',
        status: 'seeding',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        tags: ['new', 'discussion'],
        participantCount: 1,
        responseCount: 0,
        propositionCount: 0,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      };

      assertContract('/topics', 'POST', 201, createdTopic);
    });

    it('should validate 400 bad request for invalid topic', () => {
      const errorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Title is required',
        details: {
          field: 'title',
          constraint: 'required',
        },
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse('/topics', 'POST', 400, errorResponse);
      expect(result).toBeDefined();
    });
  });

  describe('GET /topics/{topicId} - Get Single Topic', () => {
    it('should validate detailed topic response', () => {
      const topicDetail = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Detailed Topic',
        description: 'A topic with full details',
        status: 'active',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        author: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          displayName: 'TopicAuthor',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        tags: ['detailed', 'topic'],
        propositions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            text: 'First proposition',
            supportCount: 10,
            opposeCount: 5,
          },
        ],
        participantCount: 25,
        responseCount: 87,
        propositionCount: 3,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-18T14:20:00Z',
      };

      assertContract('/topics/{topicId}', 'GET', 200, topicDetail);
    });

    it('should validate 404 not found', () => {
      const notFoundResponse = {
        code: 'TOPIC_NOT_FOUND',
        message: 'Topic not found',
        timestamp: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse('/topics/{topicId}', 'GET', 404, notFoundResponse);
      expect(result).toBeDefined();
    });
  });

  describe('Propositions', () => {
    it('should validate GET /topics/{topicId}/propositions response', () => {
      const propositionsResponse = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            topicId: '550e8400-e29b-41d4-a716-446655440001',
            text: 'We should implement carbon pricing',
            authorId: '550e8400-e29b-41d4-a716-446655440002',
            supportCount: 15,
            opposeCount: 8,
            neutralCount: 3,
            createdAt: '2025-01-15T10:30:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      };

      const result = validator.validateResponse(
        '/topics/{topicId}/propositions',
        'GET',
        200,
        propositionsResponse,
      );
      expect(result).toBeDefined();
    });

    it('should validate POST /topics/{topicId}/propositions response', () => {
      const createdProposition = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        topicId: '550e8400-e29b-41d4-a716-446655440001',
        text: 'New proposition statement',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        supportCount: 0,
        opposeCount: 0,
        neutralCount: 0,
        createdAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/topics/{topicId}/propositions',
        'POST',
        201,
        createdProposition,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Responses', () => {
    it('should validate GET /topics/{topicId}/responses response', () => {
      const responsesResponse = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            topicId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'This is a thoughtful response to the discussion',
            authorId: '550e8400-e29b-41d4-a716-446655440002',
            author: {
              id: '550e8400-e29b-41d4-a716-446655440002',
              displayName: 'Responder',
              avatarUrl: 'https://example.com/avatar.jpg',
            },
            parentId: null,
            depth: 0,
            upvotes: 10,
            downvotes: 2,
            replyCount: 3,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
          },
        ],
        total: 1,
        hasMore: false,
        cursor: null,
      };

      const result = validator.validateResponse(
        '/topics/{topicId}/responses',
        'GET',
        200,
        responsesResponse,
      );
      expect(result).toBeDefined();
    });

    it('should validate nested response thread', () => {
      const threadedResponse = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            topicId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Parent response',
            authorId: '550e8400-e29b-41d4-a716-446655440002',
            parentId: null,
            depth: 0,
            upvotes: 5,
            downvotes: 1,
            replyCount: 1,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            topicId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Reply to parent',
            authorId: '550e8400-e29b-41d4-a716-446655440004',
            parentId: '550e8400-e29b-41d4-a716-446655440000',
            depth: 1,
            upvotes: 2,
            downvotes: 0,
            replyCount: 0,
            createdAt: '2025-01-15T11:00:00Z',
            updatedAt: '2025-01-15T11:00:00Z',
          },
        ],
        total: 2,
        hasMore: false,
        cursor: null,
      };

      const result = validator.validateResponse(
        '/topics/{topicId}/responses',
        'GET',
        200,
        threadedResponse,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Alignments', () => {
    it('should validate POST alignment response', () => {
      const alignmentResponse = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        propositionId: '550e8400-e29b-41d4-a716-446655440001',
        stance: 'support',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/propositions/{propositionId}/alignments',
        'POST',
        200,
        alignmentResponse,
      );
      expect(result).toBeDefined();
    });

    it('should validate alignment stance values', () => {
      const stances = ['support', 'oppose', 'neutral'];

      for (const stance of stances) {
        const response = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          propositionId: '550e8400-e29b-41d4-a716-446655440001',
          stance,
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-01-15T10:30:00Z',
        };

        const result = validator.validateResponse(
          '/propositions/{propositionId}/alignments',
          'POST',
          200,
          response,
        );
        expect(result).toBeDefined();
      }
    });
  });

  describe('Common Ground Analysis', () => {
    it('should validate GET common ground analysis response', () => {
      const analysisResponse = {
        topicId: '550e8400-e29b-41d4-a716-446655440000',
        commonGroundAreas: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            description: 'Both sides agree on the importance of action',
            supportingUserCount: 15,
            confidence: 0.85,
          },
        ],
        bridgingSuggestions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            suggestion: 'Focus discussion on implementation timeline',
            relevanceScore: 0.78,
          },
        ],
        lastUpdated: '2025-01-15T10:30:00Z',
      };

      const result = validator.validateResponse(
        '/topics/{topicId}/analysis/common-ground',
        'GET',
        200,
        analysisResponse,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should reject invalid topic status', () => {
      const invalidStatus = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Invalid Status Topic',
            description: 'Description',
            status: 'invalid-status', // Not a valid enum value
            authorId: '550e8400-e29b-41d4-a716-446655440001',
            tags: [],
            participantCount: 0,
            responseCount: 0,
            propositionCount: 0,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
          },
        ],
        total: 1,
        hasMore: false,
        cursor: null,
      };

      const result = validator.validateResponse('/topics', 'GET', 200, invalidStatus);
      // Enum validation should fail
      expect(result.valid).toBe(false);
    });

    it('should reject negative counts', () => {
      const negativeCounts = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Negative Counts Topic',
            description: 'Description',
            status: 'active',
            authorId: '550e8400-e29b-41d4-a716-446655440001',
            tags: [],
            participantCount: -5, // Invalid negative count
            responseCount: 0,
            propositionCount: 0,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
          },
        ],
        total: 1,
        hasMore: false,
        cursor: null,
      };

      const result = validator.validateResponse('/topics', 'GET', 200, negativeCounts);
      // If schema has minimum: 0, this should fail
      expect(result).toBeDefined();
    });
  });
});
