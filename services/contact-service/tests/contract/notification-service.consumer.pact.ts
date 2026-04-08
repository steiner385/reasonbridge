/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for Notification Service (from contact-service)
 *
 * These tests define the consumer expectations for the notification-service API.
 * The contact-service acts as a consumer of notification-service for sending
 * invitation and acceptance notifications.
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { string, like } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'contact-service',
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

describe('Notification Service Consumer Contract Tests (from contact-service)', () => {
  describe('Invitation Notification Endpoints', () => {
    it('should send a topic invitation notification', async () => {
      await provider
        .addInteraction()
        .given('notification service is available')
        .uponReceiving('a request to send a topic invitation notification')
        .withRequest('POST', '/notifications', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-123'),
            type: string('TOPIC_INVITATION'),
            title: string('John Doe has invited you to discuss "Climate Change"'),
            body: string('You\'ve been invited to join a discussion on "Climate Change".'),
            metadata: like({
              invitationId: string('inv-456'),
              inviterName: string('John Doe'),
              topicTitle: string('Climate Change'),
            }),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: string('notif-789'),
            status: string('SENT'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-123',
              type: 'TOPIC_INVITATION',
              title: 'John Doe has invited you to discuss "Climate Change"',
              body: 'You\'ve been invited to join a discussion on "Climate Change".',
              metadata: {
                invitationId: 'inv-456',
                inviterName: 'John Doe',
                topicTitle: 'Climate Change',
              },
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('status');
        });
    });

    it('should send an invitation accepted notification', async () => {
      await provider
        .addInteraction()
        .given('notification service is available for acceptance notifications')
        .uponReceiving('a request to send an invitation accepted notification')
        .withRequest('POST', '/notifications', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            userId: string('user-789'),
            type: string('INVITATION_ACCEPTED'),
            title: string('Jane Smith accepted your invitation to "Climate Change"'),
            body: string('Jane Smith has joined the discussion on "Climate Change".'),
            metadata: like({
              accepterName: string('Jane Smith'),
              topicTitle: string('Climate Change'),
            }),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: string('notif-abc'),
            status: string('SENT'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: 'user-789',
              type: 'INVITATION_ACCEPTED',
              title: 'Jane Smith accepted your invitation to "Climate Change"',
              body: 'Jane Smith has joined the discussion on "Climate Change".',
              metadata: {
                accepterName: 'Jane Smith',
                topicTitle: 'Climate Change',
              },
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the notification service is healthy')
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
