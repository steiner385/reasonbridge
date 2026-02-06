/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Request Handlers for API Mocking
 *
 * This module provides common API mock handlers for testing.
 * Handlers can be extended or overridden in individual test files.
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Default API base URL for handlers
 */
export const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3000/api';

/**
 * Mock user data
 */
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Mock authentication token
 */
export const mockAuthToken = 'mock-jwt-token-12345';

/**
 * Authentication handlers
 */
export const authHandlers: RequestHandler[] = [
  // Login
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        token: mockAuthToken,
      });
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  // Register
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; username?: string; password?: string };

    if (body.email && body.username && body.password) {
      return HttpResponse.json(
        {
          user: {
            ...mockUser,
            email: body.email,
            username: body.username,
          },
          token: mockAuthToken,
        },
        { status: 201 },
      );
    }

    return HttpResponse.json({ message: 'Invalid registration data' }, { status: 400 });
  }),

  // Get current user
  http.get(`${API_BASE_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.includes(mockAuthToken)) {
      return HttpResponse.json({ user: mockUser });
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),

  // Logout
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),
];

/**
 * User handlers
 */
export const userHandlers: RequestHandler[] = [
  // Get user by ID
  http.get(`${API_BASE_URL}/users/:userId`, ({ params }) => {
    const { userId } = params;
    return HttpResponse.json({
      ...mockUser,
      id: userId,
    });
  }),

  // Update user
  http.patch(`${API_BASE_URL}/users/:userId`, async ({ params, request }) => {
    const { userId } = params;
    const updates = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      ...mockUser,
      id: userId,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }),
];

/**
 * Discussion/Topic handlers
 */
export const discussionHandlers: RequestHandler[] = [
  // Get topics
  http.get(`${API_BASE_URL}/topics`, () => {
    return HttpResponse.json({
      topics: [
        {
          id: 'topic-1',
          title: 'Test Topic 1',
          description: 'Description for test topic 1',
          createdAt: new Date().toISOString(),
          author: mockUser,
        },
        {
          id: 'topic-2',
          title: 'Test Topic 2',
          description: 'Description for test topic 2',
          createdAt: new Date().toISOString(),
          author: mockUser,
        },
      ],
      total: 2,
    });
  }),

  // Get topic by ID
  http.get(`${API_BASE_URL}/topics/:topicId`, ({ params }) => {
    const { topicId } = params;
    return HttpResponse.json({
      id: topicId,
      title: 'Test Topic',
      description: 'Description for test topic',
      createdAt: new Date().toISOString(),
      author: mockUser,
    });
  }),

  // Create topic
  http.post(`${API_BASE_URL}/topics`, async ({ request }) => {
    const body = (await request.json()) as { title?: string; description?: string };

    return HttpResponse.json(
      {
        id: `topic-${Date.now()}`,
        title: body.title || 'Untitled Topic',
        description: body.description || '',
        createdAt: new Date().toISOString(),
        author: mockUser,
      },
      { status: 201 },
    );
  }),

  // Get responses for a topic
  http.get(`${API_BASE_URL}/topics/:topicId/responses`, () => {
    return HttpResponse.json({
      responses: [
        {
          id: 'response-1',
          content: 'Test response content',
          createdAt: new Date().toISOString(),
          author: mockUser,
        },
      ],
      total: 1,
    });
  }),

  // Create response
  http.post(`${API_BASE_URL}/topics/:topicId/responses`, async ({ params, request }) => {
    const { topicId } = params;
    const body = (await request.json()) as { content?: string };

    return HttpResponse.json(
      {
        id: `response-${Date.now()}`,
        topicId,
        content: body.content || '',
        createdAt: new Date().toISOString(),
        author: mockUser,
      },
      { status: 201 },
    );
  }),
];

/**
 * Health check handlers
 */
export const healthHandlers: RequestHandler[] = [
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),
];

/**
 * All default handlers combined
 */
export const defaultHandlers: RequestHandler[] = [
  ...authHandlers,
  ...userHandlers,
  ...discussionHandlers,
  ...healthHandlers,
];

/**
 * Create handlers with a custom base URL
 */
export function createHandlersWithBaseUrl(baseUrl: string): RequestHandler[] {
  const url = baseUrl.replace(/\/$/, ''); // Remove trailing slash

  return [
    // Auth handlers with custom base URL
    http.post(`${url}/auth/login`, async ({ request }) => {
      const body = (await request.json()) as { email?: string; password?: string };
      if (body.email === 'test@example.com' && body.password === 'password123') {
        return HttpResponse.json({ user: mockUser, token: mockAuthToken });
      }
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }),

    http.get(`${url}/auth/me`, ({ request }) => {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.includes(mockAuthToken)) {
        return HttpResponse.json({ user: mockUser });
      }
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }),

    http.get(`${url}/health`, () => {
      return HttpResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    }),
  ];
}
