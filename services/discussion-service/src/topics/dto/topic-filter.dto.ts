import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';

/**
 * DTO for filtering and searching topics
 * Feature 016: Topic Management (T008)
 */
export class TopicFilterDto {
  /**
   * Filter by topic status
   */
  @IsOptional()
  @IsEnum(['SEEDING', 'ACTIVE', 'ARCHIVED', 'LOCKED'])
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

  /**
   * Filter by topic visibility
   */
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'])
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  /**
   * Filter by tag names (array of tags)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Full-text search query (searches title and description)
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by creation date range - start date (ISO 8601)
   */
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  /**
   * Filter by creation date range - end date (ISO 8601)
   */
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  /**
   * Sort field
   */
  @IsOptional()
  @IsEnum(['createdAt', 'lastActivityAt', 'participantCount', 'responseCount', 'title'])
  sortBy?: 'createdAt' | 'lastActivityAt' | 'participantCount' | 'responseCount' | 'title';

  /**
   * Sort direction
   */
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  /**
   * Page number (1-indexed)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Results per page (max 100)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
