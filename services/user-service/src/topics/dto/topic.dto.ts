/**
 * Topic DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Topic name',
    example: 'Climate & Environment',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Brief description of the topic',
    example: 'Discussions about climate change, sustainability, and environmental policy',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Activity level based on discussion and participant counts',
    enum: ActivityLevel,
    example: ActivityLevel.HIGH,
  })
  @IsEnum(ActivityLevel)
  activityLevel: ActivityLevel;

  @ApiProperty({
    description: 'Number of active discussions',
    example: 42,
  })
  @IsInt()
  @Min(0)
  discussionCount: number;

  @ApiProperty({
    description: 'Total number of participants across all discussions',
    example: 1247,
  })
  @IsInt()
  @Min(0)
  participantCount: number;

  @ApiProperty({
    description: 'Whether this topic is suggested for new users',
    example: true,
  })
  suggested: boolean;

  @ApiProperty({
    description: 'Topic creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  createdAt: string;
}
