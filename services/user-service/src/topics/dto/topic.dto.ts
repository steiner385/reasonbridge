/**
 * Topic DTOs
 * Matches OpenAPI schema definitions
 */

import { IsUUID, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

/**
 * Topic activity level enum
 */
export enum ActivityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Topic DTO matching OpenAPI Topic schema
 */
export class TopicDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsEnum(ActivityLevel)
  activityLevel!: ActivityLevel;

  @IsInt()
  @Min(0)
  discussionCount!: number;

  @IsInt()
  @Min(0)
  participantCount!: number;

  suggested!: boolean;

  createdAt!: string;
}
