/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response Generator for Enhanced Demo Seed Data
 *
 * Generates threaded responses with varied viewpoints, response types,
 * and realistic conversation flow across discussions.
 */

import { generateEnhancedResponseId } from '../demo-ids.js';
import type { ScaleConfig } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';
import type { GeneratedUserPersona } from './user-generator.js';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type ResponseType =
  | 'thesis'
  | 'agreement'
  | 'disagreement'
  | 'question'
  | 'synthesis'
  | 'evidence';

export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface CitedSource {
  url: string;
  title: string;
}

export interface GeneratedResponse {
  id: string;
  discussionId: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  responseType: ResponseType;
  viewpoint: ViewpointType;
  createdAtOffset: number;
  citedSources: CitedSource[];
}

export interface ResponseGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Minimal interface for generated topics (from topic-generator)
 * Defined here to avoid circular dependencies until topic-generator exists
 */
export interface GeneratedTopic {
  id: string;
  title: string;
  categoryIndex: number;
  topicIndex: number;
}

/**
 * Minimal interface for generated discussions (from topic-generator)
 */
export interface GeneratedDiscussion {
  id: string;
  topicId: string;
  discussionIndex: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RESPONSE_TYPES_ROTATION: ResponseType[] = [
  'agreement',
  'disagreement',
  'question',
  'evidence',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Assign response counts to users based on their activity tier
 */
function assignResponseCounts(
  users: GeneratedUserPersona[],
  config: ScaleConfig,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const user of users) {
    const range = config.responsesPerUser[user.activityTier];
    const [min, max] = range;
    // Deterministic count based on user index
    const count = min + (user.index % (max - min + 1));
    counts.set(user.id, count);
  }

  return counts;
}

/**
 * Decrement a user's remaining response count
 */
function decrementUserCount(counts: Map<string, number>, userId: string): void {
  const current = counts.get(userId) ?? 0;
  if (current > 0) {
    counts.set(userId, current - 1);
  }
}

/**
 * Get user with highest remaining response count
 */
function getAvailableAuthor(
  counts: Map<string, number>,
  users: GeneratedUserPersona[],
  preferredIndex: number,
): GeneratedUserPersona | null {
  // First try to find users with remaining counts
  const availableUsers = users.filter((u) => (counts.get(u.id) ?? 0) > 0);

  if (availableUsers.length === 0) {
    return null;
  }

  // Use preferred index to deterministically select a user
  const selected = availableUsers[preferredIndex % availableUsers.length];
  return selected ?? null;
}

/**
 * Get response type for a reply based on index
 */
function getReplyType(index: number): ResponseType {
  const type = RESPONSE_TYPES_ROTATION[index % RESPONSE_TYPES_ROTATION.length];
  // RESPONSE_TYPES_ROTATION is a constant non-empty array, so this is always defined
  return type as ResponseType;
}

/**
 * Determine viewpoint based on response type and index
 */
function getViewpointForType(type: ResponseType, index: number): ViewpointType {
  switch (type) {
    case 'thesis':
      // Root thesis posts alternate between support and oppose
      return index % 2 === 0 ? 'support' : 'oppose';
    case 'agreement':
      return 'support';
    case 'disagreement':
      return 'oppose';
    case 'question':
      // Questions are generally nuanced/exploratory
      return 'nuanced';
    case 'evidence':
      // Evidence can support either side
      return index % 2 === 0 ? 'support' : 'oppose';
    case 'synthesis':
      // Synthesis responses bring together perspectives
      return 'nuanced';
    default:
      return 'nuanced';
  }
}

/**
 * Generate mock content based on topic and response type
 */
function generateMockContent(
  topicTitle: string,
  type: ResponseType,
  author: GeneratedUserPersona,
): string {
  const templates: Record<ResponseType, string[]> = {
    thesis: [
      `After careful consideration of ${topicTitle}, I believe we need to examine the core principles at stake. ${author.writingStyle === 'academic' ? 'The scholarly literature suggests' : 'My experience shows'} that this issue deserves nuanced analysis.`,
      `${topicTitle} presents a fundamental challenge to our current approach. ${author.argumentationStyle === 'evidence-based' ? 'The data clearly indicates' : 'From a principled standpoint'} that significant changes are warranted.`,
    ],
    agreement: [
      `I strongly agree with the previous point. ${author.writingStyle === 'conversational' ? "You've really hit the nail on the head here." : 'This analysis aligns well with established research.'}`,
      `Building on what was said, I think there's even more support for this position. ${author.argumentationStyle === 'pragmatic' ? 'In practice, we see this working well.' : 'The theoretical foundations are solid.'}`,
    ],
    disagreement: [
      `While I appreciate the perspective, I respectfully disagree. ${author.writingStyle === 'formal' ? 'The counterarguments merit consideration.' : "Here's another way to look at it."}`,
      `I see it differently. ${author.argumentationStyle === 'principle-driven' ? 'The underlying principles suggest otherwise.' : "The practical implications don't support this view."}`,
    ],
    question: [
      `This raises an important question: ${author.writingStyle === 'academic' ? 'What does the empirical evidence suggest about' : 'How would this actually work in'} real-world scenarios?`,
      `I'm curious about one aspect. ${author.writingStyle === 'conversational' ? 'Can someone help me understand' : 'Could you elaborate on'} the implications for affected stakeholders?`,
    ],
    evidence: [
      `${author.writingStyle === 'academic' ? 'Recent studies indicate' : 'The evidence shows'} that this approach has measurable impacts. ${author.argumentationStyle === 'evidence-based' ? 'Multiple data sources confirm this trend.' : 'The case studies are compelling.'}`,
      `Looking at the empirical data, ${author.writingStyle === 'formal' ? 'one observes' : 'we can see'} concrete outcomes from similar policies. This deserves careful consideration.`,
    ],
    synthesis: [
      `Taking stock of this discussion, I see merit on multiple sides. ${author.writingStyle === 'academic' ? 'A synthetic view suggests' : 'Maybe we can find'} common ground by focusing on shared objectives.`,
      `Reflecting on the various perspectives shared, ${author.argumentationStyle === 'pragmatic' ? 'a practical middle path emerges' : 'several principles align across positions'}. Perhaps the solution lies in balancing these considerations.`,
    ],
  };

  const options = templates[type];
  // Deterministic selection based on author index
  const idx = author.index % options.length;
  // options is a non-empty array from templates, so this is always defined
  // Use non-null assertion since templates guarantees at least 2 entries per type
  return options[idx]!;
}

/**
 * Generate mock citations for evidence responses
 */
function generateMockSources(index: number): CitedSource[] {
  const sources: CitedSource[][] = [
    [
      {
        url: 'https://example.com/research-study-' + index,
        title: 'Comprehensive Analysis of Policy Impacts',
      },
    ],
    [
      {
        url: 'https://example.com/meta-analysis-' + index,
        title: 'Meta-Analysis: Examining Multiple Studies',
      },
      {
        url: 'https://example.com/case-study-' + index,
        title: 'Case Study: Real-World Implementation',
      },
    ],
    [
      {
        url: 'https://example.com/data-report-' + index,
        title: 'Statistical Report on Outcomes',
      },
    ],
    [], // Some evidence responses don't have sources
  ];

  const selected = sources[index % sources.length];
  // sources is a non-empty array, so this is always defined
  return selected ?? [];
}

/**
 * Generate thread structure for a discussion
 */
function generateThreadForDiscussion(
  discussion: GeneratedDiscussion,
  topic: GeneratedTopic,
  users: GeneratedUserPersona[],
  userResponseCounts: Map<string, number>,
  baseOffset: number,
): GeneratedResponse[] {
  const responses: GeneratedResponse[] = [];
  let responseIndex = 1;
  let timeOffset = baseOffset;

  // Track response IDs for threading
  const rootResponseIds: string[] = [];
  const directReplyIds: string[] = [];

  // --- Generate 2 root responses (thesis type) ---
  for (let i = 0; i < 2; i++) {
    const author = getAvailableAuthor(userResponseCounts, users, responseIndex + i);
    if (!author) break;

    const id = generateEnhancedResponseId(discussion.discussionIndex + 1, responseIndex);
    rootResponseIds.push(id);

    responses.push({
      id,
      discussionId: discussion.id,
      topicId: topic.id,
      authorId: author.id,
      parentId: null,
      content: generateMockContent(topic.title, 'thesis', author),
      responseType: 'thesis',
      viewpoint: getViewpointForType('thesis', i),
      createdAtOffset: timeOffset,
      citedSources: i === 0 ? generateMockSources(responseIndex) : [],
    });

    decrementUserCount(userResponseCounts, author.id);
    responseIndex++;
    timeOffset += 1; // 1 day between root posts
  }

  // --- Generate 4 direct replies with varied types ---
  for (let i = 0; i < 4; i++) {
    const author = getAvailableAuthor(userResponseCounts, users, responseIndex + i * 2);
    if (!author) break;

    // Skip if no root responses exist yet
    if (rootResponseIds.length === 0) break;
    const parentId = rootResponseIds[i % rootResponseIds.length] ?? null;
    const type = getReplyType(i);
    const id = generateEnhancedResponseId(discussion.discussionIndex + 1, responseIndex);
    directReplyIds.push(id);

    responses.push({
      id,
      discussionId: discussion.id,
      topicId: topic.id,
      authorId: author.id,
      parentId,
      content: generateMockContent(topic.title, type, author),
      responseType: type,
      viewpoint: getViewpointForType(type, i),
      createdAtOffset: timeOffset,
      citedSources: type === 'evidence' ? generateMockSources(responseIndex) : [],
    });

    decrementUserCount(userResponseCounts, author.id);
    responseIndex++;
    timeOffset += 0.5; // 12 hours between replies
  }

  // --- Generate 3 nested replies, with last being synthesis ---
  for (let i = 0; i < 3; i++) {
    const author = getAvailableAuthor(userResponseCounts, users, responseIndex + i * 3);
    if (!author) break;

    // Skip if no direct replies exist yet
    if (directReplyIds.length === 0) break;
    const parentId = directReplyIds[i % directReplyIds.length] ?? null;
    const isSynthesis = i === 2;
    const type: ResponseType = isSynthesis ? 'synthesis' : getReplyType(i + 4);
    const id = generateEnhancedResponseId(discussion.discussionIndex + 1, responseIndex);

    responses.push({
      id,
      discussionId: discussion.id,
      topicId: topic.id,
      authorId: author.id,
      parentId,
      content: generateMockContent(topic.title, type, author),
      responseType: type,
      viewpoint: getViewpointForType(type, i),
      createdAtOffset: timeOffset,
      citedSources: type === 'evidence' ? generateMockSources(responseIndex) : [],
    });

    decrementUserCount(userResponseCounts, author.id);
    responseIndex++;
    timeOffset += 0.25; // 6 hours between nested replies
  }

  return responses;
}

/**
 * Enrich responses with AI-generated content (optional)
 */
async function enrichResponsesWithAI(
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  aiClient: AIClient,
): Promise<void> {
  console.log('Enriching responses with AI...');

  // Build topic lookup
  const topicMap = new Map<string, GeneratedTopic>();
  for (const topic of topics) {
    topicMap.set(topic.id, topic);
  }

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < responses.length; i += batchSize) {
    const batch = responses.slice(i, i + batchSize);
    const prompts = batch.map((response) => {
      const topic = topicMap.get(response.topicId);
      const topicTitle = topic?.title ?? 'this topic';

      return (
        `Generate a thoughtful ${response.responseType} response for a discussion about "${topicTitle}". ` +
        `The response should express a ${response.viewpoint} viewpoint. ` +
        `Keep it concise (2-4 sentences) and suitable for a rational discussion platform. ` +
        `${response.parentId ? 'This is a reply to another comment, so reference the previous point.' : 'This is a top-level post introducing a position.'}`
      );
    });

    const generatedContent = await aiClient.generateBatch(prompts);
    batch.forEach((response, j) => {
      const content = generatedContent[j];
      if (content !== undefined) {
        response.content = content;
      }
    });

    console.log(
      `  Enriched ${Math.min(i + batchSize, responses.length)}/${responses.length} responses`,
    );
  }
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate responses for all discussions
 *
 * @param discussions - Array of generated discussions
 * @param topics - Array of generated topics
 * @param users - Array of generated user personas
 * @param config - Scale configuration for response counts
 * @param options - Optional AI client and mock data flag
 * @returns Promise resolving to array of generated responses
 */
export async function generateResponses(
  discussions: GeneratedDiscussion[],
  topics: GeneratedTopic[],
  users: GeneratedUserPersona[],
  config: ScaleConfig,
  options: ResponseGeneratorOptions = {},
): Promise<GeneratedResponse[]> {
  const { aiClient, useMockData = true } = options;

  // Build topic lookup map
  const topicMap = new Map<string, GeneratedTopic>();
  for (const topic of topics) {
    topicMap.set(topic.id, topic);
  }

  // Assign response counts to users based on activity tier
  const userResponseCounts = assignResponseCounts(users, config);

  // Generate thread structures for each discussion
  const allResponses: GeneratedResponse[] = [];
  let baseOffset = 0;

  for (const discussion of discussions) {
    const topic = topicMap.get(discussion.topicId);
    if (!topic) {
      console.warn(`Topic not found for discussion ${discussion.id}`);
      continue;
    }

    const threadResponses = generateThreadForDiscussion(
      discussion,
      topic,
      users,
      userResponseCounts,
      baseOffset,
    );

    allResponses.push(...threadResponses);
    baseOffset += 3; // 3 days between discussions for realistic spread
  }

  // Optionally enrich with AI-generated content
  if (aiClient && !useMockData) {
    await enrichResponsesWithAI(allResponses, topics, aiClient);
  }

  console.log(
    `Generated ${allResponses.length} responses across ${discussions.length} discussions`,
  );

  return allResponses;
}

export default generateResponses;
