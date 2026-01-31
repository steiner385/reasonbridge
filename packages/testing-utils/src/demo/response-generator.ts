/**
 * Demo Response Content Generator
 *
 * Generates realistic discussion responses for demo data.
 * Content varies by viewpoint (support, oppose, nuanced) and persona characteristics.
 */

import { generateDemoTimestamp, generateThreadTimestamps } from './timestamp-generator';

export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface GeneratedResponse {
  content: string;
  viewpoint: ViewpointType;
  hasCitation: boolean;
  citedSources: CitedSource[];
  mentions: string[]; // User IDs mentioned
}

export interface CitedSource {
  url: string;
  title: string;
  author?: string;
  publishedAt?: string;
}

/**
 * Pre-written response templates by topic and viewpoint
 * These provide realistic content for demos
 */
const RESPONSE_TEMPLATES: Record<string, Record<ViewpointType, string[]>> = {
  CONGESTION_PRICING: {
    support: [
      'Congestion pricing has worked remarkably well in cities like Stockholm and London. After implementation, Stockholm saw a 20% reduction in traffic and significant air quality improvements. The key is using the revenue for public transit improvements.',
      "The evidence from Singapore is compelling - they've had congestion pricing since 1975 and it's been refined over decades. It's not just about reducing traffic; it's about making cities more livable and efficient.",
      'I think the equity concerns can be addressed with proper implementation. London exempts certain vehicles and provides discounts for low-income residents. The real inequity is the current system where everyone breathes polluted air.',
    ],
    oppose: [
      'This is essentially a regressive tax that punishes working-class people who have no choice but to drive. Not everyone can afford to live near their workplace or has access to reliable public transit.',
      "Before we start charging people to drive, shouldn't we first invest in alternatives? Many areas have inadequate public transit, and expecting people to bike or walk isn't realistic in all climates.",
      'The administrative costs and surveillance infrastructure required for congestion pricing raise serious concerns. Do we really want cameras tracking every vehicle movement?',
    ],
    nuanced: [
      'I see merits on both sides. Congestion pricing can work, but only if implemented alongside significant transit improvements and with exemptions for essential workers and low-income residents.',
      'The effectiveness really depends on local context. What works in dense cities like London might not translate well to sprawling American metros with different urban planning legacies.',
    ],
  },
  AI_DISCLOSURE: {
    support: [
      "Transparency is fundamental to informed decision-making. When I read an article or view an image, I have a right to know if it was created by AI. This isn't anti-technology - it's pro-transparency.",
      "We're already seeing AI-generated misinformation spreading rapidly. Disclosure requirements would help people evaluate content more critically and make informed judgments about what they consume.",
      "The creative industry is being disrupted by AI, and disclosure helps protect human artists and writers. People should be able to choose to support human-created work if that's their preference.",
    ],
    oppose: [
      'Where do you draw the line? Spell checkers are AI. Grammar tools are AI. Auto-complete is AI. A disclosure requirement would either be so broad as to be meaningless or so narrow as to be easily circumvented.',
      "This feels like moral panic about new technology. We didn't require labels when photography disrupted painting or when digital music disrupted vinyl. Let the market and consumers decide.",
      "Disclosure requirements could stifle innovation and put companies at a competitive disadvantage globally. Other countries won't implement similar rules, so we'd just be handicapping our own tech sector.",
    ],
    nuanced: [
      "I think we need to distinguish between different use cases. AI-generated news content should absolutely be disclosed. But AI assistance in creative work is more complex - it's a tool, like Photoshop.",
      'The challenge is enforcement and definition. Maybe instead of rigid disclosure rules, we should focus on developing better AI detection tools and media literacy education.',
    ],
  },
  RETURN_TO_OFFICE: {
    support: [
      "Remote work has been a productivity disaster for many companies. Studies show that collaboration, mentorship, and spontaneous innovation suffer when teams aren't physically together.",
      "There's a reason companies invested billions in office spaces. In-person work builds culture, facilitates learning, and creates accountability that video calls can't replicate.",
      "As a manager, I've seen firsthand how remote work impacts junior employees. They miss out on the informal learning that happens when you can tap a senior colleague's shoulder.",
    ],
    oppose: [
      "The data doesn't support forced return-to-office. Multiple studies show remote workers are equally or more productive. What's really happening is managers who can't adapt to new management styles.",
      'RTO mandates are tone-deaf to employee needs. People have restructured their lives around remote work - moved to cheaper areas, arranged childcare, improved work-life balance.',
      "If companies truly believed office work was more productive, they'd be offering incentives, not mandates. The fact that they're forcing people back suggests the real motivation is control, not productivity.",
    ],
    nuanced: [
      'Different roles need different arrangements. Creative collaboration may benefit from in-person work, while deep focus tasks are often better done remotely. Blanket policies ignore this complexity.',
      'I think hybrid models make the most sense, but they need to be thoughtfully designed. Having everyone in on the same days for collaboration, with flexibility otherwise, seems like a reasonable middle ground.',
    ],
  },
  STANDARDIZED_TESTING: {
    support: [
      'Without standardized testing, how would we identify achievement gaps or measure school effectiveness? Subjective assessments are prone to bias and make comparison impossible.',
      "Tests aren't perfect, but they provide objective data that helps ensure accountability. Schools serving disadvantaged communities need this accountability to get the resources they need.",
      'The anti-testing movement often comes from privileged communities where students have other ways to demonstrate achievement. Standardized tests can be an equalizer for students without those advantages.',
    ],
    oppose: [
      "Teaching to the test has hollowed out education. We're sacrificing creativity, critical thinking, and joy in learning to optimize for bubble sheets. Is this really what education should be?",
      'Standardized tests are culturally biased and measure socioeconomic status more than actual ability. They perpetuate inequality rather than identify talent.',
      "Other countries with better educational outcomes use fewer standardized tests. Finland barely tests at all and consistently outperforms the US. Maybe we're asking the wrong questions.",
    ],
    nuanced: [
      'I think some form of assessment is necessary, but the current high-stakes approach is counterproductive. Lower-stakes diagnostic testing could provide useful data without the harmful side effects.',
      "The problem isn't testing itself but how we use the results. Tests as one data point among many? Fine. Tests as the sole determinant of school funding and student futures? That's where we've gone wrong.",
    ],
  },
  PREVENTIVE_CARE: {
    support: [
      "Preventive care saves money in the long run. A flu shot costs $40; treating flu complications costs thousands. Screenings catch cancer early when it's treatable, not late when it's a death sentence.",
      'Making preventive care free removes barriers for low-income patients who might skip check-ups due to cost. This is both an equity issue and a public health issue.',
      "Every major health organization recommends preventive care coverage. This isn't controversial in the medical community - the evidence for cost-effectiveness is overwhelming.",
    ],
    oppose: [
      "Who defines 'preventive'? This category keeps expanding, and unlimited free coverage would increase premiums for everyone. Healthcare resources are finite.",
      'Personal responsibility matters. If everything is free, people have no incentive to make healthy lifestyle choices. Some cost-sharing ensures people value what they receive.',
      'Insurance is supposed to cover unexpected events, not routine maintenance. This is like expecting car insurance to cover oil changes.',
    ],
    nuanced: [
      'I support covering evidence-based preventive care, but not every test and screening has good evidence. We need to be selective based on actual health outcomes, not just intuition about prevention.',
      'The implementation matters. Full coverage with no gatekeeping could lead to overuse and overtesting, which has its own harms. Some oversight mechanism is needed.',
    ],
  },
};

/**
 * Sample citations for responses
 */
const SAMPLE_CITATIONS: CitedSource[] = [
  {
    url: 'https://example.com/study-on-congestion-pricing',
    title: 'Evaluating the Impact of Congestion Pricing in Major Cities',
    author: 'Dr. Sarah Chen',
    publishedAt: '2025-03-15',
  },
  {
    url: 'https://example.com/ai-disclosure-report',
    title: 'Consumer Attitudes Toward AI Transparency',
    author: 'Tech Policy Institute',
    publishedAt: '2025-06-22',
  },
  {
    url: 'https://example.com/remote-work-productivity',
    title: 'Remote Work and Productivity: A Meta-Analysis',
    author: 'Harvard Business Review',
    publishedAt: '2025-01-10',
  },
];

/**
 * Generate a response for a given topic and viewpoint
 *
 * @param topicKey - Key from DEMO_TOPIC_IDS (e.g., 'CONGESTION_PRICING')
 * @param viewpoint - The stance of the response
 * @param index - Index for selecting among multiple templates
 * @param options - Additional options
 * @returns Generated response content
 */
export function generateResponseContent(
  topicKey: string,
  viewpoint: ViewpointType,
  index: number = 0,
  options: { includeCitation?: boolean; mentions?: string[] } = {},
): GeneratedResponse {
  const templates = RESPONSE_TEMPLATES[topicKey]?.[viewpoint];

  if (!templates || templates.length === 0) {
    // Fallback for topics without templates
    return {
      content: generateFallbackResponse(viewpoint),
      viewpoint,
      hasCitation: false,
      citedSources: [],
      mentions: options.mentions || [],
    };
  }

  const selectedTemplate = templates[index % templates.length];
  const hasCitation = options.includeCitation ?? index % 3 === 0; // ~30% have citations

  return {
    content: selectedTemplate,
    viewpoint,
    hasCitation,
    citedSources: hasCitation ? [SAMPLE_CITATIONS[index % SAMPLE_CITATIONS.length]] : [],
    mentions: options.mentions || [],
  };
}

/**
 * Generate a fallback response when no template exists
 */
function generateFallbackResponse(viewpoint: ViewpointType): string {
  const fallbacks: Record<ViewpointType, string[]> = {
    support: [
      'I think this proposal has real merit. The evidence suggests it could work well if implemented thoughtfully.',
      'This seems like a reasonable approach. We should give it serious consideration.',
    ],
    oppose: [
      "I have concerns about this approach. The potential downsides seem significant and haven't been adequately addressed.",
      "While I understand the intent, I don't think this is the right solution to the problem.",
    ],
    nuanced: [
      'There are valid points on both sides of this debate. I think the answer depends heavily on implementation details.',
      'I see merit in both perspectives. Perhaps we need a more nuanced approach that takes multiple concerns into account.',
    ],
  };

  const options = fallbacks[viewpoint];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate a reply to a parent response
 *
 * @param parentViewpoint - Viewpoint of the parent response
 * @param replyViewpoint - Viewpoint of this reply
 * @returns Reply content
 */
export function generateReplyContent(
  parentViewpoint: ViewpointType,
  replyViewpoint: ViewpointType,
): string {
  if (parentViewpoint === replyViewpoint) {
    return "I completely agree with this perspective. You've articulated it better than I could have.";
  }

  if (parentViewpoint === 'nuanced' || replyViewpoint === 'nuanced') {
    return "You raise some good points, but I think there's more complexity here than you're acknowledging.";
  }

  // Opposing views
  return "I respectfully disagree with this take. Here's why I see it differently...";
}

export default {
  generateResponseContent,
  generateReplyContent,
};
