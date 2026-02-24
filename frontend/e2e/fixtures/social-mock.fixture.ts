/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Social/Contacts Mock Playwright Fixture
 *
 * Provides route interception for mocking social media integration endpoints in E2E tests.
 * Covers OAuth connections, contact import, user discovery, and topic invitations.
 *
 * Usage:
 *   import { test, expect, mockSocialEndpoints } from '../fixtures/social-mock.fixture';
 *
 *   test('view contacts', async ({ page }) => {
 *     await mockSocialEndpoints(page, { hasContacts: true });
 *     await page.goto('/settings');
 *     // ...
 *   });
 */

import type { Page, Route } from '@playwright/test';

// ==================
// Types
// ==================

export type SocialProvider = 'GOOGLE' | 'FACEBOOK';

export interface SocialConnection {
  id: string;
  provider: SocialProvider;
  providerAccountId: string;
  displayName: string | null;
  email: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
}

export interface ImportedContact {
  id: string;
  provider: SocialProvider;
  providerContactId: string;
  displayName: string | null;
  email: string | null;
  matchedUserId: string | null;
  importedAt: string;
}

export interface DiscoveredUser {
  contactId: string;
  matchedUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: SocialProvider;
}

export interface TopicInvitation {
  id: string;
  topicId: string;
  topicTitle: string;
  inviterId: string;
  inviterName: string;
  inviteeUserId: string | null;
  inviteeEmail: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface SocialMockConfig {
  /** Whether the user has connected social accounts */
  hasConnections?: boolean;
  /** Connected providers */
  connectedProviders?: SocialProvider[];
  /** Whether the user has imported contacts */
  hasContacts?: boolean;
  /** Number of contacts to simulate */
  contactCount?: number;
  /** Whether some contacts are matched to platform users */
  hasDiscoveredUsers?: boolean;
  /** Number of discovered users */
  discoveredUserCount?: number;
  /** Whether user has pending received invitations */
  hasPendingInvitations?: boolean;
  /** Number of received invitations */
  receivedInvitationCount?: number;
  /** Number of sent invitations */
  sentInvitationCount?: number;
  /** Simulate API errors */
  simulateError?: 'network' | 'server' | 'unauthorized' | null;
}

// ==================
// Mock Data Generators
// ==================

function generateMockConnections(providers: SocialProvider[]): SocialConnection[] {
  return providers.map((provider, index) => ({
    id: `conn-${index + 1}`,
    provider,
    providerAccountId: `provider-${provider.toLowerCase()}-123`,
    displayName: `Test ${provider} User`,
    email: `test-${provider.toLowerCase()}@example.com`,
    connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }));
}

function generateMockContacts(count: number, withMatches: boolean): ImportedContact[] {
  const contacts: ImportedContact[] = [];
  const providers: SocialProvider[] = ['GOOGLE', 'FACEBOOK'];

  for (let i = 0; i < count; i++) {
    const provider = providers[i % 2] ?? 'GOOGLE';
    const isMatched = withMatches && i < Math.ceil(count / 3);

    contacts.push({
      id: `contact-${i + 1}`,
      provider,
      providerContactId: `provider-contact-${i + 1}`,
      displayName: `Contact ${i + 1}`,
      email: `contact${i + 1}@example.com`,
      matchedUserId: isMatched ? `user-${i + 1}` : null,
      importedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    });
  }

  return contacts;
}

function generateMockDiscoveredUsers(count: number): DiscoveredUser[] {
  const users: DiscoveredUser[] = [];
  const providers: SocialProvider[] = ['GOOGLE', 'FACEBOOK'];

  for (let i = 0; i < count; i++) {
    const provider = providers[i % 2] ?? 'GOOGLE';
    users.push({
      contactId: `contact-${i + 1}`,
      matchedUserId: `user-${i + 1}`,
      displayName: `Discovered User ${i + 1}`,
      avatarUrl: null,
      provider,
    });
  }

  return users;
}

function generateMockInvitations(count: number, type: 'sent' | 'received'): TopicInvitation[] {
  const invitations: TopicInvitation[] = [];
  const statuses: Array<'PENDING' | 'ACCEPTED' | 'DECLINED'> = ['PENDING', 'ACCEPTED', 'DECLINED'];

  for (let i = 0; i < count; i++) {
    const status = i < Math.ceil(count / 2) ? 'PENDING' : (statuses[i % 3] ?? 'PENDING');

    invitations.push({
      id: `invitation-${type}-${i + 1}`,
      topicId: `topic-${i + 1}`,
      topicTitle: `Test Topic ${i + 1}`,
      inviterId: type === 'sent' ? 'current-user' : `inviter-${i + 1}`,
      inviterName: type === 'sent' ? 'You' : `Inviter ${i + 1}`,
      inviteeUserId: type === 'received' ? 'current-user' : `invitee-${i + 1}`,
      inviteeEmail: null,
      status,
      message: i % 2 === 0 ? 'Would love your thoughts on this!' : null,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return invitations;
}

// ==================
// Route Interceptors
// ==================

/**
 * Set up route interception for social/contacts API endpoints.
 * Call this after setting up authentication mocks.
 */
export async function mockSocialEndpoints(
  page: Page,
  config: SocialMockConfig = {},
): Promise<void> {
  const {
    hasConnections = false,
    connectedProviders = hasConnections ? ['GOOGLE'] : [],
    hasContacts = false,
    contactCount = hasContacts ? 10 : 0,
    hasDiscoveredUsers = false,
    discoveredUserCount = hasDiscoveredUsers ? 3 : 0,
    hasPendingInvitations = false,
    receivedInvitationCount = hasPendingInvitations ? 3 : 0,
    sentInvitationCount = 2,
    simulateError = null,
  } = config;

  // Handle error simulation
  if (simulateError) {
    await setupErrorRoutes(page, simulateError);
    return;
  }

  // Mock connections endpoints
  await mockConnectionsEndpoints(page, connectedProviders as SocialProvider[]);

  // Mock contacts endpoints
  await mockContactsEndpoints(page, contactCount, hasDiscoveredUsers);

  // Mock discovery endpoint
  await mockDiscoveryEndpoints(page, discoveredUserCount);

  // Mock invitations endpoints
  await mockInvitationsEndpoints(page, receivedInvitationCount, sentInvitationCount);
}

async function setupErrorRoutes(
  page: Page,
  errorType: 'network' | 'server' | 'unauthorized',
): Promise<void> {
  const errorHandler = async (route: Route) => {
    switch (errorType) {
      case 'network':
        await route.abort('connectionfailed');
        break;
      case 'server':
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
        break;
      case 'unauthorized':
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
        break;
    }
  };

  await page.route('**/api/contacts/**', errorHandler);
  await page.route('**/api/invitations/**', errorHandler);
}

async function mockConnectionsEndpoints(
  page: Page,
  connectedProviders: SocialProvider[],
): Promise<void> {
  const connections = generateMockConnections(connectedProviders);

  // GET /contacts/connections - List connected social accounts
  await page.route('**/api/contacts/connections', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connections }),
      });
    } else {
      route.continue();
    }
  });

  // POST /contacts/connections/initiate - Start OAuth flow
  await page.route('**/api/contacts/connections/initiate', (route) => {
    const body = route.request().postDataJSON() as { provider?: string } | null;
    const provider = body?.provider || 'GOOGLE';

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authUrl: `/auth/callback/${provider.toLowerCase()}#access_token=mock-token&state=mock-state`,
        state: 'mock-state',
        provider,
      }),
    });
  });

  // POST /contacts/connections/callback - Handle OAuth callback
  await page.route('**/api/contacts/connections/callback', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        connection: {
          id: 'new-conn',
          provider: 'GOOGLE',
          displayName: 'New Connection',
          connectedAt: new Date().toISOString(),
        },
      }),
    });
  });

  // DELETE /contacts/connections/:id - Disconnect social account
  await page.route('**/api/contacts/connections/*', (route) => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.continue();
    }
  });
}

async function mockContactsEndpoints(
  page: Page,
  contactCount: number,
  withMatches: boolean,
): Promise<void> {
  const contacts = generateMockContacts(contactCount, withMatches);

  // POST /contacts/import - Import contacts from provider
  await page.route('**/api/contacts/import', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        imported: contactCount,
        matched: withMatches ? Math.ceil(contactCount / 3) : 0,
      }),
    });
  });

  // GET /contacts - List imported contacts
  await page.route('**/api/contacts', (route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contacts: contacts.slice(offset, offset + limit),
          total: contacts.length,
          limit,
          offset,
        }),
      });
    } else {
      route.continue();
    }
  });
}

async function mockDiscoveryEndpoints(page: Page, discoveredCount: number): Promise<void> {
  const discoveredUsers = generateMockDiscoveredUsers(discoveredCount);

  // GET /contacts/discover - Discover platform users from contacts
  await page.route('**/api/contacts/discover', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: discoveredUsers,
        total: discoveredUsers.length,
      }),
    });
  });
}

async function mockInvitationsEndpoints(
  page: Page,
  receivedCount: number,
  sentCount: number,
): Promise<void> {
  const receivedInvitations = generateMockInvitations(receivedCount, 'received');
  const sentInvitations = generateMockInvitations(sentCount, 'sent');

  // POST /invitations - Create invitation
  await page.route('**/api/invitations', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        topicId?: string;
        inviteeUserId?: string;
        inviteeEmail?: string;
        message?: string;
      } | null;

      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-invitation',
          topicId: body?.topicId || 'topic-1',
          topicTitle: 'New Topic',
          inviterId: 'current-user',
          inviterName: 'You',
          inviteeUserId: body?.inviteeUserId || null,
          inviteeEmail: body?.inviteeEmail || null,
          status: 'PENDING',
          message: body?.message || null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    } else {
      route.continue();
    }
  });

  // GET /invitations/received - List received invitations
  await page.route('**/api/invitations/received', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        invitations: receivedInvitations,
        total: receivedInvitations.length,
      }),
    });
  });

  // GET /invitations/sent - List sent invitations
  await page.route('**/api/invitations/sent', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        invitations: sentInvitations,
        total: sentInvitations.length,
      }),
    });
  });

  // POST /invitations/:id/accept - Accept invitation
  await page.route('**/api/invitations/*/accept', (route) => {
    const url = route.request().url();
    const invitationId = url.split('/').slice(-2)[0];

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        topicId: 'topic-1',
        invitationId,
      }),
    });
  });

  // POST /invitations/:id/decline - Decline invitation
  await page.route('**/api/invitations/*/decline', (route) => {
    const url = route.request().url();
    const invitationId = url.split('/').slice(-2)[0];

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        invitationId,
      }),
    });
  });
}

// Re-export test and expect from Playwright
export { test, expect } from '@playwright/test';
