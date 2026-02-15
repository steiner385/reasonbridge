/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Handlers for AWS Bedrock AI
 *
 * T298: Mock handlers for AWS Bedrock API responses
 *
 * Mocks:
 * - InvokeModel endpoint for Claude completions
 * - Common ground analysis responses
 * - Moral foundation analysis responses
 * - Content moderation responses
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * AWS Bedrock endpoint patterns
 */
export const BEDROCK_RUNTIME_BASE_URL =
  process.env['AWS_BEDROCK_ENDPOINT'] || 'https://bedrock-runtime.us-east-1.amazonaws.com';

/**
 * Mock model IDs
 */
export const MOCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

/**
 * Moral foundation types
 */
export type MoralFoundation =
  | 'care'
  | 'fairness'
  | 'loyalty'
  | 'authority'
  | 'sanctity'
  | 'liberty';

/**
 * Mock common ground analysis result
 */
export interface MockCommonGroundAnalysis {
  agreementZones: Array<{
    description: string;
    confidence: number;
    participantPercentage: number;
  }>;
  misunderstandings: Array<{
    description: string;
    term: string;
    definitions: string[];
  }>;
  genuineDisagreements: Array<{
    description: string;
    underlyingValues: string[];
    moralFoundations: MoralFoundation[];
  }>;
  overallConsensusScore: number;
}

/**
 * Mock moral foundation analysis result
 */
export interface MockMoralFoundationAnalysis {
  foundations: Array<{
    foundation: MoralFoundation;
    score: number;
    indicators: string[];
  }>;
  primaryFoundation: MoralFoundation;
  secondaryFoundation: MoralFoundation | null;
}

/**
 * Mock content moderation result
 */
export interface MockModerationResult {
  flagged: boolean;
  reason?: string;
  categories: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Predefined mock common ground analyses
 */
export const mockCommonGroundAnalyses: Record<string, MockCommonGroundAnalysis> = {
  highConsensus: {
    agreementZones: [
      {
        description: 'All participants agree that climate change is a real phenomenon',
        confidence: 0.95,
        participantPercentage: 92,
      },
      {
        description: 'Participants agree that some form of action is needed',
        confidence: 0.85,
        participantPercentage: 78,
      },
    ],
    misunderstandings: [
      {
        description: 'Different interpretations of "immediate action"',
        term: 'immediate',
        definitions: ['Within 1 year', 'Within 5 years', 'Within a decade'],
      },
    ],
    genuineDisagreements: [
      {
        description: 'Disagreement on prioritization of economic vs environmental concerns',
        underlyingValues: ['Economic stability', 'Environmental preservation'],
        moralFoundations: ['fairness', 'care'],
      },
    ],
    overallConsensusScore: 0.72,
  },
  lowConsensus: {
    agreementZones: [
      {
        description: 'Basic agreement on the importance of discussion',
        confidence: 0.6,
        participantPercentage: 55,
      },
    ],
    misunderstandings: [
      {
        description: 'Fundamental disagreement on terminology',
        term: 'freedom',
        definitions: ['Freedom from government', 'Freedom through government support'],
      },
      {
        description: 'Different understanding of historical context',
        term: 'tradition',
        definitions: ['Pre-modern values', 'Established practices'],
      },
    ],
    genuineDisagreements: [
      {
        description: 'Core value conflict on individual vs collective rights',
        underlyingValues: ['Individual liberty', 'Collective welfare'],
        moralFoundations: ['liberty', 'fairness'],
      },
      {
        description: 'Disagreement on role of authority',
        underlyingValues: ['Autonomy', 'Order'],
        moralFoundations: ['liberty', 'authority'],
      },
    ],
    overallConsensusScore: 0.28,
  },
  polarized: {
    agreementZones: [],
    misunderstandings: [
      {
        description: 'Completely different worldviews',
        term: 'progress',
        definitions: ['Technological advancement', 'Return to values'],
      },
    ],
    genuineDisagreements: [
      {
        description: 'Fundamental disagreement on core values',
        underlyingValues: ['Change', 'Stability'],
        moralFoundations: ['care', 'authority', 'sanctity'],
      },
    ],
    overallConsensusScore: 0.05,
  },
};

/**
 * Predefined mock moral foundation analyses
 */
export const mockMoralFoundationAnalyses: Record<string, MockMoralFoundationAnalysis> = {
  careOriented: {
    foundations: [
      { foundation: 'care', score: 0.85, indicators: ['empathy', 'compassion', 'protection'] },
      { foundation: 'fairness', score: 0.65, indicators: ['equality', 'justice'] },
      { foundation: 'liberty', score: 0.45, indicators: ['autonomy'] },
    ],
    primaryFoundation: 'care',
    secondaryFoundation: 'fairness',
  },
  authorityOriented: {
    foundations: [
      { foundation: 'authority', score: 0.8, indicators: ['respect', 'hierarchy', 'tradition'] },
      { foundation: 'loyalty', score: 0.7, indicators: ['patriotism', 'group cohesion'] },
      { foundation: 'sanctity', score: 0.6, indicators: ['purity', 'sacred values'] },
    ],
    primaryFoundation: 'authority',
    secondaryFoundation: 'loyalty',
  },
  libertarian: {
    foundations: [
      { foundation: 'liberty', score: 0.9, indicators: ['freedom', 'autonomy', 'rights'] },
      { foundation: 'fairness', score: 0.5, indicators: ['equal opportunity'] },
    ],
    primaryFoundation: 'liberty',
    secondaryFoundation: 'fairness',
  },
  balanced: {
    foundations: [
      { foundation: 'care', score: 0.6, indicators: ['empathy'] },
      { foundation: 'fairness', score: 0.6, indicators: ['justice'] },
      { foundation: 'loyalty', score: 0.5, indicators: ['community'] },
      { foundation: 'authority', score: 0.5, indicators: ['order'] },
      { foundation: 'sanctity', score: 0.4, indicators: ['values'] },
      { foundation: 'liberty', score: 0.55, indicators: ['freedom'] },
    ],
    primaryFoundation: 'care',
    secondaryFoundation: 'fairness',
  },
};

/**
 * Predefined mock moderation results
 */
export const mockModerationResults: Record<string, MockModerationResult> = {
  safe: {
    flagged: false,
    categories: [],
  },
  mildlyFlagged: {
    flagged: true,
    reason: 'Contains potentially inflammatory language',
    categories: [{ category: 'inflammatory', severity: 'low' }],
  },
  harassment: {
    flagged: true,
    reason: 'Contains harassment or bullying',
    categories: [{ category: 'harassment', severity: 'high' }],
  },
  hateSpeech: {
    flagged: true,
    reason: 'Contains hate speech targeting protected groups',
    categories: [
      { category: 'hate_speech', severity: 'high' },
      { category: 'discrimination', severity: 'high' },
    ],
  },
};

/**
 * Track current mock responses
 */
let currentCommonGroundAnalysis = mockCommonGroundAnalyses['highConsensus']!;
let currentMoralFoundationAnalysis = mockMoralFoundationAnalyses['balanced']!;
let currentModerationResult = mockModerationResults['safe']!;
let mockBedrockEnabled = true;
let mockLatencyMs = 0;

/**
 * Parse the prompt to determine what type of response to generate
 */
function detectPromptType(
  prompt: string,
): 'common-ground' | 'moral-foundation' | 'moderation' | 'general' {
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes('common ground') ||
    lowerPrompt.includes('agreement') ||
    lowerPrompt.includes('consensus')
  ) {
    return 'common-ground';
  }

  if (
    lowerPrompt.includes('moral foundation') ||
    lowerPrompt.includes('values') ||
    lowerPrompt.includes('care') ||
    lowerPrompt.includes('fairness')
  ) {
    return 'moral-foundation';
  }

  if (
    lowerPrompt.includes('moderate') ||
    lowerPrompt.includes('policy violation') ||
    lowerPrompt.includes('hate speech') ||
    lowerPrompt.includes('harassment')
  ) {
    return 'moderation';
  }

  return 'general';
}

/**
 * Generate mock response based on prompt type
 */
function generateMockResponse(promptType: string): string {
  switch (promptType) {
    case 'common-ground':
      return JSON.stringify(currentCommonGroundAnalysis, null, 2);

    case 'moral-foundation':
      return JSON.stringify(currentMoralFoundationAnalysis, null, 2);

    case 'moderation':
      if (currentModerationResult.flagged) {
        return `FLAGGED: ${currentModerationResult.reason}`;
      }
      return 'SAFE';

    default:
      return 'This is a mock AI response for testing purposes.';
  }
}

/**
 * Bedrock handlers
 */
export const bedrockHandlers: RequestHandler[] = [
  /**
   * POST /model/:modelId/invoke - Bedrock InvokeModel
   */
  http.post(`${BEDROCK_RUNTIME_BASE_URL}/model/:modelId/invoke`, async ({ request, params }) => {
    // Check if mock is enabled
    if (!mockBedrockEnabled) {
      return HttpResponse.json(
        {
          __type: 'ServiceUnavailableException',
          message: 'Bedrock service is unavailable (mock disabled)',
        },
        { status: 503 },
      );
    }

    // Simulate latency if configured
    if (mockLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
    }

    const { modelId } = params as { modelId: string };

    // Validate model ID
    if (!modelId.includes('anthropic.claude')) {
      return HttpResponse.json(
        {
          __type: 'ValidationException',
          message: `Model ${modelId} is not supported`,
        },
        { status: 400 },
      );
    }

    try {
      const body = (await request.json()) as {
        anthropic_version?: string;
        max_tokens?: number;
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };

      // Extract the user prompt
      const systemPrompt = body.system || '';
      const userMessage = body.messages?.find((m) => m.role === 'user')?.content || '';
      const fullPrompt = `${systemPrompt}\n${userMessage}`;

      // Detect prompt type and generate appropriate response
      const promptType = detectPromptType(fullPrompt);
      const responseContent = generateMockResponse(promptType);

      // Return Claude-formatted response
      return HttpResponse.json({
        id: `msg_mock_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: responseContent,
          },
        ],
        model: modelId,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: Math.floor(fullPrompt.length / 4),
          output_tokens: Math.floor(responseContent.length / 4),
        },
      });
    } catch {
      return HttpResponse.json(
        {
          __type: 'ValidationException',
          message: 'Invalid request body',
        },
        { status: 400 },
      );
    }
  }),

  /**
   * POST /model/:modelId/converse - Bedrock Converse API
   */
  http.post(`${BEDROCK_RUNTIME_BASE_URL}/model/:modelId/converse`, async ({ request, params }) => {
    if (!mockBedrockEnabled) {
      return HttpResponse.json(
        {
          __type: 'ServiceUnavailableException',
          message: 'Bedrock service is unavailable (mock disabled)',
        },
        { status: 503 },
      );
    }

    if (mockLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
    }

    const { modelId } = params as { modelId: string };

    try {
      const body = (await request.json()) as {
        system?: Array<{ text: string }>;
        messages?: Array<{ role: string; content: Array<{ text: string }> }>;
      };

      const systemPrompt = body.system?.map((s) => s.text).join('\n') || '';
      const userMessage = body.messages?.find((m) => m.role === 'user')?.content?.[0]?.text || '';
      const fullPrompt = `${systemPrompt}\n${userMessage}`;

      const promptType = detectPromptType(fullPrompt);
      const responseContent = generateMockResponse(promptType);

      return HttpResponse.json({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: responseContent }],
          },
        },
        stopReason: 'end_turn',
        usage: {
          inputTokens: Math.floor(fullPrompt.length / 4),
          outputTokens: Math.floor(responseContent.length / 4),
          totalTokens: Math.floor(fullPrompt.length / 4) + Math.floor(responseContent.length / 4),
        },
        metrics: {
          latencyMs: mockLatencyMs || 150,
        },
      });
    } catch {
      return HttpResponse.json(
        {
          __type: 'ValidationException',
          message: 'Invalid request body',
        },
        { status: 400 },
      );
    }
  }),
];

/**
 * Set the current common ground analysis mock
 */
export function setMockCommonGroundAnalysis(analysis: MockCommonGroundAnalysis): void {
  currentCommonGroundAnalysis = analysis;
}

/**
 * Set the current moral foundation analysis mock
 */
export function setMockMoralFoundationAnalysis(analysis: MockMoralFoundationAnalysis): void {
  currentMoralFoundationAnalysis = analysis;
}

/**
 * Set the current moderation result mock
 */
export function setMockModerationResult(result: MockModerationResult): void {
  currentModerationResult = result;
}

/**
 * Enable or disable Bedrock mock (simulates service unavailability)
 */
export function setMockBedrockEnabled(enabled: boolean): void {
  mockBedrockEnabled = enabled;
}

/**
 * Set mock latency in milliseconds
 */
export function setMockBedrockLatency(latencyMs: number): void {
  mockLatencyMs = latencyMs;
}

/**
 * Reset all Bedrock mocks to defaults
 */
export function resetBedrockMocks(): void {
  currentCommonGroundAnalysis = mockCommonGroundAnalyses['highConsensus']!;
  currentMoralFoundationAnalysis = mockMoralFoundationAnalyses['balanced']!;
  currentModerationResult = mockModerationResults['safe']!;
  mockBedrockEnabled = true;
  mockLatencyMs = 0;
}

export default bedrockHandlers;
