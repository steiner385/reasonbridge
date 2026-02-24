/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

// Module
export { AccessControlModule } from './access-control.module.js';

// Services
export {
  AccessControlService,
  TIER_LEVEL_VALUES,
  EXPERTISE_LEVEL_VALUES,
} from './access-control.service.js';
export type { AccessCheckResult } from './access-control.service.js';
export { ProvisionalAccessService } from './provisional-access.service.js';

// Guards
export { TierGuard } from './tier.guard.js';

// Decorators
export {
  RequireTier,
  RequireExpertise,
  RequireTierLevel,
  RequireExpertiseLevel,
  REQUIRE_TIER_KEY,
  REQUIRE_EXPERTISE_KEY,
} from './require-tier.decorator.js';
export type { RequireExpertiseOptions } from './require-tier.decorator.js';

// DTOs
export {
  ProvisionalAccessDto,
  AccessRequestDto,
  RequestAccessDto,
  ApproveAccessDto,
} from './dto/provisional-access.dto.js';
