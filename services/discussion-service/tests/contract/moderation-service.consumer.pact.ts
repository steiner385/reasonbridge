/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for Moderation Service
 *
 * These tests define the consumer expectations for the moderation-service API.
 * The discussion-service acts as a consumer of moderation-service for child
 * content screening and moderation queue operations.
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

const { like, string, decimal, boolean } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'discussion-service',
  provider: 'moderation-service',
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

describe('Moderation Service Consumer Contract Tests', () => {
  describe('Child Content Queue Endpoints', () => {
    it('should queue child content for moderation review', async () => {
      await provider
        .addInteraction()
        .given('moderation service is available')
        .uponReceiving('a request to queue child content for moderation')
        .withRequest('POST', '/moderation/child-content/queue', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            responseId: string('resp-123'),
            topicId: string('topic-456'),
            authorId: string('user-789'),
            content: string('Some content that needs moderation'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            queueId: string('queue-item-1'),
            status: string('QUEUED'),
            priority: string('NORMAL'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            '/moderation/child-content/queue',
            {
              method: 'POST',
              body: JSON.stringify({
                responseId: 'resp-123',
                topicId: 'topic-456',
                authorId: 'user-789',
                content: 'Some content that needs moderation',
              }),
            },
          );

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('queueId');
          expect(body).toHaveProperty('status');
        });
    });

    it('should queue child content with AI flags for urgent review', async () => {
      await provider
        .addInteraction()
        .given('moderation service is available')
        .uponReceiving('a request to queue child content with grooming flags')
        .withRequest('POST', '/moderation/child-content/queue', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            responseId: string('resp-urgent-1'),
            topicId: string('topic-456'),
            authorId: string('user-789'),
            content: string('Flagged content'),
            aiFlags: like({
              grooming: boolean(true),
              groomingConfidence: decimal(0.85),
              groomingPatternType: string('isolation_attempt'),
              recommendedAction: string('BLOCK'),
            }),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            queueId: string('queue-item-urgent'),
            status: string('QUEUED'),
            priority: string('URGENT'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            '/moderation/child-content/queue',
            {
              method: 'POST',
              body: JSON.stringify({
                responseId: 'resp-urgent-1',
                topicId: 'topic-456',
                authorId: 'user-789',
                content: 'Flagged content',
                aiFlags: {
                  grooming: true,
                  groomingConfidence: 0.85,
                  groomingPatternType: 'isolation_attempt',
                  recommendedAction: 'BLOCK',
                },
              }),
            },
          );

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body.priority).toBe('URGENT');
        });
    });
  });

  describe('Child Content Screening Endpoints', () => {
    it('should screen content and return no risk for safe content', async () => {
      await provider
        .addInteraction()
        .given('moderation service is available')
        .uponReceiving('a request to screen safe content for children')
        .withRequest('POST', '/moderation/child-content/screen', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('This is a normal discussion about homework'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            childSafetyRisk: string('none'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            '/moderation/child-content/screen',
            {
              method: 'POST',
              body: JSON.stringify({
                content: 'This is a normal discussion about homework',
              }),
            },
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.childSafetyRisk).toBe('none');
        });
    });

    it('should screen content and detect grooming patterns', async () => {
      await provider
        .addInteraction()
        .given('moderation service is available with AI detection')
        .uponReceiving('a request to screen content with grooming patterns')
        .withRequest('POST', '/moderation/child-content/screen', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('Concerning content that triggers detection'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            childSafetyRisk: string('high'),
            groomingDetection: like({
              detected: boolean(true),
              confidence: decimal(0.9),
              patternType: string('isolation_attempt'),
              flaggedPhrases: like(['concerning phrase']),
              recommendedAction: string('BLOCK'),
              explanation: string('Content matches grooming pattern indicators'),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            '/moderation/child-content/screen',
            {
              method: 'POST',
              body: JSON.stringify({
                content: 'Concerning content that triggers detection',
              }),
            },
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.childSafetyRisk).toBe('high');
          expect(body.groomingDetection).toBeDefined();
          expect(body.groomingDetection.detected).toBe(true);
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the moderation service is healthy')
        .uponReceiving('a health check request')
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
