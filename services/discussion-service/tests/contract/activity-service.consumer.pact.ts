/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for Activity Service
 *
 * These tests define the consumer expectations for the activity-service API.
 * The discussion-service acts as a consumer of activity-service for creating
 * activity events (topic created, response posted, etc.).
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { uuid, string, timestamp } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'discussion-service',
  provider: 'activity-service',
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

describe('Activity Service Consumer Contract Tests', () => {
  describe('Activity Event Creation', () => {
    it('should create a TOPIC_CREATED activity event', async () => {
      await provider
        .addInteraction()
        .given('activity service is available')
        .uponReceiving('a request to create a TOPIC_CREATED activity event')
        .withRequest('POST', '/events', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-123'),
            activityType: string('TOPIC_CREATED'),
            targetId: string('topic-456'),
            targetType: string('TOPIC'),
            targetTitle: string('My New Topic'),
            targetSlug: string('my-new-topic'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            userId: string('user-123'),
            activityType: string('TOPIC_CREATED'),
            targetId: string('topic-456'),
            targetType: string('TOPIC'),
            createdAt: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/events', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              activityType: 'TOPIC_CREATED',
              targetId: 'topic-456',
              targetType: 'TOPIC',
              targetTitle: 'My New Topic',
              targetSlug: 'my-new-topic',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body.activityType).toBe('TOPIC_CREATED');
        });
    });

    it('should create a RESPONSE_POSTED activity event', async () => {
      await provider
        .addInteraction()
        .given('activity service is available')
        .uponReceiving('a request to create a RESPONSE_POSTED activity event')
        .withRequest('POST', '/events', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-123'),
            activityType: string('RESPONSE_POSTED'),
            targetId: string('response-789'),
            targetType: string('RESPONSE'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            userId: string('user-123'),
            activityType: string('RESPONSE_POSTED'),
            targetId: string('response-789'),
            targetType: string('RESPONSE'),
            createdAt: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/events', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              activityType: 'RESPONSE_POSTED',
              targetId: 'response-789',
              targetType: 'RESPONSE',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body.activityType).toBe('RESPONSE_POSTED');
        });
    });

    it('should create a DISCUSSION_JOINED activity event', async () => {
      await provider
        .addInteraction()
        .given('activity service is available')
        .uponReceiving('a request to create a DISCUSSION_JOINED activity event')
        .withRequest('POST', '/events', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-123'),
            activityType: string('DISCUSSION_JOINED'),
            targetId: string('discussion-101'),
            targetType: string('DISCUSSION'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            userId: string('user-123'),
            activityType: string('DISCUSSION_JOINED'),
            targetId: string('discussion-101'),
            targetType: string('DISCUSSION'),
            createdAt: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/events', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              activityType: 'DISCUSSION_JOINED',
              targetId: 'discussion-101',
              targetType: 'DISCUSSION',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body.activityType).toBe('DISCUSSION_JOINED');
        });
    });

    it('should create an AI_SUGGESTION_ACCEPTED activity event', async () => {
      await provider
        .addInteraction()
        .given('activity service is available')
        .uponReceiving('a request to create an AI_SUGGESTION_ACCEPTED activity event')
        .withRequest('POST', '/events', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-123'),
            activityType: string('AI_SUGGESTION_ACCEPTED'),
            targetId: string('response-789'),
            targetType: string('RESPONSE'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            userId: string('user-123'),
            activityType: string('AI_SUGGESTION_ACCEPTED'),
            targetId: string('response-789'),
            targetType: string('RESPONSE'),
            createdAt: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/events', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              activityType: 'AI_SUGGESTION_ACCEPTED',
              targetId: 'response-789',
              targetType: 'RESPONSE',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body.activityType).toBe('AI_SUGGESTION_ACCEPTED');
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the activity service is healthy')
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
