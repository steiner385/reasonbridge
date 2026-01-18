import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for dismissing feedback
 */
export class DismissFeedbackDto {
  /**
   * Optional reason for dismissing the feedback
   * Examples: "not applicable", "already addressed", "misleading"
   */
  @IsString()
  @IsOptional()
  dismissalReason?: string;
}
