/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for Discussion Service (from contact-service)
 *
 * These tests define the consumer expectations for the discussion-service API.
 * The contact-service acts as a consumer of discussion-service for topic
 * information retrieval and access management.
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { uuid, string, boolean } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'contact-service',
  provider: 'discussion-service',
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

describe('Discussion Service Consumer Contract Tests (from contact-service)', () => {
  describe('Topic Information Endpoints', () => {
    it('should get topic by ID', async () => {
      const topicId = '550e8400-e29b-41d4-a716-446655440000';

      await provider
        .addInteraction()
        .given(`topic with ID ${topicId} exists`)
        .uponReceiving('a request to get topic by ID (from contact-service)')
        .withRequest('GET', `/topics/${topicId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(topicId),
            title: string('Climate Change Discussion'),
            status: string('ACTIVE'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/topics/${topicId}`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.id).toBe(topicId);
          expect(body).toHaveProperty('title');
          expect(body).toHaveProperty('status');
        });
    });

    it('should return 404 for non-existent topic', async () => {
      const topicId = '660e8400-e29b-41d4-a716-446655440001';

      await provider
        .addInteraction()
        .given(`topic with ID ${topicId} does not exist`)
        .uponReceiving('a request for non-existent topic (from contact-service)')
        .withRequest('GET', `/topics/${topicId}`)
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            statusCode: 404,
            message: string(`Topic with ID ${topicId} not found`),
            error: string('Not Found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/topics/${topicId}`);

          expect(response.status).toBe(404);
        });
    });
  });

  describe('Topic Access Endpoints', () => {
    it('should check user access to topic - has access', async () => {
      const topicId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = '770e8400-e29b-41d4-a716-446655440002';

      await provider
        .addInteraction()
        .given(`user ${userId} has access to topic ${topicId}`)
        .uponReceiving('a request to check user access to topic - access granted')
        .withRequest('GET', `/topics/${topicId}/access/${userId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            canAccess: boolean(true),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/topics/${topicId}/access/${userId}`,
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.canAccess).toBe(true);
        });
    });

    it('should check user access to topic - no access', async () => {
      const topicId = 'aa0e8400-e29b-41d4-a716-446655440005';
      const userId = '880e8400-e29b-41d4-a716-446655440003';

      await provider
        .addInteraction()
        .given(`user ${userId} does not have access to topic ${topicId}`)
        .uponReceiving('a request to check user access to topic - access denied')
        .withRequest('GET', `/topics/${topicId}/access/${userId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            canAccess: boolean(false),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/topics/${topicId}/access/${userId}`,
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.canAccess).toBe(false);
        });
    });

    it('should grant user access to topic via invitation', async () => {
      const topicId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = '990e8400-e29b-41d4-a716-446655440004';

      await provider
        .addInteraction()
        .given(`topic ${topicId} exists and user ${userId} can be granted access`)
        .uponReceiving('a request to grant user access to topic via invitation')
        .withRequest('POST', `/topics/${topicId}/access/${userId}`, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            source: string('INVITATION'),
            invitationId: string('inv-grant-123'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            success: boolean(true),
            topicId: uuid(topicId),
            userId: uuid(userId),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/topics/${topicId}/access/${userId}`,
            {
              method: 'POST',
              body: JSON.stringify({
                source: 'INVITATION',
                invitationId: 'inv-grant-123',
              }),
            },
          );

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body.success).toBe(true);
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the discussion service is healthy')
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
