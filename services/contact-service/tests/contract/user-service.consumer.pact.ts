/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for User Service (from contact-service)
 *
 * These tests define the consumer expectations for the user-service API.
 * The contact-service acts as a consumer of user-service for user discovery
 * and profile lookups.
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { uuid, string, eachLike, like } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'contact-service',
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
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  return fetch(url, mergedOptions);
}

describe('User Service Consumer Contract Tests (from contact-service)', () => {
  describe('Discoverable Users Endpoint', () => {
    it('should find discoverable users by email hashes', async () => {
      await provider
        .addInteraction()
        .given('discoverable users exist with matching email hashes')
        .uponReceiving('a request to find discoverable users by email hashes')
        .withRequest('POST', '/users/discoverable', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            emailHashes: eachLike('abc123def456'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            users: eachLike({
              id: uuid(),
              displayName: string('Alice Smith'),
              avatarUrl: string('https://example.com/avatar.jpg'),
              emailHash: string('abc123def456'),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/users/discoverable', {
            method: 'POST',
            body: JSON.stringify({
              emailHashes: ['abc123def456'],
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('users');
          expect(body.users.length).toBeGreaterThan(0);
          expect(body.users[0]).toHaveProperty('id');
          expect(body.users[0]).toHaveProperty('emailHash');
        });
    });

    it('should return empty array when no matching users found', async () => {
      await provider
        .addInteraction()
        .given('no discoverable users match the email hashes')
        .uponReceiving('a request to find discoverable users with non-matching hashes')
        .withRequest('POST', '/users/discoverable', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            emailHashes: like(['nonexistent-hash']),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            users: [],
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/users/discoverable', {
            method: 'POST',
            body: JSON.stringify({
              emailHashes: ['nonexistent-hash'],
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.users).toEqual([]);
        });
    });
  });

  describe('User Profile Endpoint', () => {
    it('should get user profile by ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} exists`)
        .uponReceiving('a request to get user profile by ID (from contact-service)')
        .withRequest('GET', `/users/${userId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(userId),
            displayName: string('Alice Smith'),
            avatarUrl: string('https://example.com/avatar.jpg'),
            email: string('alice@example.com'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${userId}`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.id).toBe(userId);
          expect(body).toHaveProperty('displayName');
        });
    });

    it('should return 404 for non-existent user', async () => {
      const userId = '660e8400-e29b-41d4-a716-446655440001';

      await provider
        .addInteraction()
        .given(`user with ID ${userId} does not exist`)
        .uponReceiving('a request for non-existent user profile (from contact-service)')
        .withRequest('GET', `/users/${userId}`)
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            statusCode: 404,
            message: string(`User with ID ${userId} not found`),
            error: string('Not Found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/users/${userId}`);

          expect(response.status).toBe(404);
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the user service is healthy')
        .uponReceiving('a health check request (from contact-service)')
        .withRequest('GET', '/health')
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            status: string('ok'),
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
