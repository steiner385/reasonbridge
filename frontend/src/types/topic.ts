/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic types matching the backend TopicResponseDto
 * Feature 016: Topic Management (T024, T025)
 */

export interface Topic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  slug?: string;
  evidenceStandards: string;
  minimumDiversityScore: number;
  currentDiversityScore: number | null;
  participantCount: number;
  responseCount: number;
  crossCuttingThemes: string[];
  createdAt: string;
  activatedAt: string | null;
  archivedAt: string | null;
  tags?: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export interface PaginatedTopicsResponse {
  data: Topic[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetTopicsParams {
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  creatorId?: string;
  tag?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'participantCount' | 'responseCount';
  sortOrder?: 'asc' | 'desc';
}
