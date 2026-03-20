/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsUrl, IsNotEmpty, IsString } from 'class-validator';

/**
 * Request DTO for fetching link preview metadata
 */
export class GetLinkPreviewDto {
  @IsUrl({}, { message: 'Must be a valid URL' })
  @IsNotEmpty()
  @IsString()
  url!: string;
}

/**
 * Response DTO containing link preview metadata
 */
export interface LinkPreviewResponseDto {
  /** Original URL that was fetched */
  url: string;

  /** Page title (from og:title or <title>) */
  title: string | null;

  /** Page description (from og:description or meta description) */
  description: string | null;

  /** Preview image URL (from og:image) */
  image: string | null;

  /** Site name (from og:site_name) */
  siteName: string | null;

  /** Favicon URL */
  favicon: string | null;

  /** Content type (article, video, etc.) */
  type: string | null;

  /** Whether this result was served from cache */
  cached: boolean;

  /** Timestamp when metadata was fetched */
  fetchedAt: string;
}

/**
 * Error response for link preview failures
 */
export interface LinkPreviewErrorDto {
  /** Error message */
  error: string;

  /** Original URL that failed */
  url: string;

  /** Error code for client handling */
  code: 'INVALID_URL' | 'FETCH_FAILED' | 'TIMEOUT' | 'BLOCKED' | 'RATE_LIMITED';
}
