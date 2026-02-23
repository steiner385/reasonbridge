/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CredentialService } from './credential.service.js';
import { CredentialDto, SubmitCredentialDto } from './dto/credential.dto.js';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

/**
 * CredentialController - REST API endpoints for domain credential management
 *
 * Provides endpoints for:
 * - Submitting new credentials for verification
 * - Viewing own credentials
 * - Deleting own credentials
 * - Admin: viewing pending credentials
 * - Admin: verifying/rejecting credentials
 *
 * @remarks
 * User endpoints require JWT authentication.
 * Admin endpoints require both JWT authentication and admin privileges.
 *
 * Credentials provide expertise boosts after verification:
 * - ACADEMIC_DOCTORATE: +0.30
 * - ACADEMIC_MASTERS: +0.20
 * - ACADEMIC_BACHELORS: +0.10
 * - PROFESSIONAL_LICENSE: +0.25
 * - INDUSTRY_CERTIFICATION: +0.15
 * - PUBLICATION: +0.10
 */
@Controller()
export class CredentialController {
  private readonly logger = new Logger(CredentialController.name);

  constructor(private readonly credentialService: CredentialService) {}

  /**
   * POST /credentials - Submit a new credential for verification
   *
   * Creates a new credential with PENDING status. The credential must be
   * verified by an admin before it provides an expertise boost.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @param data - Credential submission data
   * @returns CredentialDto with the created credential
   *
   * @example
   * ```
   * POST /credentials
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "tagId": "uuid-of-topic-tag",
   *   "type": "ACADEMIC_DOCTORATE",
   *   "title": "PhD in Climate Science",
   *   "institution": "Stanford University",
   *   "documentUrl": "https://storage/diploma.pdf"
   * }
   *
   * Response:
   * {
   *   "id": "cred-123",
   *   "status": "PENDING",
   *   "boostValue": 0.30,
   *   ...
   * }
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Post('credentials')
  @HttpCode(HttpStatus.CREATED)
  async submitCredential(
    @CurrentUser() user: JwtPayload,
    @Body() data: SubmitCredentialDto,
  ): Promise<CredentialDto> {
    this.logger.log(
      `POST /credentials - User ${user.sub} submitting ${data.type} credential for tag ${data.tagId}`,
    );

    return this.credentialService.submitCredential(user.sub, data);
  }

  /**
   * GET /credentials/me - List current user's credentials
   *
   * Returns all credentials belonging to the authenticated user,
   * regardless of their verification status.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @returns Array of CredentialDto sorted by creation date descending
   *
   * @example
   * ```
   * GET /credentials/me
   * Authorization: Bearer <token>
   *
   * Response:
   * [
   *   { "id": "cred-1", "status": "VERIFIED", "type": "ACADEMIC_DOCTORATE", ... },
   *   { "id": "cred-2", "status": "PENDING", "type": "INDUSTRY_CERTIFICATION", ... }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('credentials/me')
  async getMyCredentials(@CurrentUser() user: JwtPayload): Promise<CredentialDto[]> {
    this.logger.debug(`GET /credentials/me - User ${user.sub}`);

    return this.credentialService.getUserCredentials(user.sub);
  }

  /**
   * DELETE /credentials/:id - Delete a credential
   *
   * Deletes a credential owned by the authenticated user.
   * If the credential was verified, triggers expertise recalculation.
   *
   * @param user - JWT payload containing the authenticated user's ID
   * @param id - The credential ID to delete
   * @throws NotFoundException if credential does not exist
   * @throws ForbiddenException if user does not own the credential
   *
   * @example
   * ```
   * DELETE /credentials/cred-123
   * Authorization: Bearer <token>
   *
   * Response: 204 No Content
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Delete('credentials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCredential(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /credentials/${id} - User ${user.sub}`);

    await this.credentialService.deleteCredential(id, user.sub);
  }

  /**
   * GET /admin/credentials/pending - List pending credentials for review
   *
   * Returns all credentials with PENDING status, sorted by creation date
   * ascending (oldest first) for fair review ordering.
   *
   * @returns Array of CredentialDto with PENDING status
   *
   * @remarks
   * Requires admin privileges. Use with @UseGuards(JwtAuthGuard, AdminGuard)
   *
   * @example
   * ```
   * GET /admin/credentials/pending
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * [
   *   { "id": "cred-1", "userId": "user-1", "status": "PENDING", ... },
   *   { "id": "cred-2", "userId": "user-2", "status": "PENDING", ... }
   * ]
   * ```
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/credentials/pending')
  async getPendingCredentials(): Promise<CredentialDto[]> {
    this.logger.debug('GET /admin/credentials/pending');

    return this.credentialService.getPendingCredentials();
  }

  /**
   * POST /admin/credentials/:id/verify - Verify a credential
   *
   * Marks a pending credential as VERIFIED and triggers expertise
   * recalculation for the credential owner.
   *
   * @param admin - JWT payload containing the admin's ID
   * @param id - The credential ID to verify
   * @param notes - Optional verification notes
   * @returns CredentialDto with updated VERIFIED status
   * @throws NotFoundException if credential does not exist
   * @throws BadRequestException if credential is not pending
   *
   * @remarks
   * Requires admin privileges.
   *
   * @example
   * ```
   * POST /admin/credentials/cred-123/verify
   * Authorization: Bearer <admin-token>
   * Content-Type: application/json
   *
   * { "notes": "Document verified against institution records" }
   *
   * Response:
   * { "id": "cred-123", "status": "VERIFIED", "reviewedBy": "admin-id", ... }
   * ```
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/credentials/:id/verify')
  async verifyCredential(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ): Promise<CredentialDto> {
    this.logger.log(`POST /admin/credentials/${id}/verify - Admin ${admin.sub}`);

    return this.credentialService.verifyCredential(id, admin.sub, notes);
  }

  /**
   * POST /admin/credentials/:id/reject - Reject a credential
   *
   * Marks a pending credential as REJECTED with a required reason.
   * Does not trigger expertise recalculation.
   *
   * @param admin - JWT payload containing the admin's ID
   * @param id - The credential ID to reject
   * @param reason - Required reason for rejection
   * @returns CredentialDto with updated REJECTED status
   * @throws NotFoundException if credential does not exist
   * @throws BadRequestException if credential is not pending
   *
   * @remarks
   * Requires admin privileges.
   *
   * @example
   * ```
   * POST /admin/credentials/cred-123/reject
   * Authorization: Bearer <admin-token>
   * Content-Type: application/json
   *
   * { "reason": "Document appears to be forged" }
   *
   * Response:
   * { "id": "cred-123", "status": "REJECTED", "reviewNotes": "Document appears...", ... }
   * ```
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/credentials/:id/reject')
  async rejectCredential(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<CredentialDto> {
    this.logger.log(`POST /admin/credentials/${id}/reject - Admin ${admin.sub}`);

    return this.credentialService.rejectCredential(id, admin.sub, reason);
  }
}
