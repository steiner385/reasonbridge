/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response types matching the backend ResponseDto
 */

import type { UserSummary } from './user';

/**
 * Response visibility status values matching backend ResponseStatus enum
 */
export type ResponseStatus = 'VISIBLE' | 'HIDDEN' | 'REMOVED' | 'PENDING_REVIEW';

export interface CitedSource {
  url: string;
  title?: string;
  extractedAt?: string;
}

export type { UserSummary };

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
  status: ResponseStatus;
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

export interface UpdateResponseRequest {
  content: string;
  citedSources?: string[];
  containsOpinion?: boolean;
  containsFactualClaims?: boolean;
}
