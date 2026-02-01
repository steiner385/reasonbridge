/**
 * Test fixtures for moderation service integration tests
 * Contains mock data for testing flag-to-action workflows
 */

// UUIDs for test entities
export const testTopicId = '550e8400-e29b-41d4-a716-446655440000';
export const testResponseId = '950e8400-e29b-41d4-a716-446655440000';
export const testUserId = '850e8400-e29b-41d4-a716-446655440001';
export const testModeratorId = '850e8400-e29b-41d4-a716-446655440002';
export const testModerationActionId = '960e8400-e29b-41d4-a716-446655440000';
export const testAppealId = '970e8400-e29b-41d4-a716-446655440000';

// Mock user data
export const mockUser = {
  id: testUserId,
  displayName: 'Test User',
  email: 'test@example.com',
  createdAt: new Date('2026-01-17'),
};

export const mockModerator = {
  id: testModeratorId,
  displayName: 'Moderator User',
  email: 'moderator@example.com',
  createdAt: new Date('2026-01-15'),
};

// Mock response data
export const mockResponse = {
  id: testResponseId,
  authorId: testUserId,
  topicId: testTopicId,
  content: 'This is a test response that contains concerning content',
  createdAt: new Date('2026-01-17'),
  updatedAt: new Date('2026-01-17'),
};

// AI recommendation request
export const mockAiRecommendationRequest = {
  targetType: 'response' as const,
  targetId: testResponseId,
  actionType: 'warn' as const,
  reasoning: 'Content contains ad hominem attacks that undermine constructive discourse',
  confidence: 0.87,
  analysisDetails: {
    flaggedContent: 'This is a test response that contains concerning content',
    violatedGuideline: 'Respectful Discourse Policy',
    priorActions: 0,
  },
};

// Create action request (moderator-initiated)
export const mockCreateActionRequest = {
  targetType: 'response' as const,
  targetId: testResponseId,
  actionType: 'remove' as const,
  reasoning: 'Content violates community guidelines and must be removed for safety',
};

// Appeal request
export const mockCreateAppealRequest = {
  reason:
    'I believe this action was taken in error. My response was intended as constructive criticism and not as a personal attack.',
};

// Review appeal request (upheld)
export const mockReviewAppealUpheldRequest = {
  decision: 'upheld' as const,
  reasoning:
    'Upon review, the content was constructive criticism, not ad hominem. Action reversed.',
};

// Review appeal request (denied)
export const mockReviewAppealDeniedRequest = {
  decision: 'denied' as const,
  reasoning:
    'The original moderation decision was correct. The content clearly violated guidelines.',
};

// Create mock moderation action for database
export function createMockModerationAction(
  overrides: Partial<{
    id: string;
    targetType: 'RESPONSE' | 'USER' | 'TOPIC';
    targetId: string;
    actionType: 'EDUCATE' | 'WARN' | 'HIDE' | 'REMOVE' | 'SUSPEND' | 'BAN';
    severity: 'NON_PUNITIVE' | 'CONSEQUENTIAL';
    status: 'PENDING' | 'ACTIVE' | 'APPEALED' | 'REVERSED';
    reasoning: string;
    aiRecommended: boolean;
    aiConfidence: number | null;
    approvedById: string | null;
    approvedAt: Date | null;
    executedAt: Date | null;
    createdAt: Date;
  }> = {},
) {
  const now = new Date();
  return {
    id: testModerationActionId,
    targetType: 'RESPONSE' as const,
    targetId: testResponseId,
    actionType: 'WARN' as const,
    severity: 'CONSEQUENTIAL' as const,
    status: 'PENDING' as const,
    reasoning: 'Test reasoning for moderation action',
    aiRecommended: true,
    aiConfidence: 0.85,
    approvedById: null,
    approvedAt: null,
    executedAt: null,
    createdAt: now,
    isTemporary: false,
    banDurationDays: null,
    expiresAt: null,
    liftedAt: null,
    ...overrides,
  };
}

// Create mock appeal for database
export function createMockAppeal(
  overrides: Partial<{
    id: string;
    moderationActionId: string;
    appellantId: string;
    reason: string;
    status: 'PENDING' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED';
    reviewerId: string | null;
    decisionReasoning: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  }> = {},
) {
  const now = new Date();
  return {
    id: testAppealId,
    moderationActionId: testModerationActionId,
    appellantId: testUserId,
    reason: 'I believe this action was taken in error.',
    status: 'PENDING' as const,
    reviewerId: null,
    decisionReasoning: null,
    createdAt: now,
    resolvedAt: null,
    ...overrides,
  };
}
