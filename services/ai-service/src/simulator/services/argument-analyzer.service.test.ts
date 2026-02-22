/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the bedrock service module to prevent AWS SDK loading
vi.mock('../../ai/bedrock.service.js', () => ({
  BedrockService: vi.fn(),
}));

import { ArgumentAnalyzerService } from './argument-analyzer.service.js';

describe('ArgumentAnalyzerService', () => {
  let service: ArgumentAnalyzerService;
  let mockBedrockService: any;

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    service = new ArgumentAnalyzerService(mockBedrockService);
  });

  it('should analyze an argument and detect fallacies', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: JSON.stringify({
        fallacies: [
          {
            type: 'ad_hominem',
            description: 'Attacks the person',
            excerpt: 'People who believe X are stupid',
            severity: 'major',
          },
        ],
        unsupportedClaims: ['All scientists agree'],
        toneScore: 4,
        evidenceScore: 3,
        coherenceScore: 6,
        suggestions: ['Avoid personal attacks', 'Cite specific sources'],
      }),
    });

    const result = await service.analyze({
      userMessage: 'People who believe X are stupid. All scientists agree with me.',
      conversationContext: [],
    });

    expect(result.fallacies).toHaveLength(1);
    expect(result.fallacies[0].type).toBe('ad_hominem');
    expect(result.toneScore).toBe(4);
  });

  it('should return fallback analysis when AI unavailable', async () => {
    mockBedrockService.isReady.mockResolvedValue(false);

    const result = await service.analyze({
      userMessage: 'Test message',
      conversationContext: [],
    });

    expect(result.fallacies).toEqual([]);
    expect(result.suggestions).toContain('Analysis unavailable - AI service temporarily down');
  });

  it('should include conversation context in analysis', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: JSON.stringify({
        fallacies: [],
        unsupportedClaims: [],
        toneScore: 8,
        evidenceScore: 7,
        coherenceScore: 9,
        suggestions: [],
      }),
    });

    await service.analyze({
      userMessage: 'My response',
      conversationContext: [{ role: 'persona', content: 'What evidence do you have?' }],
    });

    const callArgs = mockBedrockService.complete.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('What evidence do you have?');
  });
});
