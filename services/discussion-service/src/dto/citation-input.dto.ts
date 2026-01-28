/**
 * T020 [P] [US1] - Citation Input DTO (Feature 009)
 *
 * Validates and normalizes citation URLs for responses and discussions
 */

import { IsString, IsUrl, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CitationInputDto {
  @ApiProperty({
    description: 'Citation URL (will be validated for SSRF threats)',
    example: 'https://example.com/article',
    maxLength: 2048,
  })
  @IsString()
  @IsUrl({}, { message: 'Must be a valid URL' })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({
    description: 'Optional citation title or description',
    example: 'Study on Climate Change Impacts',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;
}

/**
 * Citation information in responses
 */
export class CitationDto {
  @ApiProperty({
    description: 'Citation ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Original URL as provided by user',
    example: 'https://example.com/article',
  })
  originalUrl!: string;

  @ApiProperty({
    description: 'Normalized URL for deduplication',
    example: 'https://example.com/article',
  })
  normalizedUrl!: string;

  @ApiPropertyOptional({
    description: 'Citation title',
    example: 'Study on Climate Change Impacts',
    nullable: true,
  })
  title!: string | null;

  @ApiProperty({
    description: 'Validation status of the URL',
    enum: ['ACTIVE', 'BROKEN', 'UNVERIFIED'],
    example: 'UNVERIFIED',
  })
  validationStatus!: 'ACTIVE' | 'BROKEN' | 'UNVERIFIED';

  @ApiPropertyOptional({
    description: 'When the URL was last validated',
    example: '2026-01-27T10:30:00Z',
    nullable: true,
  })
  validatedAt!: string | null;

  @ApiProperty({
    description: 'When the citation was added',
    example: '2026-01-27T10:00:00Z',
  })
  createdAt!: string;
}
