/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsString, Matches, ValidateIf } from 'class-validator';

/**
 * DTO for requesting a verification
 * User specifies which type of verification they want to complete
 */
export class VerificationRequestDto {
  @IsEnum(['PHONE', 'GOVERNMENT_ID', 'VIDEO'], {
    message: 'Verification type must be PHONE, GOVERNMENT_ID, or VIDEO',
  })
  type!: 'PHONE' | 'GOVERNMENT_ID' | 'VIDEO';

  /**
   * Phone number for phone verification requests (E.164 format)
   * Required when type is PHONE, ignored for other types
   */
  @ValidateIf((obj) => obj.type === 'PHONE')
  @IsString()
  @Matches(/^\+\d{1,15}$/, {
    message: 'Phone number must be in E.164 format (e.g., +12125551234)',
  })
  phoneNumber?: string;

  /**
   * Challenge type for video verification
   * Determines what the user must do in their video
   */
  @ValidateIf((obj) => obj.type === 'VIDEO')
  @IsEnum(['RANDOM_PHRASE', 'RANDOM_GESTURE', 'TIMESTAMP'], {
    message: 'Video challenge type must be RANDOM_PHRASE, RANDOM_GESTURE, or TIMESTAMP',
  })
  challengeType?: 'RANDOM_PHRASE' | 'RANDOM_GESTURE' | 'TIMESTAMP';
}
