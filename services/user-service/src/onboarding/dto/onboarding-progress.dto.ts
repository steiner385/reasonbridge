/**
 * Onboarding Progress DTOs
 * Matches OpenAPI schema definitions
 */

import { OnboardingStep } from '@prisma/client';
import { NextActionDto } from '../../dto/common.dto';

/**
 * Onboarding progress response
 */
export class OnboardingProgressResponseDto {
  userId!: string;

  currentStep!: OnboardingStep;

  completionPercentage!: number;

  nextAction!: NextActionDto;

  emailVerified!: boolean;

  topicsSelected!: boolean;

  orientationViewed!: boolean;

  firstPostMade!: boolean;
}
