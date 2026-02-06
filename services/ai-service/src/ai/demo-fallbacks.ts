/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo AI Fallback Responses
 *
 * Pre-computed AI responses for demo environments when Bedrock is unavailable.
 * Provides realistic-looking feedback for sales demonstrations.
 */

// Local copy of demo topic IDs to avoid circular dependency with db-models
// These must match the IDs in packages/db-models/prisma/seed/demo-ids.ts
const DEMO_TOPIC_IDS = {
  CONGESTION_PRICING: '11111111-0001-0000-0000-000000000001',
  AI_DISCLOSURE: '11111111-0001-0000-0000-000000000002',
  STANDARDIZED_TESTING: '11111111-0001-0000-0000-000000000003',
  RETURN_TO_OFFICE: '11111111-0001-0000-0000-000000000004',
  PREVENTIVE_CARE: '11111111-0001-0000-0000-000000000005',
  AGE_VERIFICATION: '11111111-0001-0000-0000-000000000006',
  MANDATORY_VOTING: '11111111-0001-0000-0000-000000000007',
  PRODUCT_AI_DISCLOSURE: '11111111-0001-0000-0000-000000000008',
  PLASTIC_BAN: '11111111-0001-0000-0000-000000000009',
  GOF_OVERSIGHT: '11111111-0001-0000-0000-000000000010',
} as const;

/**
 * Fallback clarity analysis responses
 */
export const CLARITY_FALLBACKS: Record<string, string> = {
  default:
    'This response demonstrates clear articulation of the core argument. ' +
    'The reasoning is well-structured, though consider adding specific examples ' +
    'to strengthen your position.',
  high_clarity:
    'Excellent clarity. Your argument is well-organized with a clear thesis, ' +
    'supporting evidence, and logical conclusion. This facilitates productive dialogue.',
  medium_clarity:
    'Your main point comes through, but some supporting arguments could be clearer. ' +
    'Consider restructuring to lead with your strongest evidence.',
  low_clarity:
    'The core argument is somewhat difficult to follow. Consider breaking this into ' +
    'smaller, more focused points to help others engage with your reasoning.',
};

/**
 * Fallback tone analysis responses
 */
export const TONE_FALLBACKS: Record<string, { label: string; score: number; feedback: string }> = {
  constructive: {
    label: 'Constructive',
    score: 0.85,
    feedback:
      'Your tone is respectful and invites dialogue. The language you use ' +
      "acknowledges others' perspectives while clearly stating your own position.",
  },
  neutral: {
    label: 'Neutral',
    score: 0.65,
    feedback:
      'Your tone is factual and measured. Consider adding language that explicitly ' +
      'acknowledges the validity of other viewpoints to encourage more engagement.',
  },
  passionate: {
    label: 'Passionate',
    score: 0.7,
    feedback:
      'Your conviction comes through clearly. To maximize engagement, balance your ' +
      'strong stance with explicit openness to alternative perspectives.',
  },
  defensive: {
    label: 'Defensive',
    score: 0.45,
    feedback:
      'The tone may come across as defensive, which can limit productive dialogue. ' +
      'Consider rephrasing to focus on the ideas rather than defending your position.',
  },
};

/**
 * Fallback fallacy detection responses
 */
export const FALLACY_FALLBACKS: Array<{
  name: string;
  description: string;
  suggestion: string;
}> = [
  {
    name: 'Appeal to Authority',
    description: 'Referencing an authority figure without substantive evidence',
    suggestion: 'Strengthen by including specific data or research to support the cited authority',
  },
  {
    name: 'False Dichotomy',
    description: 'Presenting only two options when more exist',
    suggestion: 'Consider acknowledging middle-ground positions or alternative approaches',
  },
  {
    name: 'Strawman',
    description: 'Misrepresenting an opposing view to make it easier to refute',
    suggestion: "Ensure you're addressing the strongest version of the opposing argument",
  },
  {
    name: 'Ad Hominem',
    description: 'Attacking the person rather than their argument',
    suggestion: 'Focus on the merits of the argument itself rather than its source',
  },
];

/**
 * Fallback common ground analysis per topic
 */
export const COMMON_GROUND_FALLBACKS: Record<
  string,
  {
    agreementZones: string[];
    misunderstandings: string[];
    genuineDisagreements: string[];
    consensusScore: number;
  }
> = {
  [DEMO_TOPIC_IDS.CONGESTION_PRICING]: {
    agreementZones: [
      'Public transit alternatives must exist before implementing congestion pricing',
      'Revenue should be reinvested in transportation infrastructure',
      'Low-income exemptions or rebates are necessary for equity',
    ],
    misunderstandings: [
      'Different definitions of "low-income" for exemption purposes',
      'Unclear whether congestion pricing refers to tolls, fees, or dynamic pricing',
    ],
    genuineDisagreements: [
      'Whether congestion pricing is fundamentally regressive',
      'Whether market-based solutions are appropriate for public goods',
    ],
    consensusScore: 0.68,
  },
  [DEMO_TOPIC_IDS.AI_DISCLOSURE]: {
    agreementZones: [
      'AI-generated news content should require mandatory disclosure',
      'Minor AI assistance (spell check, grammar) should be exempt',
      'Disclosure helps consumers make informed decisions',
    ],
    misunderstandings: [
      'Ambiguity around what counts as "AI-generated" vs "AI-assisted"',
      'Unclear scope of regulation (news, entertainment, education)',
    ],
    genuineDisagreements: [
      'Whether disclosure requirements would stifle innovation',
      'Who bears responsibility for enforcing disclosure',
    ],
    consensusScore: 0.72,
  },
  [DEMO_TOPIC_IDS.RETURN_TO_OFFICE]: {
    agreementZones: [
      'Hybrid models work better than all-or-nothing approaches',
      'Different roles have different collaboration needs',
      'Companies should focus on outcomes rather than location',
    ],
    misunderstandings: [
      'Different definitions of "collaboration" and what requires in-person presence',
      'Conflation of productivity with visibility',
    ],
    genuineDisagreements: [
      'Whether in-person interaction is essential for innovation',
      'Whether RTO mandates harm or help company culture',
    ],
    consensusScore: 0.65,
  },
  default: {
    agreementZones: [
      'Evidence-based approaches are preferred over ideology-driven policies',
      'Multiple perspectives should be considered in decision-making',
      'Implementation details matter as much as principles',
    ],
    misunderstandings: [
      'Key terms may be interpreted differently by participants',
      'Scope of the issue may be understood differently',
    ],
    genuineDisagreements: [
      'Fundamental values may differ between participants',
      'Priorities and trade-offs are assessed differently',
    ],
    consensusScore: 0.58,
  },
};

/**
 * Get fallback clarity analysis
 */
export function getFallbackClarityAnalysis(content: string): string {
  // Simple heuristic based on content length and structure
  const wordCount = content.split(/\s+/).length;
  const hasParagraphs = content.includes('\n\n');
  const hasEvidence = /evidence|research|study|data|according to/i.test(content);

  if (wordCount > 100 && hasParagraphs && hasEvidence) {
    return CLARITY_FALLBACKS['high_clarity'] ?? CLARITY_FALLBACKS['default'] ?? '';
  } else if (wordCount > 50) {
    return CLARITY_FALLBACKS['medium_clarity'] ?? CLARITY_FALLBACKS['default'] ?? '';
  } else if (wordCount < 30) {
    return CLARITY_FALLBACKS['low_clarity'] ?? CLARITY_FALLBACKS['default'] ?? '';
  }
  return CLARITY_FALLBACKS['default'] ?? '';
}

/**
 * Get fallback tone analysis
 */
export function getFallbackToneAnalysis(content: string): {
  label: string;
  score: number;
  feedback: string;
} {
  // Simple heuristic based on keywords
  const lowerContent = content.toLowerCase();
  const defaultTone = TONE_FALLBACKS['neutral'] ?? { label: 'Neutral', score: 0.65, feedback: '' };

  if (/but i think|you make a good point|i understand|on the other hand/i.test(lowerContent)) {
    return TONE_FALLBACKS['constructive'] ?? defaultTone;
  } else if (/wrong|false|ridiculous|nonsense|clearly/i.test(lowerContent)) {
    return TONE_FALLBACKS['defensive'] ?? defaultTone;
  } else if (/strongly believe|must|absolutely|never/i.test(lowerContent)) {
    return TONE_FALLBACKS['passionate'] ?? defaultTone;
  }
  return defaultTone;
}

/**
 * Get fallback common ground for a topic
 */
export function getFallbackCommonGround(topicId: string): {
  agreementZones: string[];
  misunderstandings: string[];
  genuineDisagreements: string[];
  consensusScore: number;
} {
  const defaultFallback = COMMON_GROUND_FALLBACKS['default'] ?? {
    agreementZones: [],
    misunderstandings: [],
    genuineDisagreements: [],
    consensusScore: 0.5,
  };
  return COMMON_GROUND_FALLBACKS[topicId] ?? defaultFallback;
}
