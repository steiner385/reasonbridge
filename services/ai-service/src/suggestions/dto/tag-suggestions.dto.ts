import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for requesting tag suggestions
 */
export class TagSuggestionsRequestDto {
  /**
   * Title of the topic/content
   */
  @IsString()
  @IsNotEmpty()
  title!: string;

  /**
   * Content/description to analyze for tag suggestions
   */
  @IsString()
  @IsNotEmpty()
  content!: string;
}

/**
 * DTO for tag suggestion response
 */
export class TagSuggestionsResponseDto {
  /**
   * Suggested tags
   */
  suggestions!: string[];

  /**
   * Confidence score (0-1)
   */
  confidenceScore!: number;

  /**
   * Reasoning for the suggestions
   */
  reasoning!: string;

  /**
   * AI attribution label
   */
  attribution!: string;
}
