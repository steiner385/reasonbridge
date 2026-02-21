/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class ContextMessageDto {
  @IsEnum(['user', 'persona'])
  role!: 'user' | 'persona';

  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class AnalyzeArgumentDto {
  @IsString()
  @IsNotEmpty()
  userMessage!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContextMessageDto)
  conversationContext!: ContextMessageDto[];
}
