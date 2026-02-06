/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomPersonaConfigDto } from './generate-response.dto.js';

/**
 * Request for generating system prompt
 */
export class GeneratePromptDto {
  @ValidateNested()
  @Type(() => CustomPersonaConfigDto)
  persona!: CustomPersonaConfigDto;

  @IsOptional()
  @IsString()
  topicTitle?: string;

  @IsOptional()
  @IsString()
  topicContext?: string;
}

/**
 * Response from generating system prompt
 */
export class GeneratePromptResultDto {
  systemPrompt!: string;
}
