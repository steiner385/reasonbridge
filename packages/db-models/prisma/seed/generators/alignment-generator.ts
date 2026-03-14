/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Alignment Generator
 *
 * Generates moral foundation alignments for propositions.
 * Uses Moral Foundation Theory with six foundations: care, fairness, loyalty, authority, sanctity, liberty.
 */

import type { GeneratedUserPersona } from './user-generator.js';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Generated proposition interface (minimal fields needed for alignment)
 * Will be imported from proposition-generator.ts when available
 */
export interface GeneratedProposition {
  id: string;
  index: number;
  topicId: string;
  authorId: string;
}

export type MoralFoundation =
  | 'care'
  | 'fairness'
  | 'loyalty'
  | 'authority'
  | 'sanctity'
  | 'liberty';

export type AlignmentStance = 'SUPPORT' | 'OPPOSE' | 'NUANCED';

export interface GeneratedAlignment {
  id: string;
  userId: string;
  propositionId: string;
  stance: AlignmentStance;
  foundations: Record<MoralFoundation, number>;
  nuanceExplanation: string | null;
  createdAtOffset: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const FOUNDATIONS: MoralFoundation[] = [
  'care',
  'fairness',
  'loyalty',
  'authority',
  'sanctity',
  'liberty',
];

const STANCES: AlignmentStance[] = ['SUPPORT', 'OPPOSE', 'NUANCED'];

const NUANCE_EXPLANATIONS = [
  'This position requires careful consideration of multiple perspectives.',
  'I see valid points on both sides of this argument.',
  'The complexity of this issue defies simple categorization.',
  'Context matters significantly in evaluating this proposition.',
  'I agree with parts but have reservations about others.',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a deterministic alignment ID
 * Format: 11111111-0000-4000-8000-900NNNNNNNNN
 * NNN = alignment index (000000001-999999999)
 */
function generateAlignmentId(alignmentIndex: number): string {
  const indexPart = alignmentIndex.toString().padStart(9, '0');
  return `11111111-0000-4000-8000-900${indexPart}`;
}

/**
 * Generate foundation scores deterministically based on alignment index
 * Returns scores between 0.2 and 1.0
 */
function generateFoundationScores(alignmentIndex: number): Record<MoralFoundation, number> {
  const scores: Record<MoralFoundation, number> = {
    care: 0,
    fairness: 0,
    loyalty: 0,
    authority: 0,
    sanctity: 0,
    liberty: 0,
  };

  for (let i = 0; i < FOUNDATIONS.length; i++) {
    const foundation = FOUNDATIONS[i];
    if (foundation) {
      // Generate deterministic score between 0.2 and 1.0
      // Use different multipliers for each foundation to create variation
      const baseSeed = alignmentIndex * (i + 1) * 17;
      const normalized = ((baseSeed % 80) + 20) / 100; // Range: 0.2 to 1.0
      scores[foundation] = Math.round(normalized * 100) / 100; // Round to 2 decimal places
    }
  }

  return scores;
}

/**
 * Get nuance explanation for NUANCED stance
 */
function getNuanceExplanation(alignmentIndex: number): string {
  const explanationIndex = alignmentIndex % NUANCE_EXPLANATIONS.length;
  return NUANCE_EXPLANATIONS[explanationIndex] ?? NUANCE_EXPLANATIONS[0]!;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate alignments for propositions
 *
 * Creates 2-3 alignments per proposition with deterministic user selection,
 * stance assignment, and moral foundation scores.
 *
 * @param propositions - Array of propositions to create alignments for
 * @param users - Array of user personas to select aligners from
 * @returns Array of generated alignments
 */
export function generateAlignments(
  propositions: GeneratedProposition[],
  users: GeneratedUserPersona[],
): GeneratedAlignment[] {
  const alignments: GeneratedAlignment[] = [];
  let alignmentIndex = 0;

  for (const proposition of propositions) {
    // 2-3 alignments per proposition
    const alignmentCount = 2 + (alignmentIndex % 2);

    for (let i = 0; i < alignmentCount; i++) {
      // Select user deterministically
      const userIndex = (alignmentIndex * 7) % users.length;
      const user = users[userIndex];

      if (!user) {
        continue;
      }

      // Determine stance based on alignment index and user index
      const stanceIndex = (alignmentIndex + user.index) % 3;
      const stance = STANCES[stanceIndex] ?? 'SUPPORT';

      // Generate foundation scores
      const foundations = generateFoundationScores(alignmentIndex);

      // Set nuance explanation only for NUANCED stance
      const nuanceExplanation = stance === 'NUANCED' ? getNuanceExplanation(alignmentIndex) : null;

      // Calculate createdAtOffset (days ago, between 0 and 30)
      const createdAtOffset = alignmentIndex % 31;

      alignments.push({
        id: generateAlignmentId(alignmentIndex),
        userId: user.id,
        propositionId: proposition.id,
        stance,
        foundations,
        nuanceExplanation,
        createdAtOffset,
      });

      alignmentIndex++;
    }
  }

  return alignments;
}

export default generateAlignments;
