/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for Notification Service (from moderation-service)
 *
 * These tests define the consumer expectations for the notification-service API.
 * The moderation-service acts as a consumer of notification-service for sending
 * SLA breach alerts to moderators.
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { string, integer, decimal, boolean, eachLike, like } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'moderation-service',
  provider: 'notification-service',
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

describe('Notification Service Consumer Contract Tests (from moderation-service)', () => {
  describe('SLA Breach Notification Endpoints', () => {
    it('should send SLA breach notification with multiple breaches', async () => {
      await provider
        .addInteraction()
        .given('notification service is available for internal requests')
        .uponReceiving('a request to send SLA breach notifications')
        .withRequest('POST', '/internal/sla-breach', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            breaches: eachLike({
              queueId: string('queue-123'),
              priority: string('URGENT'),
              ageMinutes: integer(90),
              slaMinutes: integer(60),
              breachPercent: like(150.5),
              responseId: string('resp-456'),
              topicId: string('topic-789'),
            }),
            checkedAt: string('2026-01-15T10:30:00.000Z'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            success: boolean(true),
            notificationsSent: integer(3),
            broadcastSent: boolean(true),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/internal/sla-breach', {
            method: 'POST',
            body: JSON.stringify({
              breaches: [
                {
                  queueId: 'queue-123',
                  priority: 'URGENT',
                  ageMinutes: 90,
                  slaMinutes: 60,
                  breachPercent: 150.5,
                  responseId: 'resp-456',
                  topicId: 'topic-789',
                },
              ],
              checkedAt: '2026-01-15T10:30:00.000Z',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.success).toBe(true);
          expect(body).toHaveProperty('notificationsSent');
          expect(body).toHaveProperty('broadcastSent');
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the notification service is healthy')
        .uponReceiving('a health check request (from moderation-service)')
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
