/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReactionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  emoji: string;
}
