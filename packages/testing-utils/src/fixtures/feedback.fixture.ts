/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Feedback Fixtures for Testing
 *
 * T291: Predefined AI feedback data for testing scenarios
 *
 * Scenarios:
 * - Fallacy detection (various logical fallacies)
 * - Inflammatory language detection
 * - Affirmation/constructive feedback
 * - Low confidence results
 * - Multiple feedback items
 */

import { generateId } from '@reason-bridge/common';
import { nextSequence } from './index.js';

/**
 * Feedback type matching AnalysisFeedback from event-schemas
 */
export type FeedbackType = 'fallacy' | 'inflammatory' | 'unsourced' | 'bias' | 'affirmation';

/**
 * Educational resource for feedback
 */
export interface EducationalResource {
  title: string;
  url: string;
}

/**
 * AI analysis feedback item
 */
export interface Feedback {
  id: string;
  responseId: string;
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources?: EducationalResource[];
  createdAt: Date;
}

/**
 * Fallacy subtypes
 */
export type FallacySubtype =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dilemma'
  | 'slippery_slope'
  | 'appeal_to_authority'
  | 'circular_reasoning'
  | 'hasty_generalization'
  | 'red_herring'
  | 'tu_quoque'
  | 'bandwagon';

/**
 * Predefined fallacy feedback items
 */
export const fallacyFeedback: Record<
  FallacySubtype,
  Omit<Feedback, 'id' | 'responseId' | 'createdAt'>
> = {
  ad_hominem: {
    type: 'fallacy',
    subtype: 'ad_hominem',
    suggestionText:
      'This response attacks the person rather than addressing their argument. Consider focusing on the substance of their claims.',
    reasoning:
      'The text contains phrases that target the individual making the argument rather than the argument itself.',
    confidenceScore: 0.87,
    educationalResources: [
      {
        title: 'Ad Hominem Fallacy Explained',
        url: 'https://yourlogicalfallacyis.com/ad-hominem',
      },
    ],
  },
  straw_man: {
    type: 'fallacy',
    subtype: 'straw_man',
    suggestionText:
      'This appears to misrepresent the opposing position. Try to address the actual argument being made.',
    reasoning:
      'The response creates a distorted version of the original argument that is easier to attack.',
    confidenceScore: 0.82,
    educationalResources: [
      {
        title: 'Straw Man Fallacy',
        url: 'https://yourlogicalfallacyis.com/strawman',
      },
    ],
  },
  false_dilemma: {
    type: 'fallacy',
    subtype: 'false_dilemma',
    suggestionText:
      'This presents only two options when more alternatives may exist. Consider whether there are other possibilities.',
    reasoning:
      'The argument frames the issue as having only two possible outcomes, ignoring nuance or middle ground.',
    confidenceScore: 0.79,
    educationalResources: [
      {
        title: 'False Dilemma Fallacy',
        url: 'https://yourlogicalfallacyis.com/black-or-white',
      },
    ],
  },
  slippery_slope: {
    type: 'fallacy',
    subtype: 'slippery_slope',
    suggestionText:
      'This assumes one event will inevitably lead to extreme consequences without supporting evidence.',
    reasoning: 'The argument chain of causation lacks sufficient evidence for each step.',
    confidenceScore: 0.75,
    educationalResources: [
      {
        title: 'Slippery Slope Fallacy',
        url: 'https://yourlogicalfallacyis.com/slippery-slope',
      },
    ],
  },
  appeal_to_authority: {
    type: 'fallacy',
    subtype: 'appeal_to_authority',
    suggestionText:
      'Citing an authority is not inherently wrong, but ensure the authority is relevant and the claim is within their expertise.',
    reasoning:
      'The argument relies heavily on authority without considering whether that authority is relevant to this specific claim.',
    confidenceScore: 0.68,
    educationalResources: [
      {
        title: 'Appeal to Authority',
        url: 'https://yourlogicalfallacyis.com/appeal-to-authority',
      },
    ],
  },
  circular_reasoning: {
    type: 'fallacy',
    subtype: 'circular_reasoning',
    suggestionText:
      'This argument assumes its conclusion in its premise. Try to provide independent evidence.',
    reasoning: 'The conclusion is essentially restated as the premise, creating circular logic.',
    confidenceScore: 0.84,
    educationalResources: [
      {
        title: 'Circular Reasoning',
        url: 'https://yourlogicalfallacyis.com/begging-the-question',
      },
    ],
  },
  hasty_generalization: {
    type: 'fallacy',
    subtype: 'hasty_generalization',
    suggestionText:
      'This conclusion is based on insufficient evidence. Consider whether the sample size supports such a broad claim.',
    reasoning: 'A sweeping conclusion is drawn from limited examples or anecdotal evidence.',
    confidenceScore: 0.76,
    educationalResources: [
      {
        title: 'Hasty Generalization',
        url: 'https://yourlogicalfallacyis.com/hasty-generalisation',
      },
    ],
  },
  red_herring: {
    type: 'fallacy',
    subtype: 'red_herring',
    suggestionText:
      'This introduces an unrelated topic that distracts from the main issue. Try to stay focused on the original argument.',
    reasoning:
      'The response shifts attention to an irrelevant issue rather than addressing the main point.',
    confidenceScore: 0.71,
    educationalResources: [
      {
        title: 'Red Herring Fallacy',
        url: 'https://yourlogicalfallacyis.com/red-herring',
      },
    ],
  },
  tu_quoque: {
    type: 'fallacy',
    subtype: 'tu_quoque',
    suggestionText: 'Pointing out hypocrisy does not address the validity of the argument itself.',
    reasoning: 'The response attempts to deflect by accusing the other party of the same behavior.',
    confidenceScore: 0.73,
    educationalResources: [
      {
        title: 'Tu Quoque Fallacy',
        url: 'https://yourlogicalfallacyis.com/tu-quoque',
      },
    ],
  },
  bandwagon: {
    type: 'fallacy',
    subtype: 'bandwagon',
    suggestionText:
      'Popularity does not determine truth. Consider providing evidence beyond public opinion.',
    reasoning: 'The argument relies on the popularity of a belief rather than its merit.',
    confidenceScore: 0.78,
    educationalResources: [
      {
        title: 'Bandwagon Fallacy',
        url: 'https://yourlogicalfallacyis.com/bandwagon',
      },
    ],
  },
};

/**
 * Predefined inflammatory feedback items
 */
export const inflammatoryFeedback = {
  mild: {
    type: 'inflammatory' as const,
    suggestionText:
      'This response contains language that might be perceived as dismissive. Consider rephrasing for more constructive dialogue.',
    reasoning:
      'Minor instances of dismissive language detected that could hinder productive discussion.',
    confidenceScore: 0.65,
  },
  moderate: {
    type: 'inflammatory' as const,
    suggestionText:
      'This response contains emotionally charged language that may escalate tension. Consider using more neutral phrasing.',
    reasoning:
      'Multiple instances of inflammatory language that could derail productive conversation.',
    confidenceScore: 0.82,
  },
  severe: {
    type: 'inflammatory' as const,
    suggestionText:
      'This response contains highly inflammatory content. Please revise to maintain respectful discourse.',
    reasoning: 'Strong inflammatory language that is likely to prevent productive dialogue.',
    confidenceScore: 0.94,
  },
};

/**
 * Predefined affirmation feedback items
 */
export const affirmationFeedback = {
  wellReasoned: {
    type: 'affirmation' as const,
    suggestionText: 'This response presents a well-reasoned argument with clear logical structure.',
    reasoning: 'The argument follows sound logical principles and addresses the topic directly.',
    confidenceScore: 0.88,
  },
  evidenceBased: {
    type: 'affirmation' as const,
    suggestionText: 'This response effectively uses evidence to support its claims.',
    reasoning: 'Claims are backed by relevant evidence and the sources appear credible.',
    confidenceScore: 0.85,
  },
  constructive: {
    type: 'affirmation' as const,
    suggestionText:
      'This response contributes positively to the discussion by introducing new perspectives.',
    reasoning: 'The contribution adds value to the conversation without being inflammatory.',
    confidenceScore: 0.79,
  },
  bridging: {
    type: 'affirmation' as const,
    suggestionText:
      'This response effectively acknowledges different viewpoints and seeks common ground.',
    reasoning:
      'The author demonstrates understanding of opposing positions and attempts to find shared values.',
    confidenceScore: 0.91,
  },
};

/**
 * Predefined low confidence feedback items
 */
export const lowConfidenceFeedback = {
  uncertainFallacy: {
    type: 'fallacy' as const,
    subtype: 'hasty_generalization',
    suggestionText:
      'This might be a hasty generalization, but more context would help determine this.',
    reasoning:
      'The statement appears to generalize, but without full context, confidence is limited.',
    confidenceScore: 0.42,
  },
  possibleBias: {
    type: 'bias' as const,
    suggestionText:
      'There may be some implicit bias in this framing, though it could also be intentional emphasis.',
    reasoning: 'Language patterns suggest possible bias, but alternative interpretations exist.',
    confidenceScore: 0.38,
  },
  maybeInflammatory: {
    type: 'inflammatory' as const,
    suggestionText: 'This language could be interpreted as provocative depending on context.',
    reasoning: 'Tone detection is uncertain due to ambiguous phrasing.',
    confidenceScore: 0.45,
  },
};

/**
 * Create a feedback item with default or custom values
 */
export function createFeedback(overrides: Partial<Feedback> = {}): Feedback {
  const seq = nextSequence();
  return {
    id: overrides.id ?? generateId('fb'),
    responseId: overrides.responseId ?? generateId('resp'),
    type: overrides.type ?? 'affirmation',
    subtype: overrides.subtype,
    suggestionText: overrides.suggestionText ?? `Test feedback suggestion ${seq}`,
    reasoning: overrides.reasoning ?? `Test reasoning for feedback ${seq}`,
    confidenceScore: overrides.confidenceScore ?? 0.75,
    educationalResources: overrides.educationalResources,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

/**
 * Create a fallacy feedback item
 */
export function createFallacyFeedback(
  fallacyType: FallacySubtype,
  overrides: Partial<Feedback> = {},
): Feedback {
  const template = fallacyFeedback[fallacyType];
  return createFeedback({
    ...template,
    ...overrides,
  });
}

/**
 * Create an inflammatory feedback item
 */
export function createInflammatoryFeedback(
  severity: 'mild' | 'moderate' | 'severe',
  overrides: Partial<Feedback> = {},
): Feedback {
  const template = inflammatoryFeedback[severity];
  return createFeedback({
    ...template,
    ...overrides,
  });
}

/**
 * Create an affirmation feedback item
 */
export function createAffirmationFeedback(
  type: keyof typeof affirmationFeedback,
  overrides: Partial<Feedback> = {},
): Feedback {
  const template = affirmationFeedback[type];
  return createFeedback({
    ...template,
    ...overrides,
  });
}

/**
 * Create a batch of feedback items for a response
 */
export function createFeedbackBatch(
  responseId: string,
  count: number,
  typeDistribution?: Partial<Record<FeedbackType, number>>,
): Feedback[] {
  const items: Feedback[] = [];
  const distribution = typeDistribution ?? {
    fallacy: Math.floor(count * 0.3),
    inflammatory: Math.floor(count * 0.2),
    affirmation: Math.floor(count * 0.4),
    bias: Math.floor(count * 0.1),
  };

  const fallacyTypes: FallacySubtype[] = Object.keys(fallacyFeedback) as FallacySubtype[];

  for (const [type, typeCount] of Object.entries(distribution)) {
    for (let i = 0; i < (typeCount ?? 0); i++) {
      if (type === 'fallacy') {
        const fallacyType = fallacyTypes[i % fallacyTypes.length]!;
        items.push(createFallacyFeedback(fallacyType, { responseId }));
      } else {
        items.push(createFeedback({ responseId, type: type as FeedbackType }));
      }
    }
  }

  return items.slice(0, count);
}

/**
 * Feedback scenario presets for common testing needs
 */
export const feedbackScenarios = {
  /**
   * Response with no issues
   */
  clean: (): Feedback[] => [],

  /**
   * Response with a single fallacy
   */
  singleFallacy: (responseId: string): Feedback[] => [
    createFallacyFeedback('ad_hominem', { responseId }),
  ],

  /**
   * Response with multiple fallacies
   */
  multipleFallacies: (responseId: string): Feedback[] => [
    createFallacyFeedback('straw_man', { responseId }),
    createFallacyFeedback('false_dilemma', { responseId }),
  ],

  /**
   * Response with inflammatory content
   */
  inflammatory: (responseId: string): Feedback[] => [
    createInflammatoryFeedback('moderate', { responseId }),
  ],

  /**
   * Well-reasoned constructive response
   */
  constructive: (responseId: string): Feedback[] => [
    createAffirmationFeedback('wellReasoned', { responseId }),
    createAffirmationFeedback('evidenceBased', { responseId }),
  ],

  /**
   * Mixed feedback - some issues, some positives
   */
  mixed: (responseId: string): Feedback[] => [
    createFallacyFeedback('hasty_generalization', { responseId }),
    createAffirmationFeedback('constructive', { responseId }),
  ],

  /**
   * All low confidence results
   */
  uncertain: (responseId: string): Feedback[] => [
    createFeedback({
      responseId,
      ...lowConfidenceFeedback.uncertainFallacy,
    }),
    createFeedback({
      responseId,
      ...lowConfidenceFeedback.possibleBias,
    }),
  ],
};
