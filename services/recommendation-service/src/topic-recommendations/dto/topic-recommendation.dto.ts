/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query parameters for getting topic recommendations
 */
export class GetTopicRecommendationsDto {
  /** Search query for finding similar topics */
  @IsOptional()
  @IsString()
  query?: string;

  /** Tags to match against */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  tags?: string[];

  /** Maximum number of recommendations to return */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  /** User ID for personalized recommendations */
  @IsOptional()
  @IsUUID()
  userId?: string;
}

/**
 * Query parameters for similar topics search
 */
export class GetSimilarTopicsDto {
  /** Topic ID to find similar topics for */
  @IsUUID()
  topicId!: string;

  /** Maximum number of similar topics to return */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 5;
}

/**
 * Query parameters for trending topics
 */
export class GetTrendingTopicsDto {
  /** Time window for trending calculation (hours) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // 1 week
  @Transform(({ value }) => parseInt(value, 10))
  hours?: number = 24;

  /** Maximum number of trending topics to return */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  /** Filter by tags */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  tags?: string[];
}

/**
 * Tag information in recommendations
 */
export interface TagInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * A single topic recommendation
 */
export interface TopicRecommendationDto {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Topic description */
  description: string;
  /** Number of participants */
  participantCount: number;
  /** Number of responses */
  responseCount: number;
  /** Activity level */
  activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Associated tags */
  tags: TagInfo[];
  /** Recommendation score (0-1) */
  score: number;
  /** Reason for recommendation */
  reason: string;
  /** When the topic was created */
  createdAt: string;
  /** When the topic had last activity */
  lastActivityAt: string;
}

/**
 * Response containing topic recommendations
 */
export interface TopicRecommendationsResponseDto {
  /** List of recommended topics */
  recommendations: TopicRecommendationDto[];
  /** Total number of matching topics */
  total: number;
  /** Query used for recommendations */
  query?: string;
  /** Tags used for filtering */
  tags?: string[];
}

/**
 * Similar topic with similarity score
 */
export interface SimilarTopicDto {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Topic description */
  description: string;
  /** Associated tags */
  tags: TagInfo[];
  /** Similarity score (0-1) */
  similarityScore: number;
  /** Shared tags with the source topic */
  sharedTags: string[];
}

/**
 * Response containing similar topics
 */
export interface SimilarTopicsResponseDto {
  /** Source topic ID */
  sourceTopicId: string;
  /** List of similar topics */
  similarTopics: SimilarTopicDto[];
}

/**
 * Trending topic with activity metrics
 */
export interface TrendingTopicDto {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Topic description */
  description: string;
  /** Associated tags */
  tags: TagInfo[];
  /** Recent response count (in time window) */
  recentResponseCount: number;
  /** Recent participant count (in time window) */
  recentParticipantCount: number;
  /** Trending score */
  trendingScore: number;
  /** Rank in trending list */
  rank: number;
}

/**
 * Response containing trending topics
 */
export interface TrendingTopicsResponseDto {
  /** List of trending topics */
  topics: TrendingTopicDto[];
  /** Time window in hours */
  timeWindowHours: number;
  /** When the trending data was calculated */
  calculatedAt: string;
}
