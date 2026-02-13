/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFeedQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface ActivityUserDto {
  id: string;
  displayName: string | null;
}

export interface ActivityEventDto {
  id: string;
  activityType: string;
  targetId: string;
  targetType: string;
  targetTitle: string | null;
  targetSlug: string | null;
  createdAt: string;
  user: ActivityUserDto;
}

export interface ActivityFeedResponseDto {
  activities: ActivityEventDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
