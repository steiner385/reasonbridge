import {
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Tone options for personas
 */
export enum PersonaTone {
  PASSIONATE = 'passionate',
  ANALYTICAL = 'analytical',
  MEASURED = 'measured',
  CONFRONTATIONAL = 'confrontational',
}

/**
 * Custom persona configuration
 */
export class CustomPersonaConfigDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  values!: string[];

  @IsEnum(PersonaTone)
  tone!: PersonaTone;

  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  receptiveness!: number;

  @IsBoolean()
  usesEmotionalAppeals!: boolean;

  @IsBoolean()
  citesData!: boolean;

  @IsBoolean()
  asksQuestions!: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  biases?: string[];
}

/**
 * Preview feedback item (matches backend type)
 */
export class PreviewFeedbackItemDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  subtype?: string;

  @IsString()
  suggestionText!: string;

  @IsString()
  reasoning!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore!: number;

  @IsBoolean()
  shouldDisplay!: boolean;
}

/**
 * Request for generating agent responses
 */
export class GenerateResponseDto {
  @IsString()
  discussionId!: string;

  @IsOptional()
  @IsString()
  personaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomPersonaConfigDto)
  customPersona?: CustomPersonaConfigDto;

  @IsEnum(['draft', 'revise'])
  action!: 'draft' | 'revise';

  @IsOptional()
  @IsString()
  currentDraft?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewFeedbackItemDto)
  feedback?: PreviewFeedbackItemDto[];

  @IsOptional()
  @IsString()
  topicTitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  discussionHistory?: string[];
}

/**
 * Response from generating agent responses
 */
export class GenerateResponseResultDto {
  content!: string;
  reasoning!: string;
  revisedAreas?: string[];
}
