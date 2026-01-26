import type {
  AgreementZone,
  Proposition,
  Misunderstanding,
  Disagreement,
  DivergencePoint,
  DivergenceViewpoint,
} from '../../src/types/common-ground';

/**
 * Build a test Proposition
 */
export function buildProposition(overrides?: Partial<Proposition>): Proposition {
  return {
    id: 'prop-test-1',
    text: 'Climate change requires immediate action',
    agreementPercentage: 75,
    supportingParticipants: ['user-1', 'user-2', 'user-3'],
    opposingParticipants: ['user-4'],
    neutralParticipants: [],
    ...overrides,
  };
}

/**
 * Build a test AgreementZone
 */
export function buildAgreementZone(overrides?: Partial<AgreementZone>): AgreementZone {
  return {
    id: 'agreement-zone-1',
    title: 'Climate Action Consensus',
    description: 'Agreement on need for climate action',
    propositions: [buildProposition()],
    participantCount: 10,
    consensusLevel: 'high',
    ...overrides,
  };
}

/**
 * Build a test Misunderstanding
 */
export function buildMisunderstanding(overrides?: Partial<Misunderstanding>): Misunderstanding {
  return {
    id: 'misunderstanding-1',
    term: 'renewable energy',
    definitions: [
      {
        definition: 'Solar and wind power only',
        participants: ['user-1', 'user-2'],
      },
      {
        definition: 'All non-fossil fuel sources including nuclear',
        participants: ['user-3', 'user-4'],
      },
    ],
    clarificationSuggestion: 'Clarify whether nuclear is included in "renewable energy"',
    ...overrides,
  };
}

/**
 * Build a test DivergenceViewpoint
 */
export function buildDivergenceViewpoint(
  overrides?: Partial<DivergenceViewpoint>,
): DivergenceViewpoint {
  return {
    position: 'Immediate transition needed',
    participantCount: 6,
    percentage: 60,
    reasoning: ['Climate urgency', 'Technology is ready'],
    ...overrides,
  };
}

/**
 * Build a test DivergencePoint (for genuineDisagreements in common ground)
 */
export function buildDivergencePoint(overrides?: Partial<DivergencePoint>): DivergencePoint {
  return {
    proposition: 'Transition timeline to 100% renewable energy',
    propositionId: 'prop-divergence-1',
    viewpoints: [
      buildDivergenceViewpoint({
        position: 'Immediate transition (within 10 years)',
        participantCount: 4,
        percentage: 40,
        reasoning: ['Climate emergency', 'Tech is ready now'],
      }),
      buildDivergenceViewpoint({
        position: 'Gradual transition (20-30 years)',
        participantCount: 6,
        percentage: 60,
        reasoning: ['Economic stability', 'Infrastructure needs time'],
      }),
    ],
    polarizationScore: 0.65,
    totalParticipants: 10,
    underlyingValues: ['Environmental protection vs Economic stability'],
    ...overrides,
  };
}

/**
 * Build a test Disagreement
 */
export function buildDisagreement(overrides?: Partial<Disagreement>): Disagreement {
  return {
    id: 'disagreement-1',
    topic: 'Economic transition timeline',
    description: 'Disagreement on timeline for renewable energy transition',
    positions: [
      {
        stance: 'Immediate transition',
        reasoning: 'Climate urgency demands immediate action',
        participants: ['user-1', 'user-2', 'user-3', 'user-4'],
        underlyingValue: 'Environmental protection',
        underlyingAssumption: 'Technology is ready now',
      },
      {
        stance: 'Gradual transition',
        reasoning: 'Economic stability requires gradual change',
        participants: ['user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'],
        underlyingValue: 'Economic security',
        underlyingAssumption: 'Infrastructure needs time to adapt',
      },
    ],
    moralFoundations: ['care-harm', 'liberty-oppression'],
    ...overrides,
  };
}

/**
 * Build CommonGroundGeneratedPayload for WebSocket events
 */
export function buildCommonGroundGeneratedPayload(overrides?: {
  topicId?: string;
  version?: number;
  agreementZones?: AgreementZone[];
  misunderstandings?: Misunderstanding[];
  genuineDisagreements?: Disagreement[];
  overallConsensusScore?: number;
}): any {
  return {
    topicId: overrides?.topicId || 'topic-test-1',
    version: overrides?.version || 1,
    analysis: {
      agreementZones: overrides?.agreementZones || [buildAgreementZone()],
      misunderstandings: overrides?.misunderstandings || [buildMisunderstanding()],
      genuineDisagreements: overrides?.genuineDisagreements || [buildDisagreement()],
      overallConsensusScore: overrides?.overallConsensusScore || 0.65,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build CommonGroundUpdatedPayload for WebSocket events
 */
export function buildCommonGroundUpdatedPayload(overrides?: {
  topicId?: string;
  previousVersion?: number;
  newVersion?: number;
  agreementZones?: AgreementZone[];
  misunderstandings?: Misunderstanding[];
  genuineDisagreements?: Disagreement[];
  overallConsensusScore?: number;
  changes?: {
    newAgreementZones?: number;
    resolvedMisunderstandings?: number;
    newMisunderstandings?: number;
    newDisagreements?: number;
    consensusScoreChange?: number;
  };
}): any {
  const analysis = {
    agreementZones: overrides?.agreementZones || [buildAgreementZone()],
    misunderstandings: overrides?.misunderstandings || [buildMisunderstanding()],
    genuineDisagreements: overrides?.genuineDisagreements || [buildDisagreement()],
    overallConsensusScore: overrides?.overallConsensusScore || 0.7,
  };

  return {
    topicId: overrides?.topicId || 'topic-test-1',
    previousVersion: overrides?.previousVersion || 1,
    newVersion: overrides?.newVersion || 2,
    changes: {
      newAgreementZones: overrides?.changes?.newAgreementZones || 1,
      resolvedMisunderstandings: overrides?.changes?.resolvedMisunderstandings || 0,
      newMisunderstandings: overrides?.changes?.newMisunderstandings || 0,
      newDisagreements: overrides?.changes?.newDisagreements || 1,
      consensusScoreChange: overrides?.changes?.consensusScoreChange || 0.05,
    },
    analysis,
    reason: 'threshold_reached' as const,
    timestamp: new Date().toISOString(),
  };
}
