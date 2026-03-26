/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { AccessSource } from '@prisma/client';

/**
 * DTO for granting topic access
 */
export class GrantAccessDto {
  @IsEnum(['INVITATION', 'DIRECT_GRANT', 'CREATOR'])
  @IsOptional()
  source?: AccessSource;

  @IsUUID()
  @IsOptional()
  invitationId?: string;

  @IsUUID()
  @IsOptional()
  grantedBy?: string;
}

/**
 * Response DTO for grant access endpoint
 */
export class GrantAccessResponseDto {
  success!: boolean;
  accessId?: string;
  alreadyGranted?: boolean;
}

/**
 * Response DTO for check access endpoint
 */
export class CheckAccessResponseDto {
  canAccess!: boolean;
  reason?: 'public' | 'creator' | 'explicit_grant' | 'denied';
}
