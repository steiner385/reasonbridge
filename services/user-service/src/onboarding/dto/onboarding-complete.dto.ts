/**
 * Onboarding Complete DTO
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response after completing onboarding
 */
export class OnboardingCompleteResponseDto {
  @ApiProperty({
    description: 'Congratulatory message',
    example: 'Congratulations! You have completed onboarding. Welcome to the community!',
  })
  message: string;

  @ApiProperty({
    description: 'Encouragement message specific to the achievement',
    example: 'You have taken your first step in constructive dialogue. Keep sharing your perspective!',
  })
  encouragement: string;

  @ApiProperty({
    description: 'Current onboarding step (should be COMPLETED)',
    example: 'COMPLETED',
  })
  currentStep: string;

  @ApiProperty({
    description: 'Completion percentage (should be 100)',
    example: 100,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Timestamp when onboarding was completed',
    example: '2026-01-26T12:00:00Z',
  })
  completedAt: string;

  @ApiProperty({
    description: 'Badge or achievement earned for completing onboarding',
    example: 'First Post',
    required: false,
  })
  achievement?: string;
}
