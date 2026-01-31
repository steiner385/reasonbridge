/**
 * Pact Consumer Contract Tests for AI Service
 *
 * These tests define the consumer expectations for the ai-service API.
 * The api-gateway acts as a consumer of ai-service, and these contracts
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
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';

const { like, eachLike, uuid, decimal, integer, string, boolean, timestamp } = MatchersV3;

// Create the Pact instance
const provider = new PactV4({
  consumer: 'api-gateway',
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
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

describe('AI Service Consumer Contract Tests', () => {
  describe('Feedback Endpoints (Bias Analysis)', () => {
    it('should request feedback for response content', async () => {
      await provider
        .addInteraction()
        .given('the AI service is available')
        .uponReceiving('a request for feedback on response content')
        .withRequest('POST', '/feedback/request', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            responseId: uuid('550e8400-e29b-41d4-a716-446655440000'),
            content: string('This is the response content to analyze for bias and fallacies.'),
            sensitivity: string('medium'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            responseId: uuid('550e8400-e29b-41d4-a716-446655440000'),
            type: string('BIAS'),
            subtype: like('confirmation'),
            suggestionText: string('Consider alternative viewpoints...'),
            reasoning: string('The response shows signs of confirmation bias...'),
            confidenceScore: decimal(0.85),
            educationalResources: like({
              articles: eachLike('https://example.com/bias-article'),
            }),
            displayedToUser: boolean(true),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/feedback/request', {
            method: 'POST',
            body: JSON.stringify({
              responseId: '550e8400-e29b-41d4-a716-446655440000',
              content: 'This is the response content to analyze for bias and fallacies.',
              sensitivity: 'medium',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('type');
          expect(body).toHaveProperty('suggestionText');
          expect(body).toHaveProperty('confidenceScore');
        });
    });

    it('should get feedback by ID', async () => {
      const feedbackId = '660e8400-e29b-41d4-a716-446655440001';

      await provider
        .addInteraction()
        .given('feedback with ID 660e8400-e29b-41d4-a716-446655440001 exists')
        .uponReceiving('a request to get feedback by ID')
        .withRequest('GET', `/feedback/${feedbackId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(feedbackId),
            responseId: uuid(),
            type: string('FALLACY'),
            subtype: like('strawman'),
            suggestionText: string('The argument misrepresents the opposing view...'),
            reasoning: string('This appears to be a strawman fallacy...'),
            confidenceScore: decimal(0.78),
            displayedToUser: boolean(true),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, `/feedback/${feedbackId}`);

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.id).toBe(feedbackId);
          expect(body).toHaveProperty('type');
        });
    });

    it('should dismiss feedback with reason', async () => {
      const feedbackId = '770e8400-e29b-41d4-a716-446655440002';

      await provider
        .addInteraction()
        .given('feedback with ID 770e8400-e29b-41d4-a716-446655440002 exists and is not dismissed')
        .uponReceiving('a request to dismiss feedback')
        .withRequest('PATCH', `/feedback/${feedbackId}/dismiss`, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            reason: like('User disagreed with the analysis'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(feedbackId),
            responseId: uuid(),
            type: string('BIAS'),
            suggestionText: string('Consider alternative viewpoints...'),
            reasoning: string('The response shows signs of bias...'),
            confidenceScore: decimal(0.72),
            displayedToUser: boolean(false),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/feedback/${feedbackId}/dismiss`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                reason: 'User disagreed with the analysis',
              }),
            },
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.displayedToUser).toBe(false);
        });
    });

    it('should get feedback analytics', async () => {
      await provider
        .addInteraction()
        .given('feedback analytics data is available')
        .uponReceiving('a request for feedback analytics')
        .withRequest('GET', '/feedback/analytics', (builder) => {
          builder.query({
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            totalFeedbackCount: integer(150),
            feedbackByType: like({
              BIAS: integer(45),
              FALLACY: integer(38),
              INFLAMMATORY: integer(22),
              UNSOURCED: integer(30),
              AFFIRMATION: integer(15),
            }),
            averageConfidenceScore: decimal(0.76),
            dismissalRate: decimal(0.12),
            userEngagementRate: decimal(0.68),
            periodStart: string('2024-01-01'),
            periodEnd: string('2024-12-31'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            '/feedback/analytics?startDate=2024-01-01&endDate=2024-12-31',
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('totalFeedbackCount');
          expect(body).toHaveProperty('feedbackByType');
          expect(body).toHaveProperty('averageConfidenceScore');
        });
    });
  });

  describe('Common Ground Analysis Endpoints', () => {
    it('should request common ground analysis for a topic', async () => {
      await provider
        .addInteraction()
        .given('topic with ID 880e8400-e29b-41d4-a716-446655440003 exists with responses')
        .uponReceiving('a request for common ground analysis')
        .withRequest('POST', '/common-ground/analyze', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            topicId: uuid('880e8400-e29b-41d4-a716-446655440003'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            id: uuid(),
            topicId: uuid('880e8400-e29b-41d4-a716-446655440003'),
            version: integer(1),
            agreementZones: eachLike({
              proposition: string('Both sides agree on the importance of...'),
              agreementPercentage: integer(85),
              supportingEvidence: eachLike(string('Evidence point 1')),
              participantCount: integer(12),
            }),
            misunderstandings: eachLike({
              topic: string('Definition of key term'),
              interpretations: eachLike({
                interpretation: string('Some participants interpret this as...'),
                participantCount: integer(5),
              }),
              clarification: string('The term actually refers to...'),
            }),
            genuineDisagreements: eachLike({
              proposition: string('The approach to solving this issue'),
              viewpoints: eachLike({
                position: string('Position A advocates for...'),
                participantCount: integer(8),
                reasoning: eachLike(string('Because...')),
              }),
              underlyingValues: eachLike(string('Individual liberty')),
            }),
            overallConsensusScore: decimal(0.62),
            participantCountAtGeneration: integer(25),
            responseCountAtGeneration: integer(48),
            modelVersion: string('gpt-4-turbo'),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            attribution: string('AI Assistant'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/common-ground/analyze', {
            method: 'POST',
            body: JSON.stringify({
              topicId: '880e8400-e29b-41d4-a716-446655440003',
            }),
          });

          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toHaveProperty('agreementZones');
          expect(body).toHaveProperty('misunderstandings');
          expect(body).toHaveProperty('genuineDisagreements');
          expect(body).toHaveProperty('overallConsensusScore');
        });
    });
  });

  describe('Bridging Suggestions Endpoints', () => {
    it('should get bridging suggestions for a topic', async () => {
      const topicId = '990e8400-e29b-41d4-a716-446655440004';

      await provider
        .addInteraction()
        .given('topic with ID 990e8400-e29b-41d4-a716-446655440004 exists with propositions')
        .uponReceiving('a request for bridging suggestions')
        .withRequest('GET', `/suggest/bridging-suggestions/${topicId}`)
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            topicId: uuid(topicId),
            suggestions: eachLike({
              propositionId: uuid(),
              sourcePosition: string('SUPPORT'),
              targetPosition: string('OPPOSE'),
              bridgingLanguage: string(
                'While there are different views on this topic, both perspectives share concerns about...',
              ),
              commonGround: string('Both positions likely share fundamental values or goals...'),
              reasoning: string(
                'This proposition has multiple perspectives that could benefit from bridging...',
              ),
              confidenceScore: decimal(0.72),
            }),
            overallConsensusScore: decimal(0.58),
            conflictAreas: eachLike(string('The approach to implementation...')),
            commonGroundAreas: eachLike(string('The shared goal of improving outcomes...')),
            confidenceScore: decimal(0.75),
            reasoning: string('Analyzed 15 propositions from this topic...'),
            attribution: string('AI Assistant'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/suggest/bridging-suggestions/${topicId}`,
          );

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.topicId).toBe(topicId);
          expect(body).toHaveProperty('suggestions');
          expect(body).toHaveProperty('overallConsensusScore');
          expect(body).toHaveProperty('conflictAreas');
          expect(body).toHaveProperty('commonGroundAreas');
        });
    });

    it('should return 404 for non-existent topic', async () => {
      const nonExistentTopicId = 'aa0e8400-e29b-41d4-a716-446655440005';

      await provider
        .addInteraction()
        .given('topic with ID aa0e8400-e29b-41d4-a716-446655440005 does not exist')
        .uponReceiving('a request for bridging suggestions for non-existent topic')
        .withRequest('GET', `/suggest/bridging-suggestions/${nonExistentTopicId}`)
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            statusCode: integer(404),
            message: string(`Topic with ID ${nonExistentTopicId} not found`),
            error: string('Not Found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(
            mockServer.url,
            `/suggest/bridging-suggestions/${nonExistentTopicId}`,
          );

          expect(response.status).toBe(404);
          const body = await response.json();
          expect(body.statusCode).toBe(404);
          expect(body.message).toContain('not found');
        });
    });
  });

  describe('Tag Suggestions Endpoints', () => {
    it('should suggest tags for topic content', async () => {
      await provider
        .addInteraction()
        .given('the AI service is available for tag suggestions')
        .uponReceiving('a request for tag suggestions')
        .withRequest('POST', '/suggest/tags', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            title: string('Climate Change Policy Discussion'),
            content: string(
              'A comprehensive discussion about various approaches to addressing climate change...',
            ),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            suggestions: eachLike(string('climate-policy')),
            confidenceScore: decimal(0.88),
            reasoning: string('Based on the content and keywords, these tags are most relevant...'),
            attribution: string('AI Assistant'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/suggest/tags', {
            method: 'POST',
            body: JSON.stringify({
              title: 'Climate Change Policy Discussion',
              content:
                'A comprehensive discussion about various approaches to addressing climate change...',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('suggestions');
          expect(Array.isArray(body.suggestions)).toBe(true);
          expect(body).toHaveProperty('confidenceScore');
        });
    });
  });

  describe('Topic Link Suggestions Endpoints', () => {
    it('should suggest topic links', async () => {
      await provider
        .addInteraction()
        .given('the AI service is available and related topics exist')
        .uponReceiving('a request for topic link suggestions')
        .withRequest('POST', '/suggest/topic-links', (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            topicId: uuid('bb0e8400-e29b-41d4-a716-446655440006'),
            title: string('Economic Implications of Climate Policy'),
            content: string('Discussion about how climate policies affect the economy...'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            suggestions: eachLike(string('Related topic')),
            linkSuggestions: eachLike({
              targetTopicId: uuid(),
              relationshipType: string('RELATED'),
              reasoning: string('These topics share common themes...'),
            }),
            confidenceScore: decimal(0.82),
            reasoning: string('Based on content analysis, these topics are related...'),
            attribution: string('AI Assistant'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetchFromProvider(mockServer.url, '/suggest/topic-links', {
            method: 'POST',
            body: JSON.stringify({
              topicId: 'bb0e8400-e29b-41d4-a716-446655440006',
              title: 'Economic Implications of Climate Policy',
              content: 'Discussion about how climate policies affect the economy...',
            }),
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toHaveProperty('linkSuggestions');
          expect(Array.isArray(body.linkSuggestions)).toBe(true);
        });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await provider
        .addInteraction()
        .given('the AI service is healthy')
        .uponReceiving('a health check request')
        .withRequest('GET', '/health')
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' }).jsonBody({
            status: string('ok'),
            info: like({
              database: like({ status: string('up') }),
              ai: like({ status: string('up') }),
            }),
            error: like({}),
            details: like({
              database: like({ status: string('up') }),
              ai: like({ status: string('up') }),
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
