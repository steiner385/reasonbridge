/**
 * T063 [US3] - E2E test for threaded reply flow (Feature 009)
 *
 * Tests the complete threaded reply user journey:
 * - Viewing threaded responses with visual indicators
 * - Clicking reply button on a specific response
 * - Posting a reply that appears nested under parent
 * - Collapse/expand functionality
 * - Thread depth limiting
 */

import { test, expect } from '@playwright/test';

test.describe('Threaded Replies', () => {
  // TODO: Enable these tests once Feature 009 backend infrastructure is fully deployed
  //
  // Current status: Backend implementation complete (T051-T055), but E2E environment
  // needs discussion and response seed data to support threading scenarios.
  //
  // Prerequisites for enabling:
  // 1. Add seed data with discussions that have threaded responses
  // 2. Ensure /responses/:id/replies endpoint is deployed and accessible
  // 3. Configure E2E test authentication to support response posting
  //
  // See: specs/009-discussion-participation/tasks.md Phase 3

  test.skip('should display threaded responses with visual indentation', async ({ page }) => {
    // Navigate to a discussion with threaded responses
    await page.goto('/discussions/discussion-with-replies');

    // Verify root response is visible
    const rootResponse = page.locator('[data-testid="response-item"]').first();
    await expect(rootResponse).toBeVisible();

    // Verify child response is indented
    const childResponse = page.locator('[data-testid="response-item"]').nth(1);
    await expect(childResponse).toBeVisible();

    // Check for threading visual indicators (lines connecting parent and child)
    const threadingLine = page.locator('[data-testid="threading-line"]').first();
    await expect(threadingLine).toBeVisible();
  });

  test.skip('should show reply button on each response', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]');

    // Verify reply button exists on first response
    const replyButton = page
      .locator('[data-testid="response-item"]')
      .first()
      .locator('button:has-text("Reply")');
    await expect(replyButton).toBeVisible();
  });

  test.skip('should open reply form when clicking reply button', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Click reply button on first response
    const replyButton = page
      .locator('[data-testid="response-item"]')
      .first()
      .locator('button:has-text("Reply")');
    await replyButton.click();

    // Verify reply form appears
    const replyForm = page.locator('[data-testid="reply-form"]');
    await expect(replyForm).toBeVisible();

    // Verify textarea is focused
    const textarea = replyForm.locator('textarea');
    await expect(textarea).toBeFocused();
  });

  test.skip('should post a reply that appears nested under parent', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Get parent response ID for verification
    const parentResponse = page.locator('[data-testid="response-item"]').first();
    const parentId = await parentResponse.getAttribute('data-response-id');

    // Click reply button
    await parentResponse.locator('button:has-text("Reply")').click();

    // Fill in reply form
    const replyForm = page.locator('[data-testid="reply-form"]');
    await replyForm
      .locator('textarea')
      .fill(
        'This is a threaded reply to demonstrate nesting. It should appear indented under the parent response.',
      );

    // Submit reply
    await replyForm.locator('button:has-text("Post Reply")').click();

    // Wait for success message
    await expect(page.locator('text=/reply posted|success/i')).toBeVisible({ timeout: 5000 });

    // Verify reply appears nested under parent
    const newReply = page.locator(`[data-parent-id="${parentId}"]`);
    await expect(newReply).toBeVisible();

    // Verify reply content
    await expect(newReply).toContainText('This is a threaded reply to demonstrate nesting');

    // Verify reply has indentation
    const indentClass = await newReply.getAttribute('class');
    expect(indentClass).toMatch(/ml-\d+/); // Tailwind margin-left class
  });

  test.skip('should allow posting reply with citation', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Click reply button
    await page
      .locator('[data-testid="response-item"]')
      .first()
      .locator('button:has-text("Reply")')
      .click();

    // Fill in reply content
    const replyForm = page.locator('[data-testid="reply-form"]');
    await replyForm.locator('textarea').fill('Reply with supporting evidence.');

    // Add citation
    await replyForm.locator('button:has-text("Add Citation")').click();
    await replyForm.locator('input[placeholder*="URL"]').fill('https://example.com/evidence');
    await replyForm.locator('input[placeholder*="title"]').fill('Supporting Evidence');

    // Submit reply
    await replyForm.locator('button:has-text("Post Reply")').click();

    // Wait for success
    await expect(page.locator('text=/reply posted|success/i')).toBeVisible({ timeout: 5000 });

    // Verify citation appears in reply
    const newReply = page.locator('[data-testid="response-item"]').last();
    await expect(newReply.locator('a[href="https://example.com/evidence"]')).toBeVisible();
  });

  test.skip('should collapse and expand threaded replies', async ({ page }) => {
    await page.goto('/discussions/discussion-with-deep-threads');

    // Wait for responses with children
    const parentResponse = page.locator('[data-testid="response-item"]').first();
    await expect(parentResponse).toBeVisible();

    // Verify children are visible initially
    const childResponses = page.locator('[data-parent-id]');
    const initialCount = await childResponses.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click collapse button
    await parentResponse.locator('button:has-text(/hide.*replies?/i)').click();

    // Verify children are hidden
    await expect(childResponses.first()).toBeHidden();

    // Click expand button
    await parentResponse.locator('button:has-text(/show.*replies?/i)').click();

    // Verify children are visible again
    await expect(childResponses.first()).toBeVisible();
  });

  test.skip('should maintain visual hierarchy for deeply nested threads', async ({ page }) => {
    await page.goto('/discussions/discussion-with-deep-threads');

    // Verify responses at different depths have appropriate indentation
    const responses = page.locator('[data-testid="response-item"]');
    const depths = new Set<number>();

    const count = await responses.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const response = responses.nth(i);
      const depthAttr = await response.getAttribute('data-depth');
      if (depthAttr) {
        depths.add(parseInt(depthAttr, 10));
      }
    }

    // Verify we have multiple depth levels
    expect(depths.size).toBeGreaterThan(1);

    // Verify max depth doesn't exceed 5 (visual flattening)
    const maxDepth = Math.max(...Array.from(depths));
    expect(maxDepth).toBeLessThanOrEqual(5);
  });

  test.skip('should show error when thread depth limit exceeded', async ({ page }) => {
    await page.goto('/discussions/discussion-at-max-depth');

    // Try to reply to a response at max depth
    const deepResponse = page.locator('[data-depth="10"]').first();
    await deepResponse.locator('button:has-text("Reply")').click();

    // Fill and submit reply
    await page.locator('[data-testid="reply-form"] textarea').fill('Attempting deep reply');
    await page.locator('[data-testid="reply-form"] button:has-text("Post Reply")').click();

    // Verify error message
    await expect(
      page.locator('text=/thread depth limit|too deep|reply to a higher-level/i'),
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip('should preserve thread structure after page reload', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Get initial thread structure
    const initialResponses = page.locator('[data-testid="response-item"]');
    const initialCount = await initialResponses.count();

    // Get first parent-child relationship
    const firstChild = page.locator('[data-parent-id]').first();
    const parentId = await firstChild.getAttribute('data-parent-id');

    // Reload page
    await page.reload();

    // Verify thread structure is maintained
    await expect(page.locator('[data-testid="response-item"]')).toHaveCount(initialCount);
    await expect(page.locator(`[data-parent-id="${parentId}"]`).first()).toBeVisible();
  });

  test.skip('should support nested reply chains (reply to reply)', async ({ page }) => {
    await page.goto('/discussions/discussion-with-replies');

    // Reply to the first response (creates level 1)
    await page
      .locator('[data-testid="response-item"]')
      .first()
      .locator('button:has-text("Reply")')
      .click();
    await page.locator('[data-testid="reply-form"] textarea').fill('First level reply');
    await page.locator('[data-testid="reply-form"] button:has-text("Post Reply")').click();
    await expect(page.locator('text=/reply posted|success/i')).toBeVisible({ timeout: 5000 });

    // Wait for reply to appear and get its ID
    const level1Reply = page.locator('[data-testid="response-item"]').last();
    await expect(level1Reply).toContainText('First level reply');

    // Reply to the level 1 reply (creates level 2)
    await level1Reply.locator('button:has-text("Reply")').click();
    await page.locator('[data-testid="reply-form"] textarea').fill('Second level reply');
    await page.locator('[data-testid="reply-form"] button:has-text("Post Reply")').click();
    await expect(page.locator('text=/reply posted|success/i')).toBeVisible({ timeout: 5000 });

    // Verify level 2 reply appears with greater indentation
    const level2Reply = page.locator('[data-testid="response-item"]').last();
    await expect(level2Reply).toContainText('Second level reply');

    // Verify indentation increased (higher depth number)
    const level1Depth = await level1Reply.getAttribute('data-depth');
    const level2Depth = await level2Reply.getAttribute('data-depth');
    expect(parseInt(level2Depth!, 10)).toBeGreaterThan(parseInt(level1Depth!, 10));
  });
});
