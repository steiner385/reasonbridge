/**
 * Mark Orientation Viewed DTO
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Request to mark orientation as viewed
 * (Currently no body needed, but keeping for future extensibility)
 */
export class MarkOrientationRequestDto {
  @ApiProperty({
    description: 'Optional flag to mark all steps as viewed (default: true)',
    example: true,
    required: false,
  })
  allStepsViewed?: boolean;
}

/**
 * Response after marking orientation viewed
 */
export class MarkOrientationResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Orientation marked as viewed',
  })
  message: string;

  @ApiProperty({
    description: 'Updated current step',
    example: 'FIRST_POST',
  })
  currentStep: string;

  @ApiProperty({
    description: 'Updated completion percentage',
    example: 80,
  })
  completionPercentage: number;
}
