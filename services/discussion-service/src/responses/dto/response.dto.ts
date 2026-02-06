/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

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

export interface VoteSummaryDto {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: 'UPVOTE' | 'DOWNVOTE' | null;
}

export interface ResponseDto {
  id: string;
  content: string;
  authorId: string;
  parentId?: string | null;
  author?: UserSummaryDto | undefined;
  citedSources?: CitedSourceDto[] | undefined;
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  propositions?: ResponsePropositionDto[] | undefined;
  status: string;
  revisionCount: number;
  votes?: VoteSummaryDto;
  createdAt: Date;
  updatedAt: Date;
}
