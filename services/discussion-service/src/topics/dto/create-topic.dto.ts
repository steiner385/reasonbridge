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
} from 'class-validator';

/**
 * DTO for creating a new discussion topic
 * Feature 016: Topic Management (T006)
 */
export class CreateTopicDto {
  /**
   * Topic title (10-200 characters)
   */
  @IsString()
  @Length(10, 200, {
    message: 'Title must be between 10 and 200 characters',
  })
  title!: string;

  /**
   * Topic description (50-5000 characters)
   */
  @IsString()
  @Length(50, 5000, {
    message: 'Description must be between 50 and 5000 characters',
  })
  description!: string;

  /**
   * Topic tags (1-5 tags, each 2-50 characters, alphanumeric with spaces/hyphens)
   */
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
  tags!: string[];

  /**
   * Topic visibility (defaults to PUBLIC)
   */
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'], {
    message: 'Visibility must be PUBLIC, PRIVATE, or UNLISTED',
  })
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  /**
   * Evidence standards for the topic (defaults to STANDARD)
   */
  @IsOptional()
  @IsEnum(['MINIMAL', 'STANDARD', 'RIGOROUS'], {
    message: 'Evidence standards must be MINIMAL, STANDARD, or RIGOROUS',
  })
  evidenceStandards?: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';
}
