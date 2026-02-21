/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ConversationMode,
  DifficultyLevel,
  PersonaTone,
} from '../types/conversation-mode.types.js';

class ArgumentationConfigDto {
  @IsBoolean()
  usesEmotionalAppeals!: boolean;

  @IsBoolean()
  citesData!: boolean;

  @IsBoolean()
  asksQuestions!: boolean;
}

class PersonaConfigDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsString()
  @IsNotEmpty()
  background!: string;

  @IsEnum(['measured', 'analytical', 'passionate', 'confrontational'])
  tone!: PersonaTone;

  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  receptiveness!: number;

  @ValidateNested()
  @Type(() => ArgumentationConfigDto)
  argumentation!: ArgumentationConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exampleArguments?: string[];
}

class MessageDto {
  @IsString()
  role!: 'user' | 'persona';

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @ValidateNested()
  @Type(() => PersonaConfigDto)
  persona!: PersonaConfigDto;

  @IsEnum(['socratic', 'debate', 'steelman', 'common_ground'])
  mode!: ConversationMode;

  @IsEnum(['novice', 'intermediate', 'expert'])
  difficulty!: DifficultyLevel;

  @IsString()
  @IsNotEmpty()
  userMessage!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory!: MessageDto[];

  @IsOptional()
  @IsString()
  topicContext?: string;
}
