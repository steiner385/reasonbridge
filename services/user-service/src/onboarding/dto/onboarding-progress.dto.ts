/**
 * Onboarding Progress DTOs
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStep } from '@prisma/client';
import { NextActionDto } from '../../dto/common.dto';

/**
 * Onboarding progress response
 */
export class OnboardingProgressResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Current onboarding step',
    enum: OnboardingStep,
    example: OnboardingStep.ORIENTATION,
  })
  currentStep: OnboardingStep;

  @ApiProperty({
    description: 'Completion percentage (0-100)',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Recommended next action',
    type: NextActionDto,
  })
  nextAction: NextActionDto;

  @ApiProperty({
    description: 'Whether email has been verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Whether topics have been selected',
    example: true,
  })
  topicsSelected: boolean;

  @ApiProperty({
    description: 'Whether orientation has been viewed',
    example: false,
  })
  orientationViewed: boolean;

  @ApiProperty({
    description: 'Whether first post has been made',
    example: false,
  })
  firstPostMade: boolean;
}
