/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TopicRelationshipType, LinkSource, ConfirmationStatus } from '@prisma/client';

// Re-export Prisma enums for convenience
export { TopicRelationshipType, LinkSource, ConfirmationStatus };

/**
 * DTO for creating a new topic link
 * Feature 016: Topic Management - Topic Linking (T217)
 */
export class CreateTopicLinkDto {
  /**
   * ID of the target topic to link to
   */
  @IsUUID()
  targetTopicId!: string;

  /**
   * Type of relationship between the topics
   */
  @IsEnum(TopicRelationshipType, {
    message:
      'relationshipType must be one of: BUILDS_ON, RESPONDS_TO, CONTRADICTS, RELATED, SHARES_PROPOSITION',
  })
  relationshipType!: TopicRelationshipType;

  /**
   * Source of the link (AI suggested or user proposed)
   * Defaults to USER_PROPOSED
   */
  @IsOptional()
  @IsEnum(LinkSource, {
    message: 'linkSource must be AI_SUGGESTED or USER_PROPOSED',
  })
  linkSource?: LinkSource;
}

/**
 * DTO for updating a topic link's confirmation status
 */
export class UpdateTopicLinkStatusDto {
  /**
   * New confirmation status
   */
  @IsEnum(ConfirmationStatus, {
    message: 'status must be PENDING, CONFIRMED, or REJECTED',
  })
  status!: ConfirmationStatus;
}

/**
 * Query parameters for getting topic links
 */
export class GetTopicLinksQueryDto {
  /**
   * Filter by relationship type
   */
  @IsOptional()
  @IsEnum(TopicRelationshipType)
  relationshipType?: TopicRelationshipType;

  /**
   * Filter by confirmation status
   */
  @IsOptional()
  @IsEnum(ConfirmationStatus)
  status?: ConfirmationStatus;

  /**
   * Filter by link source
   */
  @IsOptional()
  @IsEnum(LinkSource)
  linkSource?: LinkSource;
}

/**
 * Response DTO for a topic link
 */
export interface TopicLinkResponseDto {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  relationshipType: TopicRelationshipType;
  linkSource: LinkSource;
  confirmationStatus: ConfirmationStatus;
  proposerId: string | null;
  confirmedByCount: number;
  rejectedByCount: number;
  createdAt: Date;
  sourceTopic?: {
    id: string;
    title: string;
    slug: string;
  };
  targetTopic?: {
    id: string;
    title: string;
    slug: string;
  };
}

/**
 * Response DTO for linked topics (simplified view)
 */
export interface LinkedTopicResponseDto {
  id: string;
  title: string;
  slug: string;
  relationshipType: TopicRelationshipType;
  linkId: string;
  confirmationStatus: ConfirmationStatus;
}
