import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUUID, IsInt, IsOptional, Min, Max, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Common response DTOs used across multiple endpoints
 */

/**
 * Success Response DTO
 *
 * Generic success response for operations that don't return specific data.
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Human-readable success message',
    example: 'Operation completed successfully',
  })
  @IsString()
  message: string;
}

/**
 * User Profile DTO
 *
 * Basic user information returned in auth responses.
 */
export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({
    description: 'Authentication method used',
    enum: ['EMAIL_PASSWORD', 'GOOGLE_OAUTH', 'APPLE_OAUTH'],
    example: 'EMAIL_PASSWORD',
  })
  @IsEnum(['EMAIL_PASSWORD', 'GOOGLE_OAUTH', 'APPLE_OAUTH'])
  authMethod: string;

  @ApiProperty({
    description: 'User display name',
    required: false,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @IsString()
  displayName?: string | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-25T12:00:00Z',
  })
  @IsString()
  createdAt: string;
}

/**
 * Onboarding Progress DTO
 *
 * Tracks user progress through onboarding steps.
 */
export class OnboardingProgressDto {
  @ApiProperty({
    description: 'Current onboarding step',
    enum: ['VERIFICATION', 'TOPICS', 'ORIENTATION', 'COMPLETE'],
    example: 'TOPICS',
  })
  @IsEnum(['VERIFICATION', 'TOPICS', 'ORIENTATION', 'COMPLETE'])
  currentStep: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({
    description: 'Topics selection status',
    example: false,
  })
  @IsBoolean()
  topicsSelected: boolean;

  @ApiProperty({
    description: 'Orientation viewing status',
    example: false,
  })
  @IsBoolean()
  orientationViewed: boolean;

  @ApiProperty({
    description: 'First post creation status',
    example: false,
  })
  @IsBoolean()
  firstPostMade: boolean;
}

/**
 * Pagination Metadata DTO
 *
 * Metadata for paginated responses.
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  @IsInt()
  @Min(0)
  totalPages: number;

  @ApiProperty({
    description: 'Has next page',
    example: true,
  })
  @IsBoolean()
  hasNext: boolean;

  @ApiProperty({
    description: 'Has previous page',
    example: false,
  })
  @IsBoolean()
  hasPrev: boolean;
}

/**
 * Topic DTO
 *
 * Discussion topic information for topic selection.
 */
export class TopicDto {
  @ApiProperty({
    description: 'Topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
    description: 'Topic description',
    example: 'Climate change, environmental policy, sustainability',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Active discussions in last 7 days',
    example: 47,
  })
  @IsInt()
  @Min(0)
  activeDiscussionCount: number;

  @ApiProperty({
    description: 'Unique participants in last 30 days',
    example: 3200,
  })
  @IsInt()
  @Min(0)
  participantCount: number;

  @ApiProperty({
    description: 'Activity level',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'HIGH',
  })
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  activityLevel: string;

  @ApiProperty({
    description: 'Suggested for new users',
    example: true,
  })
  @IsBoolean()
  suggestedForNewUsers: boolean;

  @ApiProperty({
    description: 'Recent activity metrics',
    required: false,
    type: 'object',
  })
  @IsOptional()
  recentActivity?: {
    last7Days: number;
    last30Days: number;
  };
}

/**
 * Selected Topic DTO
 *
 * Topic with priority for user selections.
 */
export class SelectedTopicDto {
  @ApiProperty({
    description: 'Topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  topicId: string;

  @ApiProperty({
    description: 'Topic name',
    example: 'Climate & Environment',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Selection priority (1-3, where 1 is highest)',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  @IsInt()
  @Min(1)
  @Max(3)
  priority: number;
}

/**
 * Next Action DTO
 *
 * Recommended next action for onboarding.
 */
export class NextActionDto {
  @ApiProperty({
    description: 'Next step identifier',
    example: 'TOPICS',
  })
  @IsString()
  step: string;

  @ApiProperty({
    description: 'Action title',
    example: 'Select your interests',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Action description',
    example: 'Choose 2-3 topics to personalize your feed',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Action URL',
    example: '/onboarding/topics',
  })
  @IsString()
  actionUrl: string;
}

/**
 * Recent Activity DTO
 *
 * Activity metrics for topics.
 */
export class RecentActivityDto {
  @ApiProperty({
    description: 'Activity in last 7 days',
    example: 23,
  })
  @IsInt()
  @Min(0)
  last7Days: number;

  @ApiProperty({
    description: 'Activity in last 30 days',
    example: 91,
  })
  @IsInt()
  @Min(0)
  last30Days: number;
}

/**
 * Health Check Response DTO
 *
 * Service health status.
 */
export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Service status',
    example: 'ok',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Service uptime in seconds',
    example: 3600,
  })
  @IsInt()
  @Min(0)
  uptime: number;

  @ApiProperty({
    description: 'Service version',
    example: '0.1.0',
  })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Timestamp',
    example: '2026-01-25T12:00:00Z',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'Dependency status',
    required: false,
    type: 'object',
  })
  @IsOptional()
  dependencies?: {
    database: 'healthy' | 'unhealthy';
    cognito: 'healthy' | 'unhealthy';
  };
}

/**
 * ID Parameter DTO
 *
 * Common UUID parameter validation.
 */
export class UuidParamDto {
  @ApiProperty({
    description: 'Resource ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id: string;
}

/**
 * Email Parameter DTO
 *
 * Email validation for query/path parameters.
 */
export class EmailParamDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsString()
  email: string;
}
