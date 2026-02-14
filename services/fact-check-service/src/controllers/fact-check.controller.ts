/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Post, BadRequestException, Logger } from '@nestjs/common';
import { FactCheckService } from '../services/fact-check.service.js';
import type { CheckClaimsRequestDto, CheckClaimsResponseDto } from '../dto/check-claims.dto.js';

/**
 * Controller for fact-check operations
 *
 * T254: POST /fact-check/check endpoint
 *
 * Exposes endpoints for checking factual claims against external
 * fact-checking databases. Results are presented as "Related Context"
 * without rendering verdicts (per FR-012b).
 */
@Controller('fact-check')
export class FactCheckController {
  private readonly logger = new Logger(FactCheckController.name);

  constructor(private readonly factCheckService: FactCheckService) {}

  /**
   * Check claims for fact-check information
   *
   * POST /fact-check/check
   *
   * @param request - Claims to check
   * @returns Fact-check results from external providers
   */
  @Post('check')
  async checkClaims(@Body() request: CheckClaimsRequestDto): Promise<CheckClaimsResponseDto> {
    // Validate required fields
    if (!request.responseId) {
      throw new BadRequestException('responseId is required');
    }

    if (!request.claims || !Array.isArray(request.claims)) {
      throw new BadRequestException('claims array is required');
    }

    if (request.claims.length === 0) {
      throw new BadRequestException('claims array cannot be empty');
    }

    // Validate each claim
    request.claims.forEach((claim, i) => {
      if (!claim || !claim.text || typeof claim.text !== 'string') {
        throw new BadRequestException(`claims[${i}].text is required and must be a string`);
      }

      if (claim.text.trim().length === 0) {
        throw new BadRequestException(`claims[${i}].text cannot be empty`);
      }

      if (claim.text.length > 1000) {
        throw new BadRequestException(
          `claims[${i}].text exceeds maximum length of 1000 characters`,
        );
      }

      if (typeof claim.startOffset !== 'number' || claim.startOffset < 0) {
        throw new BadRequestException(
          `claims[${i}].startOffset is required and must be a non-negative number`,
        );
      }

      if (typeof claim.endOffset !== 'number' || claim.endOffset < 0) {
        throw new BadRequestException(
          `claims[${i}].endOffset is required and must be a non-negative number`,
        );
      }

      if (claim.endOffset <= claim.startOffset) {
        throw new BadRequestException(`claims[${i}].endOffset must be greater than startOffset`);
      }
    });

    // Limit number of claims per request
    const maxClaims = 10;
    if (request.claims.length > maxClaims) {
      throw new BadRequestException(`Maximum ${maxClaims} claims allowed per request`);
    }

    this.logger.log(`Checking ${request.claims.length} claims for response ${request.responseId}`);

    return this.factCheckService.checkClaims(request);
  }
}
