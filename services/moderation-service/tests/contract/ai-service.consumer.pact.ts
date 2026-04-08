/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Consumer Contract Tests for AI Service (from moderation-service)
 *
 * These tests define the consumer expectations for the ai-service API.
 * The moderation-service acts as a consumer of ai-service for grooming
 * pattern detection and detailed analysis.
 *
 * @see https://docs.pact.io/implementation_guides/javascript
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const { string, decimal, boolean, eachLike, timestamp } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'moderation-service',
  provider: 'ai-service',
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

describe('AI Service Consumer Contract Tests (from moderation-service)', () => {
  describe('Grooming Detection Endpoints', () => {
    it('should analyze content for grooming patterns - no detection', async () => {
      await provider
        .addInteraction()
        .given('ai service grooming detection is available')
        .uponReceiving('a request to analyze safe content for grooming')
        .withRequest('POST', '/ai/grooming/analyze', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('This is a normal discussion about homework'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            detected: boolean(false),
            confidence: decimal(0.1),
            patternType: null,
            flaggedPhrases: [],
            recommendedAction: string('ALLOW'),
            explanation: string('No grooming patterns detected'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/ai/grooming/analyze', {
            method: 'POST',
            body: JSON.stringify({
              content: 'This is a normal discussion about homework',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.detected).toBe(false);
          expect(body.recommendedAction).toBe('ALLOW');
        });
    });

    it('should analyze content for grooming patterns - detection triggered', async () => {
      await provider
        .addInteraction()
        .given('ai service grooming detection is available')
        .uponReceiving('a request to analyze concerning content for grooming')
        .withRequest('POST', '/ai/grooming/analyze', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('Concerning content that triggers detection'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            detected: boolean(true),
            confidence: decimal(0.92),
            patternType: string('isolation_attempt'),
            flaggedPhrases: eachLike('concerning phrase'),
            recommendedAction: string('BLOCK'),
            explanation: string('Content matches grooming pattern indicators'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/ai/grooming/analyze', {
            method: 'POST',
            body: JSON.stringify({
              content: 'Concerning content that triggers detection',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.detected).toBe(true);
          expect(body.recommendedAction).toBe('BLOCK');
          expect(body.patternType).toBe('isolation_attempt');
        });
    });

    it('should analyze content with REVIEW recommendation', async () => {
      await provider
        .addInteraction()
        .given('ai service grooming detection is available')
        .uponReceiving('a request to analyze borderline content for grooming')
        .withRequest('POST', '/ai/grooming/analyze', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('Borderline content that needs review'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            detected: boolean(true),
            confidence: decimal(0.65),
            patternType: string('boundary_testing'),
            flaggedPhrases: eachLike('borderline phrase'),
            recommendedAction: string('REVIEW'),
            explanation: string(
              'Content may contain concerning patterns - human review recommended',
            ),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/ai/grooming/analyze', {
            method: 'POST',
            body: JSON.stringify({
              content: 'Borderline content that needs review',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.detected).toBe(true);
          expect(body.recommendedAction).toBe('REVIEW');
        });
    });
  });

  describe('Detailed Grooming Analysis Endpoints', () => {
    it('should get detailed grooming analysis for moderator review', async () => {
      await provider
        .addInteraction()
        .given('ai service detailed grooming analysis is available')
        .uponReceiving('a request for detailed grooming analysis')
        .withRequest('POST', '/ai/grooming/detailed', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('Content requiring detailed analysis'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            allPatternsFound: eachLike({
              type: string('isolation_attempt'),
              match: string('matched text'),
              severity: decimal(0.8),
            }),
            riskLevel: string('high'),
            moderatorNotes: string('Multiple grooming indicators detected'),
            originalContent: string('Content requiring detailed analysis'),
            timestamp: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/ai/grooming/detailed', {
            method: 'POST',
            body: JSON.stringify({
              content: 'Content requiring detailed analysis',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('allPatternsFound');
          expect(body).toHaveProperty('riskLevel');
          expect(body).toHaveProperty('moderatorNotes');
        });
    });

    it('should get detailed analysis with low risk level', async () => {
      await provider
        .addInteraction()
        .given('ai service detailed grooming analysis is available')
        .uponReceiving('a request for detailed analysis of low-risk content')
        .withRequest('POST', '/ai/grooming/detailed', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            content: string('Low risk content for analysis'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            allPatternsFound: [],
            riskLevel: string('low'),
            moderatorNotes: string('No significant patterns detected'),
            originalContent: string('Low risk content for analysis'),
            timestamp: timestamp('2026-01-15T10:30:00.000Z', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/ai/grooming/detailed', {
            method: 'POST',
            body: JSON.stringify({
              content: 'Low risk content for analysis',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.riskLevel).toBe('low');
          expect(body.allPatternsFound).toEqual([]);
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the ai service is healthy')
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
