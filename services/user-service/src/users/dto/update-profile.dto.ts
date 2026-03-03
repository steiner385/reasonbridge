/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Transform empty strings to undefined so @IsOptional skips validation.
 * This allows the frontend to send empty strings without triggering validation errors.
 */
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

/**
 * DTO for updating user profile information
 * Only allows updating fields that users should be able to modify
 */
export class UpdateProfileDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MinLength(3, { message: 'Display name must be at least 3 characters' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(300, { message: 'Bio must be at most 300 characters' })
  bio?: string;
}
