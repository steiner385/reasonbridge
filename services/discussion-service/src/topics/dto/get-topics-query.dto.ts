import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsUUID } from 'class-validator';

export class GetTopicsQueryDto {
  @IsOptional()
  @IsEnum(['SEEDING', 'ACTIVE', 'ARCHIVED'])
  status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['createdAt', 'participantCount', 'responseCount'])
  sortBy?: 'createdAt' | 'participantCount' | 'responseCount';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
