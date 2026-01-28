/**
 * T011 [P] & T012 [P] - Shared User Summary DTO (Feature 009)
 *
 * Used in both Discussion and Response DTOs to represent user information
 * without exposing sensitive fields
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Minimal user information for display in discussions and responses
 */
export class UserSummaryDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'User display name',
    example: 'Jane Doe',
    nullable: true,
  })
  displayName!: string | null;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatars/jane.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({
    description: 'User verification level',
    enum: ['BASIC', 'ENHANCED', 'VERIFIED_HUMAN'],
    example: 'BASIC',
  })
  verificationLevel!: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
}

/**
 * Helper function to map User entity to UserSummaryDto
 */
export function mapToUserSummary(user: {
  id: string;
  displayName: string | null;
  verificationLevel: string;
}): UserSummaryDto {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: null, // TODO: Add avatar support when implemented
    verificationLevel: user.verificationLevel as any,
  };
}
