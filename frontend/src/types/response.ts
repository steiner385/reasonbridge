/**
 * Response types matching the backend ResponseDto
 */

export interface CitedSource {
  url: string;
  title?: string;
  extractedAt?: string;
}

export interface UserSummary {
  id: string;
  displayName: string;
}

export interface ResponseProposition {
  id: string;
  statement: string;
  relevanceScore?: number;
}

export interface Response {
  id: string;
  content: string;
  authorId: string;
  parentId?: string | null;
  author?: UserSummary;
  citedSources?: CitedSource[];
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  propositions?: ResponseProposition[];
  status: string;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResponseRequest {
  content: string;
  parentId?: string;
  citedSources?: string[];
  containsOpinion?: boolean;
  containsFactualClaims?: boolean;
  propositionIds?: string[];
  acknowledgedFeedback?: boolean;
}
