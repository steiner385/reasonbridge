/**
 * Test fixtures for integration tests
 * Note: Using 'as any' for event types due to schema evolution.
 * These fixtures test handler behavior, not type compliance.
 */

export const testTopicId = '550e8400-e29b-41d4-a716-446655440000';
export const testCreatorId = '750e8400-e29b-41d4-a716-446655440000';
export const testUserId1 = '850e8400-e29b-41d4-a716-446655440001';
export const testUserId2 = '850e8400-e29b-41d4-a716-446655440002';

export const mockTopic = {
  id: testTopicId,
  title: 'Test Discussion Topic',
  description: 'A test topic for common ground analysis',
  creatorId: testCreatorId,
  participantCount: 3,
  createdAt: new Date('2026-01-17'),
  updatedAt: new Date('2026-01-17'),
};

export const mockCommonGroundGeneratedEvent = {
  type: 'common-ground.generated' as const,
  timestamp: new Date().toISOString(),
  payload: {
    topicId: testTopicId,
    version: 1,
    agreementZones: [
      {
        description: 'Both parties agree on the importance of environmental protection',
        propositions: ['Proposition 1', 'Proposition 2'],
      },
    ],
    misunderstandings: [
      {
        description: 'Confusion about policy implementation methods',
        participants: [testUserId1, testUserId2],
      },
    ],
    genuineDisagreements: [
      {
        description: 'Different views on economic trade-offs',
        perspectives: ['Market-driven approach', 'Regulated approach'],
      },
    ],
    overallConsensusScore: 0.65,
  },
};

export const mockCommonGroundUpdatedEvent = {
  type: 'common-ground.updated' as const,
  timestamp: new Date().toISOString(),
  payload: {
    topicId: testTopicId,
    previousVersion: 1,
    newVersion: 2,
    changes: {
      newAgreementZones: 1,
      resolvedMisunderstandings: 1,
      newMisunderstandings: 0,
      newDisagreements: 0,
      consensusScoreChange: 0.08,
    },
    newAnalysis: {
      agreementZones: [
        {
          description: 'Both parties agree on the importance of environmental protection',
          propositions: ['Proposition 1', 'Proposition 2'],
        },
        {
          description: 'Both support implementation monitoring',
          propositions: ['Proposition 3'],
        },
      ],
      misunderstandings: [],
      genuineDisagreements: [
        {
          description: 'Different views on economic trade-offs',
          perspectives: ['Market-driven approach', 'Regulated approach'],
        },
      ],
      overallConsensusScore: 0.73,
    },
    reason: 'threshold_reached',
  },
};

export const testResponseId = '950e8400-e29b-41d4-a716-446655440000';
export const testModerationActionId = '960e8400-e29b-41d4-a716-446655440000';

export const mockResponse = {
  id: testResponseId,
  authorId: testUserId1,
  topicId: testTopicId,
  content: 'This is a test response that contains concerning content',
  createdAt: new Date('2026-01-17'),
  updatedAt: new Date('2026-01-17'),
};

export const mockUser = {
  id: testUserId1,
  displayName: 'Test User',
  email: 'test@example.com',
  createdAt: new Date('2026-01-17'),
};

export const mockModerationActionRequestedEvent = {
  type: 'moderation.action.requested',
  timestamp: new Date().toISOString(),
  payload: {
    targetType: 'response' as const,
    targetId: testResponseId,
    actionType: 'warn' as const,
    severity: 'consequential' as const,
    reasoning: 'Content violates community guidelines on respectful discourse',
    aiConfidence: 0.92,
    violationContext: {
      flaggedContent: 'This is a test response that contains concerning content',
      violatedGuideline: 'Respectful Discourse Policy',
      priorActions: 1,
    },
    requestedAt: new Date().toISOString(),
  },
};

export const mockUserTrustUpdatedEvent = {
  type: 'user.trust.updated',
  timestamp: new Date().toISOString(),
  payload: {
    userId: testUserId1,
    previousScores: {
      ability: 0.75,
      benevolence: 0.8,
      integrity: 0.85,
    },
    newScores: {
      ability: 0.72,
      benevolence: 0.78,
      integrity: 0.81,
    },
    reason: 'moderation_action' as const,
    moderationActionId: testModerationActionId,
    updatedAt: new Date().toISOString(),
  },
};
