/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export enum ActivityTypeDto {
  TOPIC_CREATED = 'TOPIC_CREATED',
  RESPONSE_POSTED = 'RESPONSE_POSTED',
  DISCUSSION_JOINED = 'DISCUSSION_JOINED',
  AI_SUGGESTION_ACCEPTED = 'AI_SUGGESTION_ACCEPTED',
}

export enum TargetTypeDto {
  TOPIC = 'TOPIC',
  RESPONSE = 'RESPONSE',
  DISCUSSION = 'DISCUSSION',
}

export class CreateActivityEventDto {
  @IsUUID()
  userId!: string;

  @IsEnum(ActivityTypeDto)
  activityType!: ActivityTypeDto;

  @IsUUID()
  targetId!: string;

  @IsEnum(TargetTypeDto)
  targetType!: TargetTypeDto;

  @IsOptional()
  @IsString()
  targetTitle?: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;
}

export class ActivityEventResponseDto {
  id: string;
  createdAt: string;

  constructor(data: { id: string; createdAt: Date }) {
    this.id = data.id;
    this.createdAt = data.createdAt.toISOString();
  }
}
