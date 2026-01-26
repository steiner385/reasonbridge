/**
 * Signup DTOs for user registration
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * Request payload for user signup with email/password
 */
export class SignupRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (8-128 characters, mixed case, numbers, special chars required)',
    example: 'SecureP@ssw0rd',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    description: 'Optional display name for the user',
    example: 'John Doe',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({
    description: 'Optional visitor session ID to link pre-signup activity',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  visitorSessionId?: string;
}
