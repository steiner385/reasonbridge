import {
  IsBoolean,
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
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
  @IsBoolean()
  success!: boolean;

  @IsString()
  message!: string;
}

/**
 * User Profile DTO
 *
 * Basic user information returned in auth responses.
 */
export class UserProfileDto {
  @IsUUID()
  id!: string;

  @IsString()
  email!: string;

  @IsBoolean()
  emailVerified!: boolean;

  @IsEnum(['EMAIL_PASSWORD', 'GOOGLE_OAUTH', 'APPLE_OAUTH'])
  authMethod!: string;

  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsString()
  createdAt!: string;
}

/**
 * Onboarding Progress DTO
 *
 * Tracks user progress through onboarding steps.
 */
export class OnboardingProgressDto {
  @IsEnum(['VERIFICATION', 'TOPICS', 'ORIENTATION', 'COMPLETE'])
  currentStep!: string;

  @IsBoolean()
  emailVerified!: boolean;

  @IsBoolean()
  topicsSelected!: boolean;

  @IsBoolean()
  orientationViewed!: boolean;

  @IsBoolean()
  firstPostMade!: boolean;
}

/**
 * Pagination Metadata DTO
 *
 * Metadata for paginated responses.
 */
export class PaginationMetaDto {
  @IsInt()
  @Min(0)
  total!: number;

  @IsInt()
  @Min(1)
  page!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;

  @IsInt()
  @Min(0)
  totalPages!: number;

  @IsBoolean()
  hasNext!: boolean;

  @IsBoolean()
  hasPrev!: boolean;
}

/**
 * Topic DTO
 *
 * Discussion topic information for topic selection.
 */
export class TopicDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsInt()
  @Min(0)
  activeDiscussionCount!: number;

  @IsInt()
  @Min(0)
  participantCount!: number;

  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  activityLevel!: string;

  @IsBoolean()
  suggestedForNewUsers!: boolean;

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
  @IsUUID()
  topicId!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  priority!: number;
}

/**
 * Next Action DTO
 *
 * Recommended next action for onboarding.
 */
export class NextActionDto {
  @IsString()
  step!: string;

  @IsString()
  title!: string;

  @IsString()
  @IsString()
  actionUrl!: string;
}

/**
 * Recent Activity DTO
 *
 * Activity metrics for topics.
 */
export class RecentActivityDto {
  @IsInt()
  @Min(0)
  last7Days!: number;

  @IsInt()
  @Min(0)
  last30Days!: number;
}

/**
 * Health Check Response DTO
 *
 * Service health status.
 */
export class HealthCheckResponseDto {
  @IsString()
  status!: string;

  @IsInt()
  @Min(0)
  uptime!: number;

  @IsString()
  version!: string;

  @IsString()
  timestamp!: string;

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
  @IsUUID()
  id!: string;
}

/**
 * Email Parameter DTO
 *
 * Email validation for query/path parameters.
 */
export class EmailParamDto {
  @IsString()
  email!: string;
}
