/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsEnum, IsArray, ValidateNested, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import type { ConversationMode, PersonaTone } from '../types/conversation-mode.types.js';

class TranscriptMessageDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsEnum(['user', 'persona'])
  role!: 'user' | 'persona';

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;
}

class PersonaSummaryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsEnum(['measured', 'analytical', 'passionate', 'confrontational'])
  tone!: PersonaTone;
}

export class GenerateInsightsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptMessageDto)
  transcript!: TranscriptMessageDto[];

  @IsEnum(['socratic', 'debate', 'steelman', 'common_ground'])
  mode!: ConversationMode;

  @ValidateNested()
  @Type(() => PersonaSummaryDto)
  persona!: PersonaSummaryDto;

  @IsOptional()
  @IsString()
  topicContext?: string;
}
