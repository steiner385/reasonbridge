/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion Service OpenAPI Contract Tests
 *
 * Validates that discussion-service API responses conform to the OpenAPI specification.
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

const SPEC_PATH = resolve(__dirname, '../../docs/api/topics-management.openapi.yaml');

describe('Discussion Service OpenAPI Contract Tests', () => {
  let validator: OpenAPIValidator;

  beforeAll(async () => {
    validator = await createValidator(SPEC_PATH);
  });

  describe('Schema Availability', () => {
    it('should have all expected schemas', () => {
      const schemas = validator.getSchemaNames();

      expect(schemas).toContain('TopicResponse');
      expect(schemas).toContain('PaginatedTopicsResponse');
      expect(schemas).toContain('CreateTopicDto');
      expect(schemas).toContain('UpdateTopicDto');
      expect(schemas).toContain('UpdateTopicStatusDto');
      expect(schemas).toContain('MergeTopicsDto');
      expect(schemas).toContain('TopicEditHistoryResponse');
      expect(schemas).toContain('TopicAnalyticsResponse');
    });
  });

  describe('TopicResponse Schema', () => {
    const validTopicResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'This is a valid topic title with enough characters',
      description: 'A detailed description of the topic for discussion purposes.',
      creatorId: '123e4567-e89b-12d3-a456-426614174001',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      slug: 'valid-topic-slug',
      evidenceStandards: 'STANDARD',
      minimumDiversityScore: 0.5,
      currentDiversityScore: 0.7,
      participantCount: 10,
      responseCount: 25,
      crossCuttingThemes: ['theme1', 'theme2'],
      createdAt: '2025-01-01T00:00:00Z',
      activatedAt: '2025-01-02T00:00:00Z',
      archivedAt: null,
      tags: [{ id: '123e4567-e89b-12d3-a456-426614174002', name: 'politics' }],
    };

    it('should validate a complete topic response', () => {
      const result = validator.validateResponse('TopicResponse', validTopicResponse);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate all status values', () => {
      const statuses = ['SEEDING', 'ACTIVE', 'ARCHIVED', 'LOCKED'];

      for (const status of statuses) {
        const topic = { ...validTopicResponse, status };
        const result = validator.validateResponse('TopicResponse', topic);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate all visibility values', () => {
      const visibilities = ['PUBLIC', 'PRIVATE', 'UNLISTED'];

      for (const visibility of visibilities) {
        const topic = { ...validTopicResponse, visibility };
        const result = validator.validateResponse('TopicResponse', topic);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid status value', () => {
      const invalidTopic = { ...validTopicResponse, status: 'INVALID_STATUS' };
      const result = validator.validateResponse('TopicResponse', invalidTopic);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('status'))).toBe(true);
    });

    it('should allow null for nullable fields', () => {
      const topicWithNulls = {
        ...validTopicResponse,
        currentDiversityScore: null,
        activatedAt: null,
        archivedAt: null,
      };
      const result = validator.validateResponse('TopicResponse', topicWithNulls);
      expect(result.valid).toBe(true);
    });

    it('should validate topic with empty tags array', () => {
      const topicNoTags = { ...validTopicResponse, tags: [] };
      const result = validator.validateResponse('TopicResponse', topicNoTags);
      expect(result.valid).toBe(true);
    });
  });

  describe('PaginatedTopicsResponse Schema', () => {
    it('should validate empty topics list', () => {
      const response = {
        topics: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      const result = validator.validateResponse('PaginatedTopicsResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate paginated response with topics', () => {
      const response = {
        topics: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'First Topic Title with enough characters',
            status: 'ACTIVE',
            visibility: 'PUBLIC',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      const result = validator.validateResponse('PaginatedTopicsResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('CreateTopicDto Schema', () => {
    it('should validate valid create request', () => {
      const createDto = {
        title: 'A topic title that meets the minimum length requirement',
        description:
          'A detailed description that is long enough to meet the minimum length requirement of fifty characters for topic descriptions in the system.',
        tags: ['tag1', 'tag2'],
      };
      const result = validator.validateResponse('CreateTopicDto', createDto);
      expect(result.valid).toBe(true);
    });

    it('should require title, description, and tags', () => {
      const incompleteDto = {
        title: 'Only title provided',
      };
      const result = validator.validateResponse('CreateTopicDto', incompleteDto);
      expect(result.valid).toBe(false);
    });

    it('should validate tags array constraints', () => {
      const dtoWithTags = {
        title: 'A topic title that meets minimum length',
        description:
          'A detailed description that is long enough to meet the minimum length requirement.',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };
      const result = validator.validateResponse('CreateTopicDto', dtoWithTags);
      expect(result.valid).toBe(true);
    });
  });

  describe('UpdateTopicDto Schema', () => {
    it('should validate partial update', () => {
      const updateDto = {
        title: 'Updated topic title with minimum length',
      };
      const result = validator.validateResponse('UpdateTopicDto', updateDto);
      expect(result.valid).toBe(true);
    });

    it('should validate full update with edit reason', () => {
      const updateDto = {
        title: 'Updated topic title with minimum length',
        description:
          'Updated description that meets the minimum length requirement for topic descriptions.',
        tags: ['updated', 'tags'],
        editReason: 'Clarifying the topic scope based on user feedback',
        flagForReview: true,
      };
      const result = validator.validateResponse('UpdateTopicDto', updateDto);
      expect(result.valid).toBe(true);
    });

    it('should validate empty update', () => {
      const emptyUpdate = {};
      const result = validator.validateResponse('UpdateTopicDto', emptyUpdate);
      expect(result.valid).toBe(true);
    });
  });

  describe('UpdateTopicStatusDto Schema', () => {
    it('should validate status update', () => {
      const statusDto = {
        status: 'ARCHIVED',
      };
      const result = validator.validateResponse('UpdateTopicStatusDto', statusDto);
      expect(result.valid).toBe(true);
    });

    it('should require status field', () => {
      const emptyDto = {};
      const result = validator.validateResponse('UpdateTopicStatusDto', emptyDto);
      expect(result.valid).toBe(false);
    });

    it('should validate all status values', () => {
      const statuses = ['SEEDING', 'ACTIVE', 'ARCHIVED', 'LOCKED'];
      for (const status of statuses) {
        const result = validator.validateResponse('UpdateTopicStatusDto', { status });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('MergeTopicsDto Schema', () => {
    it('should validate merge request', () => {
      const mergeDto = {
        sourceTopicIds: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
        ],
        targetTopicId: '123e4567-e89b-12d3-a456-426614174000',
        mergeReason:
          'These topics discuss the same subject and should be consolidated for better organization.',
      };
      const result = validator.validateResponse('MergeTopicsDto', mergeDto);
      expect(result.valid).toBe(true);
    });

    it('should require all fields', () => {
      const incompleteDto = {
        sourceTopicIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      const result = validator.validateResponse('MergeTopicsDto', incompleteDto);
      expect(result.valid).toBe(false);
    });
  });

  describe('TopicEditHistoryResponse Schema', () => {
    it('should validate empty edit history', () => {
      const response = {
        edits: [],
        total: 0,
      };
      const result = validator.validateResponse('TopicEditHistoryResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate edit history with entries', () => {
      const response = {
        edits: [
          {
            id: '123e4567-e89b-12d3-a456-426614174010',
            topicId: '123e4567-e89b-12d3-a456-426614174000',
            editorId: '123e4567-e89b-12d3-a456-426614174001',
            editedAt: '2025-01-15T10:30:00Z',
            previousTitle: 'Old Title',
            newTitle: 'New Title with more detail',
            previousDescription: null,
            newDescription: null,
            previousTags: ['old'],
            newTags: ['new', 'updated'],
            changeReason: 'Improving clarity',
            flaggedForReview: false,
            editor: {
              id: '123e4567-e89b-12d3-a456-426614174001',
              name: 'John Doe',
              username: 'johndoe',
            },
          },
        ],
        total: 1,
      };
      const result = validator.validateResponse('TopicEditHistoryResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('TopicAnalyticsResponse Schema', () => {
    it('should validate analytics response', () => {
      const response = {
        topicId: '123e4567-e89b-12d3-a456-426614174000',
        summary: {
          totalViews: 1500,
          totalResponses: 45,
          totalParticipants: 23,
          avgEngagementScore: 0.75,
          createdAt: '2025-01-01T00:00:00Z',
          lastActivityAt: '2025-01-15T14:30:00Z',
        },
        dailyMetrics: [
          {
            date: '2025-01-15',
            viewCount: 100,
            uniqueViewers: 50,
            responseCount: 5,
            participantCount: 8,
            newParticipants: 3,
            avgResponseLength: 250,
            engagementScore: 0.8,
            peakActivityHour: 14,
          },
        ],
        trends: {
          viewsGrowth: 15.5,
          responsesGrowth: 8.2,
          participantsGrowth: 12.0,
          engagementTrend: 'increasing',
        },
      };
      const result = validator.validateResponse('TopicAnalyticsResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate all engagement trend values', () => {
      const trends = ['increasing', 'stable', 'decreasing'];
      for (const trend of trends) {
        const response = {
          topicId: '123e4567-e89b-12d3-a456-426614174000',
          summary: {
            totalViews: 100,
            totalResponses: 10,
            totalParticipants: 5,
            avgEngagementScore: 0.5,
            createdAt: '2025-01-01T00:00:00Z',
            lastActivityAt: '2025-01-01T00:00:00Z',
          },
          dailyMetrics: [],
          trends: {
            viewsGrowth: 0,
            responsesGrowth: 0,
            participantsGrowth: 0,
            engagementTrend: trend,
          },
        };
        const result = validator.validateResponse('TopicAnalyticsResponse', response);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Endpoint Response Validation', () => {
    it('should validate GET /topics response', () => {
      const response = {
        topics: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      const result = validator.validateEndpointResponse('get', '/topics', 200, response);
      expect(result.valid).toBe(true);
    });

    it('should validate GET /topics/{id} response', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Topic Title with enough characters',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      };
      const result = validator.validateEndpointResponse('get', '/topics/{id}', 200, response);
      expect(result.valid).toBe(true);
    });

    it('should validate POST /topics response', () => {
      const response = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Newly Created Topic Title',
        status: 'SEEDING',
        visibility: 'PUBLIC',
      };
      const result = validator.validateEndpointResponse('post', '/topics', 201, response);
      expect(result.valid).toBe(true);
    });
  });
});
