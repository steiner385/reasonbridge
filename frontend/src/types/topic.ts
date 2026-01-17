/**
 * Topic types matching the backend TopicResponseDto
 */

export interface Topic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
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
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
  creatorId?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'participantCount' | 'responseCount';
  sortOrder?: 'asc' | 'desc';
}
