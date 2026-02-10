/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail, IsNotEmpty } from 'class-validator';
import { ParentConsentStatus } from '@prisma/client';

/**
 * DTO for requesting parental consent
 */
export class RequestConsentDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Parent email is required' })
  parentEmail!: string;
}

/**
 * Response DTO for consent request
 */
export class RequestConsentResponseDto {
  message!: string;
  expiresAt!: string;
}

/**
 * Response DTO for consent verification
 */
export class VerifyConsentResponseDto {
  success!: boolean;
  childDisplayName?: string;
  error?: string;
}

/**
 * Response DTO for consent status
 */
export class ConsentStatusDto {
  status!: ParentConsentStatus;
  parentEmail?: string | null;
  expiresAt?: string | null;
  verifiedAt?: string | null;
}
