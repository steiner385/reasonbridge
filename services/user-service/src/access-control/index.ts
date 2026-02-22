/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export { AccessControlModule } from './access-control.module.js';
export {
  AccessControlService,
  TIER_LEVEL_VALUES,
  EXPERTISE_LEVEL_VALUES,
} from './access-control.service.js';
export type { AccessCheckResult } from './access-control.service.js';
export { TierGuard } from './tier.guard.js';
export {
  RequireTier,
  RequireExpertise,
  RequireTierLevel,
  RequireExpertiseLevel,
  REQUIRE_TIER_KEY,
  REQUIRE_EXPERTISE_KEY,
} from './require-tier.decorator.js';
export type { RequireExpertiseOptions } from './require-tier.decorator.js';
