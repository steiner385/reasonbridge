/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo AI Feedback Definitions
 *
 * Defines pre-computed AI feedback instances for demo responses.
 * Matches the Prisma Feedback model schema.
 */

import { DEMO_USER_IDS } from './demo-ids';
import { DEMO_RESPONSES } from './demo-responses';

/**
 * Feedback types matching Prisma schema
 */
type FeedbackType = 'FALLACY' | 'INFLAMMATORY' | 'UNSOURCED' | 'BIAS' | 'AFFIRMATION';

/**
 * Generate a simple incremental feedback ID
 * Format: 11111111-0000-4000-8000-0002000XXXXX
 */
function generateSimpleFeedbackId(sequence: number): string {
  const sequencePart = sequence.toString().padStart(5, '0');
  return `11111111-0000-4000-8000-0002000${sequencePart}`;
}

export interface DemoFeedback {
  id: string;
  responseId: string;
  type: FeedbackType;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources: Record<string, unknown> | null;
  displayedToUser: boolean;
  userAcknowledged: boolean;
  userRevised: boolean;
}

/**
 * Feedback templates organized by type
 */
const FEEDBACK_TEMPLATES: Record<
  FeedbackType,
  Array<{
    suggestionText: string;
    reasoning: string;
    confidenceScore: number;
    educationalResources: Record<string, unknown> | null;
    subtype?: string;
  }>
> = {
  FALLACY: [
    {
      suggestionText:
        'Consider strengthening this argument by addressing the strongest version of the opposing view rather than the weakest interpretation.',
      reasoning:
        'The argument appears to present a simplified version of the opposing position. Engaging with the strongest counterarguments builds credibility.',
      confidenceScore: 0.75,
      educationalResources: {
        fallacyName: 'Strawman',
        definition: 'Misrepresenting an argument to make it easier to attack',
        learnMoreUrl: 'https://yourlogicalfallacyis.com/strawman',
      },
      subtype: 'strawman',
    },
    {
      suggestionText:
        'This presents only two options when there may be middle-ground alternatives worth considering.',
      reasoning:
        'Complex issues often have more than two possible positions. Acknowledging nuance can lead to more productive dialogue.',
      confidenceScore: 0.78,
      educationalResources: {
        fallacyName: 'False Dichotomy',
        definition: 'Presenting only two options when more exist',
        learnMoreUrl: 'https://yourlogicalfallacyis.com/black-or-white',
      },
      subtype: 'false_dichotomy',
    },
  ],
  INFLAMMATORY: [
    {
      suggestionText:
        'Consider rephrasing to focus on the ideas rather than characterizing the people who hold opposing views.',
      reasoning:
        'Language that characterizes opponents rather than their arguments can derail productive discussion.',
      confidenceScore: 0.72,
      educationalResources: {
        tip: 'Focus on ideas, not people',
        examples: [
          'Instead of "People who believe X are naive" try "The argument for X may overlook..."',
        ],
      },
      subtype: 'ad_hominem',
    },
  ],
  UNSOURCED: [
    {
      suggestionText:
        'This claim would be strengthened by citing specific research or data sources.',
      reasoning:
        'Statistical claims and research references are most persuasive when the source can be verified.',
      confidenceScore: 0.82,
      educationalResources: {
        tip: 'Adding citations builds credibility',
        suggestionFormat: 'Consider adding: According to [source], [claim]',
      },
      subtype: 'statistical_claim',
    },
    {
      suggestionText:
        'Consider providing a link or reference for this claim about historical events.',
      reasoning:
        'Historical claims benefit from reliable sources that readers can verify independently.',
      confidenceScore: 0.68,
      educationalResources: {
        tip: 'Historical claims are strengthened by primary sources',
      },
      subtype: 'historical_claim',
    },
  ],
  BIAS: [
    {
      suggestionText:
        'This framing may contain implicit assumptions that not all participants share. Consider making your underlying premises explicit.',
      reasoning:
        'Making foundational assumptions explicit helps others engage with the core of your argument.',
      confidenceScore: 0.65,
      educationalResources: {
        biasType: 'Framing bias',
        tip: 'State your assumptions explicitly to invite productive discussion',
      },
      subtype: 'framing',
    },
  ],
  AFFIRMATION: [
    {
      suggestionText:
        'This response demonstrates strong reasoning skills. Your argument is well-structured with clear evidence.',
      reasoning:
        'The argument follows a logical structure: clear thesis, supporting evidence, and reasoned conclusion.',
      confidenceScore: 0.88,
      educationalResources: null,
      subtype: 'well_structured',
    },
    {
      suggestionText:
        'Excellent acknowledgment of opposing viewpoints while maintaining your position. This invites productive dialogue.',
      reasoning:
        'Recognizing valid points in opposing arguments while articulating your own view models constructive discourse.',
      confidenceScore: 0.85,
      educationalResources: null,
      subtype: 'balanced_perspective',
    },
    {
      suggestionText:
        'Your tone is constructive and invites further discussion. This helps create a productive conversation environment.',
      reasoning:
        'The language used shows respect for other participants while clearly expressing a viewpoint.',
      confidenceScore: 0.82,
      educationalResources: null,
      subtype: 'constructive_tone',
    },
  ],
};

/**
 * Generate demo feedback instances for demo responses
 */
function generateDemoFeedback(): DemoFeedback[] {
  const feedback: DemoFeedback[] = [];
  let feedbackIndex = 1;

  // Select approximately 30% of responses to have feedback
  const responsesWithFeedback = DEMO_RESPONSES.filter((_, idx) => idx % 3 === 0 || idx % 7 === 0);

  for (const response of responsesWithFeedback) {
    // Determine feedback type based on index for variety
    const typeIndex = feedbackIndex % 5;
    const types: FeedbackType[] = ['AFFIRMATION', 'FALLACY', 'UNSOURCED', 'BIAS', 'INFLAMMATORY'];
    const feedbackType = types[typeIndex] ?? 'AFFIRMATION';

    const templates = FEEDBACK_TEMPLATES[feedbackType];
    // templates always has at least one entry per type
    const template = templates[feedbackIndex % templates.length]!;

    feedback.push({
      id: generateSimpleFeedbackId(feedbackIndex++),
      responseId: response.id,
      type: feedbackType,
      subtype: template.subtype || null,
      suggestionText: template.suggestionText,
      reasoning: template.reasoning,
      confidenceScore: template.confidenceScore,
      educationalResources: template.educationalResources,
      displayedToUser: feedbackIndex % 4 !== 0, // 75% displayed
      userAcknowledged: feedbackIndex % 5 === 0, // 20% acknowledged
      userRevised: feedbackIndex % 8 === 0, // 12.5% revised
    });
  }

  return feedback;
}

export const DEMO_AI_FEEDBACK: DemoFeedback[] = generateDemoFeedback();

/**
 * Get feedback for a specific response
 */
export function getFeedbackByResponse(responseId: string): DemoFeedback[] {
  return DEMO_AI_FEEDBACK.filter((f) => f.responseId === responseId);
}

/**
 * Get feedback count by type
 */
export function getFeedbackCountByType(): Record<FeedbackType, number> {
  const counts: Record<FeedbackType, number> = {
    FALLACY: 0,
    INFLAMMATORY: 0,
    UNSOURCED: 0,
    BIAS: 0,
    AFFIRMATION: 0,
  };

  for (const f of DEMO_AI_FEEDBACK) {
    counts[f.type]++;
  }

  return counts;
}

export default DEMO_AI_FEEDBACK;
