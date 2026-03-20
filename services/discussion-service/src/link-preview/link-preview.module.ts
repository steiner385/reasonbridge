/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { LinkPreviewController } from './link-preview.controller.js';
import { LinkPreviewService } from './link-preview.service.js';
import { AuthModule } from '../auth/index.js';

/**
 * Link Preview Module
 *
 * Provides functionality for fetching and caching Open Graph metadata
 * for URLs shared in discussion responses.
 *
 * Features:
 * - Server-side URL fetching (avoids CORS issues)
 * - Redis caching with 24-hour TTL
 * - SSRF protection via URL validation
 * - Rate limiting to prevent abuse
 *
 * Endpoints:
 * - POST /link-previews - Fetch metadata for single URL
 * - POST /link-previews/batch - Fetch metadata for multiple URLs
 */
@Module({
  imports: [AuthModule],
  controllers: [LinkPreviewController],
  providers: [LinkPreviewService],
  exports: [LinkPreviewService],
})
export class LinkPreviewModule {}
