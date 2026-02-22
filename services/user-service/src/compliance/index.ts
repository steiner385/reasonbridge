/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export { ComplianceModule } from './compliance.module.js';
export { ComplianceService, type RegionalRules } from './compliance.service.js';
export { AgeVerificationService, type AgeVerificationResult } from './age-verification.service.js';
export {
  ParentalConsentService,
  type VerifyConsentResult,
  type ConsentStatusInfo,
  type InitiateConsentResult,
} from './parental-consent.service.js';
export { ParentalConsentController } from './parental-consent.controller.js';
export {
  RequestConsentDto,
  RequestConsentResponseDto,
  VerifyConsentResponseDto,
  ConsentStatusDto,
} from './dto/parental-consent.dto.js';
export { ComplianceAuditService, type AuditMetadata } from './compliance-audit.service.js';
export {
  ComplianceReportService,
  type ComplianceReportFilters,
  type ComplianceReportSummary,
  type ComplianceReportDetail,
} from './compliance-report.service.js';
export { ComplianceController } from './compliance.controller.js';
export {
  ComplianceReportQueryDto,
  ComplianceReportSummaryResponseDto,
  ComplianceReportDetailResponseDto,
  AuditLogEntryDto,
} from './dto/compliance-report.dto.js';
export { AdminGuard } from './guards/admin.guard.js';
export { AgeReverificationJob } from './age-reverification.job.js';
export {
  DataDeletionService,
  type CreateDeletionRequestResult,
  type ExecuteDeletionResult,
  type DeletionLog,
  type ProcessDeletionResult,
  type DeletionRequestor,
} from './data-deletion.service.js';
