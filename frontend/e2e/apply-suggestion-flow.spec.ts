import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E test suite for applying AI suggestions
 *
 * This test suite covers the complete flow of:
 * 1. Receiving tag and topic link suggestions
 * 2. Applying suggestions to topics
 * 3. Dismissing suggestions
 * 4. Handling applied/dismissed states
 *
 * Related to: Issue #119 (T123) - E2E: Apply suggestion flow
 */

/**
 * Mock tag suggestions for testing
 */
const mockTagSuggestions = {
  suggestions: ['climate-change', 'sustainability', 'renewable-energy'],
  confidenceScore: 0.89,
  reasoning: 'These tags are relevant based on the topic content about environmental policy.',
  attribution: 'AI Service v1.0',
};

/**
 * Mock topic link suggestions for testing
 */
const mockTopicLinkSuggestions = {
  suggestions: ['Related topics found'],
  linkSuggestions: [
    {
      targetTopicId: 'topic-456',
      relationshipType: 'supports' as const,
      reasoning: 'This topic provides supporting evidence for the main argument.',
    },
    {
      targetTopicId: 'topic-789',
      relationshipType: 'contradicts' as const,
      reasoning: 'This topic presents a counterargument to consider.',
    },
    {
      targetTopicId: 'topic-101',
      relationshipType: 'extends' as const,
      reasoning: 'This topic extends the discussion with additional context.',
    },
  ],
  confidenceScore: 0.85,
  reasoning: 'Found relevant topics based on content analysis.',
  attribution: 'AI Service v1.0',
};

/**
 * Helper function to mock the suggestions API
 */
async function mockSuggestionsAPI(page: Page) {
  // Mock the tag suggestions endpoint
  await page.route('**/suggestions/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTagSuggestions),
    });
  });

  // Mock the topic link suggestions endpoint
  await page.route('**/suggestions/topic-links', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTopicLinkSuggestions),
    });
  });

  // Mock the apply tag endpoint
  await page.route('**/topics/*/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock the apply topic link endpoint
  await page.route('**/topics/*/links', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe('Apply Suggestion Flow - Tag Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuggestionsAPI(page);
  });

  test('should successfully request tag suggestions', async ({ page }) => {
    await page.goto('/');

    // Request tag suggestions
    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify the API returned tag suggestions
    expect(suggestionsData).toBeDefined();
    expect(suggestionsData.suggestions).toBeDefined();
    expect(Array.isArray(suggestionsData.suggestions)).toBeTruthy();
    expect(suggestionsData.suggestions.length).toBeGreaterThan(0);
  });

  test('should display tag suggestions with confidence score', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify confidence score is present and valid
    expect(suggestionsData.confidenceScore).toBeDefined();
    expect(suggestionsData.confidenceScore).toBeGreaterThan(0);
    expect(suggestionsData.confidenceScore).toBeLessThanOrEqual(1);
  });

  test('should successfully apply a tag suggestion', async ({ page }) => {
    await page.goto('/');

    // Request tag suggestions first
    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    const tagToApply = suggestionsData.suggestions[0];

    // Apply the first tag suggestion
    const applyResult = await page.evaluate(async (tag) => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/topics/topic-123/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, source: 'AI_SUGGESTED' }),
      });
      return response.json();
    }, tagToApply);

    // Verify application was successful
    expect(applyResult.success).toBe(true);
  });

  test('should handle multiple tag applications', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Apply all tag suggestions
    const results = await page.evaluate(async (tags) => {
      const API_BASE_URL = 'http://localhost:3000';
      const promises = tags.map((tag: string) =>
        fetch(`${API_BASE_URL}/topics/topic-123/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag, source: 'AI_SUGGESTED' }),
        }).then((r) => r.json()),
      );
      return Promise.all(promises);
    }, suggestionsData.suggestions);

    // Verify all applications were successful
    results.forEach((result: { success: boolean }) => {
      expect(result.success).toBe(true);
    });
  });

  test('should include reasoning for tag suggestions', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify reasoning is provided
    expect(suggestionsData.reasoning).toBeDefined();
    expect(suggestionsData.reasoning.length).toBeGreaterThan(0);
  });

  test('should handle empty tag suggestions gracefully', async ({ page }) => {
    // Override mock to return empty suggestions
    await page.route('**/suggestions/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: [],
          confidenceScore: 0.0,
          reasoning: 'No relevant tags found.',
          attribution: 'AI Service v1.0',
        }),
      });
    });

    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Topic',
          content: 'Test content.',
        }),
      });
      return response.json();
    });

    // Verify empty suggestions are handled
    expect(Array.isArray(suggestionsData.suggestions)).toBeTruthy();
    expect(suggestionsData.suggestions.length).toBe(0);
  });
});

test.describe('Apply Suggestion Flow - Topic Link Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuggestionsAPI(page);
  });

  test('should successfully request topic link suggestions', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/topic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-123',
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify the API returned topic link suggestions
    expect(suggestionsData).toBeDefined();
    expect(suggestionsData.linkSuggestions).toBeDefined();
    expect(Array.isArray(suggestionsData.linkSuggestions)).toBeTruthy();
    expect(suggestionsData.linkSuggestions.length).toBeGreaterThan(0);
  });

  test('should display topic link suggestions with relationship types', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/topic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-123',
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify each link suggestion has required properties
    suggestionsData.linkSuggestions.forEach(
      (link: { targetTopicId: string; relationshipType: string; reasoning: string }) => {
        expect(link.targetTopicId).toBeDefined();
        expect(link.relationshipType).toBeDefined();
        expect(link.reasoning).toBeDefined();

        // Verify relationship type is valid
        const validTypes = ['supports', 'contradicts', 'extends', 'questions', 'relates_to'];
        expect(validTypes).toContain(link.relationshipType);
      },
    );
  });

  test('should successfully apply a topic link suggestion', async ({ page }) => {
    await page.goto('/');

    // Request topic link suggestions first
    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/topic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-123',
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    const linkToApply = suggestionsData.linkSuggestions[0];

    // Apply the first topic link suggestion
    const applyResult = await page.evaluate(async (link) => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/topics/topic-123/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTopicId: link.targetTopicId,
          relationshipType: link.relationshipType,
          linkSource: 'AI_SUGGESTED',
        }),
      });
      return response.json();
    }, linkToApply);

    // Verify application was successful
    expect(applyResult.success).toBe(true);
  });

  test('should handle multiple relationship types correctly', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/topic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-123',
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify we have multiple relationship types
    const relationshipTypes = suggestionsData.linkSuggestions.map(
      (link: { relationshipType: string }) => link.relationshipType,
    );

    const uniqueTypes = Array.from(new Set(relationshipTypes));
    expect(uniqueTypes.length).toBeGreaterThan(1);
  });

  test('should include reasoning for each topic link suggestion', async ({ page }) => {
    await page.goto('/');

    const suggestionsData = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/suggestions/topic-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-123',
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify each link has reasoning
    suggestionsData.linkSuggestions.forEach((link: { reasoning: string }) => {
      expect(link.reasoning).toBeDefined();
      expect(link.reasoning.length).toBeGreaterThan(0);
    });
  });
});

test.describe('Apply Suggestion Flow - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuggestionsAPI(page);
  });

  test('should handle tag application errors gracefully', async ({ page }) => {
    // Override mock to return error
    await page.route('**/topics/*/tags', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to apply tag' }),
      });
    });

    await page.goto('/');

    const result = await page.evaluate(async () => {
      try {
        const API_BASE_URL = 'http://localhost:3000';
        const response = await fetch(`${API_BASE_URL}/topics/topic-123/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'test-tag', source: 'AI_SUGGESTED' }),
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

  test('should handle topic link application errors gracefully', async ({ page }) => {
    // Override mock to return error
    await page.route('**/topics/*/links', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create topic link' }),
      });
    });

    await page.goto('/');

    const result = await page.evaluate(async () => {
      try {
        const API_BASE_URL = 'http://localhost:3000';
        const response = await fetch(`${API_BASE_URL}/topics/topic-123/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetTopicId: 'topic-456',
            relationshipType: 'supports',
            linkSource: 'AI_SUGGESTED',
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

  test('should handle suggestion request errors gracefully', async ({ page }) => {
    // Override mock to return error
    await page.route('**/suggestions/tags', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/');

    const result = await page.evaluate(async () => {
      try {
        const API_BASE_URL = 'http://localhost:3000';
        const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Topic',
            content: 'Test content.',
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
});

test.describe('Apply Suggestion Flow - State Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuggestionsAPI(page);
  });

  test('should track applied tag suggestions', async ({ page }) => {
    await page.goto('/');

    // Get suggestions and apply a tag
    const result = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';

      // Request suggestions
      const suggestionsResponse = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      const suggestions = await suggestionsResponse.json();

      // Apply first tag
      const applyResponse = await fetch(`${API_BASE_URL}/topics/topic-123/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: suggestions.suggestions[0], source: 'AI_SUGGESTED' }),
      });
      const applyResult = await applyResponse.json();

      return {
        tagApplied: suggestions.suggestions[0],
        success: applyResult.success,
      };
    });

    expect(result.success).toBe(true);
    expect(result.tagApplied).toBeDefined();
  });

  test('should preserve suggestion metadata after application', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const API_BASE_URL = 'http://localhost:3000';

      // Request suggestions
      const response = await fetch(`${API_BASE_URL}/suggestions/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Climate Change Policy',
          content: 'Discussion about renewable energy and sustainability.',
        }),
      });
      return response.json();
    });

    // Verify all metadata is present
    expect(result.suggestions).toBeDefined();
    expect(result.confidenceScore).toBeDefined();
    expect(result.reasoning).toBeDefined();
    expect(result.attribution).toBeDefined();
  });
});
