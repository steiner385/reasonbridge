/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import ogs from 'open-graph-scraper';
import { validateCitationUrl, isSafeUrl } from '../utils/ssrf-validator.js';
import type { LinkPreviewResponseDto, LinkPreviewErrorDto } from './dto/link-preview.dto.js';
import { LINK_PREVIEW } from '../constants/index.js';

/**
 * Open Graph result object type (subset of what ogs returns)
 */
interface OgResult {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: Array<{ url: string }> | { url: string };
  ogSiteName?: string;
  ogType?: string;
  dcTitle?: string;
  dcDescription?: string;
  favicon?: string;
  error?: string;
  success?: boolean;
}

/**
 * Link Preview Service
 *
 * Fetches and caches Open Graph metadata for URLs shared in responses.
 * Uses multi-layer security validation via SSRF validator before fetching.
 *
 * Features:
 * - SSRF protection (private IP blocking, DNS rebinding prevention)
 * - Redis caching with 24-hour TTL
 * - Graceful fallback for missing metadata
 * - Timeout protection against slow sites
 */
@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate cache key for a URL
   */
  private getCacheKey(url: string): string {
    // Normalize URL for consistent cache hits
    const normalized = url.toLowerCase().replace(/\/$/, '');
    return `link-preview:${normalized}`;
  }

  /**
   * Fetch link preview metadata for a URL
   *
   * @param url - URL to fetch metadata for
   * @returns Link preview metadata or error
   */
  async getPreview(
    url: string,
  ): Promise<
    { success: true; data: LinkPreviewResponseDto } | { success: false; error: LinkPreviewErrorDto }
  > {
    // Step 1: Check cache first
    const cacheKey = this.getCacheKey(url);
    try {
      const cached = await this.cacheManager.get<LinkPreviewResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${url}`);
        return { success: true, data: { ...cached, cached: true } };
      }
    } catch (cacheError) {
      this.logger.warn(`Cache read error for ${url}: ${cacheError}`);
      // Continue without cache
    }

    // Step 2: Validate URL for SSRF threats
    const validation = await validateCitationUrl(url);
    if (!isSafeUrl(validation)) {
      this.logger.warn(`URL blocked by SSRF validator: ${url} - ${validation.error}`);
      return {
        success: false,
        error: {
          url,
          error: validation.error || 'URL validation failed',
          code: 'BLOCKED',
        },
      };
    }

    // Step 3: Fetch the HTML ourselves with SSRF-safe redirect handling, then
    // let ogs parse the already-fetched HTML. This prevents ogs/undici from
    // making its own request that would (a) follow 30x redirects to internal
    // targets and (b) independently re-resolve DNS (TOCTOU rebinding).
    let html: string;
    try {
      html = await this.fetchHtmlSafely(validation.normalizedUrl);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const isTimeout =
        message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('aborted');
      const isBlocked = message.startsWith('SSRF_BLOCKED:');

      this.logger.warn(`Failed to fetch HTML for ${url}: ${message}`);
      return {
        success: false,
        error: {
          url,
          error: isBlocked
            ? 'URL redirects to a blocked destination'
            : isTimeout
              ? 'Request timed out'
              : 'Failed to fetch link metadata',
          code: isBlocked ? 'BLOCKED' : isTimeout ? 'TIMEOUT' : 'FETCH_FAILED',
        },
      };
    }

    try {
      // Pass ONLY html (no url) so ogs parses the provided markup and can never
      // fall back to performing its own unvalidated network request.
      const { result, error } = await ogs({ html });

      if (error || !result.success) {
        this.logger.warn(`Failed to fetch OG data for ${url}: ${result.error || 'Unknown error'}`);
        return {
          success: false,
          error: {
            url,
            error: 'Failed to fetch link metadata',
            code: 'FETCH_FAILED',
          },
        };
      }

      // Step 4: Build response with fallbacks
      const preview: LinkPreviewResponseDto = {
        url: validation.normalizedUrl,
        title: result.ogTitle || result.dcTitle || null,
        description: result.ogDescription || result.dcDescription || null,
        image: this.extractImageUrl(result),
        siteName: result.ogSiteName || this.extractSiteName(url),
        favicon: result.favicon || this.buildFaviconUrl(url),
        type: result.ogType || null,
        cached: false,
        fetchedAt: new Date().toISOString(),
      };

      // Step 5: Cache the result
      try {
        await this.cacheManager.set(cacheKey, preview, LINK_PREVIEW.CACHE_TTL_MS);
        this.logger.debug(`Cached preview for ${url}`);
      } catch (cacheError) {
        this.logger.warn(`Cache write error for ${url}: ${cacheError}`);
        // Continue without caching
      }

      return { success: true, data: preview };
    } catch (fetchError) {
      const isTimeout =
        fetchError instanceof Error &&
        (fetchError.message.includes('timeout') || fetchError.message.includes('ETIMEDOUT'));

      this.logger.error(`Error fetching preview for ${url}: ${fetchError}`);
      return {
        success: false,
        error: {
          url,
          error: isTimeout ? 'Request timed out' : 'Failed to fetch link metadata',
          code: isTimeout ? 'TIMEOUT' : 'FETCH_FAILED',
        },
      };
    }
  }

  /**
   * Fetch a URL's HTML while defending against SSRF via redirects and DNS
   * rebinding.
   *
   * @remarks
   * Redirects are NOT followed automatically. Instead, each hop is re-run
   * through {@link validateCitationUrl} before being fetched, so a validated
   * public URL cannot bounce the request to an internal address (e.g. the cloud
   * metadata endpoint). The response body is capped to prevent unbounded reads.
   *
   * @param initialUrl - The already-normalized, already-validated starting URL
   * @returns The fetched HTML as a string
   * @throws {Error} `SSRF_BLOCKED:<reason>` when a (redirect) hop fails validation
   * @throws {Error} When the request times out, errors, or returns a non-OK status
   */
  private async fetchHtmlSafely(initialUrl: string): Promise<string> {
    let currentUrl = initialUrl;

    for (let hop = 0; hop <= LINK_PREVIEW.MAX_REDIRECTS; hop++) {
      // Re-validate every hop (including redirects) against SSRF threats.
      const validation = await validateCitationUrl(currentUrl);
      if (!isSafeUrl(validation)) {
        throw new Error(`SSRF_BLOCKED:${validation.error ?? 'blocked'}`);
      }

      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // Do not auto-follow; we validate each hop ourselves.
        signal: AbortSignal.timeout(LINK_PREVIEW.FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'ReasonBridge-LinkPreview/1.0 (+https://reasonbridge.com)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      // Handle redirects manually so each destination is re-validated.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect (${response.status}) without Location header`);
        }
        // Resolve relative redirects against the current URL.
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upstream returned status ${response.status}`);
      }

      // Reject obviously oversized bodies up front when advertised.
      const contentLength = Number(response.headers.get('content-length') ?? '0');
      if (contentLength > LINK_PREVIEW.MAX_BODY_BYTES) {
        throw new Error('Response body exceeds maximum allowed size');
      }

      return await this.readCappedText(response);
    }

    throw new Error(`Too many redirects (>${LINK_PREVIEW.MAX_REDIRECTS})`);
  }

  /**
   * Read a response body as text, capped at {@link LINK_PREVIEW.MAX_BODY_BYTES}
   * to guard against unbounded/streamed downloads.
   */
  private async readCappedText(response: Response): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > LINK_PREVIEW.MAX_BODY_BYTES) {
            throw new Error('Response body exceeds maximum allowed size');
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Extract the best image URL from OG result
   */
  private extractImageUrl(result: OgResult): string | null {
    if (result.ogImage && Array.isArray(result.ogImage) && result.ogImage.length > 0) {
      return result.ogImage[0]?.url || null;
    }
    if (result.ogImage && typeof result.ogImage === 'object' && 'url' in result.ogImage) {
      return (result.ogImage as { url: string }).url;
    }
    return null;
  }

  /**
   * Extract site name from URL hostname
   */
  private extractSiteName(url: string): string | null {
    try {
      const hostname = new URL(url).hostname;
      // Remove www. prefix and return domain
      return hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  /**
   * Build favicon URL from domain
   */
  private buildFaviconUrl(url: string): string | null {
    try {
      const origin = new URL(url).origin;
      return `${origin}/favicon.ico`;
    } catch {
      return null;
    }
  }

  /**
   * Batch fetch previews for multiple URLs
   * Useful for pre-fetching all links in a response
   *
   * @param urls - Array of URLs to fetch
   * @returns Map of URL to preview result
   */
  async getPreviewsBatch(
    urls: string[],
  ): Promise<Map<string, LinkPreviewResponseDto | LinkPreviewErrorDto>> {
    const results = new Map<string, LinkPreviewResponseDto | LinkPreviewErrorDto>();

    // Limit concurrent fetches to prevent overwhelming external servers
    const BATCH_SIZE = 5;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const result = await this.getPreview(url);
          return { url, result };
        }),
      );

      for (const { url, result } of batchResults) {
        results.set(url, result.success ? result.data : result.error);
      }
    }

    return results;
  }
}
