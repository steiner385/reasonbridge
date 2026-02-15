/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Handlers for Fact-Check Service
 *
 * T299: Mock handlers for fact-check API endpoints
 *
 * Mocks:
 * - POST /fact-check/check - Check claims for fact-check information
 * - GET /fact-check/:id - Get cached fact-check result
 *
 * Also includes mock external API responses (Snopes, PolitiFact patterns)
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Fact-check service base URL
 */
export const FACT_CHECK_BASE_URL =
  process.env['FACT_CHECK_SERVICE_URL'] || 'http://localhost:3004/api';

/**
 * Mock fact-check sources representing different providers
 */
export const mockFactCheckSources = {
  snopes: {
    provider: 'Snopes',
    url: 'https://www.snopes.com/fact-check/example',
    title: 'Snopes Fact Check Article',
    publishedAt: '2024-01-15T10:00:00.000Z',
    rating: 'False',
    ratingDescription: 'This claim is false',
    credibilityScore: 0.95,
    retrievedAt: new Date().toISOString(),
  },
  politifact: {
    provider: 'PolitiFact',
    url: 'https://www.politifact.com/factchecks/example',
    title: 'PolitiFact Rating',
    publishedAt: '2024-01-10T14:30:00.000Z',
    rating: 'Pants on Fire',
    ratingDescription: 'Completely false claim',
    credibilityScore: 0.92,
    retrievedAt: new Date().toISOString(),
  },
  factCheckOrg: {
    provider: 'FactCheck.org',
    url: 'https://www.factcheck.org/example',
    title: 'FactCheck Analysis',
    publishedAt: '2024-01-12T09:15:00.000Z',
    rating: 'Misleading',
    ratingDescription: 'Contains misleading information',
    credibilityScore: 0.88,
    retrievedAt: new Date().toISOString(),
  },
};

/**
 * Pre-built fact-check results for common test scenarios
 */
export const mockFactCheckResults = {
  /**
   * Result with single source - clear verdict
   */
  singleSource: {
    id: 'fc-result-single-1',
    claimText: 'The Earth is flat',
    claimStartOffset: 0,
    claimEndOffset: 17,
    displayedAs: 'Related Context',
    sources: [mockFactCheckSources.snopes],
    hasConflictingSources: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  /**
   * Result with multiple agreeing sources
   */
  multipleAgreeing: {
    id: 'fc-result-multi-1',
    claimText: 'Vaccines cause autism',
    claimStartOffset: 0,
    claimEndOffset: 22,
    displayedAs: 'Related Context',
    sources: [mockFactCheckSources.snopes, mockFactCheckSources.politifact],
    hasConflictingSources: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  /**
   * Result with conflicting sources - different verdicts
   */
  conflicting: {
    id: 'fc-result-conflict-1',
    claimText: 'Coffee is good for health',
    claimStartOffset: 0,
    claimEndOffset: 25,
    displayedAs: 'Related Context',
    sources: [
      { ...mockFactCheckSources.snopes, rating: 'Mostly True' },
      { ...mockFactCheckSources.factCheckOrg, rating: 'Needs Context' },
    ],
    hasConflictingSources: true,
    conflictSummary: 'Multiple fact-checking sources have different assessments for this claim.',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  /**
   * Empty result - no fact-checks found
   */
  noResults: {
    id: 'fc-result-empty-1',
    claimText: 'Random obscure claim',
    claimStartOffset: 0,
    claimEndOffset: 20,
    displayedAs: 'Related Context',
    sources: [],
    hasConflictingSources: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
};

/**
 * Storage for dynamically added results (simulates cache)
 */
const resultCache = new Map<string, (typeof mockFactCheckResults)['singleSource']>();

// Pre-populate cache with mock results
Object.values(mockFactCheckResults).forEach((result) => {
  resultCache.set(result.id, result);
});

/**
 * Fact-check service handlers
 */
export const factCheckHandlers: RequestHandler[] = [
  /**
   * POST /fact-check/check - Check claims for fact-check information
   */
  http.post(`${FACT_CHECK_BASE_URL}/fact-check/check`, async ({ request }) => {
    const body = (await request.json()) as {
      responseId?: string;
      claims?: Array<{ text: string; startOffset: number; endOffset: number }>;
    };

    // Validation
    if (!body.responseId) {
      return HttpResponse.json({ message: 'responseId is required' }, { status: 400 });
    }

    if (!body.claims || !Array.isArray(body.claims) || body.claims.length === 0) {
      return HttpResponse.json({ message: 'claims array is required' }, { status: 400 });
    }

    // Process claims and generate results
    const startTime = Date.now();
    const results = body.claims.map((claim, index) => {
      // Simulate different scenarios based on claim text
      const lowerText = claim.text.toLowerCase();

      if (lowerText.includes('flat earth') || lowerText.includes('earth is flat')) {
        return { ...mockFactCheckResults.singleSource, id: `fc-${Date.now()}-${index}` };
      }

      if (lowerText.includes('vaccine') || lowerText.includes('autism')) {
        return { ...mockFactCheckResults.multipleAgreeing, id: `fc-${Date.now()}-${index}` };
      }

      if (lowerText.includes('coffee') || lowerText.includes('health')) {
        return { ...mockFactCheckResults.conflicting, id: `fc-${Date.now()}-${index}` };
      }

      // Default: no results found
      return null;
    });

    // Filter out null results
    const validResults = results.filter((r) => r !== null);

    // Cache results for later retrieval
    validResults.forEach((result) => {
      if (result) {
        resultCache.set(result.id, result);
      }
    });

    return HttpResponse.json({
      results: validResults,
      processingTimeMs: Date.now() - startTime,
    });
  }),

  /**
   * GET /fact-check/:id - Get cached fact-check result
   */
  http.get(`${FACT_CHECK_BASE_URL}/fact-check/:id`, ({ params }) => {
    const { id } = params as { id: string };

    // Check cache
    const result = resultCache.get(id);

    if (!result) {
      return HttpResponse.json({ message: `Fact-check result not found: ${id}` }, { status: 404 });
    }

    return HttpResponse.json(result);
  }),
];

/**
 * Helper to add a custom fact-check result to the mock cache
 */
export function addMockFactCheckResult(
  result: (typeof mockFactCheckResults)['singleSource'],
): void {
  resultCache.set(result.id, result);
}

/**
 * Helper to clear all cached results (useful for test isolation)
 */
export function clearMockFactCheckCache(): void {
  resultCache.clear();
  // Re-populate with defaults
  Object.values(mockFactCheckResults).forEach((result) => {
    resultCache.set(result.id, result);
  });
}

export default factCheckHandlers;
