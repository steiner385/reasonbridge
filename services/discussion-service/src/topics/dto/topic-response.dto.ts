/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TopicResponseDto {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  status: string;
  visibility?: string; // PUBLIC | PRIVATE | UNLISTED
  slug?: string; // URL-friendly identifier
  evidenceStandards: string;
  minimumDiversityScore: number;
  currentDiversityScore: number | null;
  participantCount: number;
  responseCount: number;
  crossCuttingThemes: string[];
  createdAt: Date;
  activatedAt: Date | null;
  archivedAt: Date | null;
  tags?: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export interface PaginatedTopicsResponseDto {
  data: TopicResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
