import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCommonGroundQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version?: number;
}
