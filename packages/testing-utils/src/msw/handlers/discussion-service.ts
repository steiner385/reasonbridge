/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Handlers for Discussion Service
 *
 * T301: Mock handlers for discussion-service API endpoints
 *
 * Mocks:
 * - Topics: CRUD, search, common ground
 * - Responses: CRUD, threading, moderation
 * - Propositions: extract and manage
 * - Votes: voting on responses
 * - Alignments: moral foundation alignments
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Discussion service base URL
 */
export const DISCUSSION_SERVICE_BASE_URL =
  process.env['DISCUSSION_SERVICE_URL'] || 'http://localhost:3002/api';

/**
 * Mock author type
 */
export interface MockAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Mock topic type
 */
export interface MockTopic {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: 'active' | 'archived' | 'draft';
  author: MockAuthor;
  responseCount: number;
  participantCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Mock response type
 */
export interface MockResponse {
  id: string;
  topicId: string;
  content: string;
  author: MockAuthor;
  parentId: string | null;
  depth: number;
  voteScore: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mock author for discussion content
 */
export const mockAuthor: MockAuthor = {
  id: 'user-test-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
};

/**
 * Mock topics database
 */
export const mockTopics: Record<string, MockTopic> = {
  active: {
    id: 'topic-active-1',
    title: 'Climate Change Policies',
    description: 'Discussion on effective climate change policies',
    slug: 'climate-change-policies',
    status: 'active',
    author: mockAuthor,
    responseCount: 15,
    participantCount: 8,
    tags: ['environment', 'policy', 'science'],
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  archived: {
    id: 'topic-archived-1',
    title: 'Historical Discussion',
    description: 'An archived discussion topic',
    slug: 'historical-discussion',
    status: 'archived',
    author: mockAuthor,
    responseCount: 42,
    participantCount: 20,
    tags: ['history'],
    createdAt: '2023-06-01T00:00:00.000Z',
    updatedAt: '2023-12-31T00:00:00.000Z',
  },
  draft: {
    id: 'topic-draft-1',
    title: 'Work in Progress',
    description: 'A draft topic not yet published',
    slug: 'work-in-progress',
    status: 'draft',
    author: mockAuthor,
    responseCount: 0,
    participantCount: 1,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Mock responses database
 */
export const mockResponses: Record<string, MockResponse> = {
  root: {
    id: 'response-root-1',
    topicId: 'topic-active-1',
    content: 'This is a root-level response to start the discussion.',
    author: mockAuthor,
    parentId: null,
    depth: 0,
    voteScore: 10,
    upvotes: 12,
    downvotes: 2,
    replyCount: 2,
    isDeleted: false,
    createdAt: '2024-01-11T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  reply: {
    id: 'response-reply-1',
    topicId: 'topic-active-1',
    content: 'I agree with your points, but I think we should also consider...',
    author: { ...mockAuthor, id: 'user-2', username: 'replier' },
    parentId: 'response-root-1',
    depth: 1,
    voteScore: 5,
    upvotes: 6,
    downvotes: 1,
    replyCount: 1,
    isDeleted: false,
    createdAt: '2024-01-12T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  nested: {
    id: 'response-nested-1',
    topicId: 'topic-active-1',
    content: 'Great thread! Here is my perspective...',
    author: { ...mockAuthor, id: 'user-3', username: 'nested' },
    parentId: 'response-reply-1',
    depth: 2,
    voteScore: 3,
    upvotes: 3,
    downvotes: 0,
    replyCount: 0,
    isDeleted: false,
    createdAt: '2024-01-13T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Mock propositions
 */
export const mockPropositions = {
  claim: {
    id: 'prop-claim-1',
    topicId: 'topic-active-1',
    responseId: 'response-root-1',
    content: 'We should transition to renewable energy within 20 years.',
    type: 'claim',
    supportCount: 8,
    opposeCount: 3,
    createdAt: '2024-01-11T01:00:00.000Z',
  },
  evidence: {
    id: 'prop-evidence-1',
    topicId: 'topic-active-1',
    responseId: 'response-reply-1',
    content: 'Studies show that renewable energy costs have decreased by 70%.',
    type: 'evidence',
    supportCount: 10,
    opposeCount: 1,
    sourceUrl: 'https://example.com/study',
    createdAt: '2024-01-12T01:00:00.000Z',
  },
};

/**
 * Mock common ground summary
 */
export const mockCommonGround = {
  topicId: 'topic-active-1',
  summary: 'Participants agree on the need for action but differ on timeline.',
  agreements: [
    { point: 'Climate change requires urgent attention', confidence: 0.92 },
    { point: 'Economic factors must be considered', confidence: 0.85 },
  ],
  disagreements: [{ point: 'Speed of transition to renewables', sides: ['gradual', 'immediate'] }],
  generatedAt: new Date().toISOString(),
};

/**
 * Simulated databases for dynamic operations
 */
const topicDatabase = new Map<string, MockTopic>();
const responseDatabase = new Map<string, MockResponse>();

// Pre-populate databases
Object.values(mockTopics).forEach((topic) => topicDatabase.set(topic.id, topic));
Object.values(mockResponses).forEach((response) => responseDatabase.set(response.id, response));

/**
 * Discussion service handlers
 */
export const discussionServiceHandlers: RequestHandler[] = [
  // ==================== Topics ====================

  /**
   * GET /topics - List topics
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/topics`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let topics = Array.from(topicDatabase.values());

    if (status) {
      topics = topics.filter((t) => t.status === status);
    }

    const paginatedTopics = topics.slice(offset, offset + limit);

    return HttpResponse.json({
      topics: paginatedTopics,
      total: topics.length,
      limit,
      offset,
    });
  }),

  /**
   * GET /topics/:topicId - Get topic by ID
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/topics/:topicId`, ({ params }) => {
    const { topicId } = params as { topicId: string };
    const topic = topicDatabase.get(topicId);

    if (!topic) {
      return HttpResponse.json({ message: 'Topic not found' }, { status: 404 });
    }

    return HttpResponse.json({ topic });
  }),

  /**
   * POST /topics - Create topic
   */
  http.post(`${DISCUSSION_SERVICE_BASE_URL}/topics`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      tags?: string[];
    };

    if (!body.title) {
      return HttpResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    const slug = body.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const newTopic = {
      id: `topic-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      slug,
      status: 'draft' as const,
      author: mockAuthor,
      responseCount: 0,
      participantCount: 1,
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    topicDatabase.set(newTopic.id, newTopic);

    return HttpResponse.json({ topic: newTopic }, { status: 201 });
  }),

  /**
   * GET /topics/:topicId/common-ground - Get common ground summary
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/topics/:topicId/common-ground`, ({ params }) => {
    const { topicId } = params as { topicId: string };

    if (!topicDatabase.has(topicId)) {
      return HttpResponse.json({ message: 'Topic not found' }, { status: 404 });
    }

    return HttpResponse.json({
      ...mockCommonGround,
      topicId,
    });
  }),

  // ==================== Responses ====================

  /**
   * GET /topics/:topicId/responses - Get responses for a topic
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/topics/:topicId/responses`, ({ params, request }) => {
    const { topicId } = params as { topicId: string };
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId');

    let responses = Array.from(responseDatabase.values()).filter((r) => r.topicId === topicId);

    if (parentId === 'null' || parentId === '') {
      // Root responses only
      responses = responses.filter((r) => r.parentId === null);
    } else if (parentId) {
      // Replies to specific parent
      responses = responses.filter((r) => r.parentId === parentId);
    }

    return HttpResponse.json({
      responses,
      total: responses.length,
    });
  }),

  /**
   * POST /topics/:topicId/responses - Create response
   */
  http.post(
    `${DISCUSSION_SERVICE_BASE_URL}/topics/:topicId/responses`,
    async ({ params, request }) => {
      const { topicId } = params as { topicId: string };
      const body = (await request.json()) as {
        content?: string;
        parentId?: string | null;
      };

      if (!body.content) {
        return HttpResponse.json({ message: 'Content is required' }, { status: 400 });
      }

      // Calculate depth based on parent
      let depth = 0;
      if (body.parentId) {
        const parent = responseDatabase.get(body.parentId);
        if (parent) {
          depth = parent.depth + 1;
        }
      }

      const newResponse = {
        id: `response-${Date.now()}`,
        topicId,
        content: body.content,
        author: mockAuthor,
        parentId: body.parentId || null,
        depth,
        voteScore: 0,
        upvotes: 0,
        downvotes: 0,
        replyCount: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      responseDatabase.set(newResponse.id, newResponse);

      return HttpResponse.json({ response: newResponse }, { status: 201 });
    },
  ),

  /**
   * GET /responses/:responseId - Get single response
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/responses/:responseId`, ({ params }) => {
    const { responseId } = params as { responseId: string };
    const response = responseDatabase.get(responseId);

    if (!response) {
      return HttpResponse.json({ message: 'Response not found' }, { status: 404 });
    }

    return HttpResponse.json({ response });
  }),

  // ==================== Votes ====================

  /**
   * POST /responses/:responseId/vote - Vote on response
   */
  http.post(
    `${DISCUSSION_SERVICE_BASE_URL}/responses/:responseId/vote`,
    async ({ params, request }) => {
      const { responseId } = params as { responseId: string };
      const body = (await request.json()) as { value?: number };

      const response = responseDatabase.get(responseId);
      if (!response) {
        return HttpResponse.json({ message: 'Response not found' }, { status: 404 });
      }

      const voteValue = body.value ?? 1;
      if (voteValue !== 1 && voteValue !== -1 && voteValue !== 0) {
        return HttpResponse.json({ message: 'Vote value must be 1, -1, or 0' }, { status: 400 });
      }

      // Update vote counts (simplified)
      if (voteValue === 1) {
        response.upvotes += 1;
        response.voteScore += 1;
      } else if (voteValue === -1) {
        response.downvotes += 1;
        response.voteScore -= 1;
      }

      responseDatabase.set(responseId, response);

      return HttpResponse.json({
        responseId,
        voteScore: response.voteScore,
        upvotes: response.upvotes,
        downvotes: response.downvotes,
      });
    },
  ),

  // ==================== Propositions ====================

  /**
   * GET /topics/:topicId/propositions - Get propositions for topic
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/topics/:topicId/propositions`, ({ params }) => {
    const { topicId } = params as { topicId: string };

    const propositions = Object.values(mockPropositions).filter((p) => p.topicId === topicId);

    return HttpResponse.json({
      propositions,
      total: propositions.length,
    });
  }),

  // ==================== Health ====================

  /**
   * GET /health - Health check
   */
  http.get(`${DISCUSSION_SERVICE_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      service: 'discussion-service',
      timestamp: new Date().toISOString(),
    });
  }),
];

/**
 * Helper to add a topic to the mock database
 */
export function addMockTopic(topic: MockTopic): void {
  topicDatabase.set(topic.id, topic);
}

/**
 * Helper to add a response to the mock database
 */
export function addMockResponse(response: MockResponse): void {
  responseDatabase.set(response.id, response);
}

/**
 * Helper to reset mock state (useful for test isolation)
 */
export function resetDiscussionServiceMocks(): void {
  topicDatabase.clear();
  responseDatabase.clear();
  Object.values(mockTopics).forEach((topic) => topicDatabase.set(topic.id, topic));
  Object.values(mockResponses).forEach((response) => responseDatabase.set(response.id, response));
}

export default discussionServiceHandlers;
