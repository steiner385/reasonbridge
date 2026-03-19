/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, IsEnum, Length, Matches } from 'class-validator';
import { TagSource } from '@prisma/client';

// Re-export for convenience
export { TagSource };

/**
 * DTO for adding a tag to a topic
 * Feature: AI Suggestion Actions (#1054)
 *
 * Used when users accept AI-suggested tags or add their own.
 */
export class AddTopicTagDto {
  /**
   * Tag name (2-50 characters, alphanumeric with spaces/hyphens)
   */
  @IsString()
  @Length(2, 50, {
    message: 'Tag must be between 2 and 50 characters',
  })
  @Matches(/^[a-zA-Z0-9\s-]+$/, {
    message: 'Tag can only contain letters, numbers, spaces, and hyphens',
  })
  tag!: string;

  /**
   * Source of the tag (defaults to AI_SUGGESTED for this endpoint)
   * - AI_SUGGESTED: Tag was suggested by AI and accepted by user
   * - COMMUNITY: Tag was added by a community member
   * - CREATOR: Tag was added by the topic creator (on create)
   */
  @IsOptional()
  @IsEnum(TagSource, {
    message: 'source must be CREATOR, AI_SUGGESTED, or COMMUNITY',
  })
  source?: TagSource;
}

/**
 * Response DTO for added tag
 */
export interface AddTagResponseDto {
  success: boolean;
  tag: {
    id: string;
    name: string;
    slug: string;
  };
  topicId: string;
  source: TagSource;
}
