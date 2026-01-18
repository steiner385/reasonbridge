/**
 * DTO for alignment response
 * Matches the Alignment schema from the OpenAPI spec
 */
export interface AlignmentDto {
  id: string;
  stance: 'SUPPORT' | 'OPPOSE' | 'NUANCED';
  nuanceExplanation?: string;
  createdAt: Date;
}
