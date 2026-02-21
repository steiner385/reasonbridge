/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for User Service
 *
 * These tests define the consumer expectations for the user-service API.
 * The api-gateway acts as a consumer of user-service, and these contracts
 * ensure the API behaves as expected.
 *
 * Contract testing captures:
 * - Request format (method, path, headers, body)
 * - Response format (status, headers, body structure)
 * - Expected behavior under specific conditions
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { like, eachLike, uuid, decimal, integer, string, boolean, timestamp } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'api-gateway',
  provider: 'user-service',
  dir: path.resolve(__dirname, '../../../pacts'),
  logLevel: 'warn',
});

/**
 * Helper function to make HTTP requests to the mock server
 */
async function fetchFromProvider(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${baseUrl}${endpoint}`;
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

describe('User Service Consumer Contract Tests', () => {
  describe('User Profile Endpoints', () => {
    it('should get user profile by ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists`)
        .uponReceiving('a request to get user profile by ID')
        .withRequest('GET', `/users/${userId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(userId),
            email: string('user@example.com'),
            displayName: string('Test User'),
            verificationLevel: string('BASIC'),
            status: string('ACTIVE'),
            trustScore: decimal(0.75),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            updatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${userId}`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.id).toBe(userId);
          expect(body).toHaveProperty('email');
          expect(body).toHaveProperty('displayName');
          expect(body).toHaveProperty('verificationLevel');
        });
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentUserId = '660e8400-e29b-41d4-a716-446655440001';

      await provider
        .addInteraction()
        .given(`user with ID ${nonExistentUserId} does not exist`)
        .uponReceiving('a request to get non-existent user profile')
        .withRequest('GET', `/users/${nonExistentUserId}`)
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            statusCode: integer(404),
            message: string(`User with ID ${nonExistentUserId} not found`),
            error: string('Not Found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${nonExistentUserId}`);

          expect(response.status).toBe(404);
          const body = await response.json();
          expect(body.statusCode).toBe(404);
        });
    });

    it('should update user profile', async () => {
      const userId = '770e8400-e29b-41d4-a716-446655440002';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists`)
        .uponReceiving('a request to update user profile')
        .withRequest('PATCH', `/users/${userId}`, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            displayName: string('Updated Display Name'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(userId),
            email: string('user@example.com'),
            displayName: string('Updated Display Name'),
            verificationLevel: string('BASIC'),
            status: string('ACTIVE'),
            updatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              displayName: 'Updated Display Name',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.displayName).toBe('Updated Display Name');
        });
    });

    it('should get current user profile (me)', async () => {
      await provider
        .addInteraction()
        .given('authenticated user exists')
        .uponReceiving('a request to get current user profile')
        .withRequest('GET', '/users/me', (builder) => {
          builder.headers({
            Authorization: 'Bearer valid-jwt-token',
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            email: string('current-user@example.com'),
            displayName: string('Current User'),
            verificationLevel: string('VERIFIED'),
            status: string('ACTIVE'),
            trustScore: decimal(0.85),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            updatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/users/me', {
            headers: {
              Authorization: 'Bearer valid-jwt-token',
            },
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('email');
        });
    });
  });

  describe('Verification Endpoints', () => {
    it('should get verification status for user', async () => {
      const userId = '880e8400-e29b-41d4-a716-446655440003';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists with verification records`)
        .uponReceiving('a request to get verification status')
        .withRequest('GET', `/verifications/${userId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: uuid(userId),
            verificationLevel: string('VERIFIED'),
            verifications: eachLike({
              id: uuid(),
              type: string('PHONE'),
              status: string('VERIFIED'),
              verifiedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            }),
            canRequestVerification: boolean(true),
            nextVerificationAvailable: like(null),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/verifications/${userId}`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.userId).toBe(userId);
          expect(body).toHaveProperty('verificationLevel');
          expect(body).toHaveProperty('verifications');
        });
    });

    it('should request phone verification', async () => {
      await provider
        .addInteraction()
        .given('authenticated user exists and can request verification')
        .uponReceiving('a request to initiate phone verification')
        .withRequest('POST', '/verifications/request', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            type: string('PHONE'),
            phoneNumber: string('+1234567890'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            type: string('PHONE'),
            status: string('PENDING'),
            expiresAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/verifications/request', {
            method: 'POST',
            body: JSON.stringify({
              type: 'PHONE',
              phoneNumber: '+1234567890',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body.type).toBe('PHONE');
          expect(body.status).toBe('PENDING');
        });
    });

    it('should confirm verification with OTP', async () => {
      const verificationId = '990e8400-e29b-41d4-a716-446655440004';

      await provider
        .addInteraction()
        .given(`pending verification with ID ${verificationId} exists`)
        .uponReceiving('a request to confirm verification with OTP')
        .withRequest('POST', `/verifications/${verificationId}/confirm`, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            otp: string('123456'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(verificationId),
            type: string('PHONE'),
            status: string('VERIFIED'),
            verifiedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/verifications/${verificationId}/confirm`,
            {
              method: 'POST',
              body: JSON.stringify({
                otp: '123456',
              }),
            },
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.status).toBe('VERIFIED');
        });
    });
  });

  describe('Trust Score Endpoints', () => {
    it('should get user trust score', async () => {
      const userId = 'aa0e8400-e29b-41d4-a716-446655440005';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists with activity history`)
        .uponReceiving('a request to get user trust score')
        .withRequest('GET', `/users/${userId}/trust-score`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: uuid(userId),
            overallScore: decimal(0.78),
            components: like({
              verificationScore: decimal(0.9),
              activityScore: decimal(0.75),
              reputationScore: decimal(0.7),
              communityScore: decimal(0.8),
            }),
            factors: eachLike({
              name: string('account_age'),
              weight: decimal(0.15),
              value: decimal(0.85),
              impact: string('positive'),
            }),
            calculatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${userId}/trust-score`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.userId).toBe(userId);
          expect(body).toHaveProperty('overallScore');
          expect(body).toHaveProperty('components');
        });
    });
  });

  describe('Follow System Endpoints', () => {
    it('should follow a user', async () => {
      const targetUserId = 'bb0e8400-e29b-41d4-a716-446655440006';

      await provider
        .addInteraction()
        .given(`user with ID ${targetUserId} exists and is not followed`)
        .uponReceiving('a request to follow a user')
        .withRequest('POST', `/users/${targetUserId}/follow`)
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            followerId: uuid(),
            followedId: uuid(targetUserId),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/users/${targetUserId}/follow`,
            {
              method: 'POST',
            },
          );

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('followerId');
          expect(body).toHaveProperty('followedId');
        });
    });

    it('should unfollow a user', async () => {
      const targetUserId = 'cc0e8400-e29b-41d4-a716-446655440007';

      await provider
        .addInteraction()
        .given(`user with ID ${targetUserId} exists and is followed`)
        .uponReceiving('a request to unfollow a user')
        .withRequest('DELETE', `/users/${targetUserId}/follow`)
        .willRespondWith(204)
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/users/${targetUserId}/follow`,
            {
              method: 'DELETE',
            },
          );

          expect(response.status).toBe(204);
        });
    });

    it('should get follower count', async () => {
      const userId = 'dd0e8400-e29b-41d4-a716-446655440008';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists with followers`)
        .uponReceiving('a request to get follower count')
        .withRequest('GET', `/users/${userId}/followers/count`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: uuid(userId),
            followerCount: integer(42),
            followingCount: integer(15),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/users/${userId}/followers/count`,
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.userId).toBe(userId);
          expect(body).toHaveProperty('followerCount');
          expect(body).toHaveProperty('followingCount');
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the user service is healthy')
        .uponReceiving('a health check request')
        .withRequest('GET', '/health')
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            status: string('ok'),
            info: like({
              database: like({ status: string('up') }),
              redis: like({ status: string('up') }),
            }),
            error: like({}),
            details: like({
              database: like({ status: string('up') }),
              redis: like({ status: string('up') }),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/health');

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.status).toBe('ok');
        });
    });
  });
});
