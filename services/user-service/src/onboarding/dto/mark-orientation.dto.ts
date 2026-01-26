/**
 * Mark Orientation Viewed DTO
 */

/**
 * Request to mark orientation as viewed
 * (Currently no body needed, but keeping for future extensibility)
 */
export class MarkOrientationRequestDto {
  allStepsViewed?: boolean;
}

/**
 * Response after marking orientation viewed
 */
export class MarkOrientationResponseDto {
  message!: string;

  currentStep!: string;

  completionPercentage!: number;
}
