/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for updating an existing discussion topic
 * Feature 016: Topic Management (T007)
 *
 * All fields are optional (partial update)
 * Edit reason is required if topic is >24 hours old (enforced at service level)
 */
export class UpdateTopicDto {
  /**
   * Updated topic title (10-200 characters)
   */
  @IsOptional()
  @IsString()
  @Length(10, 200, {
    message: 'Title must be between 10 and 200 characters',
  })
  title?: string;

  /**
   * Updated topic description (50-5000 characters)
   */
  @IsOptional()
  @IsString()
  @Length(50, 5000, {
    message: 'Description must be between 50 and 5000 characters',
  })
  description?: string;

  /**
   * Updated topic tags (1-5 tags, each 2-50 characters)
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least 1 tag is required',
  })
  @ArrayMaxSize(5, {
    message: 'Maximum 5 tags allowed',
  })
  @IsString({ each: true })
  @Length(2, 50, {
    each: true,
    message: 'Each tag must be between 2 and 50 characters',
  })
  @Matches(/^[a-zA-Z0-9\s-]+$/, {
    each: true,
    message: 'Tags can only contain letters, numbers, spaces, and hyphens',
  })
  tags?: string[];

  /**
   * Updated visibility
   */
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'], {
    message: 'Visibility must be PUBLIC, PRIVATE, or UNLISTED',
  })
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  /**
   * Reason for edit (required if topic >24h old, enforced at service level)
   */
  @IsOptional()
  @IsString()
  @Length(10, 500, {
    message: 'Edit reason must be between 10 and 500 characters',
  })
  editReason?: string;

  /**
   * Flag edit for moderator review
   */
  @IsOptional()
  flagForReview?: boolean;
}
