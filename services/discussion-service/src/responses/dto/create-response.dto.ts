/**
 * DTO for creating a new response to a discussion topic
 * Matches the CreateResponseRequest schema from the OpenAPI spec
 */
export class CreateResponseDto {
  /**
   * Content of the response (10-10000 characters)
   */
  content!: string;

  /**
   * Array of cited source URLs
   */
  citedSources?: string[];

  /**
   * Whether the response contains opinion (default: false)
   */
  containsOpinion?: boolean;

  /**
   * Whether the response contains factual claims (default: false)
   */
  containsFactualClaims?: boolean;

  /**
   * IDs of propositions this response addresses
   */
  propositionIds?: string[];

  /**
   * Whether user acknowledged and overrode AI feedback (default: false)
   */
  acknowledgedFeedback?: boolean;
}
