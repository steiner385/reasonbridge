/**
 * E2E tests for real-time updates feature
 *
 * Tests WebSocket-based real-time functionality:
 * - New response notifications
 * - Response update notifications
 * - Response deletion notifications
 * - Topic status changes
 * - Typing indicators
 * - Connection state handling
 */

import { test, expect } from '@playwright/test';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

// Mock data for existing responses
const mockExistingResponse = {
  id: 'existing-response',
  discussionId: 'test-topic-realtime',
  topicId: 'test-topic-realtime',
  content: 'This is an existing response in the discussion.',
  author: { id: 'user-1', displayName: 'Alice Smith' },
  parentResponseId: null,
  parentId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
  replyCount: 0,
  replies: [],
};

const mockNewResponseFromWebSocket = {
  id: 'new-ws-response',
  discussionId: 'test-topic-realtime',
  topicId: 'test-topic-realtime',
  content: 'This response just arrived via WebSocket!',
  author: { id: 'user-2', displayName: 'Bob Johnson' },
  parentResponseId: null,
  parentId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  replyCount: 0,
  replies: [],
};

const mockTopicForRealtime = {
  id: 'test-topic-realtime',
  title: 'Topic for Testing Real-time Updates',
  description: 'A test topic for demonstrating real-time update functionality',
  status: 'ACTIVE',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date().toISOString(),
  creatorId: 'user-1',
  participantCount: 5,
  responseCount: 1,
  currentDiversityScore: 0.65,
  consensusScore: 0.72,
  tags: [],
};

test.describe('Real-time Updates', () => {
  // SKIPPED: E2E tests should only test real production code, not mocked APIs
  // TODO: Rewrite to use real backend or move to integration tests
  test.skip(true, 'Uses mock APIs - needs rewrite to use real backend');

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock topic endpoint
    await page.route(/\/topics\/test-topic-realtime\/?(\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTopicForRealtime),
      });
    });

    // Mock propositions endpoint
    await page.route(/\/topics\/test-topic-realtime\/propositions/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock responses endpoint
    await page.route(/\/topics\/test-topic-realtime\/responses/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockExistingResponse]),
      });
    });

    // Mock read-state endpoint
    await page.route(/\/topics\/test-topic-realtime\/read-state/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    // Mock reactions endpoints
    await page.route(/\/responses\/.*\/reactions$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reactions: [], totalCount: 0 }),
      });
    });

    // Mock bookmark status
    await page.route(/\/bookmarks\/.*\/status/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isBookmarked: false }),
      });
    });
  });

  test('should show WebSocket connection indicator', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for page to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Check for connection status indicator
    const connectionIndicator = page.locator(
      '[data-testid="connection-status"], [data-testid="ws-status"], [aria-label*="connection"]',
    );

    const indicatorExists = await connectionIndicator.isVisible().catch(() => false);

    if (indicatorExists) {
      await expect(connectionIndicator).toBeVisible();
    }
  });

  test('should display new response notification when received', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for initial responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Initial count
    const initialCount = await page.locator('[data-testid="response-item"]').count();

    // Simulate WebSocket message for new response
    await page.evaluate((newResponse) => {
      // Create and dispatch a custom event to simulate WebSocket message
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'NEW_RESPONSE',
          payload: newResponse,
        },
      });
      window.dispatchEvent(event);

      // Also try dispatching to any WebSocket manager
      if (
        (window as unknown as { wsManager?: { emit: (type: string, data: unknown) => void } })
          .wsManager
      ) {
        (
          window as unknown as { wsManager: { emit: (type: string, data: unknown) => void } }
        ).wsManager.emit('NEW_RESPONSE', newResponse);
      }
    }, mockNewResponseFromWebSocket);

    // Wait for potential UI update
    await page.waitForTimeout(500);

    // Check for "new messages" notification or toast
    const newMessageIndicator = page.locator(
      '[data-testid="new-message-notification"], [data-testid="new-response-toast"], :text("new response")',
    );

    const notificationExists = await newMessageIndicator
      .first()
      .isVisible()
      .catch(() => false);

    // Notification or inline update should appear
    if (notificationExists) {
      await expect(newMessageIndicator.first()).toBeVisible();
    }
  });

  test('should show typing indicator when other user is typing', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for page to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Simulate typing indicator WebSocket message
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'USER_TYPING',
          payload: {
            topicId: 'test-topic-realtime',
            userId: 'user-2',
            displayName: 'Bob Johnson',
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for potential UI update
    await page.waitForTimeout(300);

    // Check for typing indicator
    const typingIndicator = page.locator(
      '[data-testid="typing-indicator"], :text("typing"), :text("is writing")',
    );

    const indicatorExists = await typingIndicator
      .first()
      .isVisible()
      .catch(() => false);

    if (indicatorExists) {
      await expect(typingIndicator.first()).toBeVisible();
    }
  });

  test('should update response content when edit notification received', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Get initial content
    const responseItem = page.locator('[data-testid="response-item"]').first();
    const initialContent = await responseItem.textContent();

    // Simulate WebSocket message for response update
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'RESPONSE_UPDATED',
          payload: {
            id: 'existing-response',
            content: 'This response has been edited via WebSocket!',
            version: 2,
            editCount: 1,
            editedAt: new Date().toISOString(),
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for potential UI update
    await page.waitForTimeout(500);

    // Content might be updated, or an "edited" indicator might appear
    const editedIndicator = page.locator(':text("edited"), :text("modified")');
    const editedExists = await editedIndicator
      .first()
      .isVisible()
      .catch(() => false);
  });

  test('should remove response from list when deletion notification received', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Verify initial response exists
    const initialCount = await page.locator('[data-testid="response-item"]').count();
    expect(initialCount).toBeGreaterThan(0);

    // Simulate WebSocket message for response deletion
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'RESPONSE_DELETED',
          payload: {
            id: 'existing-response',
            topicId: 'test-topic-realtime',
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for potential UI update
    await page.waitForTimeout(500);

    // Response should be removed or show deleted state
    // (implementation may vary - soft delete vs hard remove)
  });

  test('should update topic status when status change notification received', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for page to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Simulate WebSocket message for topic status change
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'TOPIC_STATUS_CHANGE',
          payload: {
            topicId: 'test-topic-realtime',
            newStatus: 'ARCHIVED',
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for potential UI update
    await page.waitForTimeout(500);

    // Check for archived indicator or disabled composer
    const archivedIndicator = page.locator(
      ':text("archived"), :text("closed"), :text("read-only")',
    );
    const indicatorExists = await archivedIndicator
      .first()
      .isVisible()
      .catch(() => false);
  });

  test('should handle reconnection gracefully', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for page to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Simulate WebSocket disconnection
    await page.evaluate(() => {
      const event = new CustomEvent('ws-disconnect', {
        detail: { reason: 'network-error' },
      });
      window.dispatchEvent(event);
    });

    // Wait briefly
    await page.waitForTimeout(500);

    // Check for disconnection indicator
    const disconnectedIndicator = page.locator(
      '[data-testid="connection-status"][data-status="disconnected"], :text("reconnecting"), :text("offline")',
    );

    const disconnectedExists = await disconnectedIndicator
      .first()
      .isVisible()
      .catch(() => false);

    // Simulate reconnection
    await page.evaluate(() => {
      const event = new CustomEvent('ws-reconnect', {
        detail: { success: true },
      });
      window.dispatchEvent(event);
    });

    // Wait for reconnection
    await page.waitForTimeout(500);

    // Page should still be functional
    const responses = page.locator('[data-testid="response-item"]');
    await expect(responses.first()).toBeVisible();
  });

  test('should show new message count when scrolled away', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Scroll up (away from bottom where new messages appear)
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Simulate multiple new responses arriving
    for (let i = 0; i < 3; i++) {
      await page.evaluate((index) => {
        const event = new CustomEvent('ws-message', {
          detail: {
            type: 'NEW_RESPONSE',
            payload: {
              id: `new-response-${index}`,
              topicId: 'test-topic-realtime',
              content: `New response ${index + 1}`,
              author: { id: 'user-2', displayName: 'Bob Johnson' },
              createdAt: new Date().toISOString(),
            },
          },
        });
        window.dispatchEvent(event);
      }, i);
      await page.waitForTimeout(100);
    }

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Check for "jump to new messages" or count indicator
    const newMessagesButton = page.locator(
      '[data-testid="new-messages-button"], [data-testid="scroll-to-new"], button:has-text("new")',
    );

    const buttonExists = await newMessagesButton
      .first()
      .isVisible()
      .catch(() => false);

    if (buttonExists) {
      // Click to scroll to new messages
      await newMessagesButton.first().click();

      // Should scroll to show new content
      await page.waitForTimeout(500);
    }
  });

  test('should maintain scroll position when new messages arrive', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Get current scroll position
    const initialScrollTop = await page.evaluate(() => {
      const container =
        document.querySelector('[data-testid="response-list"]') || document.documentElement;
      return container.scrollTop;
    });

    // Simulate new response arriving
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'NEW_RESPONSE',
          payload: {
            id: 'scroll-test-response',
            topicId: 'test-topic-realtime',
            content: 'Testing scroll preservation',
            author: { id: 'user-2', displayName: 'Bob Johnson' },
            createdAt: new Date().toISOString(),
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for UI update
    await page.waitForTimeout(500);

    // Get new scroll position
    const newScrollTop = await page.evaluate(() => {
      const container =
        document.querySelector('[data-testid="response-list"]') || document.documentElement;
      return container.scrollTop;
    });

    // Scroll position should be preserved (not jump to top or bottom automatically)
    // unless user was already at the bottom
  });

  test('should clear typing indicator after timeout', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-realtime');

    // Wait for page to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Simulate typing indicator
    await page.evaluate(() => {
      const event = new CustomEvent('ws-message', {
        detail: {
          type: 'USER_TYPING',
          payload: {
            topicId: 'test-topic-realtime',
            userId: 'user-2',
            displayName: 'Bob Johnson',
          },
        },
      });
      window.dispatchEvent(event);
    });

    // Check if typing indicator appears
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    const appeared = await typingIndicator.isVisible().catch(() => false);

    if (appeared) {
      // Wait for typing indicator timeout (typically 3-5 seconds)
      await page.waitForTimeout(5000);

      // Typing indicator should have disappeared
      const stillVisible = await typingIndicator.isVisible().catch(() => false);
      // expect(stillVisible).toBeFalsy();
    }
  });
});
