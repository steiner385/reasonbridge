/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAPIValidator, createValidator, createOpenAPIMatcher } from '../openapi/validator.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory of this test file (works in both local and CI environments)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the actual OpenAPI spec from discussion-service
// Path from packages/testing-utils/src/__tests__/ to services/discussion-service/docs/api/
const SPEC_PATH = resolve(
  __dirname,
  '../../../../services/discussion-service/docs/api/topics-management.openapi.yaml',
);

describe('OpenAPIValidator', () => {
  let validator: OpenAPIValidator;

  beforeAll(async () => {
    validator = await createValidator(SPEC_PATH);
  });

  describe('load()', () => {
    it('should load and parse YAML OpenAPI spec', async () => {
      const spec = validator.getSpec();
      expect(spec).toBeDefined();
      expect(spec?.openapi).toBe('3.0.3');
      expect(spec?.info.title).toBe('Topic Management API');
    });

    it('should compile component schemas', () => {
      const schemaNames = validator.getSchemaNames();
      expect(schemaNames).toContain('TopicResponse');
      expect(schemaNames).toContain('PaginatedTopicsResponse');
      expect(schemaNames).toContain('CreateTopicDto');
    });
  });

  describe('validateResponse()', () => {
    it('should validate a valid TopicResponse', () => {
      const validTopic = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'This is a valid topic title with enough characters',
        description: 'A detailed description of the topic',
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

      const result = validator.validateResponse('TopicResponse', validTopic);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid status enum', () => {
      const invalidTopic = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Valid title with enough characters here',
        status: 'INVALID_STATUS', // Invalid enum value
        visibility: 'PUBLIC',
      };

      const result = validator.validateResponse('TopicResponse', invalidTopic);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.path.includes('status'))).toBe(true);
    });

    it('should return error for non-existent schema', () => {
      const result = validator.validateResponse('NonExistentSchema', {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('not found');
    });

    it('should validate CreateTopicDto with required fields', () => {
      const validCreate = {
        title: 'A topic title that meets the minimum length requirement',
        description:
          'A description that is long enough to meet the minimum length requirement of fifty characters for topic descriptions',
        tags: ['tag1', 'tag2'],
      };

      const result = validator.validateResponse('CreateTopicDto', validCreate);
      expect(result.valid).toBe(true);
    });

    it('should reject CreateTopicDto missing required fields', () => {
      const invalidCreate = {
        title: 'A topic title',
        // missing description and tags
      };

      const result = validator.validateResponse('CreateTopicDto', invalidCreate);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEndpointResponse()', () => {
    it('should validate GET /topics response', () => {
      const validResponse = {
        topics: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      const result = validator.validateEndpointResponse('get', '/topics', 200, validResponse);
      expect(result.valid).toBe(true);
    });

    it('should return error for non-existent path', () => {
      const result = validator.validateEndpointResponse('get', '/nonexistent', 200, {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('not found');
    });

    it('should return error for non-existent method', () => {
      const result = validator.validateEndpointResponse('delete', '/topics', 200, {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('not found');
    });
  });

  describe('hasSchema()', () => {
    it('should return true for existing schema', () => {
      expect(validator.hasSchema('TopicResponse')).toBe(true);
    });

    it('should return false for non-existing schema', () => {
      expect(validator.hasSchema('NonExistent')).toBe(false);
    });
  });

  describe('createOpenAPIMatcher()', () => {
    it('should create a matcher function', () => {
      const matcher = createOpenAPIMatcher(validator);
      expect(matcher.toMatchOpenAPISchema).toBeDefined();
    });

    it('should match valid data', () => {
      const matcher = createOpenAPIMatcher(validator);
      const validTopic = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Valid topic title with enough characters',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      };

      const result = matcher.toMatchOpenAPISchema(validTopic, 'TopicResponse');
      expect(result.pass).toBe(true);
    });

    it('should not match invalid data', () => {
      const matcher = createOpenAPIMatcher(validator);
      const invalidTopic = {
        id: 'not-a-uuid',
        status: 'INVALID',
      };

      const result = matcher.toMatchOpenAPISchema(invalidTopic, 'TopicResponse');
      expect(result.pass).toBe(false);
      expect(result.message()).toContain('Validation errors');
    });
  });
});
