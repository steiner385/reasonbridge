/**
 * E2E tests for Real-Time Preview Feedback (Feature 014)
 *
 * Tests the complete user journey for seeing AI feedback while composing responses:
 * - T010: Feedback appears after 20+ chars typed
 * - T011: Feedback updates when draft modified
 * - T012: Affirmation shown for constructive content
 * - T021-T023: Multiple issues displayed, sorted by severity
 * - T028-T030: Ready-to-post indicator functionality
 * - T036-T038: Sensitivity level control
 *
 * @see specs/014-realtime-preview-feedback/
 */

import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Mock preview feedback responses for different content types
const mockFeedbackWithIssues = {
  feedback: [
    {
      type: 'FALLACY',
      subtype: 'ad_hominem',
      suggestionText: 'This argument attacks the person rather than addressing their point.',
      reasoning:
        'The statement focuses on personal characteristics instead of the argument itself.',
      confidenceScore: 0.92,
      educationalResources: {
        links: [{ title: 'Ad Hominem Fallacy', url: 'https://example.com/fallacies/ad-hominem' }],
      },
    },
    {
      type: 'INFLAMMATORY',
      suggestionText: 'Consider rephrasing to maintain a constructive tone.',
      reasoning: 'The language may escalate conflict rather than foster understanding.',
      confidenceScore: 0.85,
    },
  ],
  readyToPost: false,
  summary: 'Found 2 areas for improvement',
  analysisTimeMs: 120,
};

const mockFeedbackAffirmation = {
  feedback: [
    {
      type: 'AFFIRMATION',
      suggestionText: 'Well-reasoned argument with clear logical structure.',
      reasoning: 'The argument follows a clear logical flow and addresses potential counterpoints.',
      confidenceScore: 0.88,
    },
  ],
  readyToPost: true,
  summary: 'Your response looks constructive!',
  analysisTimeMs: 95,
};

const mockEmptyFeedback = {
  feedback: [],
  readyToPost: true,
  summary: 'No issues detected',
  analysisTimeMs: 85,
};

/**
 * Helper to mock the preview feedback API
 */
async function mockPreviewFeedbackAPI(page: Page, response: object) {
  await page.route('**/ai/feedback/preview', async (route) => {
    // Simulate realistic response time
    await new Promise((r) => setTimeout(r, 100));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Helper to mock auth for the preview endpoint
 */
async function mockAuth(page: Page) {
  // Mock auth endpoints to simulate logged-in user
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      }),
    });
  });
}

/**
 * Helper to navigate to a page with the ResponseComposer
 */
async function navigateToComposer(page: Page) {
  // Use a mock topic ID - the actual ID doesn't matter since we mock the API
  const MOCK_TOPIC_ID = 'topic-123';

  // Mock topic data API endpoint
  await page.route(`**/api/topics/${MOCK_TOPIC_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_TOPIC_ID,
        title: 'Test Topic for Feedback',
        description: 'A topic for testing the ResponseComposer',
        status: 'ACTIVE',
        participantCount: 5,
        responseCount: 3,
        consensusScore: 0.75,
        createdAt: new Date().toISOString(),
      }),
    });
  });

  await page.route(`**/api/topics/${MOCK_TOPIC_ID}/responses`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });

  // Mock propositions endpoint (topic detail page may request this)
  await page.route(`**/api/topics/${MOCK_TOPIC_ID}/propositions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock common ground analysis endpoint
  await page.route(`**/api/topics/${MOCK_TOPIC_ID}/common-ground-analysis`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
  });

  // Mock bridging suggestions endpoint
  await page.route(`**/api/topics/${MOCK_TOPIC_ID}/bridging-suggestions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
  });

  await page.goto(`/topics/${MOCK_TOPIC_ID}`);

  // Wait for the page to load and the composer to be visible
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('textarea[id="response-content"]', { timeout: 10000 });
}

test.describe('Preview Feedback - User Story 1: View Feedback While Composing', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });

  test('T010: feedback panel appears after typing 20+ characters', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackWithIssues);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    const feedbackPanel = page.locator('[aria-label="Preview feedback"]');

    // Feedback should not be visible initially
    await expect(feedbackPanel).not.toBeVisible();

    // Type less than 20 characters - feedback should still not be visible
    await textarea.fill('Short text');
    await expect(feedbackPanel).not.toBeVisible();

    // Type 20+ characters - feedback panel should appear
    await textarea.fill('This is a longer text that exceeds twenty characters');

    // Wait for debounce and API response
    await expect(feedbackPanel).toBeVisible({ timeout: 2000 });

    // Verify header shows "Feedback Preview"
    await expect(page.getByText('Feedback Preview')).toBeVisible();
  });

  test('T011: feedback updates when draft content is modified', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/ai/feedback/preview', async (route) => {
      requestCount++;
      await new Promise((r) => setTimeout(r, 100));
      // Return different feedback based on request count
      const response = requestCount === 1 ? mockFeedbackWithIssues : mockFeedbackAffirmation;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');

    // Type initial content with issues
    await textarea.fill("You're wrong and everyone knows it!");
    await expect(page.getByText('Found 2 areas for improvement')).toBeVisible({ timeout: 2000 });

    // Modify to constructive content
    await textarea.fill(
      'I understand your perspective, but I have a different view based on the evidence.',
    );
    await expect(page.getByText('Your response looks constructive!')).toBeVisible({
      timeout: 2000,
    });

    // Verify multiple requests were made
    expect(requestCount).toBeGreaterThanOrEqual(2);
  });

  test('T012: affirmation shown for constructive content', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackAffirmation);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');

    // Type constructive content
    await textarea.fill(
      'I appreciate your thoughtful analysis. Here are some points to consider...',
    );

    // Wait for feedback panel
    const feedbackPanel = page.locator('[aria-label="Preview feedback"]');
    await expect(feedbackPanel).toBeVisible({ timeout: 2000 });

    // Verify affirmation feedback type
    await expect(page.getByText('AFFIRMATION')).toBeVisible();
    await expect(page.getByText('Well-reasoned argument')).toBeVisible();

    // Verify ready to post indicator
    await expect(page.getByText('Ready to post')).toBeVisible();
  });
});

test.describe('Preview Feedback - User Story 2: Understand Specific Issues', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockPreviewFeedbackAPI(page, mockFeedbackWithIssues);
  });

  test('T021: multiple issues displayed for content with multiple problems', async ({ page }) => {
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill("You're an idiot and everyone knows this is obviously true!");

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Verify both feedback types are displayed
    await expect(page.getByText('FALLACY')).toBeVisible();
    await expect(page.getByText('INFLAMMATORY')).toBeVisible();

    // Verify count in summary
    await expect(page.getByText('Found 2 areas')).toBeVisible();
  });

  test('T022: each feedback item shows type, suggestion, and reasoning', async ({ page }) => {
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill("You're wrong because you're just ignorant!");

    // Wait for feedback
    await expect(page.getByText('FALLACY')).toBeVisible({ timeout: 2000 });

    // Verify suggestion text is visible
    await expect(page.getByText('attacks the person rather than addressing')).toBeVisible();

    // Click to expand details
    await page.getByRole('button', { name: 'Show details' }).first().click();

    // Verify reasoning is shown
    await expect(page.getByText('focuses on personal characteristics')).toBeVisible();
  });

  test('T023: feedback can be expanded to show educational resources', async ({ page }) => {
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill("You're wrong because you're just ignorant!");

    // Wait for feedback
    await expect(page.getByText('FALLACY')).toBeVisible({ timeout: 2000 });

    // Expand details
    await page.getByRole('button', { name: 'Show details' }).first().click();

    // Verify educational resources link
    await expect(page.getByText('Learn more:')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ad Hominem Fallacy' })).toBeVisible();
  });
});

test.describe('Preview Feedback - User Story 3: Ready-to-Post Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });

  test('T028: ready indicator shows green checkmark when no critical issues', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackAffirmation);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is a well-reasoned and constructive response.');

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Verify ready to post indicator with checkmark
    const readyIndicator = page.getByText('Ready to post');
    await expect(readyIndicator).toBeVisible();

    // Verify green styling (the indicator uses bg-green-100 for ready state)
    const indicatorContainer = page.locator('[role="status"]').filter({ hasText: 'Ready to post' });
    await expect(indicatorContainer).toHaveClass(/bg-green-100/);
  });

  test('T029: revision indicator shows when critical issues present', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackWithIssues);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill("You're completely wrong and everyone knows it!");

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Verify revision suggested indicator
    const revisionIndicator = page.getByText('Review suggested');
    await expect(revisionIndicator).toBeVisible();

    // Verify yellow/warning styling (the indicator uses bg-yellow-100 for review state)
    const indicatorContainer = page
      .locator('[role="status"]')
      .filter({ hasText: 'Review suggested' });
    await expect(indicatorContainer).toHaveClass(/bg-yellow-100/);
  });

  test('T030: indicator updates when user edits content to fix issues', async ({ page }) => {
    let responseIndex = 0;
    const responses = [mockFeedbackWithIssues, mockFeedbackAffirmation];

    await page.route('**/ai/feedback/preview', async (route) => {
      await new Promise((r) => setTimeout(r, 100));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responses[Math.min(responseIndex++, responses.length - 1)]),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');

    // Start with problematic content
    await textarea.fill("You're completely wrong!");
    await expect(page.getByText('Review suggested')).toBeVisible({ timeout: 2000 });

    // Edit to constructive content
    await textarea.fill('I respectfully disagree based on the following evidence...');
    await expect(page.getByText('Ready to post')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Preview Feedback - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });

  test('T020: compose still works when service unavailable', async ({ page }) => {
    // Mock API to return error
    await page.route('**/ai/feedback/preview', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' }),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    const submitButton = page.getByRole('button', { name: /Post Response/i });

    // Type content
    await textarea.fill('This is my response that I want to post.');

    // Verify feedback panel shows error gracefully
    await expect(page.getByText('Unable to analyze content')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Your response can still be posted')).toBeVisible();

    // Verify submit button is still enabled (compose still works)
    await expect(submitButton).toBeEnabled();
  });

  test('shows loading skeleton while fetching feedback', async ({ page }) => {
    // Add delay to see loading state
    await page.route('**/ai/feedback/preview', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFeedbackAffirmation),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is a longer text that will trigger feedback loading.');

    // Verify loading state appears (either skeleton or "Analyzing..." text)
    await expect(page.getByText('Analyzing...')).toBeVisible({ timeout: 1000 });

    // Wait for content to load
    await expect(page.getByText('AFFIRMATION')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Preview Feedback - User Story 4: Sensitivity Levels', () => {
  const mockLowSensitivityFeedback = {
    feedback: [
      ...mockFeedbackWithIssues.feedback,
      {
        type: 'BIAS',
        suggestionText: 'Consider presenting alternative viewpoints.',
        reasoning: 'The response only presents one perspective.',
        confidenceScore: 0.55, // Low confidence - only shows with LOW sensitivity
      },
    ],
    readyToPost: false,
    summary: 'Found 3 areas for improvement',
    analysisTimeMs: 130,
  };

  const mockHighSensitivityFeedback = {
    feedback: [mockFeedbackWithIssues.feedback[0]], // Only highest confidence item
    readyToPost: false,
    summary: 'Found 1 area for improvement',
    analysisTimeMs: 110,
  };

  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });

  test('T035: LOW sensitivity shows more feedback items', async ({ page }) => {
    let requestedSensitivity = '';
    await page.route('**/ai/feedback/preview', async (route) => {
      const postData = route.request().postDataJSON();
      requestedSensitivity = postData?.sensitivity || 'MEDIUM';
      await new Promise((r) => setTimeout(r, 100));
      // Return more feedback for LOW sensitivity
      const response =
        requestedSensitivity === 'LOW' ? mockLowSensitivityFeedback : mockFeedbackWithIssues;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is content that triggers feedback analysis.');

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Change sensitivity to LOW
    const sensitivityDropdown = page.locator('#sensitivity-selector');
    await sensitivityDropdown.selectOption('LOW');

    // Wait for new request to complete
    await expect(page.getByText('Found 3 areas')).toBeVisible({ timeout: 2000 });
    expect(requestedSensitivity).toBe('LOW');
  });

  test('T036: HIGH sensitivity shows fewer feedback items', async ({ page }) => {
    let requestedSensitivity = '';
    await page.route('**/ai/feedback/preview', async (route) => {
      const postData = route.request().postDataJSON();
      requestedSensitivity = postData?.sensitivity || 'MEDIUM';
      await new Promise((r) => setTimeout(r, 100));
      // Return fewer feedback for HIGH sensitivity
      const response =
        requestedSensitivity === 'HIGH' ? mockHighSensitivityFeedback : mockFeedbackWithIssues;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is content that triggers feedback analysis.');

    // Wait for initial feedback
    await expect(page.getByText('Found 2 areas')).toBeVisible({ timeout: 2000 });

    // Change sensitivity to HIGH
    const sensitivityDropdown = page.locator('#sensitivity-selector');
    await sensitivityDropdown.selectOption('HIGH');

    // Wait for new request to complete with fewer items
    await expect(page.getByText('Found 1 area')).toBeVisible({ timeout: 2000 });
    expect(requestedSensitivity).toBe('HIGH');
  });

  test('T037: sensitivity preference persists across page loads', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackWithIssues);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is content that triggers feedback analysis.');

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Change sensitivity to HIGH
    const sensitivityDropdown = page.locator('#sensitivity-selector');
    await sensitivityDropdown.selectOption('HIGH');

    // Verify localStorage was set
    const storedValue = await page.evaluate(() =>
      localStorage.getItem('preview-feedback-sensitivity'),
    );
    expect(storedValue).toBe('HIGH');

    // Reload page
    await page.reload();
    await textarea.fill('This is content that triggers feedback analysis again.');

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Verify sensitivity is still HIGH
    await expect(sensitivityDropdown).toHaveValue('HIGH');
  });

  test('sensitivity selector is visible and functional', async ({ page }) => {
    await mockPreviewFeedbackAPI(page, mockFeedbackWithIssues);
    await navigateToComposer(page);

    const textarea = page.locator('textarea[id="response-content"]');
    await textarea.fill('This is content that triggers feedback analysis.');

    // Wait for feedback panel
    await expect(page.locator('[aria-label="Preview feedback"]')).toBeVisible({ timeout: 2000 });

    // Verify sensitivity selector exists with correct label
    await expect(page.getByText('Sensitivity:')).toBeVisible();
    const sensitivityDropdown = page.locator('#sensitivity-selector');
    await expect(sensitivityDropdown).toBeVisible();

    // Verify all options are available
    await expect(sensitivityDropdown.locator('option[value="LOW"]')).toHaveText('Low');
    await expect(sensitivityDropdown.locator('option[value="MEDIUM"]')).toHaveText('Medium');
    await expect(sensitivityDropdown.locator('option[value="HIGH"]')).toHaveText('High');
  });
});
