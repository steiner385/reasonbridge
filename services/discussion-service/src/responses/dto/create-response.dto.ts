/**
 * T035 [P] [US2] - Create Response DTO (Feature 009)
 *
 * Validates response creation requests for discussions
 * FR-007: Response 50-25000 chars, max 10 citations
 */

import {
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CitationInputDto } from '../../dto/citation-input.dto.js';

/**
 * Request body for creating a new response in a discussion
 */
export class CreateResponseDto {
  @ApiProperty({
    description: 'ID of the discussion this response belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4')
  discussionId!: string;

  @ApiProperty({
    description: 'Response content',
    example: 'I agree with the previous points because...',
    minLength: 50,
    maxLength: 25000,
  })
  @IsString()
  @MinLength(50, { message: 'Response must be at least 50 characters' })
  @MaxLength(25000, { message: 'Response cannot exceed 25,000 characters (~5,000 words)' })
  content!: string;

  @ApiPropertyOptional({
    description: 'Optional citations for the response',
    type: [CitationInputDto],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationInputDto)
  citations?: CitationInputDto[];

  @ApiPropertyOptional({
    description: 'Optional parent response ID for threaded replies (Phase 5)',
    example: '660e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  parentResponseId?: string;

  // Service-layer properties (mapped from API properties)
  parentId?: string; // Maps from parentResponseId
  citedSources?: string[]; // Maps from citations

  @ApiPropertyOptional({
    description: 'Whether the response contains opinion',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  containsOpinion?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the response contains factual claims',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  containsFactualClaims?: boolean;

  @ApiPropertyOptional({
    description: 'Optional proposition IDs this response relates to',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  propositionIds?: string[];
}
