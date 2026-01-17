export class GetTopicsQueryDto {
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
  creatorId?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'participantCount' | 'responseCount';
  sortOrder?: 'asc' | 'desc';
}
