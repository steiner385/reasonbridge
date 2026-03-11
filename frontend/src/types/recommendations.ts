/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for the Recommendation Service
 */

export interface TagInfo {
  id: string;
  name: string;
  slug: string;
}

export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * A topic recommendation from the recommendation service
 */
export interface TopicRecommendation {
  id: string;
  title: string;
  slug: string;
  description: string;
  participantCount: number;
  responseCount: number;
  activityLevel: ActivityLevel;
  tags: TagInfo[];
  score: number;
  reason: string;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Response from the general recommendations endpoint
 */
export interface TopicRecommendationsResponse {
  recommendations: TopicRecommendation[];
  total: number;
  query?: string;
  tags?: string[];
}

/**
 * A similar topic with similarity metrics
 */
export interface SimilarTopic {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: TagInfo[];
  similarityScore: number;
  sharedTags: string[];
}

/**
 * Response from the similar topics endpoint
 */
export interface SimilarTopicsResponse {
  sourceTopicId: string;
  similarTopics: SimilarTopic[];
}

/**
 * A trending topic with activity metrics
 */
export interface TrendingTopic {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: TagInfo[];
  recentResponseCount: number;
  recentParticipantCount: number;
  trendingScore: number;
  rank: number;
}

/**
 * Response from the trending topics endpoint
 */
export interface TrendingTopicsResponse {
  topics: TrendingTopic[];
  timeWindowHours: number;
  calculatedAt: string;
}

/**
 * Parameters for fetching topic recommendations
 */
export interface GetRecommendationsParams {
  query?: string;
  tags?: string[];
  limit?: number;
  userId?: string;
}

/**
 * Parameters for fetching trending topics
 */
export interface GetTrendingParams {
  hours?: number;
  limit?: number;
  tags?: string[];
}
