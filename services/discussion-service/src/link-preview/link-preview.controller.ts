/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { LinkPreviewService } from './link-preview.service.js';
import { GetLinkPreviewDto } from './dto/link-preview.dto.js';
import type { LinkPreviewResponseDto, LinkPreviewErrorDto } from './dto/link-preview.dto.js';

/**
 * Link Preview Controller
 *
 * Provides API endpoint for fetching Open Graph metadata for URLs.
 * Rate limited to prevent abuse when used for arbitrary URL fetching.
 *
 * Security:
 * - Requires authentication
 * - SSRF protection via validation
 * - Rate limiting (10 requests per minute)
 */
@ApiTags('link-preview')
@Controller('link-previews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  /**
   * Fetch Open Graph metadata for a URL
   *
   * Returns cached data if available, otherwise fetches from the URL.
   * Validates URL for SSRF threats before fetching.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get link preview metadata',
    description: 'Fetches Open Graph metadata for a URL. Results are cached for 24 hours.',
  })
  @ApiResponse({
    status: 200,
    description: 'Link preview metadata retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or URL blocked by security validation',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async getPreview(@Body() dto: GetLinkPreviewDto): Promise<LinkPreviewResponseDto> {
    const result = await this.linkPreviewService.getPreview(dto.url);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return result.data;
  }

  /**
   * Batch fetch previews for multiple URLs
   *
   * Useful for pre-fetching all links when loading a response.
   * Limited to 10 URLs per request.
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 batch requests per minute
  @ApiOperation({
    summary: 'Get link previews for multiple URLs',
    description: 'Batch fetches Open Graph metadata for up to 10 URLs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Link preview metadata for requested URLs',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or too many URLs',
  })
  async getPreviewsBatch(
    @Body() body: { urls: string[] },
  ): Promise<Record<string, LinkPreviewResponseDto | LinkPreviewErrorDto>> {
    const MAX_URLS = 10;

    if (!body.urls || !Array.isArray(body.urls)) {
      throw new BadRequestException('urls must be an array');
    }

    if (body.urls.length > MAX_URLS) {
      throw new BadRequestException(`Maximum ${MAX_URLS} URLs per request`);
    }

    const results = await this.linkPreviewService.getPreviewsBatch(body.urls);
    return Object.fromEntries(results);
  }
}
