/**
 * Bedrock response mock fixtures for testing
 * @module tests/fixtures/bedrock-responses
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface BedrockFixtureRequest {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}

export interface BedrockFixtureResponse {
  content: string;
  stopReason: string;
}

export interface BedrockFixtureError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export interface BedrockFixture {
  description: string;
  request: BedrockFixtureRequest;
  response?: BedrockFixtureResponse;
  error?: BedrockFixtureError;
  metadata: {
    latencyMs: number;
    tokensUsed?: number;
  };
}

const loadFixture = (relativePath: string): BedrockFixture => {
  const fullPath = join(__dirname, relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
};

// Common ground fixtures
export const clusterTextsSuccess = loadFixture('common-ground/cluster-texts-success.json');
export const clusterTextsEmpty = loadFixture('common-ground/cluster-texts-empty.json');
export const identifyValuesSuccess = loadFixture('common-ground/identify-values-success.json');

// Moral foundations fixtures
export const analyzeValuesSuccess = loadFixture('moral-foundations/analyze-values-success.json');
export const analyzeValuesMixed = loadFixture('moral-foundations/analyze-values-mixed.json');
export const analyzeValuesNoMatch = loadFixture('moral-foundations/analyze-values-no-match.json');

// Error fixtures
export const timeoutError = loadFixture('errors/timeout.json');
export const rateLimitError = loadFixture('errors/rate-limit.json');
export const authFailure = loadFixture('errors/auth-failure.json');
export const malformedResponse = loadFixture('errors/malformed-response.json');

// Grouped exports for convenience
export const commonGround = {
  clusterTextsSuccess,
  clusterTextsEmpty,
  identifyValuesSuccess,
};

export const moralFoundations = {
  analyzeValuesSuccess,
  analyzeValuesMixed,
  analyzeValuesNoMatch,
};

export const errors = {
  timeoutError,
  rateLimitError,
  authFailure,
  malformedResponse,
};
