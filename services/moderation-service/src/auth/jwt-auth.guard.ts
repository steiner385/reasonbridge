/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Re-export JwtAuthGuard from shared package
 *
 * @remarks
 * The JWT authentication guard is now maintained in the shared @reason-bridge/common package.
 * This re-export maintains backward compatibility with existing imports.
 */
export { JwtAuthGuard, type JwtPayload } from '@reason-bridge/common';
