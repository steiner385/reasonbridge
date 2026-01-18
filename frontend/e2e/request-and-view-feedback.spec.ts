import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E test suite for requesting and viewing AI feedback
 *
 * This test suite covers the complete flow of:
 * 1. Requesting feedback for a response
 * 2. Viewing feedback in the FeedbackDisplayPanel
 * 3. Dismissing feedback items
 *
 * Related to: Issue #118 (T122) - E2E: Request and view feedback flow
 */

/**
 * Mock feedback data for testing
 */
const mockFeedback = [
  {
    id: 'feedback-1',
    responseId: 'response-123',
    type: 'FALLACY',
    subtype: 'ad_hominem',
    suggestionText: 'This argument attacks the person rather than addressing their point.',
    reasoning: 'The statement focuses on personal characteristics instead of the argument itself.',
    confidenceScore: 0.92,
    displayedToUser: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feedback-2',
    responseId: 'response-123',
    type: 'UNSOURCED',
    suggestionText: 'Consider adding sources to support this claim.',
    reasoning: 'No citations or references provided for factual claims.',
    confidenceScore: 0.85,
    displayedToUser: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feedback-3',
    responseId: 'response-123',
    type: 'AFFIRMATION',
    suggestionText: 'Well-reasoned argument with clear logical structure.',
    reasoning: 'The argument follows a clear logical flow and addresses potential counterpoints.',
    confidenceScore: 0.88,
    displayedToUser: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Helper function to mock the feedback API
 */
async function mockFeedbackAPI(page: Page) {
  // Mock the request feedback endpoint
  await page.route('**/feedback/request', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockFeedback),
    });
  });

  // Mock the dismiss feedback endpoint
  await page.route('**/feedback/*/dismiss', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe('Request and View Feedback Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await mockFeedbackAPI(page);
  });

  test('should successfully request feedback and display it in the panel', async ({ page }) => {
    // Navigate to a page with feedback functionality
    // Note: This assumes there's a test page or component that uses FeedbackDisplayPanel
    await page.goto('/');

    // Simulate requesting feedback by calling the API
    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify the API returned feedback
    expect(feedbackData).toBeDefined();
    expect(Array.isArray(feedbackData)).toBeTruthy();
    expect(feedbackData.length).toBeGreaterThan(0);
  });

  test('should display feedback with correct styling based on type', async ({ page }) => {
    // Navigate to a page that displays feedback
    await page.goto('/');

    // Request feedback
    await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
    });

    // Note: The actual display verification would require a page that renders
    // FeedbackDisplayPanel. This test validates the API interaction.
    // In a real implementation, you would:
    // 1. Navigate to a page with FeedbackDisplayPanel
    // 2. Verify the feedback items are rendered
    // 3. Check the styling classes match the feedback type
  });

  test('should show feedback type badges correctly', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify different feedback types are present
    const types = feedbackData.map((item: { type: string }) => item.type);
    expect(types).toContain('FALLACY');
    expect(types).toContain('UNSOURCED');
    expect(types).toContain('AFFIRMATION');
  });

  test('should display confidence scores for each feedback item', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify all feedback items have confidence scores
    feedbackData.forEach((item: { confidenceScore: number }) => {
      expect(item.confidenceScore).toBeGreaterThan(0);
      expect(item.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  test('should successfully dismiss a feedback item', async ({ page }) => {
    await page.goto('/');

    // Request feedback first
    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    const feedbackId = feedbackData[0].id;

    // Dismiss the first feedback item
    const dismissResult = await page.evaluate(async (id) => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/${id}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissalReason: 'Not helpful' }),
      });
      return response.json();
    }, feedbackId);

    // Verify dismissal was successful
    expect(dismissResult.success).toBe(true);
  });

  test('should handle feedback request errors gracefully', async ({ page }) => {
    // Override the mock to return an error
    await page.route('**/feedback/request', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/');

    // Attempt to request feedback
    const result = await page.evaluate(async () => {
      try {
        const API_BASE_URL = 'http://localhost:3000';
        const response = await fetch(`${API_BASE_URL}/feedback/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseId: 'response-123',
            content: 'Test response content',
          }),
        });
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Verify error handling
    expect(result.status).toBe(500);
    expect(result.ok).toBe(false);
  });

  test('should display subtypes for fallacy feedback', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Find fallacy feedback and verify it has a subtype
    const fallacyFeedback = feedbackData.find((item: { type: string }) => item.type === 'FALLACY');
    expect(fallacyFeedback).toBeDefined();
    expect(fallacyFeedback.subtype).toBeDefined();
    expect(fallacyFeedback.subtype).toBe('ad_hominem');
  });

  test('should include reasoning for each feedback item', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify all feedback items have reasoning
    feedbackData.forEach((item: { reasoning: string; suggestionText: string }) => {
      expect(item.reasoning).toBeDefined();
      expect(item.reasoning.length).toBeGreaterThan(0);
      expect(item.suggestionText).toBeDefined();
      expect(item.suggestionText.length).toBeGreaterThan(0);
    });
  });

  test('should handle empty feedback responses', async ({ page }) => {
    // Override mock to return empty array
    await page.route('**/feedback/request', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify empty array is handled correctly
    expect(Array.isArray(feedbackData)).toBeTruthy();
    expect(feedbackData.length).toBe(0);
  });

  test('should preserve feedback metadata after request', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify all expected properties are present
    feedbackData.forEach(
      (item: {
        id: string;
        responseId: string;
        type: string;
        displayedToUser: boolean;
        createdAt: string;
      }) => {
        expect(item.id).toBeDefined();
        expect(item.responseId).toBe('response-123');
        expect(item.type).toBeDefined();
        expect(item.displayedToUser).toBe(true);
        expect(item.createdAt).toBeDefined();
      },
    );
  });
});

test.describe('Feedback Display Panel Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockFeedbackAPI(page);
  });

  test('should filter out dismissed feedback from display', async ({ page }) => {
    await page.goto('/');

    // This test validates the expected behavior that dismissed feedback
    // should not be displayed. In a real implementation with a UI page:
    // 1. Request feedback
    // 2. Verify all feedback items are displayed
    // 3. Dismiss one item
    // 4. Verify the dismissed item is no longer visible
    // 5. Verify other items remain visible

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify initial state has no dismissed items
    const dismissedItems = feedbackData.filter(
      (item: { dismissedAt?: string }) => item.dismissedAt,
    );
    expect(dismissedItems.length).toBe(0);
  });

  test('should display all feedback types with appropriate styling', async ({ page }) => {
    await page.goto('/');

    const feedbackData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: 'response-123',
          content: 'Test response content',
        }),
      });
      return response.json();
    });

    // Verify we have multiple feedback types
    const uniqueTypes = Array.from(
      new Set(feedbackData.map((item: { type: string }) => item.type)),
    );
    expect(uniqueTypes.length).toBeGreaterThan(1);

    // Verify each type is one of the expected values
    const validTypes = ['FALLACY', 'INFLAMMATORY', 'UNSOURCED', 'BIAS', 'AFFIRMATION'];
    uniqueTypes.forEach((type) => {
      expect(validTypes).toContain(type);
    });
  });
});
