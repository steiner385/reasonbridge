/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookmarkDto {
  @IsNotEmpty()
  @IsUUID()
  responseId!: string;
}
