/**
 * Authentication Mock Fixture for E2E Tests
 *
 * Provides utilities to mock authenticated user sessions
 * without going through the full OAuth or login flow.
 * Use this for testing protected routes quickly.
 */

import type { Page } from '@playwright/test';

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'moderator' | 'admin';
  avatarUrl?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

/**
 * Default mock user for testing.
 * Has admin role to access all routes.
 */
export const DEFAULT_MOCK_USER: MockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'admin',
  emailVerified: true,
  phoneVerified: false,
};

/**
 * Mock an authenticated user session.
 *
 * Sets up localStorage tokens and intercepts auth API endpoints
 * to simulate a logged-in user session.
 *
 * @param page - Playwright Page instance
 * @param user - Optional partial user data to override defaults
 */
export async function mockAuthenticatedUser(
  page: Page,
  user?: Partial<MockUser>,
): Promise<MockUser> {
  const mockUser: MockUser = {
    ...DEFAULT_MOCK_USER,
    ...user,
  };

  // Set auth tokens in localStorage before page loads
  await page.addInitScript(
    ({ user }) => {
      // Store mock tokens
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');

      // Store user data
      localStorage.setItem('user', JSON.stringify(user));

      // Set token expiry (1 hour from now)
      const expiry = Date.now() + 60 * 60 * 1000;
      localStorage.setItem('tokenExpiry', String(expiry));
    },
    { user: mockUser },
  );

  // Intercept /auth/me endpoint to return mock user
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: mockUser,
        success: true,
      }),
    });
  });

  // Intercept /auth/refresh endpoint
  await page.route('**/api/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'refreshed-mock-token',
        refreshToken: 'refreshed-mock-refresh-token',
        expiresIn: 3600,
      }),
    });
  });

  // Intercept user profile endpoint
  await page.route('**/api/users/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: mockUser,
        success: true,
      }),
    });
  });

  // Intercept specific user profile endpoint for the test user
  await page.route(`**/api/users/${mockUser.id}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: mockUser,
        success: true,
      }),
    });
  });

  return mockUser;
}

/**
 * Mock a regular (non-admin) user session.
 */
export async function mockRegularUser(page: Page, user?: Partial<MockUser>): Promise<MockUser> {
  return mockAuthenticatedUser(page, {
    role: 'user',
    ...user,
  });
}

/**
 * Mock a moderator user session.
 */
export async function mockModeratorUser(page: Page, user?: Partial<MockUser>): Promise<MockUser> {
  return mockAuthenticatedUser(page, {
    role: 'moderator',
    ...user,
  });
}

/**
 * Mock an admin user session.
 */
export async function mockAdminUser(page: Page, user?: Partial<MockUser>): Promise<MockUser> {
  return mockAuthenticatedUser(page, {
    role: 'admin',
    ...user,
  });
}

/**
 * Clear mock authentication.
 * Useful for testing auth redirects.
 */
export async function clearMockAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
  });
}

/**
 * Mock API endpoints that require authentication.
 * Call this after mockAuthenticatedUser for comprehensive mocking.
 */
export async function mockAuthenticatedEndpoints(page: Page): Promise<void> {
  // Mock topics list endpoint with sample data
  await page.route('**/api/topics', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'test-topic-1',
              title: 'Test Topic',
              description: 'A test topic for E2E testing',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              participantCount: 5,
              responseCount: 3,
              consensusScore: 0.75,
            },
          ],
          topics: [
            {
              id: 'test-topic-1',
              title: 'Test Topic',
              description: 'A test topic for E2E testing',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              participantCount: 5,
              responseCount: 3,
              consensusScore: 0.75,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      });
    } else {
      route.continue();
    }
  });

  // Mock specific topic endpoint
  await page.route('**/api/topics/*', (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const topicId = url.split('/').pop()?.split('?')[0] || 'test-topic-1';

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: topicId,
          title: 'Test Topic',
          description: 'A test topic for E2E testing',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          participantCount: 5,
          responseCount: 3,
          consensusScore: 0.75,
          responses: [],
          propositions: [],
        }),
      });
    } else {
      route.continue();
    }
  });

  // Mock user profile endpoint with expected structure
  await page.route('**/api/users/*', (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const userId = url.split('/').pop()?.split('?')[0] || 'test-user-1';

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: userId,
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: null,
          bio: 'Test user bio',
          createdAt: new Date().toISOString(),
          reputation: 100,
          role: 'admin',
          trustScore: 0.85,
          verificationStatus: {
            email: true,
            phone: false,
            identity: false,
          },
        }),
      });
    } else {
      route.continue();
    }
  });

  // Mock feedback preferences endpoint
  await page.route('**/api/users/*/feedback-preferences', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        emailNotifications: true,
        pushNotifications: false,
        feedbackFrequency: 'immediate',
      }),
    });
  });

  // Mock verification status endpoint
  await page.route('**/api/verification/status', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        emailVerified: true,
        phoneVerified: false,
        identityVerified: false,
      }),
    });
  });

  // Mock pending verifications endpoint
  await page.route('**/api/verification/pending', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        pending: [],
        total: 0,
      }),
    });
  });

  // Mock verification methods endpoint
  await page.route('**/api/verification/methods', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        methods: ['email', 'phone'],
        available: ['email', 'phone'],
      }),
    });
  });

  // Mock appeals endpoint with expected structure
  await page.route('**/api/appeals**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        appeals: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
    });
  });

  // Mock moderation stats endpoint (more specific, should be before wildcard route)
  await page.route('**/api/moderation/queue/stats', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalPending: 0,
        criticalActions: 0,
        avgReviewTimeMinutes: 15,
        pendingByType: {},
      }),
    });
  });

  // Mock moderation stats endpoint (alternative path)
  await page.route('**/api/moderation/stats', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalPending: 0,
        criticalActions: 0,
        avgReviewTimeMinutes: 15,
        pendingByType: {},
        pending: 0,
        approved: 0,
        rejected: 0,
        totalToday: 0,
      }),
    });
  });

  // Mock moderation actions endpoint
  await page.route('**/api/moderation/actions**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }),
    });
  });

  // Mock moderation appeals endpoint
  await page.route('**/api/moderation/appeals**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }),
    });
  });

  // Mock generic moderation endpoint (fallback)
  await page.route('**/api/moderation/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        items: [],
        queue: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
    });
  });

  // Mock common ground endpoint
  await page.route('**/api/common-ground/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-analysis-1',
        agreementZones: [],
        misunderstandings: [],
        disagreements: [],
        genuineDisagreements: [],
        overallConsensusScore: 0,
        participantCount: 0,
        lastUpdated: new Date().toISOString(),
      }),
    });
  });

  // Mock bridging suggestions endpoint
  await page.route('**/api/topics/*/bridging-suggestions', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestions: [],
        overallConsensusScore: 0.5,
        reasoning: 'Test analysis reasoning',
        commonGroundAreas: [],
        conflictAreas: [],
        attribution: 'Generated by AI for testing',
      }),
    });
  });

  // Mock feedback endpoint
  await page.route('**/api/feedback/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        feedback: [],
        total: 0,
      }),
    });
  });

  // Mock notifications endpoint
  await page.route('**/api/notifications**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        notifications: [],
        unreadCount: 0,
        total: 0,
      }),
    });
  });
}
