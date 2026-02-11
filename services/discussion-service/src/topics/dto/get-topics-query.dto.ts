/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsUUID,
  IsArray,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for GET /topics endpoint with filtering and pagination
 * Feature 016: Topic Management (T021)
 */
export class GetTopicsQueryDto {
  @IsOptional()
  @IsEnum(['SEEDING', 'ACTIVE', 'ARCHIVED', 'LOCKED'])
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'])
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['createdAt', 'participantCount', 'responseCount'])
  sortBy?: 'createdAt' | 'participantCount' | 'responseCount';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  /**
   * Exclude mature content topics from results
   * Used for filtering content for minor users
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeMatureContent?: boolean;
}
