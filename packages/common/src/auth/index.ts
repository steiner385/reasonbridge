/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication utilities for NestJS services
 *
 * @packageDocumentation
 */

export { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard.js';
export { InternalApiKeyGuard } from './internal-api-key.guard.js';
