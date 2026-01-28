/**
 * OAuth Mock Playwright Fixture
 *
 * Provides route interception for mocking OAuth flows in E2E tests.
 * Extends the standard Playwright test with OAuth mocking capabilities.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/oauth-mock.fixture';
 *
 *   test('OAuth login', async ({ page }) => {
 *     // OAuth routes are automatically intercepted
 *     await page.goto('/signup');
 *     await page.click('button:has-text("Google")');
 *     // ...
 *   });
 *
 *   // Custom configuration:
 *   test.use({ oauthMock: { provider: 'apple', scenario: 'cancel' } });
 */

import { test as base, Page, Route, Request } from '@playwright/test';
import type { OAuthProvider, OAuthMockConfig } from '../utils/oauth-types';
import { generateMockStateToken, buildMockAuthSuccessResponse } from '../utils/oauth-mock';

/**
 * Extended test type with OAuth mock configuration
 */
export type OAuthMockOptions = {
  oauthMock: Partial<OAuthMockConfig>;
};

/**
 * State store for tracking OAuth state tokens during tests
 */
const stateStore = new Map<string, { provider: OAuthProvider; createdAt: Date }>();

/**
 * Create the OAuth mock fixture
 */
export const test = base.extend<OAuthMockOptions>({
  // Default OAuth mock configuration
  oauthMock: [
    {
      provider: 'google',
      scenario: 'success',
      emailVerified: true,
      isPrivateRelay: false,
      delay: 0,
    },
    { option: true },
  ],

  // Override page fixture to add route interception
  page: async ({ page, oauthMock }, use) => {
    const config: OAuthMockConfig = {
      provider: oauthMock.provider || 'google',
      scenario: oauthMock.scenario || 'success',
      email: oauthMock.email,
      name: oauthMock.name,
      picture: oauthMock.picture,
      emailVerified: oauthMock.emailVerified ?? true,
      isPrivateRelay: oauthMock.isPrivateRelay ?? false,
      delay: oauthMock.delay ?? 0,
    };

    // Set up OAuth route interception
    await setupOAuthRouteInterception(page, config);

    // Use the page with interception active
    await use(page);

    // Clear state store after test
    stateStore.clear();
  },
});

/**
 * Set up route interception for OAuth endpoints
 */
async function setupOAuthRouteInterception(page: Page, config: OAuthMockConfig): Promise<void> {
  // Intercept OAuth initiation endpoint (API call only)
  await page.route('**/auth/oauth/initiate**', async (route, request) => {
    // Only intercept fetch/XHR requests, not page navigations
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      await handleOAuthInitiate(route, request, config);
    } else {
      await route.continue();
    }
  });

  // Note: We do NOT intercept /auth/callback/* because that's a frontend page route.
  // The callback page (AuthCallbackPage) will render and handle tokens from URL hash.
  // The tokens are included in the authUrl returned by handleOAuthInitiate.

  // Intercept external OAuth redirects (prevent actual Google/Apple navigation)
  await page.route('**/accounts.google.com/**', async (route) => {
    await handleExternalOAuthRedirect(route, config, 'google');
  });

  await page.route('**/appleid.apple.com/**', async (route) => {
    await handleExternalOAuthRedirect(route, config, 'apple');
  });

  // Intercept /auth/me endpoint to return mock user data (API call only)
  await page.route('**/auth/me**', async (route, request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      await handleAuthMe(route, config);
    } else {
      await route.continue();
    }
  });
}

/**
 * Handle /auth/me request for fetching user info after OAuth
 */
async function handleAuthMe(route: Route, config: OAuthMockConfig): Promise<void> {
  // Handle expired-code scenario - /auth/me fails with token expired
  if (config.scenario === 'expired-code') {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'TOKEN_EXPIRED',
        message: 'The access token has expired',
      }),
    });
    return;
  }

  // Return mock user data based on config
  const authResponse = buildMockAuthSuccessResponse(config.provider, config);

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(authResponse),
  });
}

/**
 * Handle OAuth initiation request
 * Intercepts POST /auth/oauth/initiate and returns mock callback URL
 * Handles different scenarios based on config.scenario
 */
async function handleOAuthInitiate(
  route: Route,
  request: Request,
  config: OAuthMockConfig,
): Promise<void> {
  // Add delay if configured
  if (config.delay && config.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.delay));
  }

  // Handle network error scenario
  if (config.scenario === 'network-error') {
    await route.abort('connectionfailed');
    return;
  }

  // Handle server error scenario
  if (config.scenario === 'server-error') {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'SERVER_ERROR',
        message: 'Authentication server error',
      }),
    });
    return;
  }

  try {
    const body = request.postDataJSON() as { provider?: OAuthProvider };
    const provider = body?.provider || config.provider;

    // Generate state token and store it
    const stateToken = generateMockStateToken();
    stateStore.set(stateToken, {
      provider,
      createdAt: new Date(),
    });

    // Build callback URL based on scenario
    let authUrl: string;

    switch (config.scenario) {
      case 'cancel': {
        // Return callback URL with error params
        const errorParams = new URLSearchParams({
          error: 'access_denied',
          error_description: 'User cancelled the authorization',
          state: stateToken,
        });
        authUrl = `/auth/callback/${provider}?${errorParams.toString()}`;
        break;
      }

      case 'invalid-state': {
        // Return callback URL with invalid state token
        const authResponse = buildMockAuthSuccessResponse(provider, config);
        const tokenParams = new URLSearchParams({
          access_token: authResponse.accessToken,
          refresh_token: authResponse.refreshToken,
          state: 'invalid_state_token', // Wrong state to trigger CSRF check
          token_type: 'Bearer',
          expires_in: String(authResponse.expiresIn),
        });
        authUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
        break;
      }

      case 'expired-code': {
        // Return callback URL but the /auth/me call will fail
        // For this scenario, we don't store the state token so validation fails
        stateStore.delete(stateToken);
        const tokenParams = new URLSearchParams({
          access_token: 'expired_token',
          state: stateToken,
          token_type: 'Bearer',
          expires_in: '0',
        });
        authUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
        break;
      }

      case 'success':
      default: {
        // Generate mock tokens for direct inclusion in callback URL
        const authResponse = buildMockAuthSuccessResponse(provider, config);

        // Build mock callback URL with tokens in hash fragment
        const tokenParams = new URLSearchParams({
          access_token: authResponse.accessToken,
          refresh_token: authResponse.refreshToken,
          state: stateToken,
          token_type: 'Bearer',
          expires_in: String(authResponse.expiresIn),
        });
        authUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
        break;
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authUrl,
        state: stateToken,
        provider,
      }),
    });
  } catch (error) {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'SERVER_ERROR',
        message: 'Mock OAuth initiation failed',
      }),
    });
  }
}

/**
 * Handle external OAuth provider redirects
 * Prevents actual navigation to Google/Apple and redirects to mock callback with tokens
 */
async function handleExternalOAuthRedirect(
  route: Route,
  config: OAuthMockConfig,
  provider: OAuthProvider,
): Promise<void> {
  // Add delay if configured (simulate OAuth provider response time)
  if (config.delay && config.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.delay));
  }

  // Handle network error scenario
  if (config.scenario === 'network-error') {
    await route.abort('connectionfailed');
    return;
  }

  // Generate state token for the redirect
  const stateToken = generateMockStateToken();
  stateStore.set(stateToken, {
    provider,
    createdAt: new Date(),
  });

  // Determine callback URL based on scenario
  let callbackUrl: string;

  switch (config.scenario) {
    case 'cancel': {
      const errorParams = new URLSearchParams({
        error: 'access_denied',
        error_description: 'User cancelled the authorization',
        state: stateToken,
      });
      callbackUrl = `/auth/callback/${provider}?${errorParams.toString()}`;
      break;
    }

    case 'invalid-state': {
      const authResponse = buildMockAuthSuccessResponse(provider, config);
      const tokenParams = new URLSearchParams({
        access_token: authResponse.accessToken,
        refresh_token: authResponse.refreshToken,
        state: 'invalid_state_token', // Wrong state to trigger CSRF check
        token_type: 'Bearer',
        expires_in: String(authResponse.expiresIn),
      });
      callbackUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
      break;
    }

    case 'expired-code': {
      stateStore.delete(stateToken);
      const tokenParams = new URLSearchParams({
        access_token: 'expired_token',
        state: stateToken,
        token_type: 'Bearer',
        expires_in: '0',
      });
      callbackUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
      break;
    }

    case 'server-error': {
      // For server error, we still redirect but with an error param
      const errorParams = new URLSearchParams({
        error: 'server_error',
        error_description: 'Authentication server error',
        state: stateToken,
      });
      callbackUrl = `/auth/callback/${provider}?${errorParams.toString()}`;
      break;
    }

    case 'success':
    default: {
      const authResponse = buildMockAuthSuccessResponse(provider, config);
      const tokenParams = new URLSearchParams({
        access_token: authResponse.accessToken,
        refresh_token: authResponse.refreshToken,
        state: stateToken,
        token_type: 'Bearer',
        expires_in: String(authResponse.expiresIn),
      });
      callbackUrl = `/auth/callback/${provider}#${tokenParams.toString()}`;
      break;
    }
  }

  // Redirect to our mock callback URL
  await route.fulfill({
    status: 302,
    headers: {
      Location: callbackUrl,
    },
  });
}

// Re-export expect from base
export { expect } from '@playwright/test';
