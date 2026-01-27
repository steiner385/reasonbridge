import {
  IsInt,
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Views spectrum distribution for a demo discussion
 */
export class ViewsSpectrumDto {
  @IsInt()
  @Min(0)
  stronglySupport!: number;

  @IsInt()
  @Min(0)
  support!: number;

  @IsInt()
  @Min(0)
  neutral!: number;

  @IsInt()
  @Min(0)
  oppose!: number;

  @IsInt()
  @Min(0)
  stronglyOppose!: number;
}

/**
 * Demo discussion DTO matching OpenAPI DemoDiscussion schema
 */
export class DemoDiscussionDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  topic!: string;

  @IsInt()
  @Min(0)
  participantCount!: number;

  @IsInt()
  @Min(0)
  propositionCount!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  commonGroundScore!: number;

  @IsArray()
  @IsString({ each: true })
  topCommonGround!: string[];

  @ValidateNested()
  @Type(() => ViewsSpectrumDto)
  @IsObject()
  viewsSpectrum!: ViewsSpectrumDto;

  @IsDateString()
  createdAt!: string;
}

/**
 * Response DTO for GET /demo/discussions endpoint
 */
export class DemoDiscussionsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DemoDiscussionDto)
  discussions!: DemoDiscussionDto[];

  @IsObject()
  socialProof?: {
    averageCommonGroundScore: number;
    totalParticipants: number;
    platformSatisfaction: number;
  };
}

/**
 * Query parameters for GET /demo/discussions endpoint
 */
export class GetDemoDiscussionsQueryDto {
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number = 5;

  @IsString()
  sessionId?: string;
}
