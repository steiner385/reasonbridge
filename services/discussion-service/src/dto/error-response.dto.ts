/**
 * T011 [P] & T012 [P] - Standard error response DTOs (Feature 009)
 *
 * Provides consistent error structure across all endpoints
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validation error detail
 */
export class ValidationErrorDto {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'title',
  })
  field!: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'Title must be between 10 and 200 characters',
  })
  message!: string;
}

/**
 * Standard error response
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message!: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error!: string;

  @ApiPropertyOptional({
    description: 'Array of validation errors (if applicable)',
    type: [ValidationErrorDto],
    nullable: true,
  })
  validationErrors?: ValidationErrorDto[];
}

/**
 * Optimistic locking conflict error (409)
 */
export class ConflictErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 409,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Conflict explanation',
    example: 'Response was modified by another operation. Please refresh and try again.',
  })
  message!: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Conflict',
  })
  error!: string;

  @ApiProperty({
    description: 'Current version in database',
    example: 3,
  })
  currentVersion!: number;

  @ApiProperty({
    description: 'Version provided in request',
    example: 2,
  })
  providedVersion!: number;
}
