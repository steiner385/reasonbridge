/**
 * Demo Response Definitions
 *
 * Defines 52 responses across 10 topics with threading.
 * Responses include varied viewpoints and realistic conversation flow.
 */

import { DEMO_TOPIC_IDS, DEMO_USER_IDS, generateResponseId } from './demo-ids';

export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface DemoResponse {
  id: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  viewpoint: ViewpointType;
  citedSources: CitedSource[];
}

interface CitedSource {
  url: string;
  title: string;
  author?: string;
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

/**
 * Get topic number with type safety
 */
function getTopicNumber(topicId: string): number {
  const num = TOPIC_NUMBERS[topicId];
  if (num === undefined) {
    throw new Error(`Unknown topic ID: ${topicId}`);
  }
  return num;
}

/**
 * Generate responses for Topic 1: Congestion Pricing (5 responses, 2 levels)
 */
function generateCongestionPricingResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.CONGESTION_PRICING;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        'Congestion pricing has worked remarkably well in cities like Stockholm and London. After implementation, Stockholm saw a 20% reduction in traffic and significant air quality improvements. The key is using the revenue for public transit improvements.',
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/stockholm-study',
          title: 'Stockholm Congestion Tax Evaluation',
        },
      ],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 1),
      content:
        "But Stockholm has excellent public transit as an alternative. Many American cities don't have that infrastructure. Shouldn't we build the alternatives first before penalizing drivers?",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 2),
      content:
        "That's a fair point, @Bob. The revenue from congestion pricing could fund those transit improvements. It's a chicken-and-egg problem, but the pricing creates both the incentive to use transit AND the funding to build it.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: null,
      content:
        "From an equity perspective, we need to ensure low-income workers aren't disproportionately burdened. London offers discounts and exemptions. Any congestion pricing system needs similar protections.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 4),
      content:
        "I appreciate the equity focus, but exemptions and discounts add complexity and reduce effectiveness. At some point, so many exemptions exist that the policy doesn't work anymore.",
      viewpoint: 'oppose',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 2: AI Disclosure (8 responses, 3 levels)
 */
function generateAIDisclosureResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.AI_DISCLOSURE;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "Transparency is fundamental. When I read an article, I have a right to know if it was written by AI. This isn't anti-technology—it's pro-informed decision making.",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 1),
      content:
        'I agree in principle, but where do you draw the line? Spell checkers are AI. Grammar tools are AI. A disclosure requirement needs clear boundaries to be meaningful.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: generateResponseId(tn, 2),
      content:
        "Good point, @Alice. Maybe the distinction should be about 'substantial generation' vs 'assistance tools'. If AI generates the core content, disclose. If it just fixes typos, don't.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: null,
      content:
        "We're already seeing AI-generated misinformation spread rapidly. Disclosure requirements would help people evaluate content critically.",
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/ai-misinfo-study',
          title: 'AI-Generated Misinformation: Trends and Impacts',
        },
      ],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.NEW_USER,
      parentId: generateResponseId(tn, 4),
      content:
        "But wouldn't bad actors just ignore the disclosure rules? The people spreading misinformation aren't going to follow labeling requirements.",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 6),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: generateResponseId(tn, 5),
      content:
        'True, but having the rule creates legal consequences for non-compliance. It also helps legitimate platforms implement detection and labeling systems.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 7),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        'The creative industry is being disrupted by AI. Disclosure helps protect human artists. People should be able to choose to support human-created work.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 8),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 7),
      content:
        "I'm conflicted on this. AI is a tool, like Photoshop. We don't require 'Photoshopped' labels on edited images. Why should AI assistance be different?",
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 3: Standardized Testing (4 responses, 1 level)
 */
function generateStandardizedTestingResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.STANDARDIZED_TESTING;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "Teaching to the test has hollowed out education. We're sacrificing creativity and critical thinking for bubble sheets. Is this really what education should be?",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.NEW_USER,
      parentId: null,
      content:
        'Without standardized testing, how would we identify achievement gaps? Subjective assessments are prone to bias.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        'Other countries with better outcomes use fewer tests. Finland barely tests at all and consistently outperforms the US.',
      viewpoint: 'oppose',
      citedSources: [
        { url: 'https://example.com/finland-education', title: 'Finnish Education Model Analysis' },
      ],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.NEW_USER,
      parentId: null,
      content:
        "Maybe the problem isn't testing itself but how we use the results. Lower-stakes diagnostic testing could provide useful data without the harmful side effects.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 4: Return to Office (7 responses, 3 levels)
 */
function generateReturnToOfficeResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.RETURN_TO_OFFICE;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        "The data doesn't support forced return-to-office. Multiple studies show remote workers are equally or more productive. RTO mandates are about control, not productivity.",
      viewpoint: 'oppose',
      citedSources: [
        {
          url: 'https://example.com/remote-productivity',
          title: 'Remote Work Productivity Meta-Analysis',
        },
      ],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 1),
      content:
        "As a manager, I've seen collaboration suffer with remote work. The spontaneous hallway conversations that sparked ideas just don't happen over Slack.",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 2),
      content:
        'Those hallway conversations also interrupted deep work. Maybe the real issue is that different types of work need different environments?',
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: null,
      content:
        'RTO mandates are tone-deaf to employee needs. People have restructured their lives around remote work—moved, arranged childcare, improved work-life balance.',
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 4),
      content:
        "But companies made decisions too—leases, office investments, team structures. Shouldn't employees show some flexibility in return?",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 6),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: generateResponseId(tn, 5),
      content:
        "Sunk cost fallacy. Just because companies have office leases doesn't mean forcing people back makes sense. Cut your losses.",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 7),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        'I think hybrid models make sense—everyone in on the same days for collaboration, flexibility otherwise. The extremes on both sides miss this middle ground.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 5: Preventive Care (5 responses, 2 levels)
 */
function generatePreventiveCareResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.PREVENTIVE_CARE;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: null,
      content:
        "Preventive care saves money long-term. A flu shot costs $40; treating flu complications costs thousands. Screenings catch cancer early when it's treatable.",
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/preventive-care-economics',
          title: 'Economic Analysis of Preventive Healthcare',
        },
      ],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 1),
      content:
        'Exactly. Making preventive care free removes barriers for low-income patients who skip check-ups due to cost. This is both equity and public health.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "Who defines 'preventive'? This category keeps expanding. Unlimited free coverage would increase premiums for everyone.",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: generateResponseId(tn, 3),
      content:
        "Fair concern. We should cover evidence-based preventive care with clear clinical guidelines—not everything, but what's proven effective.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 4),
      content:
        "I could support that approach. Data-driven coverage makes sense. My concern is mission creep where everything becomes 'preventive.'",
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 6: Age Verification (6 responses, 2 levels)
 */
function generateAgeVerificationResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.AGE_VERIFICATION;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: null,
      content:
        'Child safety online is a serious issue. Kids are exposed to harmful content, predators, and addictive design patterns. Age verification could help.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 1),
      content:
        'But how would verification work without creating massive privacy risks? Do we really want tech companies holding government IDs?',
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: generateResponseId(tn, 2),
      content:
        "Privacy-preserving verification methods exist—zero-knowledge proofs, third-party verifiers. It doesn't have to be 'upload your ID.'",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "Shouldn't this be parents' responsibility? Government mandates take away parental choice and create a surveillance infrastructure.",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.NEW_USER,
      parentId: generateResponseId(tn, 4),
      content:
        "Parents can't always monitor everything. And what about kids whose parents don't supervise? They deserve protection too.",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 6),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        'Maybe we need both approaches—better parental tools AND some baseline platform requirements. Not everything has to be either/or.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 7: Mandatory Voting (4 responses, 1 level)
 */
function generateMandatoryVotingResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.MANDATORY_VOTING;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: null,
      content:
        'Australia has had mandatory voting for nearly a century. Their turnout is over 90%, and their democracy seems healthier for it.',
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/australia-voting',
          title: 'Compulsory Voting: The Australian Experience',
        },
      ],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        "The freedom NOT to vote is also important. Forced participation isn't real civic engagement—it's just checking a box.",
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: null,
      content:
        "You can still submit a blank ballot. The point is getting people to the polls. Many who don't vote actually want to but face barriers.",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        'If the goal is higher turnout, why not make voting easier first—automatic registration, more polling places, vote-by-mail—before forcing people?',
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 8: Product AI Disclosure (5 responses, 2 levels)
 */
function generateProductAIDisclosureResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.PRODUCT_AI_DISCLOSURE;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: null,
      content:
        "Consumers have a right to know what they're buying. If a product uses AI in ways that affect its behavior, that should be disclosed.",
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: generateResponseId(tn, 1),
      content:
        'AI is in everything now. My thermostat uses AI. My spam filter uses AI. Requiring disclosure for every AI use would be meaningless noise.',
      viewpoint: 'oppose',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 2),
      content:
        'Maybe focus on high-impact uses—hiring decisions, loan approvals, medical diagnoses. Not every use, but consequential ones.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "Disclosure without understanding is useless. Most people can't evaluate AI systems. We need accountability, not just labels.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 4),
      content:
        "Why not both? Disclose AND require companies to demonstrate the AI doesn't discriminate or cause harm. Transparency AND accountability.",
      viewpoint: 'support',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 9: Plastic Ban (3 responses - resolved topic)
 */
function generatePlasticBanResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.PLASTIC_BAN;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        'The environmental evidence is clear. Single-use plastics persist for centuries and are now found everywhere—oceans, soil, even our blood.',
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/microplastics-health',
          title: 'Microplastics in Human Blood: A New Study',
        },
      ],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        'Regional bans have shown that alternatives work. People adapt. Industry innovates. A nationwide ban would accelerate this transition.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.BOB_BUILDER,
      parentId: null,
      content:
        "After much discussion, it seems we've reached agreement that the environmental case is strong. The remaining questions are about implementation timeline and support for affected industries.",
      viewpoint: 'nuanced',
      citedSources: [],
    },
  ];
}

/**
 * Generate responses for Topic 10: Gain-of-Function Research Oversight (5 responses, 2 levels)
 */
function generateGOFOversightResponses(): DemoResponse[] {
  const topicId = DEMO_TOPIC_IDS.GOF_OVERSIGHT;
  const tn = getTopicNumber(topicId);

  return [
    {
      id: generateResponseId(tn, 1),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: null,
      content:
        'The biosecurity risks of gain-of-function research are existential. A lab leak of an enhanced pathogen could cause a pandemic. International oversight is essential.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 2),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 1),
      content:
        'I agree on the risks, but international oversight is hard to enforce. Countries will do this research secretly if we push too hard on restrictions.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 3),
      topicId,
      authorId: DEMO_USER_IDS.MOD_MARTINEZ,
      parentId: null,
      content:
        'Some of this research has led to vaccines and treatments. We need to balance risks against scientific benefits. Bans could slow pandemic preparedness.',
      viewpoint: 'nuanced',
      citedSources: [],
    },
    {
      id: generateResponseId(tn, 4),
      topicId,
      authorId: DEMO_USER_IDS.ADMIN_ADAMS,
      parentId: generateResponseId(tn, 3),
      content:
        "The question isn't banning all research but ensuring proper containment and review. Most scientists support stronger oversight—it's not anti-science.",
      viewpoint: 'support',
      citedSources: [
        {
          url: 'https://example.com/scientist-survey',
          title: 'Survey: Scientists Support Enhanced Biosecurity Review',
        },
      ],
    },
    {
      id: generateResponseId(tn, 5),
      topicId,
      authorId: DEMO_USER_IDS.ALICE_ANDERSON,
      parentId: generateResponseId(tn, 4),
      content:
        'Agreed. The goal should be safe research, not no research. A transparent international framework could actually enable better collaboration.',
      viewpoint: 'support',
      citedSources: [],
    },
  ];
}

/**
 * All demo responses combined
 */
export const DEMO_RESPONSES: DemoResponse[] = [
  ...generateCongestionPricingResponses(),
  ...generateAIDisclosureResponses(),
  ...generateStandardizedTestingResponses(),
  ...generateReturnToOfficeResponses(),
  ...generatePreventiveCareResponses(),
  ...generateAgeVerificationResponses(),
  ...generateMandatoryVotingResponses(),
  ...generateProductAIDisclosureResponses(),
  ...generatePlasticBanResponses(),
  ...generateGOFOversightResponses(),
];

/**
 * Get responses for a specific topic
 */
export function getResponsesByTopic(topicId: string): DemoResponse[] {
  return DEMO_RESPONSES.filter((r) => r.topicId === topicId);
}

/**
 * Get top-level responses (no parent) for a topic
 */
export function getTopLevelResponses(topicId: string): DemoResponse[] {
  return DEMO_RESPONSES.filter((r) => r.topicId === topicId && r.parentId === null);
}

/**
 * Get replies to a specific response
 */
export function getReplies(responseId: string): DemoResponse[] {
  return DEMO_RESPONSES.filter((r) => r.parentId === responseId);
}

export default DEMO_RESPONSES;
