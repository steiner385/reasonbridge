/**
 * Email verification DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

/**
 * Request payload for email verification
 */
export class VerifyEmailRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit verification code sent via email',
    example: '123456',
    pattern: '^[0-9]{6}$',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: 'Verification code must be exactly 6 digits',
  })
  code: string;
}
