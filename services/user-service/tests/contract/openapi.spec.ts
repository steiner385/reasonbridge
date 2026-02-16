/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User Service OpenAPI Contract Tests
 *
 * Validates that user-service API responses conform to the OpenAPI specification.
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

const SPEC_PATH = resolve(__dirname, '../../docs/api/users.openapi.yaml');

describe('User Service OpenAPI Contract Tests', () => {
  let validator: OpenAPIValidator;

  beforeAll(async () => {
    validator = await createValidator(SPEC_PATH);
  });

  describe('Schema Availability', () => {
    it('should have all expected schemas', () => {
      const schemas = validator.getSchemaNames();

      expect(schemas).toContain('UserResponse');
      expect(schemas).toContain('PublicUserResponse');
      expect(schemas).toContain('UpdateProfileDto');
      expect(schemas).toContain('FollowStatus');
      expect(schemas).toContain('FollowResponse');
      expect(schemas).toContain('FollowersResponse');
      expect(schemas).toContain('FollowingResponse');
      expect(schemas).toContain('FeedbackPreferencesResponse');
    });
  });

  describe('UserResponse Schema', () => {
    const validUserResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      displayName: 'Test User',
      verificationLevel: 'EMAIL_VERIFIED',
      trustScoreAbility: 75.5,
      trustScoreBenevolence: 80.0,
      trustScoreIntegrity: 85.0,
      moralFoundationProfile: null,
      positionFingerprint: null,
      topicAffinities: null,
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-15T12:30:00Z',
    };

    it('should validate a complete user response', () => {
      const result = validator.validateResponse('UserResponse', validUserResponse);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate user with all verification levels', () => {
      const levels = ['UNVERIFIED', 'EMAIL_VERIFIED', 'PHONE_VERIFIED', 'FULLY_VERIFIED'];

      for (const level of levels) {
        const user = { ...validUserResponse, verificationLevel: level };
        const result = validator.validateResponse('UserResponse', user);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate user with all status values', () => {
      const statuses = ['ACTIVE', 'SUSPENDED', 'DELETED'];

      for (const status of statuses) {
        const user = { ...validUserResponse, status };
        const result = validator.validateResponse('UserResponse', user);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid verification level', () => {
      const invalidUser = { ...validUserResponse, verificationLevel: 'INVALID_LEVEL' };
      const result = validator.validateResponse('UserResponse', invalidUser);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('verificationLevel'))).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incompleteUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        // Missing displayName, verificationLevel, etc.
      };
      const result = validator.validateResponse('UserResponse', incompleteUser);
      expect(result.valid).toBe(false);
    });

    it('should allow nullable profile fields', () => {
      const userWithProfiles = {
        ...validUserResponse,
        moralFoundationProfile: { care: 0.8, fairness: 0.7 },
        positionFingerprint: { topics: ['politics'] },
        topicAffinities: { technology: 0.9 },
      };
      const result = validator.validateResponse('UserResponse', userWithProfiles);
      expect(result.valid).toBe(true);
    });
  });

  describe('PublicUserResponse Schema', () => {
    const validPublicUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      displayName: 'Public User',
      verificationLevel: 'EMAIL_VERIFIED',
      trustScoreAbility: 70.0,
      trustScoreBenevolence: 75.0,
      trustScoreIntegrity: 80.0,
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00Z',
    };

    it('should validate a public user response', () => {
      const result = validator.validateResponse('PublicUserResponse', validPublicUser);
      expect(result.valid).toBe(true);
    });

    it('should not require email field (private)', () => {
      // PublicUserResponse intentionally excludes email
      const result = validator.validateResponse('PublicUserResponse', validPublicUser);
      expect(result.valid).toBe(true);
    });

    it('should not require updatedAt field', () => {
      // PublicUserResponse excludes updatedAt for privacy
      const result = validator.validateResponse('PublicUserResponse', validPublicUser);
      expect(result.valid).toBe(true);
    });
  });

  describe('FollowStatus Schema', () => {
    it('should validate follow status when following', () => {
      const status = {
        isFollowing: true,
        followerCount: 100,
        followingCount: 50,
      };
      const result = validator.validateResponse('FollowStatus', status);
      expect(result.valid).toBe(true);
    });

    it('should validate follow status when not following', () => {
      const status = {
        isFollowing: false,
        followerCount: 0,
        followingCount: 0,
      };
      const result = validator.validateResponse('FollowStatus', status);
      expect(result.valid).toBe(true);
    });

    it('should reject negative counts', () => {
      const invalidStatus = {
        isFollowing: false,
        followerCount: -1,
        followingCount: 0,
      };
      const result = validator.validateResponse('FollowStatus', invalidStatus);
      expect(result.valid).toBe(false);
    });
  });

  describe('FollowResponse Schema', () => {
    it('should validate successful follow response', () => {
      const response = {
        success: true,
        message: 'Successfully followed user',
        isFollowing: true,
        followedUserId: '123e4567-e89b-12d3-a456-426614174000',
        followedAt: '2025-01-15T12:00:00Z',
      };
      const result = validator.validateResponse('FollowResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate unfollow response without followedAt', () => {
      const response = {
        success: true,
        message: 'Successfully unfollowed user',
        isFollowing: false,
        followedUserId: '123e4567-e89b-12d3-a456-426614174000',
        followedAt: null,
      };
      const result = validator.validateResponse('FollowResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('FollowersResponse Schema', () => {
    it('should validate empty followers list', () => {
      const response = {
        followers: [],
        total: 0,
        limit: 20,
        offset: 0,
      };
      const result = validator.validateResponse('FollowersResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate followers list with users', () => {
      const response = {
        followers: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            displayName: 'Follower One',
            verificationLevel: 'EMAIL_VERIFIED',
            trustScoreAbility: 60.0,
            trustScoreBenevolence: 65.0,
            trustScoreIntegrity: 70.0,
            status: 'ACTIVE',
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };
      const result = validator.validateResponse('FollowersResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('FollowingResponse Schema', () => {
    it('should validate empty following list', () => {
      const response = {
        following: [],
        total: 0,
        limit: 20,
        offset: 0,
      };
      const result = validator.validateResponse('FollowingResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('FeedbackPreferencesResponse Schema', () => {
    it('should validate default preferences', () => {
      const response = {
        enabled: true,
        types: {
          tone: true,
          bias: true,
          fallacy: true,
          sources: false,
        },
      };
      const result = validator.validateResponse('FeedbackPreferencesResponse', response);
      expect(result.valid).toBe(true);
    });

    it('should validate disabled preferences', () => {
      const response = {
        enabled: false,
        types: {
          tone: false,
          bias: false,
          fallacy: false,
          sources: false,
        },
      };
      const result = validator.validateResponse('FeedbackPreferencesResponse', response);
      expect(result.valid).toBe(true);
    });
  });

  describe('UpdateProfileDto Schema', () => {
    it('should validate partial update', () => {
      const dto = {
        displayName: 'New Display Name',
      };
      const result = validator.validateResponse('UpdateProfileDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate full update', () => {
      const dto = {
        displayName: 'New Name',
        bio: 'This is my updated bio with some details about myself.',
      };
      const result = validator.validateResponse('UpdateProfileDto', dto);
      expect(result.valid).toBe(true);
    });

    it('should validate empty update', () => {
      const dto = {};
      const result = validator.validateResponse('UpdateProfileDto', dto);
      expect(result.valid).toBe(true);
    });
  });

  describe('Endpoint Response Validation', () => {
    it('should validate GET /users/me response schema reference', () => {
      const userResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        displayName: 'Test User',
        verificationLevel: 'EMAIL_VERIFIED',
        trustScoreAbility: 50,
        trustScoreBenevolence: 50,
        trustScoreIntegrity: 50,
        moralFoundationProfile: null,
        positionFingerprint: null,
        topicAffinities: null,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = validator.validateEndpointResponse('get', '/users/me', 200, userResponse);
      expect(result.valid).toBe(true);
    });

    it('should validate GET /users/{id} response schema reference', () => {
      const publicUserResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        displayName: 'Public User',
        verificationLevel: 'UNVERIFIED',
        trustScoreAbility: 50,
        trustScoreBenevolence: 50,
        trustScoreIntegrity: 50,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
      };

      const result = validator.validateEndpointResponse(
        'get',
        '/users/{id}',
        200,
        publicUserResponse,
      );
      expect(result.valid).toBe(true);
    });
  });
});
