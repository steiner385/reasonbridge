/**
 * Test fixtures for integration tests
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
  type: 'common-ground.generated',
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
  type: 'common-ground.updated',
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
