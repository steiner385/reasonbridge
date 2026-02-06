/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Common Ground Analysis Definitions
 *
 * Defines 21 common ground analyses across topics.
 * Shows AI-identified areas of agreement, misunderstandings, and genuine disagreements.
 */

import { DEMO_TOPIC_IDS, generateCommonGroundId } from './demo-ids';

interface AgreementZone {
  proposition: string;
  agreementPercentage: number;
  supportingEvidence: string[];
  participantCount: number;
}

interface Misunderstanding {
  topic: string;
  interpretations: { interpretation: string; participantCount: number }[];
  clarification: string;
}

interface GenuineDisagreement {
  proposition: string;
  viewpoints: {
    position: string;
    participantCount: number;
    reasoning: string[];
  }[];
  underlyingValues: string[];
}

export interface DemoCommonGroundAnalysis {
  id: string;
  topicId: string;
  version: number;
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  modelVersion: string;
}

// Topic number mapping
const TOPIC_NUMBERS: Record<string, number> = {
  [DEMO_TOPIC_IDS.CONGESTION_PRICING]: 101,
  [DEMO_TOPIC_IDS.AI_DISCLOSURE]: 102,
  [DEMO_TOPIC_IDS.STANDARDIZED_TESTING]: 103,
  [DEMO_TOPIC_IDS.RETURN_TO_OFFICE]: 104,
  [DEMO_TOPIC_IDS.PREVENTIVE_CARE]: 105,
  [DEMO_TOPIC_IDS.AGE_VERIFICATION]: 106,
  [DEMO_TOPIC_IDS.MANDATORY_VOTING]: 107,
  [DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE]: 108,
  [DEMO_TOPIC_IDS.PLASTIC_BAN]: 109,
  [DEMO_TOPIC_IDS.GOF_OVERSIGHT]: 110,
};

export const DEMO_COMMON_GROUND: DemoCommonGroundAnalysis[] = [
  // Topic 1: Congestion Pricing - 2 analyses
  {
    id: generateCommonGroundId(101, 1),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    version: 1,
    agreementZones: [
      {
        proposition: 'Traffic congestion is a real problem that affects quality of life',
        agreementPercentage: 92,
        supportingEvidence: ['Both supporters and opponents acknowledge the problem'],
        participantCount: 5,
      },
      {
        proposition: 'Any solution should include protections for low-income commuters',
        agreementPercentage: 78,
        supportingEvidence: ['Equity concerns raised by multiple participants'],
        participantCount: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'Revenue allocation',
        interpretations: [
          { interpretation: 'Revenue goes to general fund', participantCount: 2 },
          { interpretation: 'Revenue must fund transit', participantCount: 3 },
        ],
        clarification: 'Most successful implementations dedicate revenue to transit improvements',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Whether pricing should come before or after transit improvements',
        viewpoints: [
          {
            position: 'Build transit first',
            participantCount: 2,
            reasoning: ['Alternatives needed before penalties'],
          },
          {
            position: 'Pricing funds transit',
            participantCount: 3,
            reasoning: ['Revenue enables investment'],
          },
        ],
        underlyingValues: ['Fairness to current commuters', 'Urgency of action'],
      },
    ],
    overallConsensusScore: 0.65,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(101, 2),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    version: 2,
    agreementZones: [
      {
        proposition: 'Implementation details matter more than the principle',
        agreementPercentage: 85,
        supportingEvidence: ['Discussion shifted from yes/no to how'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.72,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 2: AI Disclosure - 3 analyses
  {
    id: generateCommonGroundId(102, 1),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    version: 1,
    agreementZones: [
      {
        proposition: 'Transparency about AI use is generally valuable',
        agreementPercentage: 88,
        supportingEvidence: ['Even opponents support some disclosure'],
        participantCount: 5,
      },
      {
        proposition: 'Simple AI tools like spell checkers should be exempt',
        agreementPercentage: 82,
        supportingEvidence: ['Consensus on proportionality'],
        participantCount: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'What counts as AI-generated content',
        interpretations: [
          { interpretation: 'Any AI involvement requires disclosure', participantCount: 1 },
          {
            interpretation: 'Only substantial AI generation requires disclosure',
            participantCount: 4,
          },
        ],
        clarification: 'Need clear definition of substantial generation vs. assistance',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Impact on innovation',
        viewpoints: [
          {
            position: 'Disclosure stifles innovation',
            participantCount: 1,
            reasoning: ['Compliance costs', 'Competitive disadvantage'],
          },
          {
            position: 'Disclosure enables trust',
            participantCount: 4,
            reasoning: ['Trust drives adoption', 'Market differentiation'],
          },
        ],
        underlyingValues: ['Innovation speed', 'Consumer trust'],
      },
    ],
    overallConsensusScore: 0.73,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 8,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(102, 2),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    version: 2,
    agreementZones: [
      {
        proposition: 'News and journalism should have stricter disclosure requirements',
        agreementPercentage: 90,
        supportingEvidence: ['Democratic discourse concerns unite participants'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.78,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 8,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(102, 3),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    version: 3,
    agreementZones: [
      {
        proposition: 'Creative industries deserve special consideration',
        agreementPercentage: 75,
        supportingEvidence: ['Concern for human artists shared across viewpoints'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Whether AI art is valid creative expression',
        viewpoints: [
          {
            position: 'AI art has value',
            participantCount: 2,
            reasoning: ['Tool like any other', 'Enables new creativity'],
          },
          {
            position: 'Human creativity is special',
            participantCount: 3,
            reasoning: ['Intent matters', 'Meaning from experience'],
          },
        ],
        underlyingValues: ['Definition of creativity', 'Value of human expression'],
      },
    ],
    overallConsensusScore: 0.68,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 8,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 3: Standardized Testing - 2 analyses
  {
    id: generateCommonGroundId(103, 1),
    topicId: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    version: 1,
    agreementZones: [
      {
        proposition: 'Current high-stakes testing has significant problems',
        agreementPercentage: 80,
        supportingEvidence: ['Critics and supporters agree on flaws'],
        participantCount: 4,
      },
    ],
    misunderstandings: [
      {
        topic: 'Purpose of testing',
        interpretations: [
          { interpretation: 'Accountability for schools', participantCount: 2 },
          { interpretation: 'Student placement and support', participantCount: 2 },
        ],
        clarification: 'Tests can serve multiple purposes but design tradeoffs exist',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Whether any standardized testing is beneficial',
        viewpoints: [
          {
            position: 'Abolish standardized tests',
            participantCount: 2,
            reasoning: ['Harms outweigh benefits'],
          },
          {
            position: 'Reform but keep testing',
            participantCount: 2,
            reasoning: ['Need some objective measure'],
          },
        ],
        underlyingValues: ['Individual assessment', 'System accountability'],
      },
    ],
    overallConsensusScore: 0.55,
    participantCountAtGeneration: 4,
    responseCountAtGeneration: 4,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(103, 2),
    topicId: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    version: 2,
    agreementZones: [
      {
        proposition: 'Lower-stakes diagnostic testing could be beneficial',
        agreementPercentage: 75,
        supportingEvidence: ['Compromise position gaining traction'],
        participantCount: 4,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.62,
    participantCountAtGeneration: 4,
    responseCountAtGeneration: 4,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 4: Return to Office - 3 analyses
  {
    id: generateCommonGroundId(104, 1),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    version: 1,
    agreementZones: [
      {
        proposition: 'Different roles may need different arrangements',
        agreementPercentage: 85,
        supportingEvidence: ['One-size-fits-all criticized by both sides'],
        participantCount: 5,
      },
      {
        proposition: 'Blanket mandates ignore individual circumstances',
        agreementPercentage: 78,
        supportingEvidence: ['Flexibility valued across positions'],
        participantCount: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'What productivity means',
        interpretations: [
          { interpretation: 'Hours and presence', participantCount: 2 },
          { interpretation: 'Output and results', participantCount: 3 },
        ],
        clarification: 'Different metrics lead to different conclusions',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Importance of spontaneous collaboration',
        viewpoints: [
          {
            position: 'Essential for innovation',
            participantCount: 2,
            reasoning: ['Hallway conversations spark ideas'],
          },
          {
            position: 'Overrated and interruptive',
            participantCount: 3,
            reasoning: ['Deep work matters more'],
          },
        ],
        underlyingValues: ['Collaboration style', 'Focus time'],
      },
    ],
    overallConsensusScore: 0.62,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 7,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(104, 2),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    version: 2,
    agreementZones: [
      {
        proposition: 'Hybrid models offer a reasonable middle ground',
        agreementPercentage: 82,
        supportingEvidence: ['Compromise position gaining support'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.71,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 7,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(104, 3),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    version: 3,
    agreementZones: [
      {
        proposition: 'Junior employees may benefit more from in-person mentorship',
        agreementPercentage: 72,
        supportingEvidence: ['Career development concerns shared'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.68,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 7,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 5: Preventive Care - 2 analyses
  {
    id: generateCommonGroundId(105, 1),
    topicId: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    version: 1,
    agreementZones: [
      {
        proposition: 'Evidence-based preventive care has long-term benefits',
        agreementPercentage: 90,
        supportingEvidence: ['Strong consensus on value'],
        participantCount: 5,
      },
      {
        proposition: 'Coverage should be tied to clinical evidence',
        agreementPercentage: 85,
        supportingEvidence: ['Agreement on data-driven approach'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Scope of what counts as preventive',
        viewpoints: [
          {
            position: 'Broad definition',
            participantCount: 3,
            reasoning: ['Upstream interventions matter'],
          },
          {
            position: 'Narrow, proven interventions only',
            participantCount: 2,
            reasoning: ['Prevent mission creep'],
          },
        ],
        underlyingValues: ['Comprehensive vs. focused care'],
      },
    ],
    overallConsensusScore: 0.82,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(105, 2),
    topicId: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    version: 2,
    agreementZones: [
      {
        proposition: 'Free preventive care improves health equity',
        agreementPercentage: 85,
        supportingEvidence: ['Equity argument resonated across positions'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.85,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 6: Age Verification - 2 analyses
  {
    id: generateCommonGroundId(106, 1),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    version: 1,
    agreementZones: [
      {
        proposition: 'Children need some form of online protection',
        agreementPercentage: 95,
        supportingEvidence: ['Universal agreement on child safety'],
        participantCount: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'Technical feasibility of privacy-preserving verification',
        interpretations: [
          { interpretation: 'Technology not ready', participantCount: 2 },
          { interpretation: 'Solutions exist today', participantCount: 3 },
        ],
        clarification: 'Privacy-preserving methods exist but have tradeoffs',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Who should be responsible for child online safety',
        viewpoints: [
          {
            position: 'Parents primarily',
            participantCount: 2,
            reasoning: ['Family autonomy', 'Government overreach'],
          },
          {
            position: 'Platforms and government',
            participantCount: 3,
            reasoning: ['Parents cant do it alone'],
          },
        ],
        underlyingValues: ['Parental rights', 'Societal responsibility'],
      },
    ],
    overallConsensusScore: 0.58,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 6,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(106, 2),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    version: 2,
    agreementZones: [
      {
        proposition: 'Multi-pronged approach combining parental tools and platform requirements',
        agreementPercentage: 78,
        supportingEvidence: ['Compromise position emerging'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.68,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 6,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 7: Mandatory Voting - 1 analysis (contentious)
  {
    id: generateCommonGroundId(107, 1),
    topicId: DEMO_TOPIC_IDS.MANDATORY_VOTING,
    version: 1,
    agreementZones: [
      {
        proposition: 'Higher voter turnout is generally desirable',
        agreementPercentage: 70,
        supportingEvidence: ['Goal shared even if means differ'],
        participantCount: 4,
      },
    ],
    misunderstandings: [
      {
        topic: 'What mandatory voting means in practice',
        interpretations: [
          { interpretation: 'Must vote for a candidate', participantCount: 1 },
          { interpretation: 'Must show up, can submit blank ballot', participantCount: 3 },
        ],
        clarification: 'Most mandatory voting systems allow blank ballots',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Whether voting is a duty or a right that includes abstention',
        viewpoints: [
          {
            position: 'Civic duty like jury duty',
            participantCount: 2,
            reasoning: ['Democracy requires participation'],
          },
          {
            position: 'Right includes freedom not to vote',
            participantCount: 2,
            reasoning: ['Compulsion isnt real engagement'],
          },
        ],
        underlyingValues: ['Civic duty', 'Individual liberty'],
      },
    ],
    overallConsensusScore: 0.42,
    participantCountAtGeneration: 4,
    responseCountAtGeneration: 4,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 8: Product AI Disclosure - 2 analyses
  {
    id: generateCommonGroundId(108, 1),
    topicId: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    version: 1,
    agreementZones: [
      {
        proposition: 'High-stakes AI applications need transparency',
        agreementPercentage: 88,
        supportingEvidence: ['Strong consensus on consequential uses'],
        participantCount: 5,
      },
      {
        proposition: 'Not every AI use requires disclosure',
        agreementPercentage: 82,
        supportingEvidence: ['Agreement on proportionality'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Whether disclosure alone is sufficient',
        viewpoints: [
          {
            position: 'Transparency is enough',
            participantCount: 1,
            reasoning: ['Market will respond'],
          },
          {
            position: 'Need accountability mechanisms too',
            participantCount: 4,
            reasoning: ['Disclosure without consequence insufficient'],
          },
        ],
        underlyingValues: ['Market solutions', 'Regulatory oversight'],
      },
    ],
    overallConsensusScore: 0.75,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(108, 2),
    topicId: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    version: 2,
    agreementZones: [
      {
        proposition: 'Consumers deserve to know when AI affects decisions about them',
        agreementPercentage: 90,
        supportingEvidence: ['Consumer rights argument compelling to all'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.8,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 9: Plastic Ban - 2 analyses (resolved topic)
  {
    id: generateCommonGroundId(109, 1),
    topicId: DEMO_TOPIC_IDS.PLASTIC_BAN,
    version: 1,
    agreementZones: [
      {
        proposition: 'Single-use plastics cause significant environmental harm',
        agreementPercentage: 95,
        supportingEvidence: ['Scientific consensus accepted'],
        participantCount: 3,
      },
      {
        proposition: 'Alternatives exist for most use cases',
        agreementPercentage: 85,
        supportingEvidence: ['Regional ban success stories'],
        participantCount: 3,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Implementation timeline',
        viewpoints: [
          {
            position: 'Immediate ban',
            participantCount: 1,
            reasoning: ['Urgency of environmental crisis'],
          },
          {
            position: 'Phased transition',
            participantCount: 2,
            reasoning: ['Industry adaptation time'],
          },
        ],
        underlyingValues: ['Environmental urgency', 'Economic transition'],
      },
    ],
    overallConsensusScore: 0.88,
    participantCountAtGeneration: 3,
    responseCountAtGeneration: 3,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(109, 2),
    topicId: DEMO_TOPIC_IDS.PLASTIC_BAN,
    version: 2,
    agreementZones: [
      {
        proposition: 'Phased ban with industry support is the way forward',
        agreementPercentage: 92,
        supportingEvidence: ['Consensus reached'],
        participantCount: 3,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.92,
    participantCountAtGeneration: 3,
    responseCountAtGeneration: 3,
    modelVersion: 'claude-3-5-sonnet',
  },

  // Topic 10: GOF Research Oversight - 2 analyses
  {
    id: generateCommonGroundId(110, 1),
    topicId: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    version: 1,
    agreementZones: [
      {
        proposition: 'Biosecurity risks are real and significant',
        agreementPercentage: 88,
        supportingEvidence: ['Risk acknowledged across positions'],
        participantCount: 5,
      },
      {
        proposition: 'Some oversight is necessary',
        agreementPercentage: 85,
        supportingEvidence: ['No one advocates for zero oversight'],
        participantCount: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'Current state of oversight',
        interpretations: [
          { interpretation: 'Adequate oversight exists', participantCount: 1 },
          { interpretation: 'Current oversight is insufficient', participantCount: 4 },
        ],
        clarification: 'Oversight varies significantly by country and institution',
      },
    ],
    genuineDisagreements: [
      {
        proposition: 'Value of gain-of-function research',
        viewpoints: [
          {
            position: 'Benefits outweigh risks',
            participantCount: 2,
            reasoning: ['Pandemic preparedness', 'Scientific knowledge'],
          },
          {
            position: 'Risks too high for any benefit',
            participantCount: 3,
            reasoning: ['Existential risk', 'Alternatives exist'],
          },
        ],
        underlyingValues: ['Scientific freedom', 'Precautionary principle'],
      },
    ],
    overallConsensusScore: 0.62,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },
  {
    id: generateCommonGroundId(110, 2),
    topicId: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    version: 2,
    agreementZones: [
      {
        proposition: 'International coordination would improve safety',
        agreementPercentage: 82,
        supportingEvidence: ['Shared concern about gaps in oversight'],
        participantCount: 5,
      },
    ],
    misunderstandings: [],
    genuineDisagreements: [],
    overallConsensusScore: 0.7,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 5,
    modelVersion: 'claude-3-5-sonnet',
  },
];

/**
 * Get common ground analyses for a specific topic
 */
export function getCommonGroundByTopic(topicId: string): DemoCommonGroundAnalysis[] {
  return DEMO_COMMON_GROUND.filter((cg) => cg.topicId === topicId);
}

/**
 * Get the latest common ground analysis for a topic
 */
export function getLatestCommonGround(topicId: string): DemoCommonGroundAnalysis | undefined {
  const analyses = getCommonGroundByTopic(topicId);
  return analyses.reduce(
    (latest, current) => (current.version > (latest?.version || 0) ? current : latest),
    undefined as DemoCommonGroundAnalysis | undefined,
  );
}

export default DEMO_COMMON_GROUND;
