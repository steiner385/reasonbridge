/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsOptional, IsUUID } from 'class-validator';

export class UpdateReadStateDto {
  @IsOptional()
  @IsUUID()
  lastResponseId?: string;
}
