/**
 * Onboarding Complete DTO
 */

/**
 * Response after completing onboarding
 */
export class OnboardingCompleteResponseDto {
  message!: string;

  encouragement!: string;

  currentStep!: string;

  completionPercentage!: number;

  completedAt!: string;

  achievement?: string;
}
