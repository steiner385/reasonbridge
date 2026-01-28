/**
 * T018 [P] [US1] - Create Discussion DTO (Feature 009)
 *
 * Validates discussion creation requests
 * FR-002: Title 10-200 chars, initial response 50-25000 chars
 */

import {
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CitationInputDto } from '../../dto/citation-input.dto.js';

/**
 * Initial response content for new discussion
 */
export class InitialResponseDto {
  @ApiProperty({
    description: 'Initial response content',
    example: 'I believe we need to address climate change urgently because...',
    minLength: 50,
    maxLength: 25000,
  })
  @IsString()
  @MinLength(50, { message: 'Initial response must be at least 50 characters' })
  @MaxLength(25000, { message: 'Initial response cannot exceed 25,000 characters (~5,000 words)' })
  content!: string;

  @ApiPropertyOptional({
    description: 'Optional citations for the initial response',
    type: [CitationInputDto],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationInputDto)
  citations?: CitationInputDto[];
}

/**
 * Request body for creating a new discussion
 */
export class CreateDiscussionDto {
  @ApiProperty({
    description: 'ID of the topic this discussion belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4')
  topicId!: string;

  @ApiProperty({
    description: 'Discussion title',
    example: 'Should carbon taxes be increased in 2027?',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @ApiProperty({
    description: 'Initial response to start the discussion',
    type: InitialResponseDto,
  })
  @ValidateNested()
  @Type(() => InitialResponseDto)
  initialResponse!: InitialResponseDto;
}
