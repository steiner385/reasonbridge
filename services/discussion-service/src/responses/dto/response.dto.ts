/**
 * Response DTOs matching the OpenAPI schema
 */

export interface CitedSourceDto {
  url: string;
  title?: string;
  extractedAt?: string;
}

export interface UserSummaryDto {
  id: string;
  displayName: string;
}

export interface ResponsePropositionDto {
  id: string;
  statement: string;
  relevanceScore?: number;
}

export interface ResponseDto {
  id: string;
  content: string;
  authorId: string;
  author?: UserSummaryDto | undefined;
  citedSources?: CitedSourceDto[] | undefined;
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  propositions?: ResponsePropositionDto[] | undefined;
  status: string;
  revisionCount: number;
  createdAt: Date;
  updatedAt: Date;
}
