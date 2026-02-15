/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Handlers for User Service
 *
 * T300: Mock handlers for user-service API endpoints
 *
 * Mocks:
 * - Authentication: login, register, logout, me, refresh
 * - Users: get user, update profile, trust score
 * - Verification: phone verification flow
 * - Onboarding: progress tracking
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * User service base URL
 */
export const USER_SERVICE_BASE_URL = process.env['USER_SERVICE_URL'] || 'http://localhost:3001/api';

/**
 * Mock JWT token for authenticated requests
 */
export const mockAuthToken = 'mock-jwt-token-user-service-12345';

/**
 * Mock refresh token
 */
export const mockRefreshToken = 'mock-refresh-token-67890';

/**
 * Mock users database
 */
/**
 * Mock user type
 */
export interface MockUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  trustScore: number;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export const mockUsers: Record<string, MockUser> = {
  testUser: {
    id: 'user-test-1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    bio: 'A test user for development',
    isVerified: true,
    isEmailVerified: true,
    trustScore: 75,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  unverifiedUser: {
    id: 'user-unverified-1',
    email: 'unverified@example.com',
    username: 'unverified',
    displayName: 'Unverified User',
    avatarUrl: null,
    bio: null,
    isVerified: false,
    isEmailVerified: false,
    trustScore: 0,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  adminUser: {
    id: 'user-admin-1',
    email: 'admin@example.com',
    username: 'admin',
    displayName: 'Admin User',
    avatarUrl: 'https://example.com/admin-avatar.jpg',
    bio: 'Platform administrator',
    isVerified: true,
    isEmailVerified: true,
    trustScore: 100,
    role: 'admin',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Mock onboarding progress states
 */
export const mockOnboardingProgress = {
  notStarted: {
    userId: 'user-test-1',
    hasCompletedOrientation: false,
    hasSelectedTopics: false,
    hasCompletedFirstPost: false,
    selectedTopicIds: [],
    completedAt: null,
  },
  inProgress: {
    userId: 'user-test-1',
    hasCompletedOrientation: true,
    hasSelectedTopics: true,
    hasCompletedFirstPost: false,
    selectedTopicIds: ['topic-1', 'topic-2'],
    completedAt: null,
  },
  completed: {
    userId: 'user-test-1',
    hasCompletedOrientation: true,
    hasSelectedTopics: true,
    hasCompletedFirstPost: true,
    selectedTopicIds: ['topic-1', 'topic-2', 'topic-3'],
    completedAt: '2024-01-20T12:00:00.000Z',
  },
};

/**
 * Simulated user database for dynamic operations
 */
const userDatabase = new Map<string, MockUser>();

// Pre-populate database
Object.values(mockUsers).forEach((user) => {
  userDatabase.set(user.id, user);
  userDatabase.set(user.email, user);
});

/**
 * Track current authenticated user (for session simulation)
 */
let currentAuthenticatedUser: MockUser | null = null;

/**
 * User service handlers
 */
export const userServiceHandlers: RequestHandler[] = [
  // ==================== Authentication ====================

  /**
   * POST /auth/login - User login
   */
  http.post(`${USER_SERVICE_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const user = userDatabase.get(body.email);

    if (!user) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Simulate password check (any password works for test@example.com)
    if (body.email === 'test@example.com' && body.password !== 'password123') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    currentAuthenticatedUser = user;

    return HttpResponse.json({
      user,
      token: mockAuthToken,
      refreshToken: mockRefreshToken,
    });
  }),

  /**
   * POST /auth/register - User registration
   */
  http.post(`${USER_SERVICE_BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      password?: string;
      displayName?: string;
    };

    if (!body.email || !body.username || !body.password) {
      return HttpResponse.json(
        { message: 'Email, username, and password are required' },
        { status: 400 },
      );
    }

    // Check for existing user
    if (userDatabase.has(body.email)) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: body.email,
      username: body.username,
      displayName: body.displayName || body.username,
      avatarUrl: null,
      bio: null,
      isVerified: false,
      isEmailVerified: false,
      trustScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    userDatabase.set(newUser.id, newUser);
    userDatabase.set(newUser.email, newUser);
    currentAuthenticatedUser = newUser;

    return HttpResponse.json(
      {
        user: newUser,
        token: mockAuthToken,
        refreshToken: mockRefreshToken,
      },
      { status: 201 },
    );
  }),

  /**
   * GET /auth/me - Get current user
   */
  http.get(`${USER_SERVICE_BASE_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes(mockAuthToken)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!currentAuthenticatedUser) {
      currentAuthenticatedUser = mockUsers['testUser'] ?? null;
    }

    return HttpResponse.json({ user: currentAuthenticatedUser });
  }),

  /**
   * POST /auth/logout - User logout
   */
  http.post(`${USER_SERVICE_BASE_URL}/auth/logout`, () => {
    currentAuthenticatedUser = null;
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  /**
   * POST /auth/refresh - Refresh token
   */
  http.post(`${USER_SERVICE_BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };

    if (body.refreshToken !== mockRefreshToken) {
      return HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    }

    return HttpResponse.json({
      token: mockAuthToken,
      refreshToken: mockRefreshToken,
    });
  }),

  // ==================== Users ====================

  /**
   * GET /users/:userId - Get user by ID
   */
  http.get(`${USER_SERVICE_BASE_URL}/users/:userId`, ({ params }) => {
    const { userId } = params as { userId: string };
    const user = userDatabase.get(userId);

    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return HttpResponse.json({ user });
  }),

  /**
   * PATCH /users/:userId - Update user profile
   */
  http.patch(`${USER_SERVICE_BASE_URL}/users/:userId`, async ({ params, request }) => {
    const { userId } = params as { userId: string };
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes(mockAuthToken)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = userDatabase.get(userId);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updates = (await request.json()) as Partial<typeof user>;
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    userDatabase.set(userId, updatedUser);

    return HttpResponse.json({ user: updatedUser });
  }),

  /**
   * GET /users/:userId/trust-score - Get user trust score
   */
  http.get(`${USER_SERVICE_BASE_URL}/users/:userId/trust-score`, ({ params }) => {
    const { userId } = params as { userId: string };
    const user = userDatabase.get(userId);

    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return HttpResponse.json({
      userId,
      score: user.trustScore,
      factors: {
        verificationStatus: user.isVerified ? 25 : 0,
        emailVerified: user.isEmailVerified ? 15 : 0,
        accountAge: 20,
        participationQuality: 15,
      },
      lastCalculated: new Date().toISOString(),
    });
  }),

  // ==================== Verification ====================

  /**
   * POST /verification/phone/send - Send phone verification code
   */
  http.post(`${USER_SERVICE_BASE_URL}/verification/phone/send`, async ({ request }) => {
    const body = (await request.json()) as { phoneNumber?: string };

    if (!body.phoneNumber) {
      return HttpResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    return HttpResponse.json({
      message: 'Verification code sent',
      expiresIn: 300, // 5 minutes
    });
  }),

  /**
   * POST /verification/phone/verify - Verify phone code
   */
  http.post(`${USER_SERVICE_BASE_URL}/verification/phone/verify`, async ({ request }) => {
    const body = (await request.json()) as { phoneNumber?: string; code?: string };

    if (!body.phoneNumber || !body.code) {
      return HttpResponse.json({ message: 'Phone number and code are required' }, { status: 400 });
    }

    // Accept "123456" as valid code for testing
    if (body.code !== '123456') {
      return HttpResponse.json({ message: 'Invalid verification code' }, { status: 400 });
    }

    return HttpResponse.json({
      verified: true,
      message: 'Phone number verified successfully',
    });
  }),

  // ==================== Onboarding ====================

  /**
   * GET /onboarding/progress - Get onboarding progress
   */
  http.get(`${USER_SERVICE_BASE_URL}/onboarding/progress`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes(mockAuthToken)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(mockOnboardingProgress.inProgress);
  }),

  /**
   * POST /onboarding/topics - Select onboarding topics
   */
  http.post(`${USER_SERVICE_BASE_URL}/onboarding/topics`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes(mockAuthToken)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { topicIds?: string[] };

    return HttpResponse.json({
      ...mockOnboardingProgress.inProgress,
      hasSelectedTopics: true,
      selectedTopicIds: body.topicIds || [],
    });
  }),

  // ==================== Health ====================

  /**
   * GET /health - Health check
   */
  http.get(`${USER_SERVICE_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    });
  }),
];

/**
 * Helper to set the current authenticated user
 */
export function setMockAuthenticatedUser(user: MockUser | null): void {
  currentAuthenticatedUser = user;
}

/**
 * Helper to add a user to the mock database
 */
export function addMockUser(user: MockUser): void {
  userDatabase.set(user.id, user);
  userDatabase.set(user.email, user);
}

/**
 * Helper to reset mock state (useful for test isolation)
 */
export function resetUserServiceMocks(): void {
  userDatabase.clear();
  Object.values(mockUsers).forEach((user) => {
    userDatabase.set(user.id, user);
    userDatabase.set(user.email, user);
  });
  currentAuthenticatedUser = null;
}

export default userServiceHandlers;
