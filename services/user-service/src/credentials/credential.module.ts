/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ExpertiseModule } from '../expertise/expertise.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CredentialService } from './credential.service.js';
import { CredentialController } from './credential.controller.js';

/**
 * CredentialModule - Provides domain credential management services
 *
 * This module encapsulates:
 * - CredentialController: REST API endpoints for credential management
 * - CredentialService: Manages credential submission, verification, and deletion
 *
 * @remarks
 * The module exports CredentialService for use by other modules that need
 * to manage or query domain credentials.
 *
 * API Endpoints:
 * - POST /credentials - Submit new credential (requires auth)
 * - GET /credentials/me - List my credentials (requires auth)
 * - DELETE /credentials/:id - Remove credential (requires auth)
 * - GET /admin/credentials/pending - Pending verifications (requires admin)
 * - POST /admin/credentials/:id/verify - Approve credential (requires admin)
 * - POST /admin/credentials/:id/reject - Reject credential (requires admin)
 *
 * Credential types and boost values:
 * - ACADEMIC_DOCTORATE: +0.30 (PhD, MD, JD)
 * - ACADEMIC_MASTERS: +0.20 (MA, MS, MBA)
 * - ACADEMIC_BACHELORS: +0.10 (BA, BS)
 * - PROFESSIONAL_LICENSE: +0.25 (Medical, Legal, Engineering)
 * - INDUSTRY_CERTIFICATION: +0.15 (AWS, PMP, CPA)
 * - PUBLICATION: +0.10 (Journal article, book)
 *
 * Credential status lifecycle:
 * - PENDING: Awaiting admin review
 * - VERIFIED: Approved by admin (triggers expertise recalculation)
 * - REJECTED: Rejected by admin
 * - EXPIRED: Time-limited certification has expired
 *
 * @example
 * ```typescript
 * // Import in another module
 * import { CredentialModule } from '../credentials/credential.module.js';
 *
 * @Module({
 *   imports: [CredentialModule],
 * })
 * export class SomeModule {}
 * ```
 */
@Module({
  imports: [PrismaModule, ExpertiseModule, forwardRef(() => AuthModule)],
  controllers: [CredentialController],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
