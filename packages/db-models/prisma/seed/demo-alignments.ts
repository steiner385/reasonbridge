/**
 * Demo Alignment Definitions
 *
 * Defines 77 alignments showing user stances on propositions.
 * Distribution varies by persona to reflect different viewpoints.
 */

import { DEMO_USER_IDS } from './demo-ids';
import { DEMO_PROPOSITIONS, getPropositionsByTopic } from './demo-propositions';
import { DEMO_TOPIC_IDS } from './demo-ids';

type AlignmentStance = 'SUPPORT' | 'OPPOSE' | 'NUANCED';

export interface DemoAlignment {
  userId: string;
  propositionId: string;
  stance: AlignmentStance;
  nuanceExplanation?: string;
}

/**
 * Persona alignment tendencies
 * Alice: Progressive leaning
 * Bob: Moderate/balanced
 * Admin: Balanced institutional perspective
 * Mod: Process-focused, slightly conservative
 * New: Limited engagement, moderate
 */

function generateAlignments(): DemoAlignment[] {
  const alignments: DemoAlignment[] = [];

  // Admin Adams - 15 alignments, balanced perspective
  const adminTopics = [
    DEMO_TOPIC_IDS.CONGESTION_PRICING,
    DEMO_TOPIC_IDS.AI_DISCLOSURE,
    DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    DEMO_TOPIC_IDS.GOF_OVERSIGHT,
  ];

  adminTopics.forEach((topicId) => {
    const props = getPropositionsByTopic(topicId);
    props.forEach((prop, idx) => {
      // Admin tends toward balanced/institutional views
      const stances: AlignmentStance[] = ['SUPPORT', 'NUANCED', 'SUPPORT', 'NUANCED'];
      const stance = stances[idx % stances.length] ?? 'NUANCED';
      alignments.push({
        userId: DEMO_USER_IDS.ADMIN_ADAMS,
        propositionId: prop.id,
        stance,
        nuanceExplanation:
          stance === 'NUANCED'
            ? 'Both perspectives have merit; implementation details matter.'
            : undefined,
      });
    });
  });

  // Mod Martinez - 12 alignments, process-focused
  const modTopics = [
    DEMO_TOPIC_IDS.AI_DISCLOSURE,
    DEMO_TOPIC_IDS.AGE_VERIFICATION,
    DEMO_TOPIC_IDS.MANDATORY_VOTING,
  ];

  modTopics.forEach((topicId) => {
    const props = getPropositionsByTopic(topicId);
    props.forEach((prop, idx) => {
      const stances: AlignmentStance[] = ['SUPPORT', 'OPPOSE', 'NUANCED', 'SUPPORT'];
      const stance = stances[idx % stances.length] ?? 'NUANCED';
      alignments.push({
        userId: DEMO_USER_IDS.MOD_MARTINEZ,
        propositionId: prop.id,
        stance,
      });
    });
  });

  // Alice Anderson - 25 alignments, progressive leaning
  const aliceTopics = [
    DEMO_TOPIC_IDS.CONGESTION_PRICING,
    DEMO_TOPIC_IDS.AI_DISCLOSURE,
    DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    DEMO_TOPIC_IDS.PREVENTIVE_CARE,
    DEMO_TOPIC_IDS.AGE_VERIFICATION,
    DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
    DEMO_TOPIC_IDS.PLASTIC_BAN,
  ];

  aliceTopics.forEach((topicId) => {
    const props = getPropositionsByTopic(topicId);
    props.forEach((prop, idx) => {
      // Alice supports progressive positions
      const stances: AlignmentStance[] = ['SUPPORT', 'SUPPORT', 'NUANCED', 'SUPPORT', 'OPPOSE'];
      const stance = stances[idx % stances.length] ?? 'NUANCED';
      alignments.push({
        userId: DEMO_USER_IDS.ALICE_ANDERSON,
        propositionId: prop.id,
        stance,
        nuanceExplanation:
          stance === 'NUANCED'
            ? 'I see validity in both sides, though I lean toward the progressive view.'
            : undefined,
      });
    });
  });

  // Bob Builder - 20 alignments, moderate/balanced
  const bobTopics = [
    DEMO_TOPIC_IDS.CONGESTION_PRICING,
    DEMO_TOPIC_IDS.STANDARDIZED_TESTING,
    DEMO_TOPIC_IDS.RETURN_TO_OFFICE,
    DEMO_TOPIC_IDS.AGE_VERIFICATION,
    DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE,
  ];

  bobTopics.forEach((topicId) => {
    const props = getPropositionsByTopic(topicId);
    props.forEach((prop, idx) => {
      // Bob takes moderate positions, often opposing extreme views
      const stances: AlignmentStance[] = ['OPPOSE', 'NUANCED', 'SUPPORT', 'NUANCED', 'OPPOSE'];
      const stance = stances[idx % stances.length] ?? 'NUANCED';
      alignments.push({
        userId: DEMO_USER_IDS.BOB_BUILDER,
        propositionId: prop.id,
        stance,
        nuanceExplanation:
          stance === 'NUANCED'
            ? 'The practical implications matter more than the principle.'
            : undefined,
      });
    });
  });

  // New User - 5 alignments only (limited engagement)
  const newUserProps = [
    DEMO_PROPOSITIONS[0], // First proposition from congestion pricing
    DEMO_PROPOSITIONS[4], // AI disclosure
    DEMO_PROPOSITIONS[10], // Standardized testing
    DEMO_PROPOSITIONS[13], // Return to office
    DEMO_PROPOSITIONS[17], // Preventive care
  ].filter((prop): prop is NonNullable<typeof prop> => prop !== undefined);

  newUserProps.forEach((prop, idx) => {
    const stances: AlignmentStance[] = ['SUPPORT', 'NUANCED', 'OPPOSE', 'SUPPORT', 'SUPPORT'];
    const stance = stances[idx] ?? 'SUPPORT';
    alignments.push({
      userId: DEMO_USER_IDS.NEW_USER,
      propositionId: prop.id,
      stance,
    });
  });

  return alignments;
}

export const DEMO_ALIGNMENTS: DemoAlignment[] = generateAlignments();

/**
 * Get alignments for a specific user
 */
export function getAlignmentsByUser(userId: string): DemoAlignment[] {
  return DEMO_ALIGNMENTS.filter((a) => a.userId === userId);
}

/**
 * Get alignments for a specific proposition
 */
export function getAlignmentsByProposition(propositionId: string): DemoAlignment[] {
  return DEMO_ALIGNMENTS.filter((a) => a.propositionId === propositionId);
}

export default DEMO_ALIGNMENTS;
