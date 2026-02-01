/**
 * Demo Proposition Definitions
 *
 * Defines 33 propositions across 10 topics.
 * Propositions represent key claims that users can align with.
 */

import { DEMO_TOPIC_IDS, generatePropositionId } from './demo-ids';

type PropositionSource = 'AI_IDENTIFIED' | 'USER_CREATED';
type PropositionStatus = 'ACTIVE' | 'MERGED' | 'ARCHIVED';

export interface DemoProposition {
  id: string;
  topicId: string;
  statement: string;
  source: PropositionSource;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;
  status: PropositionStatus;
}

// Topic number mapping for ID generation
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

export const DEMO_PROPOSITIONS: DemoProposition[] = [
  // Topic 1: Congestion Pricing (4 propositions)
  {
    id: generatePropositionId(101, 1),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    statement: 'Congestion pricing effectively reduces urban traffic volume',
    source: 'AI_IDENTIFIED',
    supportCount: 12,
    opposeCount: 5,
    nuancedCount: 3,
    consensusScore: 0.72,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(101, 2),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    statement: 'Congestion pricing disproportionately burdens low-income workers',
    source: 'USER_CREATED',
    supportCount: 8,
    opposeCount: 9,
    nuancedCount: 3,
    consensusScore: 0.45,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(101, 3),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    statement: 'Revenue from congestion pricing should fund public transit improvements',
    source: 'AI_IDENTIFIED',
    supportCount: 15,
    opposeCount: 2,
    nuancedCount: 3,
    consensusScore: 0.68,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(101, 4),
    topicId: DEMO_TOPIC_IDS.CONGESTION_PRICING,
    statement: 'Public transit alternatives must exist before implementing congestion pricing',
    source: 'USER_CREATED',
    supportCount: 10,
    opposeCount: 6,
    nuancedCount: 4,
    consensusScore: 0.55,
    status: 'ACTIVE',
  },

  // Topic 2: AI Disclosure (5 propositions)
  {
    id: generatePropositionId(102, 1),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    statement: 'AI-generated news content should require mandatory disclosure labels',
    source: 'AI_IDENTIFIED',
    supportCount: 18,
    opposeCount: 3,
    nuancedCount: 4,
    consensusScore: 0.81,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(102, 2),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    statement: 'AI assistance tools (spell check, grammar) should be exempt from disclosure',
    source: 'USER_CREATED',
    supportCount: 14,
    opposeCount: 4,
    nuancedCount: 7,
    consensusScore: 0.65,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(102, 3),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    statement: 'Disclosure requirements would stifle innovation in AI development',
    source: 'AI_IDENTIFIED',
    supportCount: 5,
    opposeCount: 15,
    nuancedCount: 5,
    consensusScore: 0.38,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(102, 4),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    statement: 'Human artists deserve protection from unlabeled AI-generated competition',
    source: 'USER_CREATED',
    supportCount: 12,
    opposeCount: 6,
    nuancedCount: 7,
    consensusScore: 0.58,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(102, 5),
    topicId: DEMO_TOPIC_IDS.AI_DISCLOSURE,
    statement: 'AI disclosure helps consumers make informed decisions',
    source: 'AI_IDENTIFIED',
    supportCount: 16,
    opposeCount: 4,
    nuancedCount: 5,
    consensusScore: 0.72,
    status: 'ACTIVE',
  },

  // Topic 3: Standardized Testing (3 propositions)
  {
    id: generatePropositionId(103, 1),
    topicId: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    statement: 'Standardized tests are culturally biased and disadvantage minority students',
    source: 'AI_IDENTIFIED',
    supportCount: 9,
    opposeCount: 7,
    nuancedCount: 4,
    consensusScore: 0.52,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(103, 2),
    topicId: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    statement: 'Some form of standardized assessment is necessary for educational accountability',
    source: 'USER_CREATED',
    supportCount: 11,
    opposeCount: 6,
    nuancedCount: 3,
    consensusScore: 0.58,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(103, 3),
    topicId: DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    statement: 'Teaching to the test reduces educational quality',
    source: 'AI_IDENTIFIED',
    supportCount: 12,
    opposeCount: 5,
    nuancedCount: 3,
    consensusScore: 0.65,
    status: 'ACTIVE',
  },

  // Topic 4: Return to Office (4 propositions)
  {
    id: generatePropositionId(104, 1),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    statement: 'Remote workers are equally or more productive than office workers',
    source: 'AI_IDENTIFIED',
    supportCount: 14,
    opposeCount: 8,
    nuancedCount: 3,
    consensusScore: 0.61,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(104, 2),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    statement: 'In-person collaboration is essential for innovation and creativity',
    source: 'USER_CREATED',
    supportCount: 10,
    opposeCount: 9,
    nuancedCount: 6,
    consensusScore: 0.48,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(104, 3),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    statement: 'Hybrid work models offer the best of both remote and office work',
    source: 'AI_IDENTIFIED',
    supportCount: 18,
    opposeCount: 4,
    nuancedCount: 3,
    consensusScore: 0.69,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(104, 4),
    topicId: DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    statement: 'RTO mandates harm employee morale and increase turnover',
    source: 'USER_CREATED',
    supportCount: 13,
    opposeCount: 10,
    nuancedCount: 2,
    consensusScore: 0.41,
    status: 'ACTIVE',
  },

  // Topic 5: Preventive Care (3 propositions)
  {
    id: generatePropositionId(105, 1),
    topicId: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    statement: 'Fully covered preventive care reduces long-term healthcare costs',
    source: 'AI_IDENTIFIED',
    supportCount: 17,
    opposeCount: 2,
    nuancedCount: 6,
    consensusScore: 0.85,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(105, 2),
    topicId: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    statement: 'Free preventive care improves health equity for low-income populations',
    source: 'USER_CREATED',
    supportCount: 15,
    opposeCount: 3,
    nuancedCount: 7,
    consensusScore: 0.75,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(105, 3),
    topicId: DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    statement: 'Preventive care coverage should be limited to evidence-based interventions',
    source: 'AI_IDENTIFIED',
    supportCount: 14,
    opposeCount: 5,
    nuancedCount: 6,
    consensusScore: 0.68,
    status: 'ACTIVE',
  },

  // Topic 6: Age Verification (4 propositions)
  {
    id: generatePropositionId(106, 1),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    statement: 'Children need protection from harmful online content',
    source: 'AI_IDENTIFIED',
    supportCount: 19,
    opposeCount: 1,
    nuancedCount: 5,
    consensusScore: 0.71,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(106, 2),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    statement: 'Age verification creates unacceptable privacy risks',
    source: 'USER_CREATED',
    supportCount: 11,
    opposeCount: 8,
    nuancedCount: 6,
    consensusScore: 0.52,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(106, 3),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    statement:
      'Privacy-preserving verification methods can address both safety and privacy concerns',
    source: 'AI_IDENTIFIED',
    supportCount: 13,
    opposeCount: 4,
    nuancedCount: 8,
    consensusScore: 0.65,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(106, 4),
    topicId: DEMO_TOPIC_IDS.AGE_VERIFICATION,
    statement: "Parents, not governments, should decide their children's online access",
    source: 'USER_CREATED',
    supportCount: 8,
    opposeCount: 10,
    nuancedCount: 7,
    consensusScore: 0.44,
    status: 'ACTIVE',
  },

  // Topic 7: Mandatory Voting (2 propositions)
  {
    id: generatePropositionId(107, 1),
    topicId: DEMO_TOPIC_IDS.MANDATORY_VOTING,
    statement: 'Mandatory voting increases democratic legitimacy through higher participation',
    source: 'AI_IDENTIFIED',
    supportCount: 8,
    opposeCount: 10,
    nuancedCount: 7,
    consensusScore: 0.35,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(107, 2),
    topicId: DEMO_TOPIC_IDS.MANDATORY_VOTING,
    statement: 'The freedom to not vote is an important democratic right',
    source: 'USER_CREATED',
    supportCount: 12,
    opposeCount: 8,
    nuancedCount: 5,
    consensusScore: 0.55,
    status: 'ACTIVE',
  },

  // Topic 8: Product AI Disclosure (3 propositions)
  {
    id: generatePropositionId(108, 1),
    topicId: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    statement: 'Consumers have a right to know when AI affects products they use',
    source: 'AI_IDENTIFIED',
    supportCount: 16,
    opposeCount: 3,
    nuancedCount: 6,
    consensusScore: 0.78,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(108, 2),
    topicId: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    statement: 'Disclosure should focus on high-impact AI uses (hiring, loans, medical)',
    source: 'USER_CREATED',
    supportCount: 15,
    opposeCount: 4,
    nuancedCount: 6,
    consensusScore: 0.71,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(108, 3),
    topicId: DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    statement: 'Disclosure alone is insufficient; accountability mechanisms are needed',
    source: 'AI_IDENTIFIED',
    supportCount: 12,
    opposeCount: 6,
    nuancedCount: 7,
    consensusScore: 0.61,
    status: 'ACTIVE',
  },

  // Topic 9: Plastic Ban (2 propositions - resolved topic)
  {
    id: generatePropositionId(109, 1),
    topicId: DEMO_TOPIC_IDS.PLASTIC_BAN,
    statement: 'Single-use plastics cause unacceptable environmental damage',
    source: 'AI_IDENTIFIED',
    supportCount: 18,
    opposeCount: 2,
    nuancedCount: 5,
    consensusScore: 0.88,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(109, 2),
    topicId: DEMO_TOPIC_IDS.PLASTIC_BAN,
    statement: 'Viable alternatives exist for most single-use plastic applications',
    source: 'USER_CREATED',
    supportCount: 14,
    opposeCount: 5,
    nuancedCount: 6,
    consensusScore: 0.72,
    status: 'ACTIVE',
  },

  // Topic 10: Gain-of-Function Oversight (3 propositions)
  {
    id: generatePropositionId(110, 1),
    topicId: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    statement: 'Gain-of-function research poses existential biosecurity risks',
    source: 'AI_IDENTIFIED',
    supportCount: 13,
    opposeCount: 5,
    nuancedCount: 7,
    consensusScore: 0.67,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(110, 2),
    topicId: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    statement: 'International oversight is essential but difficult to enforce',
    source: 'USER_CREATED',
    supportCount: 15,
    opposeCount: 3,
    nuancedCount: 7,
    consensusScore: 0.65,
    status: 'ACTIVE',
  },
  {
    id: generatePropositionId(110, 3),
    topicId: DEMO_TOPIC_IDS.GOF_OVERSIGHT,
    statement: 'Some gain-of-function research is necessary for pandemic preparedness',
    source: 'AI_IDENTIFIED',
    supportCount: 10,
    opposeCount: 8,
    nuancedCount: 7,
    consensusScore: 0.55,
    status: 'ACTIVE',
  },
];

/**
 * Get propositions for a specific topic
 */
export function getPropositionsByTopic(topicId: string): DemoProposition[] {
  return DEMO_PROPOSITIONS.filter((p) => p.topicId === topicId);
}

export default DEMO_PROPOSITIONS;
