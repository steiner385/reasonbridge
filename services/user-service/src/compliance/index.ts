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
