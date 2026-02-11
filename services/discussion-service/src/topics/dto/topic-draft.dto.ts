/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  MaxLength,
  ArrayMaxSize,
  Matches,
  IsBoolean,
  IsUUID,
} from 'class-validator';

/**
 * DTO for creating/updating a topic draft
 * Feature 016: Topic Management (T212)
 *
 * All fields are optional since drafts are work-in-progress
 */
export class SaveTopicDraftDto {
  /**
   * Optional draft ID for updating existing draft
   * If not provided, creates a new draft
   */
  @IsOptional()
  @IsUUID()
  id?: string;

  /**
   * Topic title (max 200 characters)
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Title cannot exceed 200 characters',
  })
  title?: string;

  /**
   * Topic description (max 5000 characters)
   */
  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Description cannot exceed 5000 characters',
  })
  description?: string;

  /**
   * Topic tags (max 5 tags)
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, {
    message: 'Maximum 5 tags allowed',
  })
  @IsString({ each: true })
  @MaxLength(50, {
    each: true,
    message: 'Each tag cannot exceed 50 characters',
  })
  @Matches(/^[a-zA-Z0-9\s-]*$/, {
    each: true,
    message: 'Tags can only contain letters, numbers, spaces, and hyphens',
  })
  tags?: string[];

  /**
   * Topic visibility
   */
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'], {
    message: 'Visibility must be PUBLIC, PRIVATE, or UNLISTED',
  })
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  /**
   * Evidence standards for the topic
   */
  @IsOptional()
  @IsEnum(['MINIMAL', 'STANDARD', 'RIGOROUS'], {
    message: 'Evidence standards must be MINIMAL, STANDARD, or RIGOROUS',
  })
  evidenceStandards?: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';

  /**
   * Flag for mature content
   */
  @IsOptional()
  @IsBoolean()
  isMatureContent?: boolean;
}

/**
 * Response DTO for topic draft
 */
export interface TopicDraftResponseDto {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  evidenceStandards: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';
  isMatureContent: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

/**
 * Response DTO for list of drafts
 */
export interface TopicDraftsListResponseDto {
  drafts: TopicDraftResponseDto[];
  total: number;
}
