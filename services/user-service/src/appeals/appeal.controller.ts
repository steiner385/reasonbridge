/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { AppealService } from './appeal.service.js';
import { AppealDto, SubmitAppealDto, AppealEligibilityDto } from './dto/appeal.dto.js';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

/**
 * ResolveAppealBody - Request body for resolving an appeal
 */
interface ResolveAppealBody {
  /** Action to take: approve or deny */
  action: 'approve' | 'deny';
  /** Notes for approval (optional) */
  notes?: string;
  /** Reason for denial (required for deny action) */
  reason?: string;
}

/**
 * AppealController - REST API endpoints for tier appeal management
 *
 * Provides endpoints for:
 * - Submitting new tier appeals
 * - Viewing own appeal history
 * - Checking appeal eligibility (30-day cooldown)
 * - Admin: viewing pending appeals
 * - Admin: approving/denying appeals
 *
 * @remarks
 * User endpoints require JWT authentication.
 * Admin endpoints require both JWT authentication and admin privileges.
 *
 * Appeal Types:
 * - GLOBAL_TIER: Request advancement in the global tier ranking system
 * - DOMAIN_EXPERTISE: Request advancement in a specific topic category
 *
 * Appeal Process:
 * 1. User checks eligibility (30-day cooldown enforced)
 * 2. User submits appeal with justification
 * 3. Appeal enters admin queue (PENDING status)
 * 4. Admin reviews and resolves (approve/deny)
 * 5. Approved appeals trigger tier/expertise bump
 */
@Controller()
export class AppealController {
  private readonly logger = new Logger(AppealController.name);

  constructor(@Inject(AppealService) private readonly appealService: AppealService) {}

  /**
   * POST /appeals - Submit a new tier appeal
   *
   * Creates a new appeal with PENDING status. Subject to 30-day cooldown.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @param data - Appeal submission data
   * @returns AppealDto with the created appeal
   *
   * @example
   * ```
   * POST /appeals
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "appealType": "GLOBAL_TIER",
   *   "requestedLevel": 2,
   *   "reason": "I have been contributing quality content consistently"
   * }
   *
   * Response:
   * {
   *   "id": "appeal-123",
   *   "status": "PENDING",
   *   "appealType": "GLOBAL_TIER",
   *   "requestedLevelName": "Trusted",
   *   ...
   * }
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('appeals')
  @HttpCode(HttpStatus.CREATED)
  async submitAppeal(
    @CurrentUser() user: JwtPayload,
    @Body() data: SubmitAppealDto,
  ): Promise<AppealDto> {
    this.logger.log(`POST /appeals - User ${user.sub} submitting ${data.appealType} appeal`);

    return this.appealService.submitAppeal(user.sub, data);
  }

  /**
   * GET /appeals/me - List current user's appeals
   *
   * Returns all appeals belonging to the authenticated user,
   * regardless of their status, sorted by creation date descending.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @returns Array of AppealDto sorted by creation date descending
   *
   * @example
   * ```
   * GET /appeals/me
   * Authorization: Bearer <token>
   *
   * Response:
   * [
   *   { "id": "appeal-1", "status": "PENDING", "appealType": "GLOBAL_TIER", ... },
   *   { "id": "appeal-2", "status": "DENIED", "appealType": "DOMAIN_EXPERTISE", ... }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('appeals/me')
  async getMyAppeals(@CurrentUser() user: JwtPayload): Promise<AppealDto[]> {
    this.logger.debug(`GET /appeals/me - User ${user.sub}`);

    return this.appealService.getUserAppeals(user.sub);
  }

  /**
   * GET /appeals/me/eligibility - Check appeal submission eligibility
   *
   * Returns whether the user can submit a new appeal (30-day cooldown).
   * If ineligible, includes reason and next eligible date.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @returns AppealEligibilityDto with eligibility status
   *
   * @example
   * ```
   * GET /appeals/me/eligibility
   * Authorization: Bearer <token>
   *
   * Response (eligible):
   * { "canSubmit": true }
   *
   * Response (ineligible):
   * {
   *   "canSubmit": false,
   *   "reason": "You can only submit one appeal every 30 days",
   *   "nextEligibleDate": "2026-03-24T10:00:00.000Z"
   * }
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('appeals/me/eligibility')
  async checkEligibility(@CurrentUser() user: JwtPayload): Promise<AppealEligibilityDto> {
    this.logger.debug(`GET /appeals/me/eligibility - User ${user.sub}`);

    return this.appealService.getAppealEligibility(user.sub);
  }

  /**
   * GET /admin/appeals - List pending appeals for admin review
   *
   * Returns all appeals with PENDING status, sorted by creation date
   * ascending (oldest first) for fair review ordering.
   *
   * @returns Array of AppealDto with PENDING status
   *
   * @remarks
   * Requires admin privileges. Use with @UseGuards(JwtAuthGuard, AdminGuard)
   *
   * @example
   * ```
   * GET /admin/appeals
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * [
   *   { "id": "appeal-1", "userId": "user-1", "status": "PENDING", ... },
   *   { "id": "appeal-2", "userId": "user-2", "status": "PENDING", ... }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/appeals')
  async getPendingAppeals(): Promise<AppealDto[]> {
    this.logger.debug('GET /admin/appeals');

    return this.appealService.getPendingAppeals();
  }

  /**
   * POST /admin/appeals/:id/resolve - Resolve an appeal (approve/deny)
   *
   * Approves or denies a pending appeal. Approved appeals trigger
   * tier/expertise bumps. Denied appeals require a reason.
   *
   * @param admin - JWT payload containing the admin's ID
   * @param id - The appeal ID to resolve
   * @param body - Resolution details (action, notes/reason)
   * @returns AppealDto with updated status
   * @throws NotFoundException if appeal does not exist
   * @throws BadRequestException if appeal is not pending or action is invalid
   *
   * @remarks
   * Requires admin privileges.
   *
   * @example
   * ```
   * POST /admin/appeals/appeal-123/resolve
   * Authorization: Bearer <admin-token>
   * Content-Type: application/json
   *
   * // Approve:
   * { "action": "approve", "notes": "Verified contribution history" }
   *
   * // Deny:
   * { "action": "deny", "reason": "Insufficient evidence for advancement" }
   *
   * Response:
   * { "id": "appeal-123", "status": "APPROVED", "reviewedBy": "admin-id", ... }
   * ```
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/appeals/:id/resolve')
  async resolveAppeal(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() body: ResolveAppealBody,
  ): Promise<AppealDto> {
    this.logger.log(
      `POST /admin/appeals/${id}/resolve - Admin ${admin.sub} action: ${body.action}`,
    );

    if (body.action === 'approve') {
      return this.appealService.approveAppeal(id, admin.sub, body.notes);
    }

    if (body.action === 'deny') {
      if (!body.reason) {
        throw new BadRequestException('Reason is required when denying an appeal');
      }
      return this.appealService.denyAppeal(id, admin.sub, body.reason);
    }

    throw new BadRequestException(`Invalid action: ${body.action}. Must be 'approve' or 'deny'`);
  }
}
