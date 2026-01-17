import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for requesting AI-generated feedback on a response
 */
export class RequestFeedbackDto {
  /**
   * UUID of the response to analyze
   */
  @IsUUID()
  @IsNotEmpty()
  responseId!: string;

  /**
   * The content of the response to analyze
   */
  @IsString()
  @IsNotEmpty()
  content!: string;
}
